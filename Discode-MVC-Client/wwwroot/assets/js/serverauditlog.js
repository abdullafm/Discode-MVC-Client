(function () {
    "use strict";

    var list = document.getElementById("server-audit-list");
    if (!list) return;

    var serverId = new URLSearchParams(window.location.search).get("id");
    if (!serverId) return;

    var userSelect = document.getElementById("audit-user");
    var actionSelect = document.getElementById("audit-action");
    var emptyNote = document.querySelector(".audit-empty");
    var moreButton = document.getElementById("audit-more");
    var nav = document.querySelector(".server-settings-nav [data-panel='audit']");
    var panel = document.getElementById("server-settings-panel-5");
    var PAGE = 50;
    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";

    var KINDS = [
        { key: "", label: "All Actions", icon: "fa-list" },
        { key: "ServerUpdate", label: "Update Server", icon: "fa-gear", badge: "update" },
        { key: "InviteUpdate", label: "Update Invite Link", icon: "fa-link", badge: "update" },
        { key: "ChannelCreate", label: "Create Channel", icon: "fa-hashtag", badge: "create" },
        { key: "ChannelUpdate", label: "Update Channel", icon: "fa-hashtag", badge: "update" },
        { key: "ChannelDelete", label: "Delete Channel", icon: "fa-hashtag", badge: "delete" },
        { key: "CategoryCreate", label: "Create Category", icon: "fa-folder", badge: "create" },
        { key: "CategoryUpdate", label: "Update Category", icon: "fa-folder", badge: "update" },
        { key: "CategoryDelete", label: "Delete Category", icon: "fa-folder", badge: "delete" },
        { key: "RoleCreate", label: "Create Role", icon: "fa-flag", badge: "create" },
        { key: "RoleUpdate", label: "Update Role", icon: "fa-flag", badge: "update" },
        { key: "RoleDelete", label: "Delete Role", icon: "fa-flag", badge: "delete" },
        { key: "MemberJoin", label: "Member Join", icon: "fa-user-group", badge: "create" },
        { key: "MemberLeave", label: "Member Leave", icon: "fa-user-group", badge: "delete" },
        { key: "MemberKick", label: "Kick Member", icon: "fa-user-group", badge: "delete" },
        { key: "MemberBan", label: "Ban Member", icon: "fa-user-group", badge: "delete" },
        { key: "MemberUnban", label: "Unban Member", icon: "fa-user-group", badge: "create" },
        { key: "MemberRoleUpdate", label: "Update Member Roles", icon: "fa-user-group", badge: "update" },
        { key: "MemberMute", label: "Mute Member", icon: "fa-microphone-slash", badge: "delete" },
        { key: "MemberUnmute", label: "Unmute Member", icon: "fa-microphone", badge: "create" },
        { key: "MemberVoiceDisconnect", label: "Disconnect Member", icon: "fa-user-group", badge: "delete" }
    ];
    var BADGES = { create: "fa-plus", update: "fa-rotate", delete: "fa-minus" };

    var entries = [];
    var members = [];
    var opened = false;
    var loading = false;
    var finished = false;
    var queued = false;
    var filters = { user: "", kind: "" };
    var combos = [];

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function kindOf(key) {
        for (var i = 0; i < KINDS.length; i++) if (KINDS[i].key === key) return KINDS[i];
        return KINDS[0];
    }

    function iconNode(kind) {
        var holder = element("span", "audit-glyph");
        holder.appendChild(element("i", "fa-solid " + kind.icon));
        if (kind.badge) {
            var badge = element("span", "audit-badge is-" + kind.badge);
            badge.appendChild(element("i", "fa-solid " + BADGES[kind.badge]));
            holder.appendChild(badge);
        }
        return holder;
    }

    function stamp(value) {
        var date = new Date(value);
        var now = new Date();
        var time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        var sameDay = function (a, b) { return a.toDateString() === b.toDateString(); };
        if (sameDay(date, now)) return "Today at " + time;
        var yesterday = new Date(now.getTime() - 86400000);
        if (sameDay(date, yesterday)) return "Yesterday at " + time;
        return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    }

    function headline(entry) {
        var line = element("span", "audit-title");
        function part(text) { line.appendChild(document.createTextNode(text)); }
        function bold(text) { line.appendChild(element("strong", "", text)); }
        part(entry.actorUserName + " ");
        var who = entry.targetName || "";
        switch (entry.action) {
            case "ServerUpdate":
                if (entry.details === "Created the server") { part("created "); bold(who); }
                else { part("made changes to "); bold(who); }
                break;
            case "InviteUpdate": part("changed the invite link of "); bold(who); break;
            case "ChannelCreate": part("created a channel "); bold(who); break;
            case "ChannelUpdate": part("updated the channel "); bold(who); break;
            case "ChannelDelete": part("deleted the channel "); bold(who); break;
            case "CategoryCreate": part("created a category "); bold(who); break;
            case "CategoryUpdate": part("updated the category "); bold(who); break;
            case "CategoryDelete": part("deleted the category "); bold(who); break;
            case "RoleCreate": part("created the role "); bold(who); break;
            case "RoleUpdate": part("updated the role "); bold(who); break;
            case "RoleDelete": part("deleted the role "); bold(who); break;
            case "MemberJoin": part("joined the server"); break;
            case "MemberLeave": part("left the server"); break;
            case "MemberKick": part("kicked "); bold(who); break;
            case "MemberBan": part("banned "); bold(who); break;
            case "MemberUnban": part("unbanned "); bold(who); break;
            case "MemberRoleUpdate": part("updated roles for "); bold(who); break;
            case "MemberMute": part("muted "); bold(who); break;
            case "MemberUnmute": part("unmuted "); bold(who); break;
            case "MemberVoiceDisconnect": part("disconnected "); bold(who); break;
            default: part(entry.action);
        }
        return line;
    }

    function card(entry) {
        var wrap = element("div", "audit-card");
        wrap.setAttribute("data-id", entry.id);
        var head = element("button", "audit-head-row");
        head.type = "button";
        head.setAttribute("aria-expanded", "false");
        head.appendChild(iconNode(kindOf(entry.action)));
        var photo = document.createElement("img");
        photo.className = "audit-avatar";
        photo.alt = "";
        photo.src = entry.actorAvatarUrl || DEFAULT_AVATAR;
        head.appendChild(photo);
        var copy = element("span", "audit-copy");
        copy.appendChild(headline(entry));
        var time = element("small", "audit-stamp", stamp(entry.createdAt));
        time.title = new Date(entry.createdAt).toLocaleString();
        copy.appendChild(time);
        head.appendChild(copy);
        head.appendChild(element("i", "fa-solid fa-chevron-right audit-chevron"));
        wrap.appendChild(head);

        var quiet = ["RoleCreate", "RoleDelete", "MemberLeave"].indexOf(entry.action) !== -1 || entry.details === "Created the server";
        var details = quiet ? [] : String(entry.details || "").split("; ").filter(Boolean);
        var body = element("div", "audit-detail");
        if (details.length) {
            var notes = element("ul", "audit-notes");
            details.forEach(function (text) { notes.appendChild(element("li", "", text)); });
            body.appendChild(notes);
        }
        body.appendChild(element("p", "audit-meta", "Done by " + entry.actorDisplayName + " on " + new Date(entry.createdAt).toLocaleString()));
        wrap.appendChild(body);

        head.addEventListener("click", function () {
            var openNow = !wrap.classList.contains("open");
            wrap.classList.toggle("open", openNow);
            head.setAttribute("aria-expanded", openNow ? "true" : "false");
        });
        return wrap;
    }

    function render(expanded) {
        list.textContent = "";
        entries.forEach(function (entry) {
            var node = card(entry);
            if (expanded && expanded.indexOf(String(entry.id)) !== -1) {
                node.classList.add("open");
                node.firstChild.setAttribute("aria-expanded", "true");
            }
            list.appendChild(node);
        });
        if (emptyNote) emptyNote.hidden = entries.length > 0;
        if (moreButton) moreButton.hidden = finished || entries.length === 0;
    }

    function Combo(host, label, onPick) {
        var root = element("div", "audit-combo");
        var field = element("div", "audit-combo-field");
        var lead = element("span", "audit-combo-lead");
        var input = document.createElement("input");
        input.type = "text";
        input.spellcheck = false;
        input.autocomplete = "off";
        input.setAttribute("aria-label", label);
        var caret = element("i", "fa-solid fa-chevron-down audit-combo-caret");
        field.appendChild(lead);
        field.appendChild(input);
        field.appendChild(caret);
        var menu = element("div", "audit-combo-menu");
        menu.hidden = true;
        root.appendChild(field);
        root.appendChild(menu);
        host.appendChild(root);

        var items = [];
        var current = { key: "", label: "" };

        function paintLead(item) {
            lead.textContent = "";
            if (item && item.node) lead.appendChild(item.node());
        }

        function close() {
            menu.hidden = true;
            root.classList.remove("open");
            input.value = current.label;
        }

        function draw(text) {
            menu.textContent = "";
            var needle = text.trim().toLowerCase();
            items.filter(function (item) { return !needle || item.label.toLowerCase().indexOf(needle) !== -1; }).forEach(function (item) {
                var row = element("button", "audit-combo-item" + (item.key === current.key ? " on" : ""));
                row.type = "button";
                if (item.node) row.appendChild(item.node());
                row.appendChild(element("span", "", item.label));
                row.addEventListener("mousedown", function (event) {
                    event.preventDefault();
                    current = item;
                    paintLead(item);
                    close();
                    input.blur();
                    onPick(item.key);
                });
                menu.appendChild(row);
            });
        }

        input.addEventListener("focus", function () {
            input.select();
            draw("");
            menu.hidden = false;
            root.classList.add("open");
        });
        input.addEventListener("input", function () {
            draw(input.value);
            menu.hidden = false;
            root.classList.add("open");
        });
        input.addEventListener("blur", close);
        input.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                event.stopPropagation();
                close();
                input.blur();
            }
        });
        caret.addEventListener("mousedown", function (event) {
            event.preventDefault();
            if (menu.hidden) input.focus();
            else input.blur();
        });

        return {
            set: function (next, selectedKey) {
                items = next;
                current = items.filter(function (item) { return item.key === selectedKey; })[0] || items[0];
                paintLead(current);
                if (document.activeElement !== input) input.value = current.label;
            }
        };
    }

    function peopleNode(avatar) {
        return function () {
            var photo = document.createElement("img");
            photo.className = "audit-combo-avatar";
            photo.alt = "";
            photo.src = avatar || DEFAULT_AVATAR;
            return photo;
        };
    }

    function buildCombos() {
        var heads = document.querySelectorAll(".audit-filter");
        if (heads.length < 2 || combos.length) return;
        [userSelect, actionSelect].forEach(function (select) {
            if (select) select.hidden = true;
        });
        var userCombo = new Combo(heads[0], "Filter by User", function (key) {
            filters.user = key;
            load(false);
        });
        var actionCombo = new Combo(heads[1], "Filter by Action", function (key) {
            filters.kind = key;
            load(false);
        });
        actionCombo.set(KINDS.map(function (kind) {
            return { key: kind.key, label: kind.label, node: function () { return iconNode(kind); } };
        }), "");
        userCombo.set([{ key: "", label: "All Users", node: function () { return iconNode({ icon: "fa-users" }); } }], "");
        combos = [userCombo, actionCombo];
    }

    function paintUsers() {
        if (!combos.length) return;
        var seen = {};
        var people = [{ key: "", label: "All Users", node: function () { return iconNode({ icon: "fa-users" }); } }];
        function add(id, name, avatar) {
            if (seen[id]) return;
            seen[id] = true;
            people.push({ key: id, label: name, node: peopleNode(avatar) });
        }
        members.forEach(function (member) { add(member.id, member.displayName, member.avatarUrl); });
        entries.forEach(function (entry) { add(entry.actorId, entry.actorDisplayName, entry.actorAvatarUrl); });
        combos[0].set(people, filters.user);
    }

    function query(before) {
        var parts = ["id=" + encodeURIComponent(serverId), "take=" + PAGE];
        if (filters.user) parts.push("actorId=" + encodeURIComponent(filters.user));
        if (filters.kind) parts.push("kind=" + encodeURIComponent(filters.kind));
        if (before) parts.push("beforeId=" + before);
        return "/Server/Audit?" + parts.join("&");
    }

    function fetchJson(url) {
        return fetch(url, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("audit");
            return response.json();
        });
    }

    function load(more) {
        if (loading) {
            if (!more) queued = true;
            return;
        }
        loading = true;
        var before = more && entries.length ? entries[entries.length - 1].id : 0;
        fetchJson(query(before)).then(function (page) {
            page = Array.isArray(page) ? page : [];
            var expanded = [].map.call(list.querySelectorAll(".audit-card.open"), function (node) { return node.getAttribute("data-id"); });
            entries = more ? entries.concat(page) : page;
            finished = page.length < PAGE;
            paintUsers();
            render(expanded);
        }).catch(function () {}).then(function () {
            loading = false;
            if (queued) {
                queued = false;
                load(false);
            }
        });
    }

    function loadMembers() {
        fetchJson("/Server/Members?id=" + encodeURIComponent(serverId)).then(function (data) {
            members = Array.isArray(data) ? data : [];
            paintUsers();
        }).catch(function () {});
    }

    function open() {
        opened = true;
        buildCombos();
        loadMembers();
        load(false);
    }

    function refresh() {
        if (!opened) return;
        if (panel && panel.hidden) return;
        load(false);
    }

    if (nav) nav.addEventListener("click", open);
    if (moreButton) moreButton.addEventListener("click", function () { load(true); });

    document.addEventListener("discode-server-audit-changed", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        refresh();
    });

    var tick = window.setInterval(function () {
        if (!document.body.contains(list)) {
            window.clearInterval(tick);
            return;
        }
        if (entries.length && panel && !panel.hidden) {
            var expanded = [].map.call(list.querySelectorAll(".audit-card.open"), function (node) { return node.getAttribute("data-id"); });
            render(expanded);
        }
    }, 60000);
})();
