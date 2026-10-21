(function () {
    "use strict";

    var RING_MS = window.discodeCallRingMs || 30000;
    var ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
    var state = null;
    var ringTimer = 0;
    var readyCallbacks = [];
    var isReady = false;

    var peer = null;
    var localStream = null;
    var micPromise = null;
    var mediaCallId = "";
    var pendingCandidates = [];
    var remoteAudio = null;
    var voiceConnected = false;
    var cameraState = "off";
    var cameraStream = null;
    var cameraToken = 0;
    var videoSender = null;
    var remoteVideoStream = null;
    var peerCamera = false;
    var screenState = "off";
    var screenStream = null;
    var screenToken = 0;
    var screenSender = null;
    var remoteScreenStream = null;
    var peerScreen = null;
    var watchingPeerScreen = false;
    var focusedScreen = "";
    var watchSince = 0;
    var peerMuted = false;
    var peerDeafened = false;
    var AUDIO_KEY = "discode-call-audio";
    var audioState = { muted: false, deafened: false };

    var ringtone = new Audio("/assets/css/audio/call.mp3");
    ringtone.loop = true;
    var joinSound = new Audio("/assets/css/audio/join-voice.mp3");
    var leaveSound = new Audio("/assets/css/audio/leave-voice.mp3");

    var invite = document.getElementById("incoming-call");
    var sidebarCall = document.getElementById("sidebar-call");
    var userPanel = document.getElementById("user-panel");
    if (!invite) return;
    var sidebarHangup = null;
    var watcher = null;

    function play(sound) {
        try {
            sound.currentTime = 0;
            var promise = sound.play();
            if (promise && promise.catch) promise.catch(function () {});
        } catch (e) {}
    }

    function stopRing() {
        ringtone.pause();
        ringtone.currentTime = 0;
        clearTimeout(ringTimer);
        ringTimer = 0;
    }

    function startRing(volume) {
        ringtone.volume = volume;
        play(ringtone);
    }

    function invoke() {
        if (!window.discodePresence) return Promise.reject(new Error("Live connection is not ready yet."));
        return window.discodePresence.invoke.apply(null, arguments);
    }

    function clean(error) {
        var message = (error && error.message) || "";
        var at = message.indexOf("HubException: ");
        return at >= 0 ? message.slice(at + 14) : (message || "Could not start the call.");
    }

    function name(call) {
        return call.other.displayName || call.other.userName;
    }

    function onDmPageOf(call) {
        return !!call && window.discodeOpenDm === call.other.userName;
    }

    function controls() {
        return window.discodeCallControls || null;
    }

    function micIsMuted() {
        return audioState.muted;
    }

    var micIcon = null;
    var headIcon = null;
    var headButton = null;

    function readSidebar() {
        return {
            muted: !!micIcon && micIcon.classList.contains("mute"),
            deafened: !!headIcon && headIcon.classList.contains("mute")
        };
    }

    function paintSidebar() {
        if (micIcon) micIcon.className = audioState.muted ? "fa-solid fa-microphone-slash mute" : "fa-solid fa-microphone";
        if (headIcon) headIcon.className = audioState.deafened ? "fa-solid fa-headphones mute" : "fa-solid fa-headphones";
        if (headButton) {
            if (audioState.deafened) headButton.setAttribute("data-deafened", "true");
            else headButton.removeAttribute("data-deafened");
        }
        window.micO = audioState.muted;
        window.headO = audioState.deafened;
    }

    function paintStage() {
        if (controls() && controls().set) controls().set(audioState.muted, audioState.deafened);
    }

    function saveAudio() {
        try {
            if (state) sessionStorage.setItem(AUDIO_KEY, JSON.stringify(audioState));
        } catch (e) {}
    }

    function setAudio(next, source) {
        if (next.muted === audioState.muted && next.deafened === audioState.deafened) return;
        audioState = next;
        if (source !== "sidebar") paintSidebar();
        if (source !== "stage") paintStage();
        applyMute();
        if (audioState.muted) setSpeaking("me", false);
        if (remoteAudio) remoteAudio.muted = audioState.deafened;
        saveAudio();
        renderTiles();
        if (state && state.status === "active") sendMuteState();
    }

    function loadAudio() {
        var saved = null;
        try {
            saved = JSON.parse(sessionStorage.getItem(AUDIO_KEY) || "null");
        } catch (e) {}
        audioState = saved && typeof saved.muted === "boolean" ? { muted: saved.muted, deafened: !!saved.deafened } : readSidebar();
        paintSidebar();
        paintStage();
    }

    function watchSidebarIcons() {
        if (watcher) watcher.disconnect();
        if (!micIcon && !headIcon) return;
        watcher = new MutationObserver(function () {
            setAudio(readSidebar(), "sidebar");
        });
        [micIcon, headIcon].forEach(function (icon) {
            if (icon) watcher.observe(icon, { attributes: true, attributeFilter: ["class"] });
        });
    }

    function sendSignal(type, data) {
        if (!state) return;
        var body = { type: type };
        Object.keys(data || {}).forEach(function (key) { body[key] = data[key]; });
        invoke("SendCallSignal", state.callId, JSON.stringify(body)).catch(function () {});
    }

    function sendMuteState() {
        sendSignal("mute", { muted: micIsMuted(), deafened: audioState.deafened, camera: cameraState === "on", screen: screenInfo() });
        if (state) invoke("SetCallScreen", state.callId, screenState === "on").catch(function () {});
    }

    function applyMute() {
        if (!localStream) return;
        var muted = micIsMuted();
        localStream.getAudioTracks().forEach(function (track) { track.enabled = !muted; });
    }

    function showPeerMuted(muted, deafened) {
        var badge = document.getElementById("call-peer-mute");
        if (!badge) return;
        badge.classList.toggle("is-gone", !muted && !deafened);
        badge.classList.toggle("is-deaf", !!deafened);
        peerMuted = !!muted || !!deafened;
        peerDeafened = !!deafened;
        renderTiles();
    }

    function tileParts(face) {
        return {
            video: face.querySelector(".call-tile-video"),
            loading: face.querySelector(".call-tile-loading"),
            error: face.querySelector(".call-tile-error"),
            micIcon: face.querySelector(".call-tile-name .fa-microphone-slash"),
            deafIcon: face.querySelector(".call-tile-name .tile-deaf"),
            name: face.querySelector(".call-tile-name span")
        };
    }

    function fillTile(face, info) {
        var parts = tileParts(face);
        var showVideo = info.camera === "on" && !!info.stream;
        face.classList.toggle("has-video", showVideo);
        face.classList.toggle("is-loading", info.camera === "starting");
        if (parts.video) {
            if (showVideo) {
                if (parts.video.srcObject !== info.stream) parts.video.srcObject = info.stream;
                var playing = parts.video.play();
                if (playing && playing.catch) playing.catch(function () {});
            } else if (parts.video.srcObject) {
                parts.video.srcObject = null;
            }
        }
        if (parts.loading) parts.loading.hidden = info.camera !== "starting";
        if (parts.error) {
            parts.error.hidden = info.camera !== "error";
            var detail = parts.error.querySelector("small");
            if (detail) detail.textContent = info.error ? "Error: " + info.error : "";
        }
        if (parts.micIcon) parts.micIcon.hidden = !info.muted || !!info.deafened;
        if (parts.deafIcon) parts.deafIcon.hidden = !info.deafened;
        if (parts.name) parts.name.textContent = info.name || "";
    }

    function canFocus(tile, keeping) {
        if (!tile) return false;
        if (tile.classList.contains("is-screen")) return !tile.classList.contains("is-unwatched");
        return tile.classList.contains("has-video") || (!!focusedScreen && !!keeping);
    }

    function screenInfo() {
        if (screenState !== "on" || !screenStream) return null;
        var track = screenStream.getVideoTracks()[0];
        var settings = track && track.getSettings ? track.getSettings() : {};
        return { h: Math.round(settings.height || 720), fps: Math.round(settings.frameRate || 30) };
    }

    function screenTile(id) {
        var faces = document.getElementById("call-faces");
        var tile = document.getElementById(id);
        if (!faces) return null;
        if (tile) return tile;
        tile = document.createElement("div");
        tile.className = "call-face is-screen";
        tile.id = id;
        tile.innerHTML = "<video class=\"call-screen-tile-video\" autoplay playsinline muted></video>" +
            "<div class=\"call-screen-badge\"><span class=\"call-screen-quality\"></span><b>LIVE</b></div>" +
            "<button type=\"button\" class=\"call-screen-watch\">Watch Stream</button>" +
            "<div class=\"call-tile-name\"><i class=\"fa-solid fa-display\"></i><span></span></div>";
        faces.insertBefore(tile, faces.firstChild);
        return tile;
    }

    function fillScreenTile(id, show, stream, info, label, unwatched) {
        var tile = document.getElementById(id);
        if (!show) {
            if (tile) {
                var old = tile.querySelector("video");
                if (old) old.srcObject = null;
                tile.parentNode.removeChild(tile);
            }
            return;
        }
        tile = screenTile(id);
        if (!tile) return;
        var video = tile.querySelector("video");
        if (video.srcObject !== stream) video.srcObject = stream;
        var playing = video.play();
        if (playing && playing.catch) playing.catch(function () {});
        tile.classList.toggle("is-unwatched", !!unwatched);
        tile.querySelector(".call-screen-quality").textContent = info ? info.h + "P " + info.fps + "FPS" : "";
        tile.querySelector(".call-tile-name span").textContent = label;
    }

    function renderTiles() {
        var stage = document.getElementById("call-stage");
        var avatar = document.getElementById("call-avatar");
        var peerFace = document.getElementById("call-peer-face");
        if (!stage || !avatar || !peerFace) return;
        var mineShown = screenState === "on" && !!screenStream;
        var ghostShown = !!state && state.joined === false && !!state.peerScreen;
        var theirsShown = (!!peerScreen && !!remoteScreenStream) || ghostShown;
        if (!peerScreen && !ghostShown && Date.now() - watchSince > 15000) watchingPeerScreen = false;
        var video = cameraState !== "off" || peerCamera || mineShown || theirsShown;
        stage.classList.toggle("is-video", video);
        stage.classList.toggle("has-screen-tile", mineShown || theirsShown);
        var myName = document.querySelector("#user-panel .me-display");
        fillTile(avatar.parentNode, { camera: cameraState, stream: cameraStream, muted: audioState.muted, deafened: audioState.deafened, name: myName ? myName.textContent.trim() : "", error: cameraError });
        fillTile(peerFace, { camera: peerCamera ? "on" : "off", stream: remoteVideoStream, muted: peerMuted, deafened: peerDeafened, name: state ? name(state) : "" });
        fillScreenTile("call-screen-peer", theirsShown, ghostShown ? null : remoteScreenStream, ghostShown ? null : peerScreen, state ? name(state) : "", ghostShown || !watchingPeerScreen);
        fillScreenTile("call-screen-me", mineShown, screenStream, screenInfo(), myName ? myName.textContent.trim() : "");
        avatar.parentNode.id = "call-me-face";
        if (focusedScreen && !canFocus(document.getElementById(focusedScreen))) focusedScreen = "";
        stage.classList.toggle("has-focus", !!focusedScreen);
        var tilesNow = [].slice.call(document.querySelectorAll("#call-faces > .call-face"));
        var focusedTile = focusedScreen ? document.getElementById(focusedScreen) : null;
        var wantScreen = !!focusedTile && !focusedTile.classList.contains("is-screen");
        var candidates = focusedTile ? tilesNow.filter(function (tile) {
            if (tile === focusedTile) return false;
            return wantScreen ? tile.classList.contains("is-screen") : (!tile.classList.contains("is-screen") && tile.classList.contains("has-video"));
        }) : [];
        var mini = candidates.filter(function (tile) { return /-me/.test(tile.id); })[0] || candidates[0] || null;
        tilesNow.forEach(function (tile) {
            tile.classList.toggle("is-focused", focusedScreen === tile.id);
            tile.classList.toggle("is-mini", tile === mini);
        });
    }

    var cameraError = "";

    function stopCameraStream() {
        cameraToken++;
        if (cameraStream) {
            cameraStream.getTracks().forEach(function (track) { track.stop(); });
            cameraStream = null;
        }
        if (videoSender) videoSender.replaceTrack(null).catch(function () {});
    }

    function stopScreenStream() {
        screenToken++;
        if (screenStream) {
            screenStream.getTracks().forEach(function (track) {
                track.onended = null;
                track.stop();
            });
            screenStream = null;
        }
        if (screenSender) screenSender.replaceTrack(null).catch(function () {});
    }

    function setScreen(on) {
        var buttons = window.discodeCallControls;
        if (!on) {
            stopScreenStream();
            screenState = "off";
            if (buttons && buttons.setScreenButton) buttons.setScreenButton(false);
            if (state && state.status === "active") sendMuteState();
            renderTiles();
            return;
        }
        if (!state || state.joined === false) {
            if (buttons && buttons.setScreenButton) buttons.setScreenButton(false);
            return;
        }
        if (screenState === "starting" || screenState === "on") return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            if (buttons && buttons.setScreenButton) buttons.setScreenButton(false);
            return;
        }
        var token = ++screenToken;
        screenState = "starting";
        navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false }).then(function (stream) {
            if (token !== screenToken || !state) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            screenStream = stream;
            screenState = "on";
            var track = stream.getVideoTracks()[0];
            if (track) track.onended = function () { setScreen(false); };
            if (screenSender && track) screenSender.replaceTrack(track).catch(function () {});
            if (state.status === "active") sendMuteState();
            renderTiles();
        }).catch(function () {
            if (token !== screenToken) return;
            screenState = "off";
            if (buttons && buttons.setScreenButton) buttons.setScreenButton(false);
        });
    }

    document.addEventListener("click", function (event) {
        var tile = event.target.closest && event.target.closest("#call-faces > .call-face");
        if (tile && !event.target.closest(".call-screen-watch, .call-tile-retry") && tile.id && (focusedScreen || canFocus(tile))) {
            if (canFocus(tile)) {
                focusedScreen = focusedScreen === tile.id ? "" : tile.id;
                renderTiles();
            } else if (focusedScreen && tile.id !== focusedScreen) {
                focusedScreen = tile.id;
                renderTiles();
            }
            return;
        }
        if (event.target.closest && event.target.closest("#call-screen-peer .call-screen-watch")) {
            watchingPeerScreen = true;
            watchSince = Date.now();
            if (state && state.joined === false) answer(false);
            renderTiles();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && focusedScreen) {
            focusedScreen = "";
            renderTiles();
        }
    });

    document.addEventListener("discode-call-screen", function (event) {
        setScreen(!!event.detail.on);
    });

    function setCamera(on) {
        var buttons = window.discodeCallControls;
        if (!on) {
            stopCameraStream();
            cameraState = "off";
            cameraError = "";
            if (buttons && buttons.setCameraButton) buttons.setCameraButton(false);
            if (state && state.status === "active") sendMuteState();
            renderTiles();
            return;
        }
        if (!state || state.joined === false) {
            if (buttons && buttons.setCameraButton) buttons.setCameraButton(false);
            return;
        }
        if (cameraState === "starting" || cameraState === "on") return;
        var token = ++cameraToken;
        cameraState = "starting";
        cameraError = "";
        if (buttons && buttons.setCameraButton) buttons.setCameraButton(true);
        renderTiles();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            cameraState = "error";
            cameraError = "NotSupported";
            renderTiles();
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (stream) {
            if (token !== cameraToken || !state) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            cameraStream = stream;
            cameraState = "on";
            var track = stream.getVideoTracks()[0];
            if (videoSender && track) videoSender.replaceTrack(track).catch(function () {});
            if (state.status === "active") sendMuteState();
            renderTiles();
        }).catch(function (error) {
            if (token !== cameraToken) return;
            cameraState = "error";
            cameraError = (error && error.name) || "Unknown";
            renderTiles();
        });
    }

    document.addEventListener("discode-call-camera", function (event) {
        setCamera(!!event.detail.on);
    });

    document.addEventListener("click", function (event) {
        if (event.target.closest && event.target.closest(".call-tile-retry")) {
            cameraState = "off";
            setCamera(true);
        }
    });

    function ensureRemoteAudio() {
        if (remoteAudio) return remoteAudio;
        remoteAudio = document.createElement("audio");
        remoteAudio.autoplay = true;
        remoteAudio.hidden = true;
        document.documentElement.appendChild(remoteAudio);
        return remoteAudio;
    }

    var meterContext = null;
    var localMeter = null;
    var remoteMeter = null;

    function meterAudioContext() {
        if (!meterContext) {
            var Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) return null;
            meterContext = new Context();
        }
        if (meterContext.state === "suspended") meterContext.resume().catch(function () {});
        return meterContext;
    }

    document.addEventListener("click", function () {
        if (meterContext && meterContext.state === "suspended") meterContext.resume().catch(function () {});
    });

    function startMeter(stream, onSpeaking) {
        var context = meterAudioContext();
        if (!context || !stream || !stream.getAudioTracks().length) return null;
        var source = context.createMediaStreamSource(stream);
        var analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        var buffer = new Uint8Array(analyser.fftSize);
        var lastLoud = 0;
        var speaking = false;
        var timer = setInterval(function () {
            analyser.getByteTimeDomainData(buffer);
            var peak = 0;
            for (var i = 0; i < buffer.length; i++) {
                var level = Math.abs(buffer[i] - 128) / 128;
                if (level > peak) peak = level;
            }
            var now = Date.now();
            if (peak > 0.03) lastLoud = now;
            var next = now - lastLoud < 350;
            if (next !== speaking) {
                speaking = next;
                onSpeaking(next);
            }
        }, 80);
        return {
            stop: function () {
                clearInterval(timer);
                try {
                    source.disconnect();
                } catch (e) {}
                if (speaking) onSpeaking(false);
            }
        };
    }

    function setSpeaking(who, on) {
        var face = who === "me" ? document.getElementById("call-avatar") : document.getElementById("call-peer-face");
        if (who === "me" && face) face = face.parentNode;
        if (face) face.classList.toggle("is-speaking", !!on);
    }

    function closePeer() {
        if (remoteMeter) {
            remoteMeter.stop();
            remoteMeter = null;
        }
        if (peer) {
            peer.onicecandidate = null;
            peer.ontrack = null;
            peer.onconnectionstatechange = null;
            peer.close();
            peer = null;
        }
        voiceConnected = false;
        pendingCandidates = [];
        videoSender = null;
        screenSender = null;
        remoteVideoStream = null;
        remoteScreenStream = null;
        if (remoteAudio) remoteAudio.srcObject = null;
        renderTiles();
    }

    function teardownMedia() {
        closePeer();
        if (localMeter) {
            localMeter.stop();
            localMeter = null;
        }
        setSpeaking("me", false);
        stopCameraStream();
        cameraState = "off";
        cameraError = "";
        stopScreenStream();
        screenState = "off";
        peerScreen = null;
        if (window.discodeCallControls && window.discodeCallControls.setScreenButton) window.discodeCallControls.setScreenButton(false);
        if (window.discodeCallControls && window.discodeCallControls.setCameraButton) window.discodeCallControls.setCameraButton(false);
        renderTiles();
        if (localStream) {
            localStream.getTracks().forEach(function (track) { track.stop(); });
            localStream = null;
        }
        micPromise = null;
        mediaCallId = "";
        peerCamera = false;
        showPeerMuted(false, false);
    }

    function openMic() {
        if (micPromise) return micPromise;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            micPromise = Promise.resolve(null);
            return micPromise;
        }
        micPromise = navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            localStream = stream;
            if (localMeter) localMeter.stop();
            localMeter = startMeter(stream, function (on) {
                setSpeaking("me", on && !audioState.muted);
            });
            return stream;
        }).catch(function () {
            return null;
        });
        return micPromise;
    }

    function createPeer(forAnswer) {
        closePeer();
        peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peer.onicecandidate = function (event) {
            if (event.candidate) sendSignal("candidate", { candidate: event.candidate });
        };
        peer.onconnectionstatechange = function () {
            voiceConnected = !!peer && peer.connectionState === "connected";
            if (voiceConnected) sendMuteState();
            render();
        };
        peer.ontrack = function (event) {
            if (event.track.kind === "video") {
                var videos = peer.getTransceivers().filter(function (item) { return item.receiver.track && item.receiver.track.kind === "video"; });
                if (videos.indexOf(event.transceiver) === 1) remoteScreenStream = new MediaStream([event.track]);
                else remoteVideoStream = new MediaStream([event.track]);
                renderTiles();
                return;
            }
            var audio = ensureRemoteAudio();
            audio.srcObject = event.streams[0] || new MediaStream([event.track]);
            audio.muted = audioState.deafened;
            if (remoteMeter) remoteMeter.stop();
            remoteMeter = startMeter(audio.srcObject, function (on) {
                setSpeaking("peer", on);
            });
            var promise = audio.play();
            if (promise && promise.catch) promise.catch(function () {});
        };
        if (localStream && localStream.getAudioTracks().length) {
            localStream.getAudioTracks().forEach(function (track) { peer.addTrack(track, localStream); });
        } else {
            peer.addTransceiver("audio", { direction: "recvonly" });
        }
        if (!forAnswer) {
            videoSender = peer.addTransceiver("video", { direction: "sendrecv" }).sender;
            screenSender = peer.addTransceiver("video", { direction: "sendrecv" }).sender;
            attachCameraTrack();
        }
        return peer;
    }

    function attachCameraTrack() {
        var cameraTrack = cameraStream ? cameraStream.getVideoTracks()[0] : null;
        if (videoSender && cameraTrack) videoSender.replaceTrack(cameraTrack).catch(function () {});
        var screenTrack = screenStream ? screenStream.getVideoTracks()[0] : null;
        if (screenSender && screenTrack) screenSender.replaceTrack(screenTrack).catch(function () {});
    }

    function useOfferedVideo(connection) {
        var offered = connection.getTransceivers().filter(function (item) {
            return item.receiver.track && item.receiver.track.kind === "video" && item.mid !== null;
        });
        if (!offered.length) return;
        offered.forEach(function (item) { item.direction = "sendrecv"; });
        videoSender = offered[0].sender;
        screenSender = offered[1] ? offered[1].sender : null;
        attachCameraTrack();
    }

    function flushCandidates() {
        var queued = pendingCandidates;
        pendingCandidates = [];
        queued.forEach(function (candidate) {
            if (peer) peer.addIceCandidate(candidate).catch(function () {});
        });
    }

    function makeOffer() {
        openMic().then(function () {
            applyMute();
            var connection = createPeer(false);
            return connection.createOffer().then(function (offer) {
                return connection.setLocalDescription(offer);
            }).then(function () {
                sendSignal("offer", { sdp: connection.localDescription });
                sendMuteState();
            });
        }).catch(function () {});
    }

    function answerOffer(description) {
        openMic().then(function () {
            applyMute();
            var connection = createPeer(true);
            return connection.setRemoteDescription(description).then(function () {
                useOfferedVideo(connection);
                flushCandidates();
                return connection.createAnswer();
            }).then(function (answer) {
                return connection.setLocalDescription(answer);
            }).then(function () {
                sendSignal("answer", { sdp: connection.localDescription });
                sendMuteState();
            });
        }).catch(function () {});
    }

    function beginMedia(call) {
        if (mediaCallId === call.callId) return;
        mediaCallId = call.callId;
        openMic().then(function (stream) {
            if (!state || state.callId !== call.callId) return;
            if (!stream) setAudio({ muted: true, deafened: audioState.deafened }, "");
            applyMute();
            sendSignal("ready", {});
        });
    }

    function handleSignal(message) {
        if (!state || !message || state.callId !== message.callId || state.status !== "active") return;
        var data;
        try {
            data = JSON.parse(message.payload);
        } catch (e) {
            return;
        }
        if (data.type === "ready") {
            if (state.role === "caller") makeOffer();
            else sendSignal("ready", {});
            sendMuteState();
        } else if (data.type === "offer") {
            answerOffer(data.sdp);
        } else if (data.type === "answer") {
            if (peer) {
                peer.setRemoteDescription(data.sdp).then(flushCandidates).catch(function () {});
            }
        } else if (data.type === "candidate") {
            if (peer && peer.remoteDescription) peer.addIceCandidate(data.candidate).catch(function () {});
            else pendingCandidates.push(data.candidate);
        } else if (data.type === "mute") {
            peerCamera = !!data.camera;
            peerScreen = data.screen || null;
            showPeerMuted(!!data.muted, !!data.deafened);
        }
    }

    function render() {
        renderTiles();
        var incoming = !!state && state.status === "ringing" && state.role === "callee";
        invite.hidden = !incoming || onDmPageOf(state);
        if (incoming) {
            document.getElementById("incoming-call-avatar").src = state.other.avatarUrl || "/assets/img/img-icon-profile.jpeg";
            document.getElementById("incoming-call-name").textContent = name(state);
            document.getElementById("incoming-call-kind").textContent = state.video ? "Incoming Video Call" : "Incoming Voice Call";
        }

        var inCall = !!state && !incoming && state.joined !== false;
        if (sidebarCall) {
            sidebarCall.hidden = !inCall;
            if (inCall) {
                var connected = state.status === "active" && (voiceConnected || state.peerPresent === false);
                sidebarCall.classList.toggle("is-connected", connected);
                document.getElementById("sidebar-call-status").textContent = connected ? "Connected" : "Connecting";
                var link = document.getElementById("sidebar-call-name");
                link.textContent = name(state);
                link.setAttribute("href", "/Dm/Index?name=" + encodeURIComponent(state.other.userName));
            }
            var sidebar = sidebarCall.closest(".conversation-sidebar");
            if (sidebar) sidebar.classList.toggle("has-call", inCall);
        }
        if (userPanel) userPanel.classList.toggle("in-call", inCall);
        var inCallLabel = userPanel ? userPanel.querySelector(".in-call-label") : null;
        if (inCallLabel) inCallLabel.hidden = !inCall;
    }

    function emit(reason, previous) {
        document.dispatchEvent(new CustomEvent("discode-call-state", { detail: { call: state, reason: reason || "", previous: previous || null } }));
    }

    function setState(next, reason) {
        var previous = state;
        state = next;
        if (!next) {
            stopRing();
            teardownMedia();
            try {
                sessionStorage.removeItem(AUDIO_KEY);
            } catch (e) {}
        }
        render();
        emit(reason, previous);
    }

    function finishSync(call) {
        if (call) {
            state = call;
            if (call.status === "ringing" && call.role === "callee") startRing(1);
            if (call.status === "active" && call.joined !== false) beginMedia(call);
            render();
            emit("");
        } else if (state) {
            setState(null, "ended");
        }
        isReady = true;
        var pending = readyCallbacks;
        readyCallbacks = [];
        pending.forEach(function (callback) { callback(); });
    }

    document.addEventListener("discode-hub-connected", function (event) {
        if (event.detail && event.detail.pageSwap && isReady) return;
        invoke("GetMyCall").then(finishSync).catch(function () { finishSync(state); });
    });

    document.addEventListener("discode-call-incoming", function (event) {
        state = event.detail;
        startRing(1);
        render();
        emit("");
    });

    document.addEventListener("discode-call-accepted", function (event) {
        stopRing();
        state = event.detail;
        play(joinSound);
        beginMedia(state);
        render();
        emit("");
    });

    document.addEventListener("discode-call-ended", function (event) {
        var data = event.detail;
        if (data && (data.reason === "ended" || data.reason === "cancelled")) {
            document.dispatchEvent(new CustomEvent("discode-call-over", { detail: data }));
        }
        if (!state || !data || state.callId !== data.callId) return;
        play(leaveSound);
        setState(null, data.reason);
    });

    document.addEventListener("discode-call-signal", function (event) {
        handleSignal(event.detail);
    });

    document.addEventListener("discode-call-updated", function (event) {
        if (!state || !event.detail || state.callId !== event.detail.callId) return;
        stopRing();
        state = event.detail;
        if (state.joined === false) teardownMedia();
        render();
        emit("");
    });

    document.addEventListener("discode-call-peer", function (event) {
        var data = event.detail;
        if (!state || state.callId !== data.callId) return;
        var wasRinging = state.status === "ringing";
        state.peerPresent = !!data.present;
        if (!data.present && wasRinging) {
            stopRing();
            state.status = "active";
            beginMedia(state);
        } else if (!data.present) {
            closePeer();
            peerCamera = false;
            peerScreen = null;
            showPeerMuted(false, false);
            play(leaveSound);
        } else {
            play(joinSound);
        }
        render();
        emit("");
    });

    document.addEventListener("discode-call-mic", function (event) {
        setAudio({ muted: !!event.detail.muted, deafened: audioState.deafened && !!event.detail.muted }, "stage");
    });

    document.addEventListener("discode-call-deafen", function (event) {
        setAudio({ muted: audioState.muted, deafened: !!event.detail.deafened }, "stage");
    });

    var pendingEnd = Promise.resolve();

    function start(userName, video) {
        return pendingEnd.then(function () {
            return invoke("StartCall", userName, !!video);
        }).then(function (call) {
            state = call;
            if (call.status === "active") {
                play(joinSound);
                beginMedia(call);
            } else {
                startRing(0.5);
                ringTimer = setTimeout(function () {
                    if (state && state.callId === call.callId && state.status === "ringing") invoke("EndCall", call.callId, true).catch(function () {});
                }, RING_MS);
            }
            render();
            emit("");
            if (video) setCamera(true);
            return call;
        }).catch(function (error) {
            throw new Error(clean(error));
        });
    }

    function accept() {
        if (!state || state.role !== "callee") return;
        var call = state;
        stopRing();
        invoke("AcceptCall", call.callId).then(function () {
            if (!onDmPageOf(call)) window.discodeGo("/Dm/Index?name=" + encodeURIComponent(call.other.userName));
        }).catch(function () {
            setState(null, "unavailable");
        });
    }

    function answer(video) {
        if (!state) return Promise.resolve();
        if (state.role === "callee" && state.status === "ringing") {
            accept();
            return Promise.resolve();
        }
        if (state.joined === false) return start(state.other.userName, video);
        return Promise.resolve();
    }

    function decline() {
        if (!state) return;
        var call = state;
        invoke("DeclineCall", call.callId).catch(function () {
            if (state && state.callId === call.callId) setState(null, "");
        });
        if (call.role === "callee" && call.status === "ringing") {
            stopRing();
            state = Object.assign({}, call, { status: "active", joined: false, peerPresent: true });
            render();
            emit("");
        } else {
            setState(null, "");
        }
    }

    function end() {
        if (!state) return;
        var call = state;
        pendingEnd = invoke("EndCall", call.callId, false).catch(function () {});
        play(leaveSound);
        if (call.status === "active" && call.joined !== false && call.peerPresent !== false) {
            teardownMedia();
            state = Object.assign({}, call, { joined: false });
            render();
            emit("");
        } else {
            setState(null, "");
        }
    }

    function bindPage() {
        invite = document.getElementById("incoming-call");
        sidebarCall = document.getElementById("sidebar-call");
        userPanel = document.getElementById("user-panel");
        micIcon = document.getElementById("mic");
        headIcon = document.getElementById("head");
        headButton = document.getElementById("headp-btn");
        document.getElementById("incoming-call-accept").addEventListener("click", accept);
        document.getElementById("incoming-call-decline").addEventListener("click", decline);
        sidebarHangup = document.getElementById("sidebar-call-hangup");
        if (sidebarHangup) sidebarHangup.addEventListener("click", end);
        watchSidebarIcons();
    }

    bindPage();
    loadAudio();

    document.addEventListener("discode-page-ready", function () {
        if (!document.getElementById("incoming-call")) return;
        bindPage();
        paintSidebar();
        paintStage();
        render();
        renderTiles();
        emit("");
    });

    window.discodeCalls = {
        current: function () { return state; },
        start: start,
        answer: answer,
        decline: decline,
        end: end,
        ready: function (callback) {
            if (isReady) callback();
            else readyCallbacks.push(callback);
        },
        diagnostics: function () {
            if (!peer) return Promise.resolve(null);
            return peer.getStats().then(function (report) {
                var bytes = 0;
                report.forEach(function (item) {
                    if (item.type === "inbound-rtp" && item.kind === "audio") bytes += item.bytesReceived;
                });
                return {
                    connection: peer.connectionState,
                    receivedBytes: bytes,
                    micOpen: !!localStream,
                    micSending: !!localStream && localStream.getAudioTracks().some(function (track) { return track.enabled; }),
                    speakerMuted: !!remoteAudio && remoteAudio.muted,
                    peerCamera: peerCamera,
                    remoteVideo: remoteVideoStream ? remoteVideoStream.getVideoTracks().map(function (track) { return track.readyState + (track.muted ? "/muted" : "/live"); }).join(",") : "none",
                    transceivers: peer ? peer.getTransceivers().map(function (item) { return item.receiver.track.kind + ":" + item.direction + "/" + (item.currentDirection || "-"); }).join(" ") : ""
                };
            });
        }
    };
})();
