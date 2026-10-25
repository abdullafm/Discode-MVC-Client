(function () {
    "use strict";

    var list = document.getElementById("server-list");
    if (!list) return;

    var PREFS_KEY = "discode-server-prefs";
    var menu = null;
    var current = null;

    var MUTES = [
        { label: "For 15 Minutes", minutes: 15 },
        { label: "For 1 Hour", minutes: 60 },
        { label: "For 3 Hours", minutes: 180 },
        { label: "For 8 Hours", minutes: 480 },
        { label: "For 24 Hours", minutes: 1440 },
        { label: "Until I turn it back on", minutes: 0 }
    ];
    var NOTIFY = [
        { key: "all", label: "All Messages" },
        { key: "mentions", label: "Only @mentions" },
        { key: "nothing", label: "Nothing" }
    ];
    var PANELS = [
        { key: "profile", label: "Server Profile" },
        { key: "boost", label: "Boost Perks" },
        { key: "members", label: "Members" },
        { key: "roles", label: "Roles" },
        { key: "audit", label: "Audit Log" },
        { key: "bans", label: "Bans" }
    ];

    function readPrefs() {
        try {
            return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {};
        } catch (error) {
            return {};
        }
    }

    function prefsOf(server) {
        var all = readPrefs();
        var saved = all[server.id] || {};
        return {
            mutedUntil: saved.mutedUntil || 0,
            notify: saved.notify || (server.isOwner ? "all" : "mentions"),
            hideMuted: !!saved.hideMuted,
            showAll: saved.showAll !== false
        };
    }

    function savePref(server, changes) {
        var all = readPrefs();
        all[server.id] = Object.assign(all[server.id] || {}, changes);
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(all));
        } catch (error) {}
    }

    function isMuted(prefs) {
        return prefs.mutedUntil === -1 || prefs.mutedUntil > Date.now();
    }

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function notice(text) {
        var note = element("div", "server-menu-notice", text);
        document.body.appendChild(note);
        window.setTimeout(function () {
            if (window.discodeDismiss) window.discodeDismiss(note);
            else if (note.parentNode) note.parentNode.removeChild(note);
        }, 2600);
    }

    function onThisServer(server) {
        return window.location.pathname.toLowerCase().indexOf("/server") === 0 && new URLSearchParams(window.location.search).get("id") === String(server.id);
    }

    function go(server, action) {
        var url = "/Server/Index?id=" + encodeURIComponent(server.id) + (action ? "&do=" + encodeURIComponent(action) : "");
        window.location.href = url;
    }

    function runHere(action) {
        var steps = {
            invite: function () { var b = document.querySelector("[data-invite='server']"); if (b) b.click(); },
            channel: function () { var b = document.querySelector("[data-create='channel']"); if (b) b.click(); },
            category: function () { var b = document.querySelector("[data-create='category']"); if (b) b.click(); },
            leave: function () { var b = document.getElementById("server-leave-open"); if (b) b.click(); }
        };
        if (action.indexOf("settings:") === 0) {
            var open = document.getElementById("server-settings-open");
            if (open) open.click();
            var panel = document.querySelector(".server-settings-nav [data-panel='" + action.slice(9) + "']");
            if (panel) panel.click();
            return;
        }
        if (steps[action]) steps[action]();
    }

    function perform(server, action) {
        if (onThisServer(server)) runHere(action);
        else go(server, action);
    }

    function itemButton(label, options) {
        var li = document.createElement("li");
        if (options.line) {
            li.className = "row-menu-line";
            return li;
        }
        var button = document.createElement("button");
        button.type = "button";
        if (options.danger) button.className = "row-menu-danger";
        if (options.disabled) button.disabled = true;
        var text = element("span", "row-menu-label", label);
        if (options.subtitle) {
            var holder = element("span", "server-ctx-text");
            holder.appendChild(text);
            holder.appendChild(element("small", "server-ctx-sub", options.subtitle));
            button.appendChild(holder);
        } else {
            button.appendChild(text);
        }
        if (options.check !== undefined) {
            var box = element("span", "server-ctx-check" + (options.check ? " on" : ""));
            if (options.check) box.innerHTML = '<i class="fa-solid fa-check"></i>';
            button.appendChild(box);
        }
        if (options.sub) {
            button.appendChild(element("i", "fa-solid fa-chevron-right row-menu-chev"));
            li.className = "row-menu-branch";
            li.appendChild(button);
            var sub = document.createElement("ul");
            sub.className = "row-menu-sub";
            options.sub.forEach(function (entry) { sub.appendChild(itemButton(entry.label, entry)); });
            li.appendChild(sub);
            return li;
        }
        if (options.onClick) {
            button.addEventListener("click", function () {
                close();
                options.onClick();
            });
        }
        li.appendChild(button);
        return li;
    }

    function build(server) {
        var prefs = prefsOf(server);
        var muted = isMuted(prefs);
        var owner = !!server.isOwner;
        var notifyLabel = (NOTIFY.filter(function (n) { return n.key === prefs.notify; })[0] || NOTIFY[0]).label;
        var items = [];

        items.push({ label: "Mark As Read", disabled: true });
        items.push({ line: true });
        items.push({ label: "Invite to Server", onClick: function () { perform(server, "invite"); } });
        items.push({ line: true });
        if (muted) {
            items.push({ label: "Unmute Server", onClick: function () { savePref(server, { mutedUntil: 0 }); notice("Server unmuted."); } });
        } else {
            items.push({
                label: "Mute Server",
                sub: MUTES.map(function (entry) {
                    return {
                        label: entry.label,
                        onClick: function () {
                            savePref(server, { mutedUntil: entry.minutes ? Date.now() + entry.minutes * 60000 : -1 });
                            notice("Server muted.");
                        }
                    };
                })
            });
        }
        items.push({
            label: "Notification Settings",
            subtitle: notifyLabel,
            sub: NOTIFY.map(function (entry) {
                return {
                    label: entry.label,
                    check: prefs.notify === entry.key,
                    onClick: function () { savePref(server, { notify: entry.key }); }
                };
            })
        });
        items.push({
            label: "Hide Muted Channels",
            check: prefs.hideMuted,
            onClick: function () { savePref(server, { hideMuted: !prefs.hideMuted }); }
        });
        if (!owner) {
            items.push({
                label: "Show All Channels",
                check: prefs.showAll,
                onClick: function () { savePref(server, { showAll: !prefs.showAll }); }
            });
        }
        items.push({ line: true });
        if (owner) {
            items.push({
                label: "Server Settings",
                sub: PANELS.map(function (panel) {
                    return { label: panel.label, onClick: function () { perform(server, "settings:" + panel.key); } };
                })
            });
        }
        items.push({ label: "Privacy Settings", onClick: openPrivacy });
        items.push({ label: "Edit Per-server Profile", onClick: openProfile });
        items.push({ line: true });
        if (owner) {
            items.push({ label: "Create Channel", onClick: function () { perform(server, "channel"); } });
            items.push({ label: "Create Category", onClick: function () { perform(server, "category"); } });
            items.push({ label: "Create Event", onClick: function () { notice("Events are not available yet."); } });
            items.push({ line: true });
        }
        items.push({
            label: "Move to...",
            sub: [
                { label: "Move to Top", onClick: function () { move(server, "top"); } },
                { label: "Move Up", onClick: function () { move(server, "up"); } },
                { label: "Move Down", onClick: function () { move(server, "down"); } },
                { label: "Move to Bottom", onClick: function () { move(server, "bottom"); } }
            ]
        });
        if (!owner) {
            items.push({ line: true });
            items.push({ label: "Leave Server", danger: true, onClick: function () { perform(server, "leave"); } });
        }
        return items;
    }

    function move(server, where) {
        if (window.discodeMoveServer) window.discodeMoveServer(server.id, where);
    }

    function openPrivacy() {
        var open = document.getElementById("settings-open");
        if (open) open.click();
        var tab = document.querySelector("[data-settings-tab='privacy']");
        if (tab) tab.click();
    }

    function openProfile() {
        var handle = document.getElementById("me-handle-name");
        if (window.openUserProfile && handle) window.openUserProfile(handle.textContent.trim(), "");
    }

    function close() {
        if (menu) menu.hidden = true;
    }

    function open(server, x, y) {
        if (!menu) {
            menu = element("div", "row-menu server-ctx");
            menu.hidden = true;
            menu.appendChild(document.createElement("ul"));
            document.body.appendChild(menu);
            menu.addEventListener("mouseover", function (event) {
                var branch = event.target.closest(".row-menu-branch");
                if (!branch || !menu.contains(branch)) return;
                var sub = branch.querySelector(".row-menu-sub");
                if (!sub) return;
                sub.style.left = "";
                sub.style.right = "";
                sub.style.top = "0";
                sub.style.bottom = "auto";
                var rect = sub.getBoundingClientRect();
                if (rect.right > window.innerWidth - 8) {
                    sub.style.left = "auto";
                    sub.style.right = "calc(100% + 6px)";
                }
                rect = sub.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 8) {
                    sub.style.top = "auto";
                    sub.style.bottom = "0";
                }
            });
        }
        if (menu.getAttribute("data-pop-lock") === "1") {
            window.setTimeout(function () { open(server, x, y); }, 230);
            return;
        }
        current = server;
        var holder = menu.firstChild;
        holder.textContent = "";
        build(server).forEach(function (entry) { holder.appendChild(itemButton(entry.label, entry)); });
        menu.hidden = false;
        var width = menu.offsetWidth;
        var height = menu.offsetHeight;
        menu.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + "px";
        menu.style.top = Math.max(8, Math.min(y, window.innerHeight - height - 8)) + "px";
    }

    document.addEventListener("contextmenu", function (event) {
        var chip = event.target.closest("#server-list .server-chip");
        if (!chip || !chip._server) {
            if (menu && !menu.hidden && !menu.contains(event.target)) close();
            return;
        }
        event.preventDefault();
        open(chip._server, event.clientX, event.clientY);
    });

    function closeOutside(event) {
        if (!menu || menu.hidden || menu.contains(event.target)) return;
        if (event.button === 2) return;
        close();
    }

    document.addEventListener("mousedown", closeOutside, true);
    document.addEventListener("click", closeOutside, true);
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") close();
    });
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
})();
