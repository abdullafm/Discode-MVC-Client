(function () {
    "use strict";

    if (window.discodeVoice) return;

    // Səs modulu səhifə dəyişəndə də canlı qalır: kanal siyahısı yalnız server səhifəsində var
    function listEl() {
        return document.getElementById("server-channel-list");
    }

    function onServerPage() {
        return /^\/Server\/Index/i.test(window.location.pathname) && !!listEl();
    }

    function pageServerId() {
        return onServerPage() ? (Number(new URLSearchParams(window.location.search).get("id")) || 0) : 0;
    }

    var voiceServerId = 0;

    function viewServerId() {
        return pageServerId() || voiceServerId;
    }

    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
    var joinSound = new Audio("/assets/css/audio/join-voice.mp3");
    var leaveSound = new Audio("/assets/css/audio/leave-voice.mp3");
    var state = { channels: {}, started: {}, current: null, viewId: 0, canModerate: false };
    var lastFlags = { muted: false, deafened: false };
    var remote = null;
    var known = "";
    var sent = { muted: false, deafened: false, camera: false, screen: false };
    var loading = false;
    var again = false;

    var cachedToken = "";

    // anti-forgery token bəzi səhifələrdə (məs. Social) yoxdur: gördüyümüz sonuncunu saxlayırıq
    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        if (field && field.value) cachedToken = field.value;
        return cachedToken;
    }

    function request(url, method, body) {
        return fetch(url, {
            method: method || "GET",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": token(),
                "X-Requested-With": "XMLHttpRequest"
            },
            body: body ? JSON.stringify(body) : undefined
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (data) {
                if (!response.ok) throw new Error((data && data.errors && data.errors[0]) || "Something went wrong (" + response.status + ").");
                return data;
            });
        });
    }

    function play(sound) {
        try {
            sound.currentTime = 0;
            var result = sound.play();
            if (result && result.catch) result.catch(function () {});
        } catch (e) {}
    }

    // what the person chose with their own buttons
    function localAudio() {
        return {
            muted: typeof micO !== "undefined" && !!micO,
            deafened: typeof headO !== "undefined" && !!headO
        };
    }

    // a moderator's server mute / deafen always wins over the buttons
    function serverFlags() {
        var c = state.current;
        return { muted: !!(c && (c.isServerMuted || c.isServerDeafened)), deafened: !!(c && c.isServerDeafened) };
    }

    function effective(muted, deafened) {
        var f = serverFlags();
        return { muted: !!muted || f.muted, deafened: !!deafened || f.deafened };
    }

    function audio() {
        var local = localAudio();
        return effective(local.muted, local.deafened);
    }

    // səhifədə göstərilən server üçün cari səs otağı
    function mine() {
        return state.current && state.current.serverId === pageServerId() ? state.current : null;
    }

    // qoşulduğum otaq harada olursa olsun (başqa səhifədə də)
    function here() {
        return state.current || null;
    }

    function rosterSource() {
        if (!state.current) return null;
        return state.viewId === state.current.serverId ? state : remote;
    }

    function userNode(user) {
        var row = document.createElement("div");
        row.className = "server-voice-user" + (user.isMuted ? " is-muted" : "") + (user.isDeafened ? " is-deafened" : "") + (user.isServerMuted ? " is-server-muted" : "") + (user.isServerDeafened ? " is-server-deafened" : "") + (user.isCameraOn ? " is-camera" : "") + (user.isStreaming ? " is-streaming" : "");
        row.setAttribute("data-user", user.userId);
        var photo = document.createElement("img");
        photo.alt = "";
        photo.src = user.avatarUrl || DEFAULT_AVATAR;
        var text = document.createElement("span");
        var name = document.createElement("strong");
        name.textContent = user.displayName;
        text.appendChild(name);
        var icons = document.createElement("span");
        icons.className = "voice-user-icons";
        var mic = document.createElement("i");
        mic.className = "fa-solid fa-microphone-slash voice-mute-icon";
        mic.setAttribute("aria-hidden", "true");
        var deaf = document.createElement("span");
        deaf.className = "voice-deaf-icon";
        var head = document.createElement("i");
        head.className = "fa-solid fa-headphones";
        head.setAttribute("aria-hidden", "true");
        deaf.appendChild(head);
        icons.appendChild(mic);
        icons.appendChild(deaf);
        row.appendChild(photo);
        var live = document.createElement("span");
        live.className = "voice-user-media";
        var cam = document.createElement("i");
        cam.className = "fa-solid fa-video voice-cam-icon";
        cam.setAttribute("aria-hidden", "true");
        var badge = document.createElement("em");
        badge.className = "voice-live-badge";
        badge.textContent = "LIVE";
        live.appendChild(cam);
        live.appendChild(badge);
        row.appendChild(text);
        row.appendChild(live);
        row.appendChild(icons);
        return row;
    }

    function tileNode(user) {
        var tile = document.createElement("div");
        tile.className = "server-voice-tile is-peer";
        tile.setAttribute("data-user", user.userId);
        var screen = document.createElement("video");
        screen.className = "server-voice-screen";
        screen.autoplay = true;
        screen.muted = true;
        screen.setAttribute("playsinline", "");
        var cam = document.createElement("video");
        cam.className = "server-voice-cam-video";
        cam.autoplay = true;
        cam.muted = true;
        cam.setAttribute("playsinline", "");
        var photo = document.createElement("img");
        photo.alt = "";
        var name = document.createElement("p");
        tile.appendChild(screen);
        tile.appendChild(cam);
        tile.appendChild(photo);
        tile.appendChild(name);
        return tile;
    }

    function paintTiles() {
        var call = document.getElementById("server-voice-call");
        if (!call) return;
        var here = mine();
        var group = here ? (state.channels[here.channelId] || []) : [];
        var wanted = {};
        group.forEach(function (user) {
            if (!user.isSelf) wanted[user.userId] = user;
        });
        [].forEach.call(call.querySelectorAll(".server-voice-tile.is-peer"), function (node) {
            if (!wanted[node.getAttribute("data-user")]) node.remove();
        });
        [].forEach.call(call.querySelectorAll(".server-voice-tile.is-screen"), function (node) {
            var owner = node.getAttribute("data-for");
            if (!call.querySelector('.server-voice-tile:not(.is-screen)[data-user="' + owner + '"]')) node.remove();
        });
        var self = group.filter(function (user) { return user.isSelf; })[0];
        var me = document.getElementById("server-voice-tile");
        if (me && self) {
            me.setAttribute("data-user", self.userId);
            me.classList.toggle("is-muted", self.isMuted);
            me.classList.toggle("is-deafened", self.isDeafened);
            var myFace = me.querySelector("img");
            var myUrl = self.avatarUrl || DEFAULT_AVATAR;
            if (myFace && myFace.getAttribute("src") !== myUrl) myFace.src = myUrl;
        }
        Object.keys(wanted).forEach(function (id) {
            var user = wanted[id];
            var tile = call.querySelector('.server-voice-tile.is-peer[data-user="' + id + '"]');
            if (!tile) {
                tile = tileNode(user);
                call.appendChild(tile);
            }
            tile.classList.toggle("is-muted", user.isMuted);
            tile.classList.toggle("is-deafened", user.isDeafened);
            tile.classList.toggle("is-server-muted", !!user.isServerMuted);
            tile.classList.toggle("is-server-deafened", !!user.isServerDeafened);
            tile.querySelector("img").src = user.avatarUrl || DEFAULT_AVATAR;
            tile.querySelector("p").textContent = user.displayName;
        });
        call.classList.toggle("has-peers", group.length > 1);
        layoutTiles();
    }

    function layoutTiles() {
        var call = document.getElementById("server-voice-call");
        if (!call || call.hidden) return;
        var tiles = call.querySelectorAll(".server-voice-tile").length;
        if (!tiles) return;
        var style = window.getComputedStyle(call);
        var gap = 8;
        var width = call.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        var height = call.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        if (width <= 0 || height <= 0) return;
        var best = { w: 0, h: 0 };
        for (var cols = 1; cols <= tiles; cols++) {
            var rows = Math.ceil(tiles / cols);
            var w = (width - gap * (cols - 1)) / cols;
            var h = w * 9 / 16;
            var room = (height - gap * (rows - 1)) / rows;
            if (h > room) {
                h = room;
                w = h * 16 / 9;
            }
            if (w > best.w) best = { w: w, h: h };
        }
        call.style.setProperty("--tile-w", Math.floor(Math.min(best.w, 1100)) + "px");
        call.style.setProperty("--tile-h", Math.floor(Math.min(best.w, 1100) * 9 / 16) + "px");
    }

    window.addEventListener("resize", layoutTiles);
    document.addEventListener("discode-voice-media", layoutTiles);
    if (window.ResizeObserver) {
        var watch = document.getElementById("server-voice-call");
        if (watch) new ResizeObserver(layoutTiles).observe(watch);
    }

    function tick() {
        var list = listEl();
        if (!list) return;
        [].forEach.call(list.querySelectorAll(".server-channel[data-kind='voice']"), function (button) {
            var live = button.querySelector(".server-voice-live");
            if (!live) return;
            var id = Number(button.getAttribute("data-id"));
            var occupied = (state.channels[id] || []).length > 0 && state.started[id];
            live.hidden = !occupied;
            if (!occupied) return;
            var seconds = Math.max(0, Math.floor((Date.now() - state.started[id]) / 1000));
            var hours = Math.floor(seconds / 3600);
            var minutes = Math.floor((seconds % 3600) / 60);
            var rest = seconds % 60;
            live.textContent = (hours ? hours + ":" + (minutes < 10 ? "0" : "") : "") + minutes + ":" + (rest < 10 ? "0" : "") + rest;
        });
    }

    window.setInterval(tick, 1000);

    function paint() {
        var here = mine();
        var list = listEl();
        [].forEach.call(list ? list.querySelectorAll(".server-channel[data-kind='voice']") : [], function (button) {
            var id = Number(button.getAttribute("data-id"));
            var row = button.closest(".server-channel-row") || button;
            var slot = row.nextElementSibling;
            var inside = !!here && here.channelId === id;
            button.classList.toggle("joined", inside);
            var limit = Number(button.getAttribute("data-limit")) || 0;
            var count = button.querySelector(".server-voice-count");
            if (limit > 0) {
                if (!count) {
                    count = document.createElement("span");
                    count.className = "server-voice-count";
                    var anchor = button.querySelector(".server-voice-live");
                    button.insertBefore(count, anchor);
                }
                count.textContent = ((state.channels[id] || []).length) + "/" + limit;
            } else if (count) {
                count.remove();
            }
            if (!slot || !slot.classList.contains("server-voice-people")) return;
            [].forEach.call(slot.querySelectorAll(".server-voice-user"), function (node) { node.remove(); });
            var users = state.channels[id] || [];
            var invite = slot.querySelector(".server-voice-invite");
            users.forEach(function (user) {
                var node = userNode(user);
                if (invite) slot.insertBefore(node, invite);
                else slot.appendChild(node);
            });
            if (invite) invite.hidden = !inside;
            slot.hidden = users.length === 0;
        });
        tick();
        paintTiles();
        paintGlobalBar();
        document.dispatchEvent(new CustomEvent("discode-voice-painted"));
    }

    function shape(payload) {
        var out = { channels: {}, started: {} };
        (payload.channels || []).forEach(function (group) {
            out.channels[group.channelId] = group.users || [];
            out.started[group.channelId] = Date.parse(group.startedAt) || Date.now();
        });
        return out;
    }

    function apply(payload, viewId) {
        state.viewId = viewId;
        state.channels = {};
        state.started = {};
        (payload.channels || []).forEach(function (group) {
            state.channels[group.channelId] = group.users || [];
            state.started[group.channelId] = Date.parse(group.startedAt) || Date.now();
        });
        state.current = payload.current || null;
        state.canModerate = !!payload.canModerate;
    }

    function announce() {
        var current = here();
        var source = rosterSource();
        if (!current || !source) {
            known = "";
            return;
        }
        var ids = (source.channels[current.channelId] || []).map(function (user) { return user.userId; }).sort().join(",");
        if (known && known !== ids) {
            var was = known ? known.split(",") : [];
            var now = ids ? ids.split(",") : [];
            if (now.length > was.length) play(joinSound);
            else if (now.length < was.length) play(leaveSound);
        }
        known = ids;
    }

    function load() {
        var viewId = viewServerId();
        if (!viewId) {
            paintGlobalBar();
            return Promise.resolve();
        }
        if (loading) {
            again = true;
            return Promise.resolve();
        }
        loading = true;
        return request("/ServerVoice/State?serverId=" + viewId).then(function (payload) {
            apply(payload, viewId);
            voiceServerId = state.current ? state.current.serverId : 0;
            remote = null;
            if (state.current && state.current.serverId !== viewId) {
                // başqa serverə baxıram, amma səsdəyəm: öz otağımın siyahısı da lazımdır
                return request("/ServerVoice/State?serverId=" + state.current.serverId).then(function (other) {
                    remote = shape(other);
                }).catch(function () {});
            }
        }).then(function () {
            announce();
            if (state.current) {
                sent.muted = state.current.isMuted;
                sent.deafened = state.current.isDeafened;
                sent.camera = !!state.current.isCameraOn;
                sent.screen = !!state.current.isStreaming;
            }
            paint();
            obeyModerator();
            document.dispatchEvent(new CustomEvent("discode-voice-updated"));
        }).catch(function () {}).then(function () {
            loading = false;
            if (again) {
                again = false;
                return load();
            }
        });
    }

    function join(channelId) {
        var current = audio();
        var serverId = pageServerId() || voiceServerId;
        return request("/ServerVoice/Join", "POST", { serverId: serverId, channelId: Number(channelId), isMuted: current.muted || current.deafened, isDeafened: current.deafened }).then(function () {
            play(joinSound);
            document.dispatchEvent(new CustomEvent("discode-voice-audio", { detail: { muted: current.muted, deafened: current.deafened } }));
            return load();
        }).catch(function (error) {
            if (window.discodeServerFlash) window.discodeServerFlash(error.message);
        });
    }

    function leave() {
        return request("/ServerVoice/Leave", "POST", {}).catch(function () {}).then(function () {
            play(leaveSound);
            return load();
        });
    }

    function push(muted, deafened) {
        if (!state.current) return;
        var live = window.discodeVoiceRtc ? window.discodeVoiceRtc.media() : { camera: false, screen: false };
        var silent = muted || deafened;
        if (sent.muted === silent && sent.deafened === deafened && sent.camera === live.camera && sent.screen === live.screen) return;
        sent.muted = silent;
        sent.deafened = deafened;
        sent.camera = live.camera;
        sent.screen = live.screen;
        request("/ServerVoice/Update", "POST", { isMuted: silent, isDeafened: deafened, isCameraOn: live.camera, isStreaming: live.screen }).catch(function () {});
    }

    function sync(muted, deafened) {
        var now = effective(muted, deafened);
        document.dispatchEvent(new CustomEvent("discode-voice-audio", { detail: { muted: now.muted, deafened: now.deafened } }));
        push(now.muted, now.deafened);
    }

    // the room told us a moderator changed our state: apply it to the microphone / speakers now, and show it on the buttons
    function obeyModerator() {
        var f = serverFlags();
        document.body.classList.toggle("voice-server-muted", f.muted && !f.deafened);
        document.body.classList.toggle("voice-server-deafened", f.deafened);
        if (f.muted === lastFlags.muted && f.deafened === lastFlags.deafened) return;
        lastFlags = f;
        if (!state.current) return;
        var local = localAudio();
        sync(local.muted, local.deafened);
    }

    document.addEventListener("discode-voice-media", function () {
        var now = audio();
        push(now.muted, now.deafened);
    });

    document.addEventListener("discode-profile-changed", load);

    document.addEventListener("discode-server-voice-changed", function (event) {
        var detail = event.detail || {};
        if (!detail.serverId || Number(detail.serverId) === viewServerId() || Number(detail.serverId) === voiceServerId) load();
    });

    // yeni səhifə açılanda (server səhifəsinə qayıdanda) siyahı yenidən çəkilir
    document.addEventListener("discode-page-ready", function () {
        load();
        paintGlobalBar();
    });

    // başqa səhifələrdə mikrofon / qulaqlıq düymələri də otağa bildirilir
    document.addEventListener("discode-mic-changed", function (event) {
        var detail = event.detail || {};
        if (!state.current) return;
        var f = serverFlags();
        // trying to unmute / undeafen while a moderator holds it: stays muted, say why
        if ((f.muted && !detail.muted) || (f.deafened && !detail.deafened)) {
            tell(f.deafened ? "A moderator deafened you in this server." : "A moderator muted you in this server.");
        }
        sync(!!detail.muted, !!detail.deafened);
    });

    function tell(text) {
        if (window.discodeServerFlash) window.discodeServerFlash(text);
    }

    // what happened to me: shown as a message; a disconnect also closes my side of the call (the room list no longer has me)
    document.addEventListener("discode-server-voice-moderated", function (event) {
        var kind = (event.detail || {}).kind;
        var text = {
            muted: "A moderator muted you in this server.",
            unmuted: "A moderator removed your server mute.",
            deafened: "A moderator deafened you in this server.",
            undeafened: "A moderator removed your server deafen.",
            disconnected: "A moderator disconnected you from voice."
        }[kind];
        if (text) tell(text);
        if (kind === "disconnected") play(leaveSound);
        load();
    });

    // ---------- right click on someone in a voice channel: server mute / deafen / disconnect ----------
    var modMenu = null;

    function closeModMenu() {
        if (modMenu) modMenu.hidden = true;
    }

    function findUser(userId) {
        var found = null;
        Object.keys(state.channels).forEach(function (id) {
            (state.channels[id] || []).forEach(function (user) { if (user.userId === userId) found = user; });
        });
        return found;
    }

    function act(url, body) {
        closeModMenu();
        return request(url, "POST", body).then(load).catch(function (error) { tell(error.message); });
    }

    function openModMenu(userId, x, y) {
        var user = findUser(userId);
        if (!user) return;
        if (!modMenu) {
            modMenu = document.createElement("div");
            modMenu.className = "channel-menu voice-mod-menu";
            modMenu.hidden = true;
            document.body.appendChild(modMenu);
        }
        var serverId = state.viewId;
        var rtc = window.discodeVoiceRtc;
        var mineSelf = !!user.isSelf;
        modMenu.innerHTML = "";
        modMenu.setAttribute("data-user", userId);

        function line(label, opts) {
            opts = opts || {};
            var button = document.createElement("button");
            button.type = "button";
            if (opts.danger) button.className = "is-danger";
            var text = document.createElement("span");
            text.textContent = label;
            button.appendChild(text);
            if (opts.sub) {
                var sub = document.createElement("small");
                sub.textContent = opts.sub;
                text.appendChild(sub);
            }
            if (typeof opts.checked === "boolean") {
                var box = document.createElement("span");
                box.className = "vm-check" + (opts.checked ? " on" : "");
                box.innerHTML = '<i class="fa-solid fa-check"></i>';
                button.appendChild(box);
            } else if (opts.icon) {
                var glyph = document.createElement("i");
                glyph.className = "fa-solid " + opts.icon;
                button.appendChild(glyph);
            }
            button.addEventListener("click", function (event) {
                event.stopPropagation();
                opts.run(button);
            });
            modMenu.appendChild(button);
            return button;
        }
        function divider() { modMenu.appendChild(document.createElement("hr")); }

        line("Profile", { run: function () {
            closeModMenu();
            if (window.openUserProfile && user.userName) window.openUserProfile(user.userName, user.avatarUrl || "");
        } });
        if (!mineSelf && user.userName) {
            line("Send Message", { run: function () {
                closeModMenu();
                var url = "/Dm/Index?name=" + encodeURIComponent(user.userName);
                if (window.discodeGo) window.discodeGo(url);
                else window.location.href = url;
            } });
        }

        if (!mineSelf && rtc && rtc.getUserAudio) {
            // heard only by me: never sent to the other person, and not remembered after a reload
            divider();
            var prefs = rtc.getUserAudio(userId);
            var volume = document.createElement("div");
            volume.className = "vm-volume";
            var caption = document.createElement("span");
            caption.textContent = "User Volume";
            var slider = document.createElement("input");
            slider.type = "range";
            slider.min = "0";
            slider.max = "100";
            slider.value = String(Math.round(prefs.volume * 100));
            slider.setAttribute("aria-label", "User Volume");
            slider.addEventListener("input", function () { rtc.setUserAudio(userId, { volume: Number(slider.value) / 100 }); });
            volume.appendChild(caption);
            volume.appendChild(slider);
            modMenu.appendChild(volume);
            divider();
            line("Mute", { checked: prefs.muted, run: function (button) {
                var next = !rtc.getUserAudio(userId).muted;
                rtc.setUserAudio(userId, { muted: next });
                button.querySelector(".vm-check").classList.toggle("on", next);
            } });
        }

        if (!mineSelf && state.canModerate) {
            divider();
            line("Server Mute", { danger: true, checked: !!user.isServerMuted, run: function () {
                act("/ServerVoice/Moderate", { serverId: serverId, userId: userId, serverMuted: !user.isServerMuted });
            } });
            line("Server Deafen", { danger: true, checked: !!user.isServerDeafened, run: function () {
                act("/ServerVoice/Moderate", { serverId: serverId, userId: userId, serverDeafened: !user.isServerDeafened });
            } });
            line("Disconnect", { danger: true, icon: "fa-phone-slash", run: function () {
                act("/ServerVoice/Disconnect", { serverId: serverId, userId: userId });
            } });
        }

        divider();
        line("Copy User ID", { icon: "fa-id-badge", run: function () {
            closeModMenu();
            try { navigator.clipboard.writeText(userId); } catch (e) {}
        } });

        modMenu.hidden = false;
        var width = modMenu.offsetWidth, height = modMenu.offsetHeight;
        modMenu.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + "px";
        modMenu.style.top = Math.max(8, Math.min(y, window.innerHeight - height - 8)) + "px";
    }

    document.addEventListener("contextmenu", function (event) {
        var row = event.target.closest && event.target.closest(".server-voice-user, .server-voice-tile.is-peer, .server-voice-tile");
        var userId = row && row.getAttribute("data-user");
        if (!userId || !findUser(userId)) return;
        event.preventDefault();
        openModMenu(userId, event.clientX, event.clientY);
    });
    document.addEventListener("click", function (event) {
        if (modMenu && !modMenu.hidden && !event.target.closest(".voice-mod-menu")) closeModMenu();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeModMenu();
    });
    window.addEventListener("blur", closeModMenu);

    // ---------- "Voice Connected" zolağı: serverdən kənarda da görünür ----------
    function globalBar() {
        var bar = document.getElementById("voice-global-bar");
        if (bar) return bar;
        bar = document.createElement("div");
        bar.id = "voice-global-bar";
        bar.className = "voice-global-bar";
        bar.hidden = true;
        bar.innerHTML = '<button type="button" class="vgb-main" title="Back to the voice channel"><i class="fa-solid fa-signal"></i><span><strong>Voice Connected</strong><small></small></span></button>' +
            '<button type="button" class="vgb-btn vgb-mic" aria-label="Mute"><i class="fa-solid fa-microphone"></i></button>' +
            '<button type="button" class="vgb-btn vgb-head" aria-label="Deafen"><i class="fa-solid fa-headphones"></i></button>' +
            '<button type="button" class="vgb-btn vgb-leave" aria-label="Disconnect"><i class="fa-solid fa-phone-slash"></i></button>';
        document.documentElement.appendChild(bar);
        bar.querySelector(".vgb-main").addEventListener("click", function () {
            if (!state.current) return;
            var url = "/Server/Index?id=" + state.current.serverId;
            if (window.discodeGo) window.discodeGo(url);
            else window.location.href = url;
        });
        bar.querySelector(".vgb-mic").addEventListener("click", function () {
            if (typeof window.mic === "function") window.mic();
        });
        bar.querySelector(".vgb-head").addEventListener("click", function () {
            if (typeof window.headp === "function") window.headp();
        });
        bar.querySelector(".vgb-leave").addEventListener("click", function () {
            leave();
        });
        return bar;
    }

    function paintGlobalBar() {
        var bar = globalBar();
        var current = state.current;
        var onItsPage = !!current && pageServerId() === current.serverId;
        bar.hidden = !current || onItsPage;
        if (!current) return;
        bar.querySelector("small").textContent = current.channelName + " / " + current.serverName;
        var muted = typeof micO !== "undefined" && !!micO;
        var deaf = typeof headO !== "undefined" && !!headO;
        bar.querySelector(".vgb-mic").classList.toggle("is-off", muted || deaf);
        bar.querySelector(".vgb-mic i").className = "fa-solid " + (muted || deaf ? "fa-microphone-slash" : "fa-microphone");
        bar.querySelector(".vgb-head").classList.toggle("is-off", deaf);
    }

    document.addEventListener("discode-mic-changed", paintGlobalBar);
    document.addEventListener("discode-server-channels-rendered", paint);
    document.addEventListener("discode-server-channels-changed", function () { window.setTimeout(load, 400); });
    document.addEventListener("discode-server-roles-changed", function () { window.setTimeout(load, 400); });

    window.discodeVoice = {
        join: join,
        leave: leave,
        sync: sync,
        reload: load,
        current: function () { return state.current; },
        here: here,
        roster: function () {
            var current = here();
            var source = rosterSource();
            if (!current || !source) return null;
            var users = source.channels[current.channelId] || [];
            var self = users.filter(function (user) { return user.isSelf; })[0];
            return { channelId: current.channelId, selfId: self ? self.userId : "", users: users };
        },
        has: function (userId) {
            return Object.keys(state.channels).some(function (id) {
                return state.channels[id].some(function (user) { return user.userId === userId; });
            });
        }
    };

    load();
})();
