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

    var micIcon = document.getElementById("mic");
    var headIcon = document.getElementById("head");
    var headButton = document.getElementById("headp-btn");

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

    if (micIcon || headIcon) {
        var watcher = new MutationObserver(function () {
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
        sendSignal("mute", { muted: micIsMuted(), deafened: audioState.deafened });
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
    }

    function ensureRemoteAudio() {
        if (remoteAudio) return remoteAudio;
        remoteAudio = document.createElement("audio");
        remoteAudio.autoplay = true;
        remoteAudio.hidden = true;
        document.body.appendChild(remoteAudio);
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
        if (remoteAudio) remoteAudio.srcObject = null;
    }

    function teardownMedia() {
        closePeer();
        if (localMeter) {
            localMeter.stop();
            localMeter = null;
        }
        setSpeaking("me", false);
        if (localStream) {
            localStream.getTracks().forEach(function (track) { track.stop(); });
            localStream = null;
        }
        micPromise = null;
        mediaCallId = "";
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

    function createPeer() {
        closePeer();
        peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peer.onicecandidate = function (event) {
            if (event.candidate) sendSignal("candidate", { candidate: event.candidate });
        };
        peer.onconnectionstatechange = function () {
            voiceConnected = !!peer && peer.connectionState === "connected";
            render();
        };
        peer.ontrack = function (event) {
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
        return peer;
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
            var connection = createPeer();
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
            var connection = createPeer();
            return connection.setRemoteDescription(description).then(function () {
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
            showPeerMuted(!!data.muted, !!data.deafened);
        }
    }

    function render() {
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

    document.addEventListener("discode-hub-connected", function () {
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
            if (!onDmPageOf(call)) window.location.href = "/Dm/Index?name=" + encodeURIComponent(call.other.userName);
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

    loadAudio();

    document.getElementById("incoming-call-accept").addEventListener("click", accept);
    document.getElementById("incoming-call-decline").addEventListener("click", decline);
    var sidebarHangup = document.getElementById("sidebar-call-hangup");
    if (sidebarHangup) sidebarHangup.addEventListener("click", end);

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
                    speakerMuted: !!remoteAudio && remoteAudio.muted
                };
            });
        }
    };
})();
