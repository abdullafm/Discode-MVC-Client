(function () {
    "use strict";

    var list = document.getElementById("server-channel-list");
    if (!list) return;

    var serverId = Number(new URLSearchParams(window.location.search).get("id")) || 0;
    if (!serverId) return;

    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
    var joinSound = new Audio("/assets/css/audio/join-voice.mp3");
    var leaveSound = new Audio("/assets/css/audio/leave-voice.mp3");
    var state = { channels: {}, current: null };
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
        tile.className = "server-voice-tile is-peer" + (user.isMuted ? " is-muted" : "") + (user.isDeafened ? " is-deafened" : "");
        tile.setAttribute("data-user", user.userId);
        var photo = document.createElement("img");
        photo.alt = "";
        photo.src = user.avatarUrl || DEFAULT_AVATAR;
        var name = document.createElement("p");
        name.textContent = user.displayName;
        tile.appendChild(photo);
        tile.appendChild(name);
        return tile;
    }

    function paintTiles() {
        var call = document.getElementById("server-voice-call");
        if (!call) return;
        [].forEach.call(call.querySelectorAll(".server-voice-tile.is-peer"), function (node) { node.remove(); });
        var here = mine();
        if (!here) return;
        var me = document.getElementById("server-voice-tile");
        var group = state.channels[here.channelId] || [];
        var self = group.filter(function (user) { return user.isSelf; })[0];
        if (me && self) {
            me.classList.toggle("is-muted", self.isMuted);
            me.classList.toggle("is-deafened", self.isDeafened);
        }
        group.forEach(function (user) {
            if (!user.isSelf) call.appendChild(tileNode(user));
        });
        call.classList.toggle("has-peers", group.length > 1);
    }

    function paint() {
        var here = mine();
        [].forEach.call(list.querySelectorAll(".server-channel[data-kind='voice']"), function (button) {
            var id = Number(button.getAttribute("data-id"));
            var row = button.closest(".server-channel-row") || button;
            var slot = row.nextElementSibling;
            var inside = !!here && here.channelId === id;
            button.classList.toggle("joined", inside);
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
        paintTiles();
    }

    function apply(payload) {
        state.channels = {};
        (payload.channels || []).forEach(function (group) {
            state.channels[group.channelId] = group.users || [];
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
        has: function (userId) {
            return Object.keys(state.channels).some(function (id) {
                return state.channels[id].some(function (user) { return user.userId === userId; });
            });
        }
    };

    load();
})();
