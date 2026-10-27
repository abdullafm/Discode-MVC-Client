(function () {
    "use strict";

    var voice = window.discodeVoice;
    if (!voice) return;

    var ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

    var peers = {};
    var early = {};
    var localStream = null;
    var micPromise = null;
    var cameraStream = null;
    var screenStream = null;
    var localMeter = null;
    var meterContext = null;
    var speaking = {};
    var activeChannel = 0;
    var selfId = "";
    var audioState = { muted: false, deafened: false };
    var media = { camera: false, screen: false };

    function invoke() {
        if (!window.discodePresence) return Promise.reject(new Error("Live connection is not ready yet."));
        return window.discodePresence.invoke.apply(null, arguments);
    }

    function signal(userId, type, data) {
        var body = { type: type };
        Object.keys(data || {}).forEach(function (key) { body[key] = data[key]; });
        invoke("SendServerVoiceSignal", userId, JSON.stringify(body)).catch(function () {});
    }

    function stateBody() {
        return { camera: media.camera, screen: media.screen };
    }

    function sendStateTo(userId) {
        signal(userId, "state", stateBody());
    }

    function sendState() {
        Object.keys(peers).forEach(sendStateTo);
    }

    function meterContextOf() {
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
        var context = meterContextOf();
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

    function markSpeaking(userId, on) {
        if (!userId) return;
        speaking[userId] = !!on;
        paintSpeaking();
    }

    function paintSpeaking() {
        [].forEach.call(document.querySelectorAll("[data-user]"), function (node) {
            node.classList.toggle("is-speaking", !!speaking[node.getAttribute("data-user")]);
        });
    }

    function applyAudio() {
        var silent = audioState.muted || audioState.deafened;
        if (localStream) localStream.getAudioTracks().forEach(function (track) { track.enabled = !silent; });
        Object.keys(peers).forEach(function (id) {
            if (peers[id].audio) peers[id].audio.muted = audioState.deafened;
        });
        if (silent && selfId) markSpeaking(selfId, false);
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
                if (selfId) markSpeaking(selfId, on && !audioState.muted && !audioState.deafened);
            });
            applyAudio();
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
            state: { camera: false, screen: false }
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
        attach();
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
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                if (peers[peer.userId] === peer) {
                    closePeer(peer.userId);
                    setTimeout(ensure, 1500);
                }
            }
        };
        pc.ontrack = function (event) {
            if (event.track.kind === "video") {
                var videos = pc.getTransceivers().filter(function (item) { return item.receiver.track && item.receiver.track.kind === "video"; });
                if (videos.indexOf(event.transceiver) === 1) peer.screenStream = new MediaStream([event.track]);
                else peer.camStream = new MediaStream([event.track]);
                attach();
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
            applyAudio();
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
            applyAudio();
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
        if (!message || !voice.here()) return;
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
            peer.state = { camera: !!data.camera, screen: !!data.screen };
            attach();
        }
    }

    function setVideo(video, stream) {
        if (!video) return;
        if (video.srcObject === stream) return;
        video.srcObject = stream || null;
        if (stream) {
            var playing = video.play();
            if (playing && playing.catch) playing.catch(function () {});
        }
    }

    function screenTile(owner, stream) {
        var id = owner.getAttribute("data-user");
        var tile = document.querySelector('.server-voice-tile.is-screen[data-for="' + id + '"]');
        if (!tile) {
            tile = document.createElement("div");
            tile.className = "server-voice-tile is-screen";
            tile.setAttribute("data-for", id);
            var video = document.createElement("video");
            video.className = "server-voice-screen";
            video.autoplay = true;
            video.muted = true;
            video.setAttribute("playsinline", "");
            var badge = document.createElement("span");
            badge.className = "server-voice-badge";
            badge.textContent = "LIVE";
            tile.appendChild(video);
            tile.appendChild(badge);
            tile.appendChild(document.createElement("p"));
            owner.insertAdjacentElement("afterend", tile);
        }
        var label = owner.querySelector("p");
        tile.querySelector("p").textContent = label ? label.textContent : "";
        setVideo(tile.querySelector("video"), stream);
    }

    function attach() {
        var wanted = {};
        var ownTile = document.getElementById("server-voice-tile");
        if (ownTile) {
            ownTile.classList.toggle("has-cam", media.camera);
            setVideo(document.getElementById("server-voice-cam-video"), media.camera ? cameraStream : null);
            setVideo(document.getElementById("server-voice-screen-video"), media.screen ? screenStream : null);
            if (media.screen && screenStream && ownTile.getAttribute("data-user")) {
                wanted[ownTile.getAttribute("data-user")] = true;
                screenTile(ownTile, screenStream);
            }
        }
        [].forEach.call(document.querySelectorAll(".server-voice-tile.is-peer"), function (tile) {
            var peer = peers[tile.getAttribute("data-user")];
            var cam = !!peer && peer.state.camera && !!peer.camStream;
            var screen = !!peer && peer.state.screen && !!peer.screenStream;
            tile.classList.toggle("has-cam", cam);
            setVideo(tile.querySelector(".server-voice-cam-video"), cam ? peer.camStream : null);
            if (screen) {
                wanted[tile.getAttribute("data-user")] = true;
                screenTile(tile, peer.screenStream);
            }
        });
        [].forEach.call(document.querySelectorAll(".server-voice-tile.is-screen"), function (tile) {
            if (!wanted[tile.getAttribute("data-for")]) tile.remove();
        });
        paintSpeaking();
        document.dispatchEvent(new CustomEvent("discode-voice-media"));
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(function (track) { track.stop(); });
            cameraStream = null;
        }
        Object.keys(peers).forEach(function (id) {
            if (peers[id].videoSender) peers[id].videoSender.replaceTrack(null).catch(function () {});
        });
        media.camera = false;
    }

    function stopScreen() {
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
        media.screen = false;
    }

    function fail(text) {
        if (window.discodeServerFlash) window.discodeServerFlash(text);
    }

    function setCamera(on) {
        if (!on) {
            stopCamera();
            sendState();
            attach();
            return;
        }
        if (!voice.here() || media.camera) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            fail("Your browser can't use the camera.");
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (stream) {
            if (!voice.here()) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            cameraStream = stream;
            media.camera = true;
            Object.keys(peers).forEach(function (id) { attachTracks(peers[id]); });
            sendState();
            attach();
        }).catch(function () {
            fail("Couldn't turn on the camera. Check that it's connected and allowed.");
        });
    }

    function setScreen(on) {
        if (!on) {
            stopScreen();
            sendState();
            attach();
            return;
        }
        if (!voice.here() || media.screen) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            fail("Your browser can't share the screen.");
            return;
        }
        navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false }).then(function (stream) {
            if (!voice.here()) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            screenStream = stream;
            media.screen = true;
            var track = stream.getVideoTracks()[0];
            if (track) track.onended = function () { setScreen(false); };
            Object.keys(peers).forEach(function (id) { attachTracks(peers[id]); });
            sendState();
            attach();
        }).catch(function () {});
    }

    function teardown() {
        Object.keys(peers).forEach(closePeer);
        early = {};
        stopCamera();
        stopScreen();
        if (localMeter) {
            localMeter.stop();
            localMeter = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(function (track) { track.stop(); });
            localStream = null;
        }
        micPromise = null;
        activeChannel = 0;
        selfId = "";
        speaking = {};
        attach();
    }

    function ensure() {
        var roster = voice.roster();
        if (!roster) {
            if (activeChannel || Object.keys(peers).length || localStream) teardown();
            return;
        }
        if (roster.channelId !== activeChannel) {
            Object.keys(peers).forEach(closePeer);
            early = {};
            activeChannel = roster.channelId;
        }
        selfId = roster.selfId;
        openMic();
        var others = {};
        roster.users.forEach(function (user) {
            if (user.userId !== selfId) others[user.userId] = true;
        });
        Object.keys(peers).forEach(function (id) {
            if (!others[id]) closePeer(id);
        });
        Object.keys(others).forEach(function (id) {
            if (!peers[id] && selfId > id) offerTo(id);
        });
    }

    document.addEventListener("discode-voice-updated", ensure);
    document.addEventListener("discode-voice-painted", attach);
    document.addEventListener("discode-voice-audio", function (event) {
        var detail = event.detail || {};
        audioState = { muted: !!detail.muted, deafened: !!detail.deafened };
        applyAudio();
    });
    document.addEventListener("discode-server-voice-signal", function (event) { handleSignal(event.detail); });
    window.addEventListener("beforeunload", function () {
        Object.keys(peers).forEach(function (id) { if (peers[id].pc) peers[id].pc.close(); });
    });

    window.discodeVoiceRtc = {
        setCamera: setCamera,
        setScreen: setScreen,
        media: function () { return { camera: media.camera, screen: media.screen }; }
    };

    ensure();
})();
