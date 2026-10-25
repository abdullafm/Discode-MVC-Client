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
    var hostState = window.discodeHost = window.discodeHost || { current: null };
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

    var replyTarget = null;
    var chatMenu = null;

    function closeChatMenu() {
        if (chatMenu && chatMenu.parentNode) chatMenu.parentNode.removeChild(chatMenu);
        chatMenu = null;
    }

    function setReply(target) {
        replyTarget = target;
        var bar = byId("live-reply-bar");
        bar.hidden = !target;
        byId("live-reply-name").textContent = target ? target.user : "";
        if (target) byId("live-chat-input").focus();
    }

    function openChatMenu(anchor, line) {
        closeChatMenu();
        chatMenu = element("div", "watch-msg-menu");
        var reply = element("button", "");
        reply.type = "button";
        reply.innerHTML = '<i class="fa-solid fa-reply"></i><span>Reply</span>';
        reply.addEventListener("click", function () {
            closeChatMenu();
            setReply({ user: line.getAttribute("data-user"), text: line.getAttribute("data-text") });
        });
        chatMenu.appendChild(reply);
        document.body.appendChild(chatMenu);
        var rect = anchor.getBoundingClientRect();
        var width = chatMenu.offsetWidth;
        var left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
        var top = rect.bottom + 4;
        if (top + chatMenu.offsetHeight > window.innerHeight - 8) top = rect.top - chatMenu.offsetHeight - 4;
        chatMenu.style.left = left + "px";
        chatMenu.style.top = top + "px";
    }

    document.addEventListener("click", function (event) {
        if (chatMenu && !event.target.closest(".watch-msg-menu, .watch-msg-more")) closeChatMenu();
    });

    byId("live-reply-cancel").addEventListener("click", function () { setReply(null); });
    byId("live-chat-input").addEventListener("keydown", function (event) {
        if (event.key === "Escape" && replyTarget) {
            event.preventDefault();
            setReply(null);
        }
    });

    function appendChat(author, avatar, text, replyUser, replyText) {
        var feed = byId("live-chat-feed");
        var line = element("div", "watch-msg");
        line.setAttribute("data-user", author);
        line.setAttribute("data-text", text);
        var face = element("img");
        face.src = avatar || DEFAULT_AVATAR;
        face.alt = "";
        var body = element("div");
        if (replyUser) {
            var quote = element("div", "watch-reply");
            quote.innerHTML = '<i class="fa-solid fa-reply"></i>';
            quote.appendChild(element("strong", "", replyUser));
            quote.appendChild(element("span", "", replyText || ""));
            body.appendChild(quote);
        }
        body.appendChild(element("strong", "", author));
        var said = element("p", "", text);
        if (window.discodeMentions && window.discodeMentions.decorate) window.discodeMentions.decorate(said);
        body.appendChild(said);
        if (window.discodeMentions && window.discodeMentions.mentionsMe && window.discodeMentions.mentionsMe(said)) {
            line.classList.add("is-mentioned");
            var ping = element("em", "watch-msg-ping", "mentioned you");
            body.insertBefore(ping, said);
        }
        var more = element("button", "watch-msg-more");
        more.type = "button";
        more.setAttribute("aria-label", "More");
        more.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
        more.addEventListener("click", function (event) {
            event.stopPropagation();
            openChatMenu(more, line);
        });
        line.appendChild(face);
        line.appendChild(body);
        line.appendChild(more);
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
        if (mine && window.discodeLiveDock) window.discodeLiveDock.hideHost();
        if (mine) {
            hub("GetLiveViewers", stream.id).then(function (viewers) {
                if (currentStreamId() === stream.id) byId("live-viewers-count").textContent = viewerText(viewers.length);
            }).catch(function () {});
        }
        var video = byId("live-stream-video");
        byId("live-watch-modal").hidden = false;
        byId("live-watch-title").textContent = stream.title;
        byId("live-streamer-name").textContent = hostName(stream);
        byId("live-streamer-name").setAttribute("data-username", stream.hostUserName || "");
        byId("live-streamer-avatar").src = stream.hostAvatarUrl || DEFAULT_AVATAR;
        byId("live-viewers-count").textContent = viewerText(stream.viewerCount);
        byId("live-btn-end").hidden = !mine;
        byId("live-chat-feed").textContent = "";
        video.muted = mine;
        video.srcObject = null;
        byId("live-mute-btn").querySelector("i").className = "fa-solid " + (mine ? "fa-volume-xmark" : "fa-volume-high");
        setWait(mine ? "" : "Connecting to the stream...");
        updateGuestButton();
        updateMinimizeButton();
    }

    function updateMinimizeButton() {
        byId("live-minimize-btn").hidden = isHostNow() ? false : (!watching || !!myGuest);
    }

    byId("live-minimize-btn").addEventListener("click", function () {
        if (isHostNow() && window.discodeLiveDock) {
            var session = hostState.current;
            closeViewerList();
            setReply(null);
            closeChatMenu();
            byId("live-stream-video").srcObject = null;
            byId("live-watch-modal").hidden = true;
            window.discodeLiveDock.takeHost({ stream: session.stream, title: session.info.title });
            return;
        }
        if (!watching || !watching.pc || myGuest || !window.discodeLiveDock) return;
        var current = watching;
        var video = byId("live-stream-video");
        var info = {
            streamId: current.stream.id,
            pc: current.pc,
            stream: video.srcObject,
            title: current.stream.title,
            host: hostName(current.stream),
            muted: video.muted
        };
        watching = null;
        clearGuest();
        closeViewerList();
        setReply(null);
        closeChatMenu();
        video.srcObject = null;
        byId("live-watch-modal").hidden = true;
        window.discodeLiveDock.take(info);
    });

    function refreshRoster() {
        var id = currentStreamId();
        if (!id) return;
        hub("GetLiveViewers", id).then(function (viewers) {
            if (currentStreamId() === id) window.discodeLiveRoster = viewers;
        }).catch(function () {});
    }

    byId("live-chat-input").addEventListener("focus", refreshRoster);

    function closeViewerList() {
        byId("live-viewer-list").hidden = true;
    }

    function refreshViewerList() {
        var id = currentStreamId();
        if (!hostState.current || hostState.current.streamId !== id || byId("live-viewer-list").hidden) return;
        hub("GetLiveViewers", id).then(function (viewers) {
            var rows = byId("live-viewer-rows");
            rows.textContent = "";
            byId("live-viewer-empty").hidden = viewers.length > 0;
            viewers.forEach(function (viewer) {
                var row = element("button", "watch-viewer-row");
                row.type = "button";
                var face = element("img");
                face.alt = "";
                face.src = viewer.avatarUrl || DEFAULT_AVATAR;
                var names = element("span");
                names.appendChild(element("strong", "", viewer.displayName || viewer.userName));
                names.appendChild(element("small", "", viewer.userName));
                row.appendChild(face);
                row.appendChild(names);
                row.addEventListener("click", function () {
                    if (window.openUserProfile) window.openUserProfile(viewer.userName, viewer.avatarUrl || "");
                });
                rows.appendChild(row);
            });
        }).catch(function () {});
    }

    byId("live-viewers-btn").addEventListener("click", function (event) {
        event.stopPropagation();
        var panel = byId("live-viewer-list");
        if (!hostState.current || hostState.current.streamId !== currentStreamId()) return;
        panel.hidden = !panel.hidden;
        refreshViewerList();
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest("#live-viewer-list, #live-viewers-btn")) closeViewerList();
    });

    function openStream(stream, attempt) {
        if (window.discodeLiveDock) window.discodeLiveDock.close();
        if (stream.isMine) {
            if (hostState.current && hostState.current.streamId === stream.id) {
                showWatchDialog(stream, true);
                byId("live-stream-video").srcObject = hostState.current.stream;
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
            if (join.guest) {
                guest = join.guest;
                showGuestTile(guest, null, false);
                wantGuest();
            }
            updateGuestButton();
        }).catch(function (err) {
            if (!watching || watching.stream.id !== stream.id) return;
            if (/not ready/i.test(String((err && err.message) || "")) && (attempt || 0) < 12) {
                setTimeout(function () {
                    if (watching && watching.stream.id === stream.id) openStream(stream, (attempt || 0) + 1);
                }, 700);
                return;
            }
            setWait(hubMessage(err));
        });
    }

    function leaveWatching() {
        if (!watching) return;
        var current = watching;
        watching = null;
        if (current.pc) current.pc.close();
        clearGuest();
        hub("LeaveLive", current.stream.id).catch(function () {});
        var video = byId("live-stream-video");
        video.srcObject = null;
    }

    function finishClose() {
        window.discodeLiveRoster = [];
        closeViewerList();
        setReply(null);
        closeChatMenu();
        leaveWatching();
        byId("live-watch-modal").hidden = true;
        byId("live-stream-video").srcObject = null;
    }

    function closeWatchDialog() {
        if (hostState.current && !byId("live-watch-modal").hidden && !byId("live-btn-end").hidden) {
            askConfirm("End your stream?", "You are live. Closing this window will stop the stream for everyone watching.", "End stream").then(function (ok) {
                if (!ok || !hostState.current) return;
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
        if (!hostState.current) return;
        askConfirm("End your stream?", "Your viewers will be disconnected and the stream will stop.", "End stream").then(function (ok) {
            if (!ok || !hostState.current) return;
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
        if (replyTarget) {
            var target = replyTarget;
            setReply(null);
            hub("SendLiveReply", id, text, target.user, target.text).catch(function () {});
            return;
        }
        hub("SendLiveMessage", id, text).catch(function () {});
    });

    byId("ig-heart-btn").addEventListener("click", function () {
        var id = currentStreamId();
        if (id) hub("SendLiveHeart", id).catch(function () {});
    });

    function currentStreamId() {
        if (watching) return watching.stream.id;
        if (hostState.current) return hostState.current.streamId;
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
        var streamId = hostState.current.streamId;
        var pc = new RTCPeerConnection(ICE);
        var peer = { pc: pc, pending: [] };
        hostState.current.peers[viewerConnection] = peer;

        hostState.current.stream.getTracks().forEach(function (track) {
            pc.addTrack(track, hostState.current.stream);
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
        if (!hostState.current || !hostState.current.peers[viewerConnection]) return;
        hostState.current.peers[viewerConnection].pc.close();
        delete hostState.current.peers[viewerConnection];
    }

    function hostSignal(from, message) {
        var peer = hostState.current.peers[from];
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
                video.play().catch(function () {
                    video.muted = true;
                    byId("live-mute-btn").querySelector("i").className = "fa-solid fa-volume-xmark";
                    video.play().catch(function () {});
                });
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
        if (message.role === "guest") {
            if (currentStreamId() === data.streamId) guestSignal(data.from, message);
            return;
        }
        if (hostState.current && hostState.current.streamId === data.streamId) return;
        if (watching && watching.stream.id === data.streamId) {
            viewerSignal(data.from, message);
        }
    });

    function keepHostHandlers() {
        var keep = window.discodeKeepOnce;
        if (!keep) return;
        keep("host-signal", "discode-live-signal", function (event) {
            var data = event.detail;
            var message;
            try {
                message = JSON.parse(data.payload);
            } catch (err) {
                return;
            }
            if (message.role === "guest") return;
            if (hostState.current && hostState.current.streamId === data.streamId) hostSignal(data.from, message);
        });
        keep("host-joined", "discode-live-viewer-joined", function (event) {
            if (hostState.current && hostState.current.streamId === event.detail.streamId) startPeerFor(event.detail.connectionId);
        });
        keep("host-left", "discode-live-viewer-left", function (event) {
            dropPeer(event.detail.connectionId);
        });
    }

    keepHostHandlers();

    document.addEventListener("discode-live-viewer-left", function (event) {
        if (guest && guest.connectionId === event.detail.connectionId && currentStreamId() === event.detail.streamId) clearGuest();
        removeGuestRequest(event.detail.connectionId);
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
        refreshViewerList();
        refreshRoster();
    });

    document.addEventListener("discode-live-ended", function (event) {
        var id = event.detail.streamId;
        if (watching && watching.stream.id === id) {
            if (watching.pc) watching.pc.close();
            watching.pc = null;
            byId("live-stream-video").srcObject = null;
            setWait("This stream has ended.");
        }
        if (hostState.current && hostState.current.streamId === id) {
            releaseBroadcast();
            byId("live-watch-modal").hidden = true;
        }
    });

    document.addEventListener("discode-live-changed", refreshLive);

    document.addEventListener("discode-live-message", function (event) {
        var message = event.detail;
        if (currentStreamId() === message.streamId) appendChat(message.userName, message.avatarUrl, message.text, message.replyToUserName, message.replyToText);
    });

    document.addEventListener("discode-live-joined", function (event) {
        var viewer = event.detail;
        if (currentStreamId() !== viewer.streamId || viewer.userName === ME) return;
        appendJoin(viewer.userName, viewer.avatarUrl);
    });

    document.addEventListener("discode-live-heart", function (event) {
        if (currentStreamId() === event.detail.streamId) spawnHeart();
    });

    /* ---------------- guests ---------------- */

    var guest = null;
    var myGuest = null;
    var guestPending = false;
    var guestRecv = {};
    var earlyGuestIce = {};

    function isHostNow() {
        return !!hostState.current && hostState.current.streamId === currentStreamId();
    }

    function guestNote(text) {
        var holder = byId("live-guest-requests");
        var note = element("div", "watch-guest-note", text);
        holder.appendChild(note);
        setTimeout(function () {
            if (window.discodeDismiss) window.discodeDismiss(note);
            else if (note.parentNode) note.parentNode.removeChild(note);
        }, 3500);
    }

    function guestStatus(text) {
        var holder = byId("live-guest-requests");
        var old = holder.querySelector(".watch-guest-status");
        if (old && old.parentNode) old.parentNode.removeChild(old);
        if (!text) return;
        holder.appendChild(element("div", "watch-guest-note watch-guest-status", text));
    }

    function showGuestTile(info, stream, mine) {
        byId("live-guest-tile").hidden = false;
        byId("live-guest-name").textContent = mine ? "You" : (info.displayName || info.userName || "");
        var video = byId("live-guest-video");
        video.muted = !!mine;
        if (stream) {
            video.srcObject = stream;
            video.play().catch(function () {});
        }
        byId("live-guest-remove").hidden = !(isHostNow() || mine);
    }

    function updateGuestButton() {
        var button = byId("live-guest-btn");
        button.hidden = !watching || isHostNow();
        button.classList.toggle("is-pending", guestPending);
        button.classList.toggle("is-guest", !!myGuest);
        button.disabled = guestPending || (!!guest && !myGuest);
        updateMinimizeButton();
        button.title = myGuest ? "Leave as guest" : guestPending ? "Request sent" : guest ? "A guest is already on" : "Request to join";
    }

    function clearGuest() {
        Object.keys(guestRecv).forEach(function (key) { guestRecv[key].pc.close(); });
        guestRecv = {};
        earlyGuestIce = {};
        if (myGuest) {
            Object.keys(myGuest.peers).forEach(function (key) { myGuest.peers[key].pc.close(); });
            stopTracks(myGuest.stream);
            myGuest = null;
        }
        guest = null;
        guestPending = false;
        guestStatus("");
        byId("live-guest-tile").hidden = true;
        byId("live-guest-video").srcObject = null;
        updateGuestButton();
    }

    function wantGuest() {
        if (!guest || myGuest) return;
        signal(currentStreamId(), guest.connectionId, { kind: "want", role: "guest" });
    }

    function startGuestPeer(target) {
        var streamId = currentStreamId();
        var pc = new RTCPeerConnection(ICE);
        var peer = { pc: pc, pending: [] };
        if (myGuest.peers[target]) myGuest.peers[target].pc.close();
        myGuest.peers[target] = peer;
        myGuest.stream.getTracks().forEach(function (track) {
            pc.addTrack(track, myGuest.stream);
        });
        pc.onicecandidate = function (event) {
            if (event.candidate) signal(streamId, target, { kind: "ice", role: "guest", candidate: event.candidate });
        };
        pc.onconnectionstatechange = function () {
            if ((pc.connectionState === "failed" || pc.connectionState === "closed") && myGuest && myGuest.peers[target] === peer) {
                delete myGuest.peers[target];
            }
        };
        pc.createOffer().then(function (offer) {
            return pc.setLocalDescription(offer);
        }).then(function () {
            tuneSenders(pc);
            signal(streamId, target, { kind: "offer", role: "guest", sdp: pc.localDescription });
        }).catch(function () {});
    }

    function guestSignal(from, message) {
        var streamId = currentStreamId();
        if (message.kind === "want") {
            if (!myGuest) return;
            if (myGuest.stream) startGuestPeer(from);
            else myGuest.wants.push(from);
        } else if (message.kind === "offer") {
            if (guestRecv[from]) guestRecv[from].pc.close();
            var pc = new RTCPeerConnection(ICE);
            var peer = { pc: pc, pending: (earlyGuestIce[from] || []).splice(0) };
            guestRecv[from] = peer;
            pc.onicecandidate = function (event) {
                if (event.candidate) signal(streamId, from, { kind: "ice", role: "guest", candidate: event.candidate });
            };
            pc.ontrack = function (event) {
                var video = byId("live-guest-video");
                video.srcObject = event.streams[0];
                video.muted = false;
                video.play().catch(function () {
                    video.muted = true;
                    video.play().catch(function () {});
                });
                byId("live-guest-tile").hidden = false;
            };
            pc.setRemoteDescription(message.sdp).then(function () {
                flushCandidates(peer);
                return pc.createAnswer();
            }).then(function (answer) {
                return pc.setLocalDescription(answer);
            }).then(function () {
                signal(streamId, from, { kind: "answer", role: "guest", sdp: pc.localDescription });
            }).catch(function () {});
        } else if (message.kind === "answer") {
            var sender = myGuest && myGuest.peers[from];
            if (sender) {
                sender.pc.setRemoteDescription(message.sdp).then(function () {
                    flushCandidates(sender);
                }).catch(function () {});
            }
        } else if (message.kind === "ice") {
            var target = (myGuest && myGuest.peers[from]) || guestRecv[from];
            if (target) addRemoteCandidate(target, message.candidate);
            else (earlyGuestIce[from] = earlyGuestIce[from] || []).push(message.candidate);
        }
    }

    function becomeGuest() {
        myGuest = { stream: null, peers: {}, wants: [] };
        guestPending = false;
        updateGuestButton();
        acquireCamera().then(function (stream) {
            if (!myGuest) {
                stopTracks(stream);
                return;
            }
            myGuest.stream = stream;
            showGuestTile(guest || {}, stream, true);
            myGuest.wants.splice(0).forEach(startGuestPeer);
        }).catch(function () {
            guestNote("Your camera or microphone is not available.");
            hub("EndLiveGuest", currentStreamId()).catch(function () {});
            clearGuest();
        });
    }

    function removeGuestRequest(connectionId) {
        var card = byId("live-guest-requests").querySelector('[data-connection="' + connectionId + '"]:not(.is-leaving)');
        if (card && card.parentNode) {
            if (window.discodeDismiss) window.discodeDismiss(card);
            else card.parentNode.removeChild(card);
        }
    }

    byId("live-guest-btn").addEventListener("click", function () {
        var id = currentStreamId();
        if (!id) return;
        if (myGuest) {
            hub("EndLiveGuest", id).catch(function () {});
            return;
        }
        guestPending = true;
        updateGuestButton();
        hub("RequestLiveGuest", id).then(function () {
            if (guestPending) guestStatus("Request sent. Waiting for the host to accept...");
        }).catch(function (err) {
            guestPending = false;
            updateGuestButton();
            guestNote(hubMessage(err));
        });
    });

    byId("live-guest-tile").addEventListener("click", function (event) {
        if (event.target.closest("#live-guest-remove")) return;
        var video = byId("live-guest-video");
        if (!myGuest && video.muted) {
            video.muted = false;
            video.play().catch(function () {});
        }
    });

    byId("live-guest-remove").addEventListener("click", function () {
        var id = currentStreamId();
        if (id) hub("EndLiveGuest", id).catch(function () {});
    });

    document.addEventListener("discode-live-guest-requested", function (event) {
        var request = event.detail;
        if (!isHostNow() || hostState.current.streamId !== request.streamId) return;
        removeGuestRequest(request.connectionId);
        var card = element("div", "watch-guest-request");
        card.setAttribute("data-connection", request.connectionId);
        var face = element("img");
        face.alt = "";
        face.src = request.avatarUrl || DEFAULT_AVATAR;
        var text = element("span", "", (request.displayName || request.userName) + " wants to join");
        var accept = element("button", "watch-guest-accept", "Accept");
        accept.type = "button";
        var decline = element("button", "watch-guest-decline", "Decline");
        decline.type = "button";
        accept.addEventListener("click", function () {
            removeGuestRequest(request.connectionId);
            hub("RespondLiveGuest", request.streamId, request.connectionId, true).catch(function (err) { guestNote(hubMessage(err)); });
        });
        decline.addEventListener("click", function () {
            removeGuestRequest(request.connectionId);
            hub("RespondLiveGuest", request.streamId, request.connectionId, false).catch(function () {});
        });
        card.appendChild(face);
        card.appendChild(text);
        card.appendChild(accept);
        card.appendChild(decline);
        byId("live-guest-requests").appendChild(card);
    });

    document.addEventListener("discode-live-guest-response", function (event) {
        if (!watching || watching.stream.id !== event.detail.streamId) return;
        guestStatus("");
        if (event.detail.accepted) {
            becomeGuest();
        } else {
            guestPending = false;
            updateGuestButton();
            guestNote("The host declined your request.");
        }
    });

    document.addEventListener("discode-live-guest-started", function (event) {
        var info = event.detail;
        if (currentStreamId() !== info.streamId) return;
        guest = info;
        updateGuestButton();
        if (myGuest) return;
        showGuestTile(info, null, false);
        wantGuest();
    });

    document.addEventListener("discode-live-guest-ended", function (event) {
        if (currentStreamId() !== event.detail.streamId) return;
        clearGuest();
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
        if (window.discodeLiveDock) window.discodeLiveDock.close();
        if (hostState.current) {
            showWatchDialog(hostState.current.info, true);
            byId("live-stream-video").srcObject = hostState.current.stream;
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
        if (!hostState.current) {
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
            hostState.current = { streamId: stream.id, stream: out.stream, mixer: out.mixer, peers: {}, info: stream, thumbnail: "", snapshotTimer: 0, sources: [capture.camera, capture.screen].filter(Boolean), discard: function () { try { discardCapture(); } catch (error) {} } };
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
        if (!hostState.current) return;
        var current = hostState.current;
        var shot = document.createElement("canvas");
        shot.width = 640;
        shot.height = 360;
        shot.getContext("2d").drawImage(canvas, 0, 0, shot.width, shot.height);
        shot.toBlob(function (blob) {
            if (!blob || hostState.current !== current) return;
            postThumbnail(blob, current.thumbnail).then(function (url) {
                if (hostState.current !== current) {
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
        var current = hostState.current;
        if (!current) return;
        current.snapshotTimer = setTimeout(function () {
            if (hostState.current !== current) return;
            takeSnapshot();
            scheduleSnapshot((10 + Math.random() * 5) * 60 * 1000);
        }, delay);
    }

    function releaseBroadcast() {
        if (!hostState.current) return;
        var current = hostState.current;
        hostState.current = null;
        clearGuest();
        byId("live-guest-requests").textContent = "";
        clearTimeout(current.snapshotTimer);
        removeThumbnail(current.thumbnail);
        Object.keys(current.peers).forEach(function (key) { current.peers[key].pc.close(); });
        stopTracks(current.stream);
        (current.sources || []).forEach(stopTracks);
        if (current.mixer) current.mixer.close();
        if (current.discard) current.discard();
        discardCapture();
        if (window.discodeLiveDock) window.discodeLiveDock.hideHost();
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

    if (hostState.current && /[?&]hostlive=/.test(location.search)) openCreateDialog();
})();
