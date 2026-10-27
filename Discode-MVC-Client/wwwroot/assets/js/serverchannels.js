(function () {
    "use strict";

    var list = document.getElementById("server-channel-list");
    if (!list) return;

    var serverId = new URLSearchParams(window.location.search).get("id");
    if (!serverId) return;

    var ICONS = { text: "fa-hashtag", voice: "fa-volume-high", announce: "fa-bullhorn" };
    var loose = document.getElementById("server-channel-loose");
    var empty = document.getElementById("server-channel-empty");
    var data = { loose: [], categories: [] };
    var reloading = false;
    var again = false;
    var wanted = 0;

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function channelNode(channel) {
        var tpl = document.getElementById("server-channel-new");
        if (!tpl) return null;
        var frag = tpl.content.cloneNode(true);
        var button = frag.querySelector(".server-channel");
        var icon = button.querySelector("i");
        if (icon) icon.className = "fa-solid " + (ICONS[channel.kind] || ICONS.text);
        button.setAttribute("data-kind", channel.kind);
        button.setAttribute("data-id", channel.id);
        button.setAttribute("data-view", channel.isPrivate ? "0" : "1");
        button.setAttribute("data-readonly", channel.isReadOnly ? "1" : "0");
        button.setAttribute("data-limit", channel.userLimit || 0);
        button.querySelector(".server-channel-name").textContent = channel.name;
        var lock = button.querySelector(".server-channel-lock");
        if (lock) lock.hidden = !channel.isPrivate && channel.kind !== "announce";
        if (channel.kind === "voice") {
            button.setAttribute("data-join", "1");
            button.removeAttribute("data-send");
        } else {
            button.setAttribute("data-send", channel.kind === "announce" || channel.isReadOnly ? "0" : "1");
            var people = frag.querySelector(".server-voice-people");
            if (people) people.remove();
        }
        var editable = !!window.discodeCanManage;
        [].forEach.call(frag.querySelectorAll("[data-edit-channel], [data-delete-channel]"), function (node) { node.hidden = !editable; });
        return frag;
    }

    function categoryNode(category) {
        var tpl = document.getElementById("server-category-new");
        if (!tpl) return null;
        var frag = tpl.content.cloneNode(true);
        var node = frag.querySelector(".server-category");
        node.setAttribute("data-id", category.id);
        node.setAttribute("data-private", category.isPrivate ? "1" : "0");
        node.querySelector(".server-category-name span").textContent = category.name;
        var add = node.querySelector(".server-category-add");
        if (add) add.hidden = !window.discodeCanManage;
        var holder = node.querySelector(".server-category-list");
        category.channels.forEach(function (channel) {
            var item = channelNode(channel);
            if (item) holder.appendChild(item);
        });
        return frag;
    }

    function openCategories() {
        var closed = {};
        [].forEach.call(list.querySelectorAll(".server-category.closed"), function (node) { closed[node.getAttribute("data-id")] = true; });
        return closed;
    }

    function render(next, wantedId) {
        data = next || data;
        var selectedId = wantedId || (function () {
            var on = list.querySelector(".server-channel.on");
            return on ? on.getAttribute("data-id") : "";
        })();
        var closed = openCategories();
        [].forEach.call(list.querySelectorAll(".server-category"), function (node) { node.remove(); });
        if (loose) loose.textContent = "";
        data.loose.forEach(function (channel) {
            var item = channelNode(channel);
            if (item && loose) loose.appendChild(item);
        });
        var anchor = list.querySelector("template");
        data.categories.forEach(function (category) {
            var item = categoryNode(category);
            if (!item) return;
            list.insertBefore(item, anchor);
        });
        [].forEach.call(list.querySelectorAll(".server-category"), function (node) {
            if (closed[node.getAttribute("data-id")]) node.classList.add("closed");
        });
        var buttons = list.querySelectorAll(".server-channel");
        if (empty) empty.hidden = buttons.length > 0;
        var emptyTitle = document.getElementById("server-chat-empty-title");
        var emptyText = document.getElementById("server-chat-empty-text");
        var noText = ![].some.call(buttons, function (button) { return button.getAttribute("data-kind") !== "voice"; });
        if (emptyTitle) emptyTitle.textContent = noText ? "No Text Channels" : "Select a channel.";
        if (emptyText) {
            emptyText.hidden = !noText;
            emptyText.textContent = noText ? "You find yourself in a strange place. You don't have access to any text channels, or there are none in this server." : "";
        }
        var target = null;
        [].forEach.call(buttons, function (button) {
            if (selectedId && button.getAttribute("data-id") === String(selectedId)) target = button;
        });
        if (!target) {
            [].forEach.call(buttons, function (button) {
                if (!target && button.getAttribute("data-kind") !== "voice") target = button;
            });
        }
        window.setTimeout(function () { document.dispatchEvent(new CustomEvent("discode-server-channels-rendered")); }, 0);
        return target;
    }

    function fetchData() {
        return fetch("/Server/Channels?id=" + encodeURIComponent(serverId), { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("channels");
            return response.json();
        });
    }

    function reload(selectId) {
        if (selectId) wanted = selectId;
        if (reloading) {
            again = true;
            return Promise.resolve();
        }
        reloading = true;
        return fetchData().then(function (next) {
            var pick = wanted;
            wanted = 0;
            var panel = document.getElementById("server-settings");
            var settingsOpen = !!panel && !panel.hidden;
            var target = render(next, pick);
            if (target) {
                if (settingsOpen) target.classList.add("on");
                else if (window.discodeSelectChannel) window.discodeSelectChannel(target, true);
                else target.classList.add("on");
            }
        }).catch(function () {}).then(function () {
            reloading = false;
            if (again) {
                again = false;
                reload();
            }
        });
    }

    function get(url) {
        return fetch(url, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (result) {
                if (!response.ok) throw new Error((result && result.errors && result.errors[0]) || "Something went wrong.");
                return result;
            });
        });
    }

    function post(url, body) {
        return fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify(body)
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (result) {
                if (!response.ok) throw new Error((result && result.errors && result.errors[0]) || "Something went wrong.");
                return result;
            });
        });
    }

    window.discodeServerChannels = {
        createChannel: function (options) {
            return post("/Server/CreateChannel", {
                serverId: Number(serverId),
                name: options.name,
                kind: options.kind,
                categoryId: options.categoryId ? Number(options.categoryId) : null,
                isPrivate: !!options.isPrivate,
                userLimit: Number(options.userLimit) || 0
            }).then(function (channel) {
                return reload(channel.id).then(function () { return channel; });
            });
        },
        getChannelPermissions: function (id) {
            return get("/Server/ChannelPermissions?id=" + encodeURIComponent(serverId) + "&channelId=" + encodeURIComponent(id));
        },
        getViewers: function (id) {
            return get("/Server/ChannelViewers?id=" + encodeURIComponent(serverId) + "&channelId=" + encodeURIComponent(id));
        },
        getCategoryPermissions: function (id) {
            return get("/Server/CategoryPermissions?id=" + encodeURIComponent(serverId) + "&categoryId=" + encodeURIComponent(id));
        },
        searchTargets: function (text) {
            return get("/Server/PermissionTargets?id=" + encodeURIComponent(serverId) + "&search=" + encodeURIComponent(text || ""));
        },
        updateChannel: function (options) {
            return post("/Server/UpdateChannel", {
                serverId: Number(serverId),
                channelId: Number(options.id),
                name: options.name,
                syncWithCategory: options.syncWithCategory === undefined ? null : options.syncWithCategory,
                userLimit: options.userLimit === undefined ? null : options.userLimit,
                overwrites: options.overwrites || null
            }).then(function (channel) {
                return reload().then(function () { return channel; });
            });
        },
        deleteChannel: function (id) {
            return post("/Server/DeleteChannel", { serverId: Number(serverId), channelId: Number(id) }).then(function () {
                return reload();
            });
        },
        updateCategory: function (options) {
            return post("/Server/UpdateCategory", { serverId: Number(serverId), categoryId: Number(options.id), name: options.name, overwrites: options.overwrites || null }).then(function (category) {
                return reload().then(function () { return category; });
            });
        },
        deleteCategory: function (id) {
            return post("/Server/DeleteCategory", { serverId: Number(serverId), categoryId: Number(id) }).then(function () {
                return reload();
            });
        },
        createCategory: function (options) {
            return post("/Server/CreateCategory", { serverId: Number(serverId), name: options.name, isPrivate: !!options.isPrivate }).then(function (category) {
                return reload().then(function () { return category; });
            });
        },
        reload: reload
    };

    var holder = document.getElementById("server-channels-data");
    if (holder) {
        try {
            var first = JSON.parse(holder.getAttribute("data-json") || "null");
            if (first && Array.isArray(first.categories)) {
                var target = render({ loose: first.loose || [], categories: first.categories });
                if (target) target.classList.add("on");
            }
        } catch (error) {}
    }

    document.addEventListener("discode-server-channels-changed", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        reload();
    });

    document.addEventListener("discode-server-roles-changed", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        reload();
    });
})();
