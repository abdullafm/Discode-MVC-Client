(function () {
    "use strict";

    var list = document.getElementById("server-channel-list");
    if (!list) return;

    var serverId = Number(new URLSearchParams(window.location.search).get("id")) || 0;
    if (!serverId) return;

    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
    var joinSound = new Audio("/assets/css/audio/join-voice.mp3");
    var leaveSound = new Audio("/assets/css/audio/leave-voice.mp3");
    var state = { channels: {}, started: {}, current: null };
    var known = "";
    var sent = { muted: false, deafened: false };
    var loading = false;
    var again = false;

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
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

    function audio() {
        return {
            muted: typeof micO !== "undefined" && !!micO,
            deafened: typeof headO !== "undefined" && !!headO
        };
    }

    function mine() {
        return state.current && state.current.serverId === serverId ? state.current : null;
    }

    function userNode(user) {
        var row = document.createElement("div");
        row.className = "server-voice-user" + (user.isMuted ? " is-muted" : "") + (user.isDeafened ? " is-deafened" : "");
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
        row.appendChild(text);
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
        var self = group.filter(function (user) { return user.isSelf; })[0];
        var me = document.getElementById("server-voice-tile");
        if (me && self) {
            me.setAttribute("data-user", self.userId);
            me.classList.toggle("is-muted", self.isMuted);
            me.classList.toggle("is-deafened", self.isDeafened);
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
    if (window.ResizeObserver) {
        var watch = document.getElementById("server-voice-call");
        if (watch) new ResizeObserver(layoutTiles).observe(watch);
    }

    function tick() {
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
        [].forEach.call(list.querySelectorAll(".server-channel[data-kind='voice']"), function (button) {
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
        document.dispatchEvent(new CustomEvent("discode-voice-painted"));
    }

    function apply(payload) {
        state.channels = {};
        state.started = {};
        (payload.channels || []).forEach(function (group) {
            state.channels[group.channelId] = group.users || [];
            state.started[group.channelId] = Date.parse(group.startedAt) || Date.now();
        });
        state.current = payload.current || null;
    }

    function announce() {
        var here = mine();
        if (!here) {
            known = "";
            return;
        }
        var ids = (state.channels[here.channelId] || []).map(function (user) { return user.userId; }).sort().join(",");
        if (known && known !== ids) {
            var was = known ? known.split(",") : [];
            var now = ids ? ids.split(",") : [];
            if (now.length > was.length) play(joinSound);
            else if (now.length < was.length) play(leaveSound);
        }
        known = ids;
    }

    function load() {
        if (loading) {
            again = true;
            return Promise.resolve();
        }
        loading = true;
        return request("/ServerVoice/State?serverId=" + serverId).then(function (payload) {
            apply(payload);
            announce();
            if (state.current) {
                sent.muted = state.current.isMuted;
                sent.deafened = state.current.isDeafened;
            }
            paint();
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

    function sync(muted, deafened) {
        document.dispatchEvent(new CustomEvent("discode-voice-audio", { detail: { muted: muted, deafened: deafened } }));
        if (!state.current) return;
        var silent = muted || deafened;
        if (sent.muted === silent && sent.deafened === deafened) return;
        sent.muted = silent;
        sent.deafened = deafened;
        request("/ServerVoice/Update", "POST", { isMuted: silent, isDeafened: deafened }).catch(function () {});
    }

    document.addEventListener("discode-server-voice-changed", function (event) {
        var detail = event.detail || {};
        if (!detail.serverId || Number(detail.serverId) === serverId) load();
    });
    document.addEventListener("discode-server-channels-rendered", paint);
    document.addEventListener("discode-server-channels-changed", function () { window.setTimeout(load, 400); });
    document.addEventListener("discode-server-roles-changed", function () { window.setTimeout(load, 400); });

    window.discodeVoice = {
        join: join,
        leave: leave,
        sync: sync,
        reload: load,
        current: function () { return state.current; },
        here: mine,
        roster: function () {
            var here = mine();
            if (!here) return null;
            var users = state.channels[here.channelId] || [];
            var self = users.filter(function (user) { return user.isSelf; })[0];
            return { channelId: here.channelId, selfId: self ? self.userId : "", users: users };
        },
        has: function (userId) {
            return Object.keys(state.channels).some(function (id) {
                return state.channels[id].some(function (user) { return user.userId === userId; });
            });
        }
    };

    load();
})();
