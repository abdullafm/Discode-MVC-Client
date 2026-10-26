(function () {
    "use strict";

    var list = document.getElementById("server-audit-list");
    if (!list) return;

    var serverId = new URLSearchParams(window.location.search).get("id");
    if (!serverId) return;

    var userFilter = document.getElementById("audit-user");
    var actionFilter = document.getElementById("audit-action");
    var emptyNote = document.querySelector(".audit-empty");
    var moreButton = document.getElementById("audit-more");
    var nav = document.querySelector(".server-settings-nav [data-panel='audit']");
    var panel = document.getElementById("server-settings-panel-5");
    var PAGE = 50;
    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";

    var ICONS = {
        ServerUpdate: "fa-gear",
        InviteUpdate: "fa-link",
        ChannelCreate: "fa-hashtag",
        ChannelUpdate: "fa-hashtag",
        ChannelDelete: "fa-hashtag",
        CategoryCreate: "fa-folder",
        CategoryUpdate: "fa-folder",
        CategoryDelete: "fa-folder",
        RoleCreate: "fa-shield",
        RoleUpdate: "fa-shield",
        RoleDelete: "fa-shield",
        MemberJoin: "fa-right-to-bracket",
        MemberLeave: "fa-right-from-bracket",
        MemberKick: "fa-user-xmark",
        MemberBan: "fa-gavel",
        MemberUnban: "fa-gavel",
        MemberRoleUpdate: "fa-user-tag",
        MemberMute: "fa-microphone-slash",
        MemberUnmute: "fa-microphone",
        MemberVoiceDisconnect: "fa-phone-slash"
    };
    var TONES = {
        RoleCreate: "good",
        ChannelCreate: "good",
        CategoryCreate: "good",
        MemberJoin: "good",
        MemberUnban: "good",
        MemberUnmute: "good",
        RoleDelete: "bad",
        ChannelDelete: "bad",
        CategoryDelete: "bad",
        MemberLeave: "bad",
        MemberKick: "bad",
        MemberBan: "bad",
        MemberMute: "bad",
        MemberVoiceDisconnect: "bad"
    };

    var entries = [];
    var members = [];
    var opened = false;
    var loading = false;
    var finished = false;
    var queued = "";

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function ago(value) {
        var seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
        if (seconds < 60) return "just now";
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
        var days = Math.floor(hours / 24);
        if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
        var months = Math.floor(days / 30);
        if (months < 12) return months + (months === 1 ? " month ago" : " months ago");
        var years = Math.floor(days / 365);
        return years + (years === 1 ? " year ago" : " years ago");
    }

    function sentence(entry) {
        var who = entry.targetName || "";
        switch (entry.action) {
            case "ServerUpdate": return entry.details === "Created the server" ? "created the server" : "updated the server";
            case "InviteUpdate": return "changed the invite link";
            case "ChannelCreate": return "created the channel " + who;
            case "ChannelUpdate": return "updated the channel " + who;
            case "ChannelDelete": return "deleted the channel " + who;
            case "CategoryCreate": return "created the category " + who;
            case "CategoryUpdate": return "updated the category " + who;
            case "CategoryDelete": return "deleted the category " + who;
            case "RoleCreate": return "created the role " + who;
            case "RoleUpdate": return "updated the role " + who;
            case "RoleDelete": return "deleted the role " + who;
            case "MemberJoin": return "joined the server";
            case "MemberLeave": return "left the server";
            case "MemberKick": return "kicked " + who;
            case "MemberBan": return "banned " + who;
            case "MemberUnban": return "unbanned " + who;
            case "MemberRoleUpdate": return "updated the roles of " + who;
            case "MemberMute": return "muted " + who + " in voice";
            case "MemberUnmute": return "unmuted " + who + " in voice";
            case "MemberVoiceDisconnect": return "disconnected " + who + " from voice";
            default: return entry.action;
        }
    }

    function row(entry) {
        var item = element("div", "audit-row");
        var icon = element("span", "audit-icon " + (TONES[entry.action] || ""));
        icon.appendChild(element("i", "fa-solid " + (ICONS[entry.action] || "fa-circle-info")));
        item.appendChild(icon);
        var body = element("div", "audit-body");
        var line = element("p", "audit-line");
        var photo = document.createElement("img");
        photo.alt = "";
        photo.src = entry.actorAvatarUrl || DEFAULT_AVATAR;
        line.appendChild(photo);
        line.appendChild(element("strong", "", entry.actorDisplayName));
        line.appendChild(document.createTextNode(" " + sentence(entry)));
        body.appendChild(line);
        var quiet = ["RoleCreate", "RoleDelete", "MemberLeave"].indexOf(entry.action) !== -1 || entry.details === "Created the server";
        var details = quiet ? [] : String(entry.details || "").split("; ").filter(Boolean);
        if (details.length) {
            var notes = element("ul", "audit-notes");
            details.forEach(function (text) { notes.appendChild(element("li", "", text)); });
            body.appendChild(notes);
        }
        item.appendChild(body);
        var time = element("time", "audit-time", ago(entry.createdAt));
        time.title = new Date(entry.createdAt).toLocaleString();
        item.appendChild(time);
        return item;
    }

    function render() {
        list.textContent = "";
        entries.forEach(function (entry) { list.appendChild(row(entry)); });
        if (emptyNote) emptyNote.hidden = entries.length > 0;
        if (moreButton) moreButton.hidden = finished || entries.length === 0;
    }

    function paintUsers() {
        if (!userFilter) return;
        var current = userFilter.value;
        var seen = {};
        var people = [];
        members.forEach(function (member) {
            seen[member.id] = true;
            people.push({ id: member.id, name: member.displayName });
        });
        entries.forEach(function (entry) {
            if (seen[entry.actorId]) return;
            seen[entry.actorId] = true;
            people.push({ id: entry.actorId, name: entry.actorDisplayName });
        });
        userFilter.textContent = "";
        var all = document.createElement("option");
        all.value = "";
        all.textContent = "All Users";
        userFilter.appendChild(all);
        people.forEach(function (person) {
            var option = document.createElement("option");
            option.value = person.id;
            option.textContent = person.name;
            userFilter.appendChild(option);
        });
        userFilter.value = current;
    }

    function query(before) {
        var parts = ["id=" + encodeURIComponent(serverId), "take=" + PAGE];
        if (userFilter && userFilter.value) parts.push("actorId=" + encodeURIComponent(userFilter.value));
        if (actionFilter && actionFilter.value) parts.push("kind=" + encodeURIComponent(actionFilter.value));
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
            queued = more ? queued : "fresh";
            return;
        }
        loading = true;
        var before = more && entries.length ? entries[entries.length - 1].id : 0;
        fetchJson(query(before)).then(function (page) {
            page = Array.isArray(page) ? page : [];
            entries = more ? entries.concat(page) : page;
            finished = page.length < PAGE;
            paintUsers();
            render();
        }).catch(function () {}).then(function () {
            loading = false;
            if (queued) {
                queued = "";
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
        loadMembers();
        load(false);
    }

    function refresh() {
        if (!opened) return;
        if (panel && panel.hidden) return;
        load(false);
    }

    if (nav) nav.addEventListener("click", open);
    if (userFilter) userFilter.addEventListener("change", function () { load(false); });
    if (actionFilter) actionFilter.addEventListener("change", function () { load(false); });
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
        if (entries.length && panel && !panel.hidden) render();
    }, 60000);
})();
