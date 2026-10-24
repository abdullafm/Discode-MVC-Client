"use strict";

(function () {
    if (!document.getElementById("live-create-modal")) return;

    var ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    var DRAW_MS = 33;
    var GRADIENTS = {
        "Gaming": "linear-gradient(135deg, #1a0536, #5b1a8a 55%, #e1306c)",
        "Music": "linear-gradient(135deg, #04252c, #0f766e 55%, #5eead4)",
        "Science & Tech": "linear-gradient(135deg, #04140a, #14532d 55%, #4ade80)",
        "Entertainment": "linear-gradient(135deg, #2a0a1c, #9d174d 55%, #fb923c)",
        "Education": "linear-gradient(135deg, #0b1b3a, #1d4ed8 55%, #67e8f9)",
        "Student Hubs": "linear-gradient(135deg, #2b1a05, #b45309 55%, #fde047)"
    };

    var liveStreams = [];
    var liveCategory = "All";
    var heroIndex = 0;
    var broadcast = null;
    var watching = null;
    var notice = "";
    var capture = { camera: null, screen: null, camVideo: makeVideo(), scrVideo: makeVideo(), timer: 0 };

    function makeVideo() {
        var video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        return video;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function hub() {
        var presence = window.discodePresence;
        if (!presence || !presence.invoke) return Promise.reject(new Error("Live connection is not ready yet."));
        return presence.invoke.apply(presence, arguments);
    }

    function hubMessage(err) {
        var text = (err && err.message) || "Something went wrong.";
        var marker = "HubException: ";
        var at = text.indexOf(marker);
        return at >= 0 ? text.slice(at + marker.length) : text;
    }

    function element(tag, className, text) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    var confirmDone = null;

    function askConfirm(title, text, okLabel, single) {
        if (confirmDone) confirmDone(false);
        byId("confirm-title").textContent = title;
        byId("confirm-text").textContent = text;
        byId("confirm-ok").textContent = okLabel || "OK";
        byId("confirm-cancel").hidden = !!single;
        byId("confirm-modal").hidden = false;
        byId("confirm-ok").focus();
        return new Promise(function (resolve) {
            confirmDone = function (answer) {
                confirmDone = null;
                byId("confirm-modal").hidden = true;
                resolve(answer);
            };
        });
    }

    byId("confirm-ok").addEventListener("click", function () {
        if (confirmDone) confirmDone(true);
    });
    byId("confirm-cancel").addEventListener("click", function () {
        if (confirmDone) confirmDone(false);
    });
    byId("confirm-backdrop").addEventListener("click", function () {
        if (confirmDone) confirmDone(false);
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && confirmDone) confirmDone(false);
    });

    function viewerText(count) {
        return count >= 1000 ? (count / 1000).toFixed(1) + "K" : String(count);
    }

    function gradientFor(category) {
        return GRADIENTS[category] || GRADIENTS["Gaming"];
    }

    function hostName(stream) {
        return stream.hostDisplayName || stream.hostUserName;
    }

    /* ---------------- list ---------------- */

    function refreshLive() {
        return requestJson("/Home/LiveStreams").then(function (data) {
            liveStreams = Array.isArray(data) ? data : [];
            renderLive();
            if (typeof openWantedLive === "function") openWantedLive();
        }).catch(function () {});
    }

    window.discodeLiveRefresh = refreshLive;

    function buildCard(stream) {
        var item = element("button", "live-drawer-item");
        item.type = "button";
        item.setAttribute("data-stream-id", stream.id);

        var preview = element("div", "live-drawer-preview live-thumb");
        preview.style.background = gradientFor(stream.category);
        if (stream.thumbnailUrl) {
            var shot = element("img", "live-thumb-image");
            shot.src = stream.thumbnailUrl;
            shot.alt = "";
            preview.appendChild(shot);
        } else {
            var face = element("img", "live-thumb-avatar");
            face.src = stream.hostAvatarUrl || DEFAULT_AVATAR;
            face.alt = "";
            preview.appendChild(face);
        }
        preview.appendChild(element("span", "live-drawer-live-badge", "LIVE"));
        var viewers = element("span", "live-drawer-viewers");
        viewers.innerHTML = '<i class="fa-solid fa-eye"></i> ' + viewerText(stream.viewerCount);
        preview.appendChild(viewers);

        var body = element("div", "live-drawer-body");
        var avatar = element("img", "live-drawer-avatar");
        avatar.src = stream.hostAvatarUrl || DEFAULT_AVATAR;
        avatar.alt = "";
        var meta = element("div", "live-drawer-meta");
        meta.appendChild(element("h3", "live-drawer-title", stream.title));
        meta.appendChild(element("strong", "live-drawer-streamer-name", hostName(stream)));
        meta.appendChild(element("span", "live-drawer-sub", stream.category + " • " + (stream.isMine ? "Your stream" : timeAgo(utcMillis(stream.startedAt)))));
        body.appendChild(avatar);
        body.appendChild(meta);

        item.appendChild(preview);
        item.appendChild(body);
        item.addEventListener("click", function () {
            openStream(stream);
        });
        return item;
    }

    function renderHero(friends) {
        var hero = byId("live-hero");
        var countText = byId("live-friends-count");
        var emptyBox = byId("live-friends-empty");
        while (hero.firstChild) hero.removeChild(hero.firstChild);
        hero.hidden = !friends.length;
        emptyBox.hidden = friends.length > 0;
        countText.textContent = friends.length ? friends.length + " live" : "";
        if (!friends.length) return;

        if (heroIndex >= friends.length) heroIndex = 0;
        if (heroIndex < 0) heroIndex = friends.length - 1;
        var stream = friends[heroIndex];

        var bg = element("div", "live-hero-bg");
        bg.style.background = gradientFor(stream.category);
        var blur = element("img", stream.thumbnailUrl ? "live-hero-shot" : "live-hero-blur");
        blur.src = stream.thumbnailUrl || stream.hostAvatarUrl || DEFAULT_AVATAR;
        blur.alt = "";
        bg.appendChild(blur);
        hero.appendChild(bg);
        hero.appendChild(element("div", "live-hero-shade"));
        hero.appendChild(element("strong", "live-hero-badge", "LIVE"));

        var info = element("div", "live-hero-info");
        info.appendChild(element("h2", "live-hero-title", stream.title));
        var who = element("div", "live-hero-who");
        var avatar = element("img");
        avatar.src = stream.hostAvatarUrl || DEFAULT_AVATAR;
        avatar.alt = "";
        var whoText = element("div");
        whoText.appendChild(element("strong", "", hostName(stream)));
        whoText.appendChild(element("p", "", viewerText(stream.viewerCount) + " watching"));
        who.appendChild(avatar);
        who.appendChild(whoText);
        info.appendChild(who);
        hero.appendChild(info);

        var watch = element("button", "live-hero-watch");
        watch.type = "button";
        watch.innerHTML = '<i class="fa-solid fa-tower-broadcast"></i> Click to watch LIVE';
        hero.appendChild(watch);

        if (friends.length > 1) {
            var nav = element("div", "live-hero-nav");
            var prev = element("button");
            prev.type = "button";
            prev.setAttribute("data-hero", "-1");
            prev.setAttribute("aria-label", "Previous");
            prev.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
            var next = element("button");
            next.type = "button";
            next.setAttribute("data-hero", "1");
            next.setAttribute("aria-label", "Next");
            next.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
            nav.appendChild(prev);
            nav.appendChild(element("p", "", (heroIndex + 1) + " / " + friends.length));
            nav.appendChild(next);
            hero.appendChild(nav);
        }

        hero.onclick = function (event) {
            var step = event.target.closest("[data-hero]");
            if (step) {
                heroIndex += Number(step.getAttribute("data-hero"));
                renderLive();
                return;
            }
            openStream(stream);
        };
    }

    function renderChips() {
        var box = byId("live-chips");
        while (box.firstChild) box.removeChild(box.firstChild);
        var names = ["All"];
        liveStreams.forEach(function (stream) {
            if (names.indexOf(stream.category) === -1) names.push(stream.category);
        });
        if (names.indexOf(liveCategory) === -1) liveCategory = "All";
        names.forEach(function (name) {
            var chip = element("button", "live-chip" + (name === liveCategory ? " active" : ""), name);
            chip.type = "button";
            chip.setAttribute("data-category", name);
            box.appendChild(chip);
        });
    }

    byId("live-chips").addEventListener("click", function (event) {
        var chip = event.target.closest("[data-category]");
        if (!chip) return;
        liveCategory = chip.getAttribute("data-category");
        heroIndex = 0;
        renderLive();
    });

    function renderLive() {
        var list = byId("live-streams-list");
        var badge = byId("live-count-badge");
        if (badge) badge.textContent = String(liveStreams.length);
        while (list.firstChild) list.removeChild(list.firstChild);

        byId("live-streams-empty").hidden = liveStreams.length > 0;
        var heads = document.querySelectorAll("#view-live .live-section-head");
        for (var i = 0; i < heads.length; i++) heads[i].hidden = !liveStreams.length;
        byId("live-chips").hidden = !liveStreams.length;
        if (!liveStreams.length) {
            byId("live-hero").textContent = "";
            byId("live-hero").hidden = true;
            byId("live-friends-empty").hidden = true;
            return;
        }

        renderChips();
        var shown = liveStreams.filter(function (stream) {
            return liveCategory === "All" || stream.category === liveCategory;
        });
        renderHero(shown.filter(function (stream) { return stream.isFriend; }));
        shown.filter(function (stream) { return !stream.isFriend; }).forEach(function (stream) {
            list.appendChild(buildCard(stream));
        });
    }

    /* ---------------- watch dialog ---------------- */

    function appendChat(author, avatar, text) {
        var feed = byId("live-chat-feed");
        var line = element("div", "watch-msg");
        var face = element("img");
        face.src = avatar || DEFAULT_AVATAR;
        face.alt = "";
        var body = element("div");
        body.appendChild(element("strong", "", author));
        body.appendChild(element("p", "", text));
        line.appendChild(face);
        line.appendChild(body);
        feed.appendChild(line);
        feed.scrollTop = feed.scrollHeight;
    }

    function appendJoin(name, avatar) {
        var feed = byId("live-chat-feed");
        var line = element("div", "watch-join");
        var face = element("img");
        face.src = avatar || DEFAULT_AVATAR;
        face.alt = "";
        var text = element("p");
        text.appendChild(element("strong", "", name));
        text.appendChild(document.createTextNode(" joined"));
        line.appendChild(face);
        line.appendChild(text);
        feed.appendChild(line);
        feed.scrollTop = feed.scrollHeight;

        var visibleFor = 5000 + Math.random() * 5000;
        setTimeout(function () {
            line.classList.add("leaving");
            setTimeout(function () {
                if (line.parentNode) line.parentNode.removeChild(line);
            }, 450);
        }, visibleFor);
    }

    function spawnHeart() {
        var zone = byId("live-floating-reactions");
        var colors = ["#ff3040", "#fc5c7d", "#ff8a00", "#e1306c", "#c13584", "#ffd200"];
        var heart = element("div", "ig-floating-heart");
        heart.style.color = colors[Math.floor(Math.random() * colors.length)];
        heart.innerHTML = '<i class="fa-solid fa-heart"></i>';
        heart.style.right = (8 + Math.floor(Math.random() * 26)) + "px";
        zone.appendChild(heart);
        setTimeout(function () {
            if (heart.parentNode) heart.parentNode.removeChild(heart);
        }, 2200);
    }

    function setWait(text) {
        var wait = byId("live-watch-wait");
        wait.hidden = !text;
        byId("live-watch-wait-text").textContent = text || "";
    }

    function showWatchDialog(stream, mine) {
        var video = byId("live-stream-video");
        byId("live-watch-modal").hidden = false;
        byId("live-watch-title").textContent = stream.title;
        byId("live-streamer-name").textContent = hostName(stream);
        byId("live-streamer-avatar").src = stream.hostAvatarUrl || DEFAULT_AVATAR;
        byId("live-viewers-count").textContent = viewerText(stream.viewerCount);
        byId("live-btn-end").hidden = !mine;
        byId("live-chat-feed").textContent = "";
        video.muted = mine;
        video.srcObject = null;
        byId("live-mute-btn").querySelector("i").className = "fa-solid " + (mine ? "fa-volume-xmark" : "fa-volume-high");
        setWait(mine ? "" : "Connecting to the stream...");
    }

    function openStream(stream) {
        if (stream.isMine) {
            if (broadcast && broadcast.streamId === stream.id) {
                showWatchDialog(stream, true);
                byId("live-stream-video").srcObject = broadcast.stream;
                byId("live-stream-video").play().catch(function () {});
            }
            return;
        }

        leaveWatching();
        watching = { stream: stream, pc: null, pending: [] };
        showWatchDialog(stream, false);
        hub("JoinLive", stream.id).then(function (join) {
            if (!watching || watching.stream.id !== stream.id) return;
            watching.stream = join.stream;
            byId("live-viewers-count").textContent = viewerText(join.stream.viewerCount);
        }).catch(function (err) {
            if (watching && watching.stream.id === stream.id) setWait(hubMessage(err));
        });
    }

    function leaveWatching() {
        if (!watching) return;
        var current = watching;
        watching = null;
        if (current.pc) current.pc.close();
        hub("LeaveLive", current.stream.id).catch(function () {});
        var video = byId("live-stream-video");
        video.srcObject = null;
    }

    function finishClose() {
        leaveWatching();
        byId("live-watch-modal").hidden = true;
        byId("live-stream-video").srcObject = null;
    }

    function closeWatchDialog() {
        if (broadcast && !byId("live-watch-modal").hidden && !byId("live-btn-end").hidden) {
            askConfirm("End your stream?", "You are live. Closing this window will stop the stream for everyone watching.", "End stream").then(function (ok) {
                if (!ok || !broadcast) return;
                endBroadcast();
                finishClose();
            });
            return;
        }
        finishClose();
    }

    var shareModal = byId("live-share-modal");
    var shareList = byId("live-share-list");
    var shareSubmit = byId("live-share-submit");

    function shareError(text) {
        var box = byId("live-share-error");
        box.textContent = text || "";
        box.hidden = !text;
    }

    function closeShare() {
        shareModal.hidden = true;
        shareList.textContent = "";
        byId("live-share-search").value = "";
        shareError("");
    }

    function liveNotice(text) {
        var note = document.createElement("div");
        note.className = "story-notice";
        note.textContent = text;
        document.body.appendChild(note);
        setTimeout(function () {
            if (note.parentNode) note.parentNode.removeChild(note);
        }, 3000);
    }

    byId("live-share-btn").addEventListener("click", function () {
        if (!currentStreamId()) return;
        shareError("");
        shareList.textContent = "";
        shareSubmit.disabled = true;
        shareModal.hidden = false;
        byId("live-share-search").focus();
        fetch("/Dm/ForwardTargets", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("targets");
            return response.text();
        }).then(function (html) {
            shareList.innerHTML = html;
        }).catch(function () {
            shareError("Could not load your friends. Try again.");
        });
    });

    shareModal.addEventListener("click", function (event) {
        if (event.target.closest("[data-close]")) closeShare();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !shareModal.hidden) closeShare();
    });
    shareList.addEventListener("change", function () {
        shareSubmit.disabled = shareList.querySelectorAll(".dm-forward-check:checked").length === 0;
    });
    byId("live-share-search").addEventListener("input", function () {
        var term = this.value.trim().toLowerCase();
        [].forEach.call(shareList.querySelectorAll(".dm-forward-item"), function (item) {
            item.hidden = term.length > 0 && item.getAttribute("data-name").indexOf(term) === -1 && item.getAttribute("data-key").toLowerCase().indexOf(term) === -1;
        });
    });
    shareSubmit.addEventListener("click", function () {
        var id = currentStreamId();
        var names = [];
        [].forEach.call(shareList.querySelectorAll(".dm-forward-check:checked"), function (box) { names.push(box.value); });
        if (!id || !names.length) return;
        shareSubmit.disabled = true;
        shareError("");
        requestJson("/Home/InviteToLive", "POST", { id: id, userNames: names }).then(function () {
            closeShare();
            liveNotice("Invitation sent.");
        }).catch(function (error) {
            shareError((error && error.message) || "Could not send the invitation.");
            shareSubmit.disabled = false;
        });
    });

    var wantedLive = Number(new URLSearchParams(window.location.search).get("live")) || 0;

    function openWantedLive() {
        if (!wantedLive) return;
        var id = wantedLive;
        wantedLive = 0;
        try {
            window.history.replaceState(window.history.state, "", window.location.pathname);
        } catch (e) {}
        var found = liveStreams.filter(function (item) { return item.id === id; })[0];
        if (!found) {
            liveNotice("This live stream has ended.");
            return;
        }
        openStream(found);
    }

    byId("live-watch-close").addEventListener("click", closeWatchDialog);
    byId("live-watch-backdrop").addEventListener("click", closeWatchDialog);

    byId("live-mute-btn").addEventListener("click", function () {
        var video = byId("live-stream-video");
        video.muted = !video.muted;
        this.querySelector("i").className = "fa-solid " + (video.muted ? "fa-volume-xmark" : "fa-volume-high");
    });

    byId("live-fullscreen-btn").addEventListener("click", function () {
        var stage = byId("live-watch-stage");
        if (document.fullscreenElement) document.exitFullscreen();
        else if (stage.requestFullscreen) stage.requestFullscreen();
    });

    byId("live-btn-end").addEventListener("click", function () {
        if (!broadcast) return;
        askConfirm("End your stream?", "Your viewers will be disconnected and the stream will stop.", "End stream").then(function (ok) {
            if (!ok || !broadcast) return;
            endBroadcast();
            byId("live-watch-modal").hidden = true;
        });
    });

    byId("live-chat-form").addEventListener("submit", function (event) {
        event.preventDefault();
        var input = byId("live-chat-input");
        var text = input.value.trim();
        var id = currentStreamId();
        if (!text || !id) return;
        input.value = "";
        hub("SendLiveMessage", id, text).catch(function () {});
    });

    byId("ig-heart-btn").addEventListener("click", function () {
        var id = currentStreamId();
        if (id) hub("SendLiveHeart", id).catch(function () {});
    });

    function currentStreamId() {
        if (watching) return watching.stream.id;
        if (broadcast) return broadcast.streamId;
        return 0;
    }

    /* ---------------- WebRTC (signalling goes through SignalR) ---------------- */

    function signal(streamId, target, message) {
        return hub("SendSignal", streamId, target, JSON.stringify(message)).catch(function () {});
    }

    function addRemoteCandidate(peer, candidate) {
        if (peer.pc.remoteDescription) peer.pc.addIceCandidate(candidate).catch(function () {});
        else peer.pending.push(candidate);
    }

    function flushCandidates(peer) {
        peer.pending.splice(0).forEach(function (candidate) {
            peer.pc.addIceCandidate(candidate).catch(function () {});
        });
    }

    function startPeerFor(viewerConnection) {
        var streamId = broadcast.streamId;
        var pc = new RTCPeerConnection(ICE);
        var peer = { pc: pc, pending: [] };
        broadcast.peers[viewerConnection] = peer;

        broadcast.stream.getTracks().forEach(function (track) {
            pc.addTrack(track, broadcast.stream);
        });
        pc.onicecandidate = function (event) {
            if (event.candidate) signal(streamId, viewerConnection, { kind: "ice", candidate: event.candidate });
        };
        pc.onconnectionstatechange = function () {
            if (pc.connectionState === "failed" || pc.connectionState === "closed") dropPeer(viewerConnection);
        };
        pc.createOffer().then(function (offer) {
            return pc.setLocalDescription(offer);
        }).then(function () {
            tuneSenders(pc);
            signal(streamId, viewerConnection, { kind: "offer", sdp: pc.localDescription });
        }).catch(function () {});
    }

    function tuneSenders(pc) {
        pc.getSenders().forEach(function (sender) {
            if (!sender.track || sender.track.kind !== "video") return;
            var params = sender.getParameters();
            if (!params.encodings || !params.encodings.length) params.encodings = [{}];
            params.encodings[0].maxBitrate = 3000000;
            params.degradationPreference = "maintain-resolution";
            sender.setParameters(params).catch(function () {});
        });
    }

    function dropPeer(viewerConnection) {
        if (!broadcast || !broadcast.peers[viewerConnection]) return;
        broadcast.peers[viewerConnection].pc.close();
        delete broadcast.peers[viewerConnection];
    }

    function hostSignal(from, message) {
        var peer = broadcast.peers[from];
        if (!peer) return;
        if (message.kind === "answer") {
            peer.pc.setRemoteDescription(message.sdp).then(function () {
                flushCandidates(peer);
            }).catch(function () {});
        } else if (message.kind === "ice") {
            addRemoteCandidate(peer, message.candidate);
        }
    }

    function viewerSignal(from, message) {
        if (message.kind === "offer") {
            if (watching.pc) watching.pc.close();
            var pc = new RTCPeerConnection(ICE);
            watching.pc = pc;
            var current = watching;
            pc.onicecandidate = function (event) {
                if (event.candidate) signal(current.stream.id, from, { kind: "ice", candidate: event.candidate });
            };
            pc.ontrack = function (event) {
                var video = byId("live-stream-video");
                video.srcObject = event.streams[0];
                video.play().catch(function () {});
                setWait("");
            };
            pc.setRemoteDescription(message.sdp).then(function () {
                flushCandidates(current);
                return pc.createAnswer();
            }).then(function (answer) {
                return pc.setLocalDescription(answer);
            }).then(function () {
                signal(current.stream.id, from, { kind: "answer", sdp: pc.localDescription });
            }).catch(function () {});
        } else if (message.kind === "ice" && watching.pc) {
            addRemoteCandidate(watching, message.candidate);
        } else if (message.kind === "ice") {
            watching.pending.push(message.candidate);
        }
    }

    document.addEventListener("discode-live-signal", function (event) {
        var data = event.detail;
        var message;
        try {
            message = JSON.parse(data.payload);
        } catch (err) {
            return;
        }
        if (broadcast && broadcast.streamId === data.streamId) hostSignal(data.from, message);
        else if (watching && watching.stream.id === data.streamId) {
            viewerSignal(data.from, message);
        }
    });

    document.addEventListener("discode-live-viewer-joined", function (event) {
        if (broadcast && broadcast.streamId === event.detail.streamId) startPeerFor(event.detail.connectionId);
    });

    document.addEventListener("discode-live-viewer-left", function (event) {
        dropPeer(event.detail.connectionId);
    });

    document.addEventListener("discode-live-viewers", function (event) {
        var data = event.detail;
        var changed = false;
        liveStreams.forEach(function (stream) {
            if (stream.id === data.streamId) {
                stream.viewerCount = data.count;
                changed = true;
            }
        });
        if (changed) renderLive();
        if (currentStreamId() === data.streamId) byId("live-viewers-count").textContent = viewerText(data.count);
    });

    document.addEventListener("discode-live-ended", function (event) {
        var id = event.detail.streamId;
        if (watching && watching.stream.id === id) {
            if (watching.pc) watching.pc.close();
            watching.pc = null;
            byId("live-stream-video").srcObject = null;
            setWait("This stream has ended.");
        }
        if (broadcast && broadcast.streamId === id) {
            releaseBroadcast();
            byId("live-watch-modal").hidden = true;
        }
    });

    document.addEventListener("discode-live-changed", refreshLive);

    document.addEventListener("discode-live-message", function (event) {
        var message = event.detail;
        if (currentStreamId() === message.streamId) appendChat(message.userName, message.avatarUrl, message.text);
    });

    document.addEventListener("discode-live-joined", function (event) {
        var viewer = event.detail;
        if (currentStreamId() !== viewer.streamId || viewer.userName === ME) return;
        appendJoin(viewer.userName, viewer.avatarUrl);
    });

    document.addEventListener("discode-live-heart", function (event) {
        if (currentStreamId() === event.detail.streamId) spawnHeart();
    });

    /* ---------------- Go Live: capture + preview ---------------- */

    var statusBox = byId("live-preview-status");
    var canvas = byId("live-create-preview-canvas");
    var drawing = canvas.getContext("2d");
    var submit = byId("live-create-submit");

    function stopTracks(stream) {
        if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
    }

    function containRect(width, height, boxW, boxH) {
        var scale = Math.min(boxW / width, boxH / height);
        return { w: width * scale, h: height * scale };
    }

    function roundedPath(x, y, w, h, r) {
        drawing.beginPath();
        drawing.moveTo(x + r, y);
        drawing.arcTo(x + w, y, x + w, y + h, r);
        drawing.arcTo(x + w, y + h, x, y + h, r);
        drawing.arcTo(x, y + h, x, y, r);
        drawing.arcTo(x, y, x + w, y, r);
        drawing.closePath();
    }

    function drawFrame() {
        var W = canvas.width;
        var H = canvas.height;
        drawing.fillStyle = "#0b0b0d";
        drawing.fillRect(0, 0, W, H);
        var screenReady = capture.screen && capture.scrVideo.videoWidth > 0;
        var cameraReady = capture.camera && capture.camVideo.videoWidth > 0;

        if (screenReady) {
            var size = containRect(capture.scrVideo.videoWidth, capture.scrVideo.videoHeight, W, H);
            drawing.drawImage(capture.scrVideo, (W - size.w) / 2, (H - size.h) / 2, size.w, size.h);
        }

        if (cameraReady && screenReady) {
            var pipW = Math.round(W * 0.24);
            var pipH = Math.round(pipW * capture.camVideo.videoHeight / capture.camVideo.videoWidth);
            var x = W - pipW - 24;
            var y = H - pipH - 24;
            drawing.save();
            roundedPath(x, y, pipW, pipH, 18);
            drawing.clip();
            drawing.drawImage(capture.camVideo, x, y, pipW, pipH);
            drawing.restore();
            roundedPath(x, y, pipW, pipH, 18);
            drawing.lineWidth = 4;
            drawing.strokeStyle = "#ffffff";
            drawing.stroke();
        } else if (cameraReady) {
            var scale = Math.max(W / capture.camVideo.videoWidth, H / capture.camVideo.videoHeight);
            var cw = capture.camVideo.videoWidth * scale;
            var ch = capture.camVideo.videoHeight * scale;
            drawing.drawImage(capture.camVideo, (W - cw) / 2, (H - ch) / 2, cw, ch);
        } else if (!screenReady) {
            drawing.fillStyle = "rgba(255, 255, 255, 0.55)";
            drawing.font = "600 34px sans-serif";
            drawing.textAlign = "center";
            var lines = (notice || "Choose a camera or screen to preview your stream").split("\n");
            lines.forEach(function (line, index) {
                drawing.fillText(line, W / 2, H / 2 + (index - (lines.length - 1) / 2) * 46);
            });
        }
    }

    function ensureDrawing() {
        var active = !!(capture.camera || capture.screen);
        if (active && !capture.timer) capture.timer = setInterval(drawFrame, DRAW_MS);
        if (!active && capture.timer) {
            clearInterval(capture.timer);
            capture.timer = 0;
            drawFrame();
        }
    }

    function refreshSourceUi(message) {
        document.querySelectorAll(".live-source-card").forEach(function (button) {
            var on = !!capture[button.getAttribute("data-source")];
            button.classList.toggle("active", on);
            button.setAttribute("aria-pressed", on ? "true" : "false");
        });
        var any = !!(capture.camera || capture.screen);
        submit.disabled = !any;
        if (message) statusBox.textContent = message;
        else if (capture.camera && capture.screen) statusBox.textContent = "Screen + camera";
        else if (capture.screen) statusBox.textContent = "Screen";
        else if (capture.camera) statusBox.textContent = "Camera";
        else statusBox.textContent = "Choose a source";
        ensureDrawing();
        if (!any) drawFrame();
    }

    function releaseSource(name) {
        var stream = capture[name];
        capture[name] = null;
        stopTracks(stream);
        (name === "camera" ? capture.camVideo : capture.scrVideo).srcObject = null;
    }

    function attach(name, stream) {
        capture[name] = stream;
        var video = name === "camera" ? capture.camVideo : capture.scrVideo;
        video.srcObject = stream;
        video.play().catch(function () {});
        if (name === "screen") {
            stream.getVideoTracks()[0].addEventListener("ended", function () {
                if (capture.screen === stream) {
                    releaseSource("screen");
                    refreshSourceUi();
                }
            });
        }
    }

    function acquireCamera() {
        var media = navigator.mediaDevices;
        if (!media || !media.getUserMedia) return Promise.reject(new Error("no camera"));
        return media.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }).catch(function () {
            return media.getUserMedia({ video: true });
        });
    }

    function acquireScreen() {
        var media = navigator.mediaDevices;
        if (!media || !media.getDisplayMedia) return Promise.reject(new Error("no screen"));
        return media.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
    }

    function captureProblem(name, err) {
        var what = name === "camera" ? "Camera" : "Screen sharing";
        var reason = err && err.name;
        if (reason === "NotAllowedError" || reason === "SecurityError") {
            return name === "camera"
                ? { short: "Camera blocked", long: "The browser blocked the camera.\nClick the lock icon in the address bar,\nallow Camera and Microphone, then try again." }
                : { short: "Sharing cancelled", long: "Screen sharing was cancelled or blocked." };
        }
        if (reason === "NotFoundError" || reason === "OverconstrainedError" || (err && err.message === "no camera")) {
            return { short: "No camera found", long: "No camera was found on this device.\nPlug one in, or use Screen Share." };
        }
        if (reason === "NotReadableError" || reason === "AbortError") {
            return { short: "Camera busy", long: "The camera is being used by another app.\nClose it there and try again." };
        }
        return { short: what + " unavailable", long: what + " could not be started." };
    }

    function toggleSource(name) {
        notice = "";
        if (capture[name]) {
            releaseSource(name);
            refreshSourceUi();
            return;
        }
        statusBox.textContent = name === "camera" ? "Connecting camera..." : "Choose what to share...";
        (name === "camera" ? acquireCamera() : acquireScreen()).then(function (stream) {
            attach(name, stream);
            refreshSourceUi();
        }).catch(function (err) {
            var problem = captureProblem(name, err);
            notice = problem.long;
            refreshSourceUi(problem.short);
        });
    }

    document.querySelectorAll(".live-source-card").forEach(function (button) {
        button.addEventListener("click", function () {
            toggleSource(button.getAttribute("data-source"));
        });
    });

    function openCreateDialog() {
        if (broadcast) {
            showWatchDialog(broadcast.info, true);
            byId("live-stream-video").srcObject = broadcast.stream;
            byId("live-stream-video").play().catch(function () {});
            return;
        }
        byId("live-create-modal").hidden = false;
        refreshSourceUi();
    }

    function discardCapture() {
        releaseSource("camera");
        releaseSource("screen");
        ensureDrawing();
    }

    function closeCreateDialog() {
        byId("live-create-modal").hidden = true;
        if (!broadcast) {
            discardCapture();
            refreshSourceUi();
        }
    }

    byId("live-create-close").addEventListener("click", closeCreateDialog);
    byId("live-create-cancel").addEventListener("click", closeCreateDialog);
    byId("live-create-backdrop").addEventListener("click", closeCreateDialog);
    byId("explore-go-live-btn").addEventListener("click", openCreateDialog);
    byId("empty-go-live-btn").addEventListener("click", openCreateDialog);

    /* ---------------- Go Live: broadcast ---------------- */

    function buildOutputStream() {
        var output = canvas.captureStream(30);
        var audioStreams = [capture.camera, capture.screen].filter(function (stream) {
            return stream && stream.getAudioTracks().length;
        });
        var mixer = null;
        if (audioStreams.length) {
            var Context = window.AudioContext || window.webkitAudioContext;
            mixer = new Context();
            var destination = mixer.createMediaStreamDestination();
            audioStreams.forEach(function (stream) {
                mixer.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(destination);
            });
            destination.stream.getAudioTracks().forEach(function (track) { output.addTrack(track); });
        }
        return { stream: output, mixer: mixer };
    }

    byId("live-create-form").addEventListener("submit", function (event) {
        event.preventDefault();
        if (!capture.camera && !capture.screen) return;
        var title = byId("live-form-title").value.trim();
        var category = byId("live-form-category").value;
        submit.disabled = true;
        statusBox.textContent = "Going live...";

        var out = buildOutputStream();
        hub("StartLive", { title: title, category: category }).then(function (stream) {
            broadcast = { streamId: stream.id, stream: out.stream, mixer: out.mixer, peers: {}, info: stream, thumbnail: "", snapshotTimer: 0 };
            scheduleSnapshot(5000);
            byId("live-create-modal").hidden = true;
            showWatchDialog(stream, true);
            var video = byId("live-stream-video");
            video.srcObject = out.stream;
            video.play().catch(function () {});
            refreshLive();
        }).catch(function (err) {
            stopTracks(out.stream);
            if (out.mixer) out.mixer.close();
            refreshSourceUi(hubMessage(err));
        });
    });

    function postThumbnail(blob, previous) {
        var data = new FormData();
        data.append("file", blob, "preview.jpg");
        if (previous) data.append("previous", previous);
        return fetch("/Home/UploadLiveThumbnail", {
            method: "POST",
            credentials: "same-origin",
            headers: { "RequestVerificationToken": csrfToken(), "X-Requested-With": "XMLHttpRequest" },
            body: data
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (result) {
                if (!response.ok) throw readError(response, result);
                return result.imageUrl;
            });
        });
    }

    function takeSnapshot() {
        if (!broadcast) return;
        var current = broadcast;
        var shot = document.createElement("canvas");
        shot.width = 640;
        shot.height = 360;
        shot.getContext("2d").drawImage(canvas, 0, 0, shot.width, shot.height);
        shot.toBlob(function (blob) {
            if (!blob || broadcast !== current) return;
            postThumbnail(blob, current.thumbnail).then(function (url) {
                if (broadcast !== current) {
                    removeThumbnail(url);
                    return;
                }
                current.thumbnail = url;
                return hub("UpdateLiveThumbnail", { imageUrl: url });
            }).catch(function () {});
        }, "image/jpeg", 0.8);
    }

    function removeThumbnail(url) {
        if (!url) return;
        requestJson("/Home/RemoveLiveThumbnail", "POST", { imageUrl: url }).catch(function () {});
    }

    function scheduleSnapshot(delay) {
        var current = broadcast;
        if (!current) return;
        current.snapshotTimer = setTimeout(function () {
            if (broadcast !== current) return;
            takeSnapshot();
            scheduleSnapshot((10 + Math.random() * 5) * 60 * 1000);
        }, delay);
    }

    function releaseBroadcast() {
        if (!broadcast) return;
        var current = broadcast;
        broadcast = null;
        clearTimeout(current.snapshotTimer);
        removeThumbnail(current.thumbnail);
        Object.keys(current.peers).forEach(function (key) { current.peers[key].pc.close(); });
        stopTracks(current.stream);
        if (current.mixer) current.mixer.close();
        discardCapture();
        refreshSourceUi();
        byId("live-stream-video").srcObject = null;
    }

    function endBroadcast() {
        hub("StopLive").catch(function () {});
        releaseBroadcast();
        refreshLive();
    }

    drawFrame();
    refreshLive();
})();
