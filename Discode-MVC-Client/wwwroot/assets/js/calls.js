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
        return controls() ? controls().isMuted() : true;
    }

    function sendSignal(type, data) {
        if (!state) return;
        var body = { type: type };
        Object.keys(data || {}).forEach(function (key) { body[key] = data[key]; });
        invoke("SendCallSignal", state.callId, JSON.stringify(body)).catch(function () {});
    }

    function sendMuteState() {
        sendSignal("mute", { muted: micIsMuted() });
    }

    function applyMute() {
        if (!localStream) return;
        var muted = micIsMuted();
        localStream.getAudioTracks().forEach(function (track) { track.enabled = !muted; });
    }

    function showPeerMuted(muted) {
        var badge = document.getElementById("call-peer-mute");
        if (badge) badge.classList.toggle("is-gone", !muted);
    }

    function ensureRemoteAudio() {
        if (remoteAudio) return remoteAudio;
        remoteAudio = document.createElement("audio");
        remoteAudio.autoplay = true;
        remoteAudio.hidden = true;
        document.body.appendChild(remoteAudio);
        return remoteAudio;
    }

    function closePeer() {
        if (peer) {
            peer.onicecandidate = null;
            peer.ontrack = null;
            peer.close();
            peer = null;
        }
        pendingCandidates = [];
        if (remoteAudio) remoteAudio.srcObject = null;
    }

    function teardownMedia() {
        closePeer();
        if (localStream) {
            localStream.getTracks().forEach(function (track) { track.stop(); });
            localStream = null;
        }
        micPromise = null;
        mediaCallId = "";
        showPeerMuted(false);
    }

    function openMic() {
        if (micPromise) return micPromise;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            micPromise = Promise.resolve(null);
            return micPromise;
        }
        micPromise = navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            localStream = stream;
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
        peer.ontrack = function (event) {
            var audio = ensureRemoteAudio();
            audio.srcObject = event.streams[0] || new MediaStream([event.track]);
            var deafened = controls() && document.getElementById("call-deafen") && document.getElementById("call-deafen").classList.contains("is-off");
            audio.muted = !!deafened;
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
            if (controls()) controls().setMuted(!stream);
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
            showPeerMuted(!!data.muted);
        }
    }

    function render() {
        var incoming = !!state && state.status === "ringing" && state.role === "callee";
        invite.hidden = !incoming;
        if (incoming) {
            document.getElementById("incoming-call-avatar").src = state.other.avatarUrl || "/assets/img/img-icon-profile.jpeg";
            document.getElementById("incoming-call-name").textContent = name(state);
            document.getElementById("incoming-call-kind").textContent = state.video ? "Incoming Video Call" : "Incoming Voice Call";
        }

        var inCall = !!state && !incoming;
        if (sidebarCall) {
            sidebarCall.hidden = !inCall;
            if (inCall) {
                var connected = state.status === "active";
                sidebarCall.classList.toggle("is-connected", connected);
                document.getElementById("sidebar-call-status").textContent = connected ? "Voice Connected" : "Connecting";
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
        }
        render();
        emit(reason, previous);
    }

    function finishSync(call) {
        if (call) {
            state = call;
            if (call.status === "ringing" && call.role === "callee") startRing(1);
            if (call.status === "active") beginMedia(call);
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
        if (!state || !data || state.callId !== data.callId) return;
        play(leaveSound);
        setState(null, data.reason);
    });

    document.addEventListener("discode-call-signal", function (event) {
        handleSignal(event.detail);
    });

    document.addEventListener("discode-call-mic", function () {
        applyMute();
        if (state && state.status === "active") sendMuteState();
    });

    document.addEventListener("discode-call-deafen", function (event) {
        if (remoteAudio) remoteAudio.muted = !!event.detail.deafened;
    });

    function start(userName, video) {
        return invoke("StartCall", userName, !!video).then(function (call) {
            state = call;
            startRing(0.5);
            ringTimer = setTimeout(function () {
                if (state && state.callId === call.callId && state.status === "ringing") invoke("EndCall", call.callId, true).catch(function () {});
            }, RING_MS);
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

    function decline() {
        if (!state) return;
        invoke("DeclineCall", state.callId).catch(function () {});
        setState(null, "");
    }

    function end() {
        if (!state) return;
        invoke("EndCall", state.callId, false).catch(function () {});
        play(leaveSound);
        setState(null, "");
    }

    document.getElementById("incoming-call-accept").addEventListener("click", accept);
    document.getElementById("incoming-call-decline").addEventListener("click", decline);
    var sidebarHangup = document.getElementById("sidebar-call-hangup");
    if (sidebarHangup) sidebarHangup.addEventListener("click", end);

    window.discodeCalls = {
        current: function () { return state; },
        start: start,
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
                return { connection: peer.connectionState, receivedBytes: bytes, micOpen: !!localStream };
            });
        }
    };
})();
