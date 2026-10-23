(function () {
    "use strict";

    var RING_MS = window.discodeGroupRingMs || 210000;
    var ALONE_MS = window.discodeCallAloneMs || 180000;
    var ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";

    var call = null;
    var ringing = null;
    var active = {};
    var peers = {};
    var early = {};
    var localStream = null;
    var micPromise = null;
    var mediaCallId = 0;
    var cameraState = "off";
    var cameraStream = null;
    var cameraToken = 0;
    var cameraError = "";
    var screenState = "off";
    var screenStream = null;
    var screenToken = 0;
    var audioState = { muted: false, deafened: false };
    var focused = "";
    var silenced = {};
    var ringTimer = 0;
    var ringUntil = 0;
    var ghostTimer = 0;
    var aloneTimer = 0;
    var aloneCallId = 0;
    var localMeter = null;
    var meterContext = null;
    var speaking = {};
    var isReady = false;
    var readyCallbacks = [];
    var micIcon = null;
    var headIcon = null;
    var headButton = null;
    var watcher = null;

    var ringtone = new Audio("/assets/css/audio/call.mp3");
    ringtone.loop = true;
    var joinSound = new Audio("/assets/css/audio/join-voice.mp3");
    var leaveSound = new Audio("/assets/css/audio/leave-voice.mp3");

    function play(sound) {
        try {
            sound.currentTime = 0;
            var promise = sound.play();
            if (promise && promise.catch) promise.catch(function () {});
        } catch (e) {}
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

    function stopRing() {
        ringtone.pause();
        ringtone.currentTime = 0;
        clearTimeout(ringTimer);
        ringTimer = 0;
    }

    function meName() {
        var field = document.getElementById("Update_UserName");
        return field ? field.value.trim() : "";
    }

    function onGroupPage(groupId) {
        return Number(window.discodeOpenGroup) === Number(groupId);
    }

    function inCall() {
        return !!call;
    }

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

    function setAudio(next, source) {
        if (next.muted === audioState.muted && next.deafened === audioState.deafened) return;
        audioState = next;
        if (source !== "sidebar") paintSidebar();
        applyMute();
        if (audioState.muted) markSpeaking("me", false);
        Object.keys(peers).forEach(function (id) {
            if (peers[id].audio) peers[id].audio.muted = audioState.deafened;
        });
        try {
            if (call) sessionStorage.setItem("discode-call-audio", JSON.stringify(audioState));
        } catch (e) {}
        sendState();
        render();
    }

    function watchSidebar() {
        if (watcher) watcher.disconnect();
        if (!micIcon && !headIcon) return;
        watcher = new MutationObserver(function () {
            if (call) setAudio(readSidebar(), "sidebar");
        });
        [micIcon, headIcon].forEach(function (icon) {
            if (icon) watcher.observe(icon, { attributes: true, attributeFilter: ["class"] });
        });
    }

    function applyMute() {
        if (!localStream) return;
        localStream.getAudioTracks().forEach(function (track) { track.enabled = !audioState.muted; });
    }

    function screenInfo() {
        if (screenState !== "on" || !screenStream) return null;
        var track = screenStream.getVideoTracks()[0];
        var settings = track && track.getSettings ? track.getSettings() : {};
        return { h: Math.round(settings.height || 720), fps: Math.round(settings.frameRate || 30) };
    }

    function signal(userId, type, data) {
        if (!call) return;
        var body = { type: type };
        Object.keys(data || {}).forEach(function (key) { body[key] = data[key]; });
        invoke("SendGroupCallSignal", call.callId, userId, JSON.stringify(body)).catch(function () {});
    }

    function stateBody() {
        return { muted: audioState.muted, deafened: audioState.deafened, camera: cameraState === "on", screen: screenInfo() };
    }

    function sendStateTo(userId) {
        signal(userId, "state", stateBody());
    }

    function sendState() {
        Object.keys(peers).forEach(sendStateTo);
    }

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
        var on = false;
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
            if (next !== on) {
                on = next;
                onSpeaking(next);
            }
        }, 80);
        return {
            stop: function () {
                clearInterval(timer);
                try {
                    source.disconnect();
                } catch (e) {}
                if (on) onSpeaking(false);
            }
        };
    }

    function markSpeaking(who, on) {
        speaking[who] = !!on;
        var tile = document.querySelector('#call-faces [data-user="' + who + '"]');
        if (tile) tile.classList.toggle("is-speaking", !!on);
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
                markSpeaking("me", on && !audioState.muted);
            });
            return stream;
        }).catch(function () {
            return null;
        });
        return micPromise;
    }

    function ensureAudio(peer) {
        if (peer.audio) return peer.audio;
        peer.audio = document.createElement("audio");
        peer.audio.autoplay = true;
        peer.audio.hidden = true;
        document.documentElement.appendChild(peer.audio);
        return peer.audio;
    }

    function newPeer(userId) {
        var peer = {
            userId: userId,
            pc: null,
            pending: early[userId] || [],
            videoSender: null,
            screenSender: null,
            camStream: null,
            screenStream: null,
            audio: null,
            meter: null,
            connected: false,
            state: { muted: false, deafened: false, camera: false, screen: null }
        };
        delete early[userId];
        peers[userId] = peer;
        return peer;
    }

    function closePeer(userId) {
        var peer = peers[userId];
        if (!peer) return;
        if (peer.meter) peer.meter.stop();
        if (peer.pc) {
            peer.pc.onicecandidate = null;
            peer.pc.ontrack = null;
            peer.pc.onconnectionstatechange = null;
            peer.pc.close();
        }
        if (peer.audio) {
            peer.audio.srcObject = null;
            if (peer.audio.parentNode) peer.audio.parentNode.removeChild(peer.audio);
        }
        markSpeaking(userId, false);
        delete peers[userId];
        delete early[userId];
    }

    function attachTracks(peer) {
        var cameraTrack = cameraStream ? cameraStream.getVideoTracks()[0] : null;
        if (peer.videoSender && cameraTrack) peer.videoSender.replaceTrack(cameraTrack).catch(function () {});
        var screenTrack = screenStream ? screenStream.getVideoTracks()[0] : null;
        if (peer.screenSender && screenTrack) peer.screenSender.replaceTrack(screenTrack).catch(function () {});
    }

    function createConnection(peer, offering) {
        var pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peer.pc = pc;
        pc.onicecandidate = function (event) {
            if (event.candidate) signal(peer.userId, "candidate", { candidate: event.candidate });
        };
        pc.onconnectionstatechange = function () {
            peer.connected = pc.connectionState === "connected";
            if (peer.connected) sendStateTo(peer.userId);
            render();
        };
        pc.ontrack = function (event) {
            if (event.track.kind === "video") {
                var videos = pc.getTransceivers().filter(function (item) { return item.receiver.track && item.receiver.track.kind === "video"; });
                if (videos.indexOf(event.transceiver) === 1) peer.screenStream = new MediaStream([event.track]);
                else peer.camStream = new MediaStream([event.track]);
                render();
                return;
            }
            var audio = ensureAudio(peer);
            audio.srcObject = event.streams[0] || new MediaStream([event.track]);
            audio.muted = audioState.deafened;
            if (peer.meter) peer.meter.stop();
            peer.meter = startMeter(audio.srcObject, function (on) { markSpeaking(peer.userId, on); });
            var promise = audio.play();
            if (promise && promise.catch) promise.catch(function () {});
        };
        if (localStream && localStream.getAudioTracks().length) {
            localStream.getAudioTracks().forEach(function (track) { pc.addTrack(track, localStream); });
        } else {
            pc.addTransceiver("audio", { direction: "recvonly" });
        }
        if (offering) {
            peer.videoSender = pc.addTransceiver("video", { direction: "sendrecv" }).sender;
            peer.screenSender = pc.addTransceiver("video", { direction: "sendrecv" }).sender;
            attachTracks(peer);
        }
        return pc;
    }

    function flush(peer) {
        var queued = peer.pending;
        peer.pending = [];
        queued.forEach(function (candidate) {
            if (peer.pc) peer.pc.addIceCandidate(candidate).catch(function () {});
        });
    }

    function offerTo(userId) {
        closePeer(userId);
        var peer = newPeer(userId);
        openMic().then(function () {
            applyMute();
            var pc = createConnection(peer, true);
            return pc.createOffer().then(function (offer) {
                return pc.setLocalDescription(offer);
            }).then(function () {
                signal(userId, "offer", { sdp: pc.localDescription });
                sendStateTo(userId);
            });
        }).catch(function () {});
    }

    function answerFrom(userId, description) {
        closePeer(userId);
        var peer = newPeer(userId);
        openMic().then(function () {
            applyMute();
            var pc = createConnection(peer, false);
            return pc.setRemoteDescription(description).then(function () {
                var offered = pc.getTransceivers().filter(function (item) {
                    return item.receiver.track && item.receiver.track.kind === "video" && item.mid !== null;
                });
                offered.forEach(function (item) { item.direction = "sendrecv"; });
                peer.videoSender = offered[0] ? offered[0].sender : null;
                peer.screenSender = offered[1] ? offered[1].sender : null;
                attachTracks(peer);
                flush(peer);
                return pc.createAnswer();
            }).then(function (answer) {
                return pc.setLocalDescription(answer);
            }).then(function () {
                signal(userId, "answer", { sdp: pc.localDescription });
                sendStateTo(userId);
            });
        }).catch(function () {});
    }

    function handleSignal(message) {
        if (!call || !message || call.callId !== message.callId) return;
        var data;
        try {
            data = JSON.parse(message.payload);
        } catch (e) {
            return;
        }
        var from = message.fromUserId;
        if (data.type === "offer") {
            answerFrom(from, data.sdp);
            return;
        }
        var peer = peers[from];
        if (data.type === "answer") {
            if (peer && peer.pc) peer.pc.setRemoteDescription(data.sdp).then(function () { flush(peer); }).catch(function () {});
        } else if (data.type === "candidate") {
            if (peer && peer.pc && peer.pc.remoteDescription) peer.pc.addIceCandidate(data.candidate).catch(function () {});
            else if (peer) peer.pending.push(data.candidate);
            else (early[from] = early[from] || []).push(data.candidate);
        } else if (data.type === "state" && peer) {
            peer.state = { muted: !!data.muted, deafened: !!data.deafened, camera: !!data.camera, screen: data.screen || null };
            render();
        }
    }

    function stopCameraStream() {
        cameraToken++;
        if (cameraStream) {
            cameraStream.getTracks().forEach(function (track) { track.stop(); });
            cameraStream = null;
        }
        Object.keys(peers).forEach(function (id) {
            if (peers[id].videoSender) peers[id].videoSender.replaceTrack(null).catch(function () {});
        });
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
        Object.keys(peers).forEach(function (id) {
            if (peers[id].screenSender) peers[id].screenSender.replaceTrack(null).catch(function () {});
        });
    }

    function paintButtons() {
        var controls = window.discodeCallControls;
        if (!controls) return;
        controls.set(audioState.muted, audioState.deafened);
        controls.setCameraButton(cameraState === "on" || cameraState === "starting");
        controls.setScreenButton(screenState === "on" || screenState === "starting");
    }

    function setCamera(on) {
        if (!on) {
            stopCameraStream();
            cameraState = "off";
            cameraError = "";
            sendState();
            render();
            return;
        }
        if (!call || cameraState === "starting" || cameraState === "on") return;
        var token = ++cameraToken;
        cameraState = "starting";
        cameraError = "";
        render();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            cameraState = "error";
            cameraError = "NotSupported";
            render();
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (stream) {
            if (token !== cameraToken || !call) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            cameraStream = stream;
            cameraState = "on";
            Object.keys(peers).forEach(function (id) { attachTracks(peers[id]); });
            sendState();
            render();
        }).catch(function (error) {
            if (token !== cameraToken) return;
            cameraState = "error";
            cameraError = (error && error.name) || "Unknown";
            render();
        });
    }

    function setScreen(on) {
        if (!on) {
            stopScreenStream();
            screenState = "off";
            if (call) invoke("SetGroupCallScreen", call.callId, false).catch(function () {});
            sendState();
            render();
            return;
        }
        if (!call || screenState === "starting" || screenState === "on") return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return;
        var token = ++screenToken;
        screenState = "starting";
        render();
        navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false }).then(function (stream) {
            if (token !== screenToken || !call) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            screenStream = stream;
            screenState = "on";
            var track = stream.getVideoTracks()[0];
            if (track) track.onended = function () { setScreen(false); };
            Object.keys(peers).forEach(function (id) { attachTracks(peers[id]); });
            invoke("SetGroupCallScreen", call.callId, true).catch(function () {});
            sendState();
            render();
        }).catch(function () {
            if (token !== screenToken) return;
            screenState = "off";
            render();
        });
    }

    function tileFor(id, className) {
        var faces = document.getElementById("call-faces");
        var tile = document.getElementById("gcall-" + id);
        if (tile) return tile;
        tile = document.createElement("div");
        tile.id = "gcall-" + id;
        if (className === "is-screen") {
            tile.className = "call-face is-screen";
            tile.innerHTML = '<video class="call-screen-tile-video" autoplay playsinline muted></video>' +
                '<div class="call-screen-badge"><span class="call-screen-quality"></span><b>LIVE</b></div>' +
                '<button type="button" class="call-screen-watch">Watch Stream</button>' +
                '<div class="call-tile-name"><i class="fa-solid fa-display"></i><span></span></div>';
        } else {
            tile.className = "call-face" + (className === "is-peer" ? " is-peer" : "");
            tile.innerHTML = '<img alt="">' +
                '<span class="call-mute is-gone"><i class="fa-solid fa-microphone-slash"></i><i class="fa-solid fa-headphones deaf-icon"></i></span>' +
                '<video class="call-tile-video" autoplay playsinline muted></video>' +
                '<div class="call-tile-loading" hidden><span></span><span></span><span></span></div>' +
                '<div class="call-tile-error" hidden><strong>Failed to start camera</strong><small></small></div>' +
                '<div class="call-tile-name"><i class="fa-solid fa-microphone-slash" hidden></i><i class="fa-solid fa-headphones tile-deaf" hidden></i><span></span></div>';
        }
        faces.appendChild(tile);
        return tile;
    }

    function fillTile(tile, info) {
        var video = tile.querySelector("video");
        var showVideo = !!info.stream && info.on && !info.isSelf;
        tile.classList.toggle("has-video", showVideo && !info.isScreen);
        tile.classList.toggle("is-self", !!info.isSelf);
        tile.setAttribute("data-user", info.key);
        var face = tile.querySelector(":scope > img");
        if (face && info.avatar && face.getAttribute("src") !== info.avatar) face.setAttribute("src", info.avatar);
        if (showVideo) {
            if (video.srcObject !== info.stream) video.srcObject = info.stream;
            var playing = video.play();
            if (playing && playing.catch) playing.catch(function () {});
        } else if (video.srcObject) {
            video.srcObject = null;
        }
        tile.querySelector(".call-tile-name span").textContent = info.name;
        if (info.isScreen) {
            tile.querySelector(".call-screen-quality").textContent = info.quality || "";
            return;
        }
        tile.classList.toggle("is-loading", !!info.loading);
        var badge = tile.querySelector(".call-mute");
        badge.classList.toggle("is-gone", !info.muted && !info.deafened);
        badge.classList.toggle("is-deaf", !!info.deafened);
        tile.querySelector(".call-tile-name .fa-microphone-slash").hidden = !info.muted || !!info.deafened;
        tile.querySelector(".tile-deaf").hidden = !info.deafened;
        tile.querySelector(".call-tile-loading").hidden = !info.loading;
        var error = tile.querySelector(".call-tile-error");
        error.hidden = !info.error;
        error.querySelector("small").textContent = info.error ? "Error: " + info.error : "";
        tile.classList.toggle("is-speaking", !!speaking[info.key]);
    }

    function startedMs(dto) {
        var text = String(dto.startedAt);
        return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(text) ? text : text + "Z");
    }

    function joinable() {
        var group = Number(window.discodeOpenGroup);
        var info = group ? active[group] : null;
        return !call && !!info && info.active ? info : null;
    }

    function renderStage() {
        var stage = document.getElementById("call-stage");
        var faces = document.getElementById("call-faces");
        if (!stage || !faces) return;
        var ghost = joinable();
        var here = !!call && onGroupPage(call.groupId);
        var answerBar = document.getElementById("gcall-answer-bar");
        if (answerBar) answerBar.hidden = !ghost;
        var declineButton = document.getElementById("gcall-answer-decline");
        if (declineButton) declineButton.hidden = !!ghost && !!silenced[ghost.callId];
        stage.classList.toggle("is-joinable", !!ghost);
        if (ghost) {
            renderJoinable(stage, faces, ghost);
            return;
        }
        faces.classList.remove("is-me-away");
        stage.hidden = !here;
        if (!here) return;
        var wanted = {};
        var myName = document.querySelector("#user-panel .me-display");
        var me = meName();
        var label = document.getElementById("gcall-label");
        if (label) label.textContent = call.groupName;
        call.participants.forEach(function (person) {
            var isMe = person.userName === me;
            var peer = peers[person.userId];
            var key = isMe ? "me" : person.userId;
            var tile = tileFor("t-" + key, isMe ? "" : "is-peer");
            wanted["gcall-t-" + key] = true;
            var info = isMe
                ? { key: "me", name: (myName ? myName.textContent.trim() : "") || person.displayName, avatar: person.avatarUrl || DEFAULT_AVATAR, muted: audioState.muted, deafened: audioState.deafened, stream: cameraStream, on: cameraState === "on", loading: cameraState === "starting", error: cameraState === "error" ? cameraError || "Unknown" : "" }
                : { key: key, name: person.displayName, avatar: person.avatarUrl || DEFAULT_AVATAR, muted: peer ? peer.state.muted : false, deafened: peer ? peer.state.deafened : false, stream: peer ? peer.camStream : null, on: !!peer && peer.state.camera };
            fillTile(tile, info);
            var sharing = isMe ? (screenState === "on" && !!screenStream) : (!!peer && !!peer.state.screen && !!peer.screenStream);
            if (sharing) {
                var screenTile = tileFor("s-" + key, "is-screen");
                wanted["gcall-s-" + key] = true;
                var quality = isMe ? screenInfo() : peer.state.screen;
                fillTile(screenTile, { key: "screen-" + key, name: info.name, stream: isMe ? screenStream : peer.screenStream, on: true, isScreen: true, quality: quality ? quality.h + "P " + quality.fps + "FPS" : "" });
                if (screenTile.parentNode === faces && screenTile !== faces.firstChild && !screenTile.hasAttribute("data-placed")) {
                    faces.insertBefore(screenTile, faces.firstChild);
                    screenTile.setAttribute("data-placed", "1");
                }
            }
        });
        var ringLeft = RING_MS - (Date.now() - startedMs(call));
        if (ringLeft > 0 && window.discodeGroupInfo && window.discodeGroupInfo.members) {
            clearTimeout(ghostTimer);
            ghostTimer = setTimeout(render, ringLeft + 100);
            window.discodeGroupInfo.members.forEach(function (member) {
                if (member.userName === me) return;
                if (call.participants.some(function (p) { return p.userName === member.userName; })) return;
                var ghostKey = "g-" + member.userName;
                var ghost = tileFor("t-" + ghostKey, "is-peer");
                wanted["gcall-t-" + ghostKey] = true;
                ghost.classList.add("is-waiting");
                fillTile(ghost, { key: ghostKey, name: member.displayName || member.userName, avatar: member.avatarUrl || DEFAULT_AVATAR, muted: false, deafened: false });
            });
        }
        [].slice.call(faces.children).forEach(function (child) {
            if (!wanted[child.id]) {
                var video = child.querySelector("video");
                if (video) video.srcObject = null;
                faces.removeChild(child);
            }
        });
        if (focused && !wanted[focused]) focused = "";
        var tiles = [].slice.call(faces.children);
        var anyVideo = tiles.some(function (tile) { return tile.classList.contains("has-video") || tile.classList.contains("is-screen") || tile.classList.contains("is-loading"); });
        stage.classList.toggle("is-video", anyVideo);
        faces.classList.toggle("is-many", tiles.length > 5);
        stage.classList.toggle("has-screen-tile", tiles.some(function (tile) { return tile.classList.contains("is-screen"); }));
        var focusedTile = focused ? document.getElementById(focused) : null;
        stage.classList.toggle("has-focus", !!focusedTile);
        var wantScreen = !!focusedTile && !focusedTile.classList.contains("is-screen");
        var candidates = focusedTile ? tiles.filter(function (tile) {
            if (tile === focusedTile) return false;
            return wantScreen ? tile.classList.contains("is-screen") : (!tile.classList.contains("is-screen") && tile.classList.contains("has-video"));
        }) : [];
        var mini = candidates.filter(function (tile) { return /-me$/.test(tile.id); })[0] || candidates[0] || null;
        tiles.forEach(function (tile) {
            tile.classList.toggle("is-focused", focused === tile.id);
            tile.classList.toggle("is-mini", tile === mini);
        });
        paintButtons();
    }

    function renderJoinable(stage, faces, info) {
        stage.hidden = false;
        var wanted = {};
        var label = document.getElementById("gcall-label");
        if (label) label.textContent = info.groupName;
        info.participants.forEach(function (person) {
            var tile = tileFor("t-" + person.userId, "is-peer");
            wanted["gcall-t-" + person.userId] = true;
            fillTile(tile, { key: person.userId, name: person.displayName, avatar: person.avatarUrl || DEFAULT_AVATAR, muted: false, deafened: false });
            if (person.screen) {
                var screenTile = tileFor("s-" + person.userId, "is-screen");
                wanted["gcall-s-" + person.userId] = true;
                screenTile.classList.add("is-unwatched");
                fillTile(screenTile, { key: "screen-" + person.userId, name: person.displayName, stream: null, on: false, isScreen: true });
                if (!screenTile.hasAttribute("data-placed")) {
                    faces.insertBefore(screenTile, faces.firstChild);
                    screenTile.setAttribute("data-placed", "1");
                }
            }
        });
        var left = RING_MS - (Date.now() - startedMs(info));
        if (left > 0 && window.discodeGroupInfo && window.discodeGroupInfo.members) {
            window.discodeGroupInfo.members.forEach(function (member) {
                if (info.participants.some(function (p) { return p.userName === member.userName; })) return;
                var ghostKey = "g-" + member.userName;
                var ghost = tileFor("t-" + ghostKey, member.userName === meName() ? "" : "is-peer");
                wanted["gcall-t-" + ghostKey] = true;
                ghost.classList.add("is-waiting");
                fillTile(ghost, { key: ghostKey, name: member.displayName || member.userName, avatar: member.avatarUrl || DEFAULT_AVATAR, muted: false, deafened: false });
            });
            clearTimeout(ghostTimer);
            ghostTimer = setTimeout(render, left + 100);
        }
        [].slice.call(faces.children).forEach(function (child) {
            if (!wanted[child.id]) faces.removeChild(child);
        });
        faces.classList.toggle("is-me-away", !!silenced[info.callId]);
        var tiles = [].slice.call(faces.children);
        var hasScreen = tiles.some(function (tile) { return tile.classList.contains("is-screen"); });
        stage.classList.toggle("is-video", hasScreen);
        stage.classList.toggle("has-screen-tile", hasScreen);
        stage.classList.remove("has-focus");
    }

    function renderSidebar() {
        var widget = document.getElementById("sidebar-call");
        var panel = document.getElementById("user-panel");
        var dm = window.discodeCalls && window.discodeCalls.current && window.discodeCalls.current();
        var dmIn = !!dm && dm.joined !== false;
        if (call) {
            if (widget) {
                widget.hidden = false;
                var connected = call.participants.length <= 1 || Object.keys(peers).some(function (id) { return peers[id].connected; });
                widget.classList.toggle("is-connected", connected);
                document.getElementById("sidebar-call-status").textContent = connected ? "Connected" : "Connecting";
                var link = document.getElementById("sidebar-call-name");
                link.textContent = call.groupName;
                link.setAttribute("href", "/Group/Index?id=" + call.groupId);
                var side = widget.closest(".conversation-sidebar");
                if (side) side.classList.add("has-call");
            }
            if (panel) {
                panel.classList.add("in-call");
                var tag = panel.querySelector(".in-call-label");
                if (tag) tag.hidden = false;
            }
        } else if (!dmIn) {
            if (widget) {
                widget.hidden = true;
                var host = widget.closest(".conversation-sidebar");
                if (host) host.classList.remove("has-call");
            }
            if (panel) {
                panel.classList.remove("in-call");
                var label = panel.querySelector(".in-call-label");
                if (label) label.hidden = true;
            }
        }
    }

    function renderPill() {
        var pill = document.getElementById("gcall-pill");
        var show = false;
        if (!show) {
            if (pill) pill.hidden = true;
            return;
        }
        if (!pill) {
            pill = document.createElement("div");
            pill.id = "gcall-pill";
            pill.className = "gcall-pill";
            pill.innerHTML = '<i class="fa-solid fa-phone"></i><a href="#" id="gcall-pill-link"></a><button type="button" id="gcall-pill-hangup" aria-label="Leave call"><i class="fa-solid fa-phone-slash"></i></button>';
            document.body.appendChild(pill);
            pill.querySelector("#gcall-pill-hangup").addEventListener("click", leave);
            pill.querySelector("#gcall-pill-link").addEventListener("click", function (event) {
                event.preventDefault();
                if (call && window.discodeGo) window.discodeGo("/Group/Index?id=" + call.groupId);
            });
        }
        pill.hidden = false;
        pill.querySelector("#gcall-pill-link").textContent = "In call — " + call.groupName;
    }

    function renderInvite() {
        var invite = document.getElementById("incoming-group-call");
        if (!invite) return;
        var show = !!ringing && !call && !onGroupPage(ringing.groupId);
        invite.hidden = !show;
        if (!show) return;
        document.getElementById("incoming-group-call-avatar").src = ringing.groupIconUrl || ringing.starterAvatarUrl || DEFAULT_AVATAR;
        document.getElementById("incoming-group-call-name").textContent = ringing.groupName;
        document.getElementById("incoming-group-call-kind").textContent = (ringing.video ? "Incoming Group Video Call" : "Incoming Group Call") + " — " + ringing.starterDisplayName;
    }

    function render() {
        renderStage();
        renderSidebar();
        renderPill();
        renderInvite();
        watchAlone();
        document.dispatchEvent(new CustomEvent("discode-gcall-state", { detail: { call: call, active: active } }));
    }

    function watchAlone() {
        var alone = !!call && call.participants.length <= 1;
        if (!alone) {
            clearTimeout(aloneTimer);
            aloneTimer = 0;
            aloneCallId = 0;
            return;
        }
        if (aloneTimer && aloneCallId === call.callId) return;
        clearTimeout(aloneTimer);
        aloneCallId = call.callId;
        aloneTimer = setTimeout(function () {
            aloneTimer = 0;
            if (!call || call.callId !== aloneCallId || call.participants.length > 1) return;
            var groupId = call.groupId;
            try {
                sessionStorage.setItem("discode-group-idle-note", String(groupId));
            } catch (e) {}
            leave();
            document.dispatchEvent(new CustomEvent("discode-gcall-idle", { detail: { groupId: groupId } }));
        }, ALONE_MS);
    }

    function teardown() {
        Object.keys(peers).forEach(closePeer);
        early = {};
        if (localMeter) {
            localMeter.stop();
            localMeter = null;
        }
        markSpeaking("me", false);
        stopCameraStream();
        cameraState = "off";
        cameraError = "";
        stopScreenStream();
        screenState = "off";
        if (localStream) {
            localStream.getTracks().forEach(function (track) { track.stop(); });
            localStream = null;
        }
        micPromise = null;
        mediaCallId = 0;
        focused = "";
        try {
            sessionStorage.removeItem("discode-call-audio");
        } catch (e) {}
    }

    function beginMedia(initial) {
        if (!call || mediaCallId === call.callId) return;
        mediaCallId = call.callId;
        var me = meName();
        var callId = call.callId;
        openMic().then(function (stream) {
            if (!call || call.callId !== callId) return;
            if (!stream) setAudio({ muted: true, deafened: audioState.deafened }, "");
            applyMute();
            (initial.participants || []).forEach(function (person) {
                if (person.userName !== me) offerTo(person.userId);
            });
        });
    }

    function adopt(dto, joinedNow) {
        var previous = call;
        call = dto;
        delete active[dto.groupId];
        active[dto.groupId] = dto;
        if (ringing && ringing.callId === dto.callId) {
            ringing = null;
            stopRing();
        }
        if (joinedNow) {
            play(joinSound);
            beginMedia(dto);
        }
        render();
        return previous;
    }

    function leaveDmCall() {
        var dm = window.discodeCalls && window.discodeCalls.current && window.discodeCalls.current();
        if (dm && dm.joined !== false) window.discodeCalls.end();
    }

    function begin(promise, video) {
        leaveDmCall();
        audioState = readSidebar();
        return promise.then(function (dto) {
            stopRing();
            ringing = null;
            if (dto.participants.length <= 1) {
                ringUntil = Date.now() + RING_MS;
                clearTimeout(ghostTimer);
                ghostTimer = setTimeout(render, RING_MS + 100);
            }
            adopt(dto, true);
            if (dto.participants.length <= 1) {
                ringtone.volume = 0.5;
                play(ringtone);
                clearTimeout(ringTimer);
                ringTimer = setTimeout(stopRing, RING_MS);
            }
            if (video) setCamera(true);
            return dto;
        }).catch(function (error) {
            throw new Error(clean(error));
        });
    }

    function start(groupId, video) {
        if (call && call.groupId === groupId) return Promise.resolve(call);
        var existing = active[groupId];
        if (existing && existing.active) return join(existing.callId, video);
        return begin(invoke("StartGroupCall", groupId, !!video), video);
    }

    function join(callId, video) {
        if (call && call.callId === callId) return Promise.resolve(call);
        return begin(invoke("JoinGroupCall", callId), video);
    }

    function leave() {
        if (!call) return;
        var leaving = call;
        stopRing();
        play(leaveSound);
        teardown();
        call = null;
        render();
        invoke("LeaveGroupCall", leaving.callId).catch(function () {});
    }

    function accept() {
        if (!ringing) return;
        var target = ringing;
        stopRing();
        ringing = null;
        join(target.callId, false).then(function () {
            if (!onGroupPage(target.groupId) && window.discodeGo) window.discodeGo("/Group/Index?id=" + target.groupId);
        }).catch(function () { render(); });
        render();
    }

    function decline() {
        stopRing();
        if (ringing) silenced[ringing.callId] = true;
        ringing = null;
        render();
    }

    document.addEventListener("discode-gcall-incoming", function (event) {
        var dto = event.detail;
        if (!dto || call) return;
        active[dto.groupId] = dto;
        ringing = dto;
        ringtone.volume = 1;
        play(ringtone);
        clearTimeout(ringTimer);
        ringTimer = setTimeout(decline, RING_MS);
        render();
    });

    document.addEventListener("discode-gcall-updated", function (event) {
        var dto = event.detail;
        if (!dto) return;
        if (!dto.active) {
            delete active[dto.groupId];
            delete silenced[dto.callId];
        }
        else active[dto.groupId] = dto;
        if (ringing && ringing.callId === dto.callId && (!dto.active || dto.participants.length === 0)) {
            ringing = null;
            stopRing();
        }
        if (call && call.callId === dto.callId) {
            var me = meName();
            var still = dto.active && dto.participants.some(function (p) { return p.userName === me; });
            if (!still) {
                stopRing();
                teardown();
                call = null;
                play(leaveSound);
            } else {
                var before = call.participants.map(function (p) { return p.userId; });
                var after = dto.participants.map(function (p) { return p.userId; });
                var mine = dto.participants.filter(function (p) { return p.userName === me; })[0];
                before.filter(function (id) { return after.indexOf(id) === -1; }).forEach(function (id) {
                    closePeer(id);
                    play(leaveSound);
                });
                after.filter(function (id) { return before.indexOf(id) === -1 && id !== (mine && mine.userId); }).forEach(function () { play(joinSound); });
                call = dto;
                if (dto.participants.length > 1) stopRing();
            }
        }
        render();
    });

    document.addEventListener("discode-gcall-signal", function (event) {
        handleSignal(event.detail);
    });

    document.addEventListener("discode-hub-connected", function (event) {
        var swap = event.detail && event.detail.pageSwap;
        if (swap && isReady) return;
        invoke("GetGroupCalls").then(function (list) {
            active = {};
            (list || []).forEach(function (dto) { active[dto.groupId] = dto; });
            return invoke("GetMyGroupCall");
        }).then(function (mine) {
            if (mine && !call) {
                audioState = readSidebar();
                invoke("JoinGroupCall", mine.callId).then(function (dto) { adopt(dto, true); }).catch(function () {});
            }
        }).catch(function () {}).then(function () {
            isReady = true;
            readyCallbacks.splice(0).forEach(function (callback) { callback(); });
            render();
        });
    });

    function refreshActive() {
        if (!window.discodePresence) return;
        invoke("GetGroupCalls").then(function (list) {
            var next = {};
            (list || []).forEach(function (dto) { next[dto.groupId] = dto; });
            active = next;
            render();
        }).catch(function () {});
    }

    ["discode-group-updated", "discode-groups-changed"].forEach(function (name) {
        document.addEventListener(name, function () { setTimeout(refreshActive, 300); });
    });
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) refreshActive();
    });

    function bindPage() {
        micIcon = document.getElementById("mic");
        headIcon = document.getElementById("head");
        headButton = document.getElementById("headp-btn");
        watchSidebar();
        var accept1 = document.getElementById("incoming-group-call-accept");
        if (accept1) accept1.addEventListener("click", accept);
        var decline1 = document.getElementById("incoming-group-call-decline");
        if (decline1) decline1.addEventListener("click", decline);
        var sideHang = document.getElementById("sidebar-call-hangup");
        if (sideHang) sideHang.addEventListener("click", function () { if (call) leave(); });
        var hangup = document.getElementById("call-hangup");
        if (!hangup) return;
        hangup.addEventListener("click", leave);
        document.getElementById("gcall-answer-video").addEventListener("click", function () { joinFromStage(true); });
        document.getElementById("gcall-answer-voice").addEventListener("click", function () { joinFromStage(false); });
        document.getElementById("gcall-answer-decline").addEventListener("click", function () {
            var info = joinable();
            if (info) silenced[info.callId] = true;
            stopRing();
            ringing = null;
            render();
        });
        document.getElementById("call-faces").addEventListener("click", function (event) {
            if (event.target.closest(".call-screen-watch")) {
                joinFromStage(false);
                return;
            }
            var tile = event.target.closest(".call-face");
            if (!tile || !call) return;
            var canFocus = tile.classList.contains("has-video") || tile.classList.contains("is-screen") || !!focused;
            if (!canFocus) return;
            focused = focused === tile.id ? "" : tile.id;
            renderStage();
        });
    }

    function joinFromStage(video) {
        var info = joinable();
        if (!info) return;
        join(info.callId, video).catch(function () {});
    }

    document.addEventListener("discode-call-mic", function (event) {
        if (!call) return;
        setAudio({ muted: !!event.detail.muted, deafened: audioState.deafened && !!event.detail.muted }, "stage");
    });

    document.addEventListener("discode-call-deafen", function (event) {
        if (!call) return;
        setAudio({ muted: audioState.muted, deafened: !!event.detail.deafened }, "stage");
    });

    document.addEventListener("discode-call-camera", function (event) {
        if (call) setCamera(!!event.detail.on);
    });

    document.addEventListener("discode-call-screen", function (event) {
        if (call) setScreen(!!event.detail.on);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && focused) {
            focused = "";
            renderStage();
        }
    });

    bindPage();

    document.addEventListener("discode-page-ready", function () {
        bindPage();
        refreshActive();
        if (call) {
            paintSidebar();
            applyMute();
        }
        render();
    });

    window.discodeGroupCalls = {
        current: function () { return call; },
        activeFor: function (groupId) { return active[groupId] || null; },
        start: start,
        join: join,
        leave: leave,
        isReady: function () { return isReady; },
        peers: function () {
            var result = {};
            Object.keys(peers).forEach(function (id) { result[id] = peers[id].pc ? peers[id].pc.connectionState : "none"; });
            return result;
        },
        ready: function (callback) {
            if (isReady) callback();
            else readyCallbacks.push(callback);
        }
    };
})();
