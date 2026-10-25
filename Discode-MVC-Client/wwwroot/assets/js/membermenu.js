(function () {
    "use strict";

    var list = document.getElementById("group-member-list");
    var chat = document.getElementById("group-chat");
    if (!list || !chat) return;

    var meName = chat.getAttribute("data-me") || "";
    var menu = null;
    var current = null;
    var items = {};

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function post(url, body) {
        var headers = { "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" };
        if (body) headers["Content-Type"] = "application/json";
        return fetch(url, { method: "POST", credentials: "same-origin", headers: headers, body: body ? JSON.stringify(body) : undefined }).then(function (response) {
            if (response.ok) return response;
            return response.json().catch(function () { return {}; }).then(function (data) {
                throw new Error((data && data.errors && data.errors[0]) || "Something went wrong.");
            });
        });
    }

    function note(text) {
        var box = document.getElementById("group-error");
        if (!box) return;
        box.textContent = text;
        box.hidden = false;
        window.setTimeout(function () { box.hidden = true; }, 3500);
    }

    function addItem(key, icon, label, danger) {
        var li = document.createElement("li");
        var button = document.createElement("button");
        button.type = "button";
        button.setAttribute("data-member-action", key);
        if (danger) button.className = "row-menu-danger";
        var glyph = document.createElement("i");
        glyph.className = "fa-solid " + icon;
        var text = document.createElement("span");
        text.className = "row-menu-label";
        text.textContent = label;
        button.appendChild(glyph);
        button.appendChild(text);
        li.appendChild(button);
        menu.firstChild.appendChild(li);
        items[key] = { li: li, glyph: glyph, text: text };
    }

    function addLine(key) {
        var li = document.createElement("li");
        li.className = "row-menu-line";
        menu.firstChild.appendChild(li);
        items[key] = { li: li };
    }

    function build() {
        menu = document.createElement("div");
        menu.className = "row-menu member-menu";
        menu.hidden = true;
        menu.appendChild(document.createElement("ul"));
        addItem("profile", "fa-user", "Profile");
        addItem("mention", "fa-at", "Mention");
        addItem("message", "fa-message", "Message");
        addItem("call", "fa-phone", "Start a Call");
        addItem("ring", "fa-bell", "Ring to Call");
        addItem("stopring", "fa-bell-slash", "Stop Ringing");
        addLine("lineOwner");
        addItem("remove", "fa-user-xmark", "Remove From Group", true);
        addItem("owner", "fa-crown", "Make Group Owner", true);
        addLine("line");
        addItem("friend", "fa-user-minus", "Remove Friend");
        addItem("ignore", "fa-eye-slash", "Ignore");
        addItem("block", "fa-ban", "Block", true);
        document.body.appendChild(menu);
        menu.addEventListener("click", onChoose);
    }

    function show(key, on) {
        items[key].li.hidden = !on;
    }

    function iAmOwner() {
        var info = window.discodeGroupInfo;
        return !!info && String(info.ownerUserName || "").toLowerCase() === meName.toLowerCase();
    }

    function groupCall() {
        var calls = window.discodeGroupCalls;
        var active = calls && calls.current ? calls.current() : null;
        var groupId = Number(chat.getAttribute("data-group-id"));
        return active && active.groupId === groupId && active.active !== false ? active : null;
    }

    function paint() {
        var self = current.user === meName;
        var inCall = groupCall();
        var canRing = !self && !!inCall && !inCall.participants.some(function (p) { return p.userName === current.user; });
        show("ring", canRing && !current.ringing);
        show("stopring", canRing && !!current.ringing);
        var owner = !self && iAmOwner();
        show("lineOwner", owner);
        show("remove", owner);
        show("owner", owner);
        show("mention", !self);
        show("message", !self);
        show("call", !self);
        show("line", !self);
        show("friend", !self && current.relation === "friend");
        show("ignore", !self);
        show("block", !self && !!current.relation);
        var ignored = !!(window.discodeIgnored || {})[current.user.toLowerCase()];
        items.ignore.text.textContent = ignored ? "Unignore" : "Ignore";
        items.ignore.glyph.className = "fa-solid " + (ignored ? "fa-eye" : "fa-eye-slash");
        var blocked = current.relation === "blocked";
        items.block.text.textContent = blocked ? "Unblock" : "Block";
        items.block.glyph.className = "fa-solid " + (blocked ? "fa-circle-check" : "fa-ban");
        items.block.li.firstChild.classList.toggle("row-menu-danger", !blocked);
    }

    function place(x, y) {
        menu.hidden = false;
        var width = menu.offsetWidth;
        var height = menu.offsetHeight;
        var left = Math.min(x, window.innerWidth - width - 8);
        var top = Math.min(y, window.innerHeight - height - 8);
        menu.style.left = Math.max(8, left) + "px";
        menu.style.top = Math.max(8, top) + "px";
    }

    function close() {
        if (menu) menu.hidden = true;
    }

    function open(row, x, y) {
        if (menu.getAttribute("data-pop-lock") === "1") {
            window.setTimeout(function () { open(row, x, y); }, 230);
            return;
        }
        var photo = row.querySelector("img");
        current = { user: row.getAttribute("data-user"), avatar: photo ? photo.getAttribute("src") : "", relation: "", friendRequestId: null, blockId: null };
        paint();
        place(x, y);
        if (current.user === meName) return;
        var wanted = current.user;
        var activeCall = groupCall();
        if (activeCall && window.discodePresence && window.discodePresence.invoke) {
            window.discodePresence.invoke("GetGroupCallRinging", activeCall.callId).then(function (names) {
                if (!current || current.user !== wanted) return;
                current.ringing = (names || []).some(function (name) { return String(name).toLowerCase() === wanted.toLowerCase(); });
                paint();
                if (!menu.hidden) place(parseFloat(menu.style.left), parseFloat(menu.style.top));
            }).catch(function () {});
        }
        fetch("/Dm/RelationInfo?name=" + encodeURIComponent(wanted), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (info) {
            if (!info || !current || current.user !== wanted) return;
            current.relation = info.relation || "none";
            current.friendRequestId = info.friendRequestId;
            current.blockId = info.blockId;
            paint();
            if (!menu.hidden) place(parseFloat(menu.style.left), parseFloat(menu.style.top));
        }).catch(function () {});
    }

    function ringMember(userName, on) {
        var activeCall = groupCall();
        if (!activeCall || !window.discodePresence) return;
        window.discodePresence.invoke(on ? "RingGroupCallMember" : "StopRingingGroupCallMember", activeCall.callId, userName).then(function () {
            if (window.discodeGroupCalls.setRinging) window.discodeGroupCalls.setRinging(userName, on);
        }).catch(function (error) { note(String((error && error.message) || "Could not change the ringing.").replace(/^.*HubException:\s*/, "")); });
    }

    function onChoose(event) {
        var button = event.target.closest("[data-member-action]");
        if (!button || !current) return;
        var action = button.getAttribute("data-member-action");
        var target = current;
        close();
        if (action === "profile" && window.openUserProfile) window.openUserProfile(target.user, target.avatar);
        else if (action === "mention" && window.discodeMentions) window.discodeMentions.insert(document.getElementById("group-input"), target.user);
        else if (action === "message") window.discodeGo("/Dm/Index?name=" + encodeURIComponent(target.user));
        else if (action === "call") window.discodeGo("/Dm/Index?name=" + encodeURIComponent(target.user) + "&call=1&t=" + Date.now());
        else if (action === "remove") post("/Group/RemoveMember", { id: Number(chat.getAttribute("data-group-id")), userName: target.user }).catch(function (error) { note(error.message); });
        else if (action === "owner") post("/Group/TransferOwner", { id: Number(chat.getAttribute("data-group-id")), userName: target.user }).catch(function (error) { note(error.message); });
        else if (action === "ring") ringMember(target.user, true);
        else if (action === "stopring") ringMember(target.user, false);
        else if (action === "friend" && target.friendRequestId) post("/Friend/Remove?id=" + target.friendRequestId).catch(function (error) { note(error.message); });
        else if (action === "ignore") post("/Home/IgnoreUser", { userName: target.user }).catch(function (error) { note(error.message); });
        else if (action === "block" && target.relation === "blocked" && target.blockId) post("/Friend/Unblock?id=" + target.blockId).catch(function (error) { note(error.message); });
        else if (action === "block") post("/Friend/Block?userName=" + encodeURIComponent(target.user)).catch(function (error) { note(error.message); });
    }

    build();

    list.addEventListener("contextmenu", function (event) {
        var row = event.target.closest(".group-member");
        if (!row || event.target.closest(".group-kick")) return;
        event.preventDefault();
        open(row, event.clientX, event.clientY);
    });

    document.addEventListener("contextmenu", function (event) {
        if (!menu.hidden && !menu.contains(event.target) && !event.target.closest("#group-member-list .group-member")) close();
    });

    function closeOutside(event) {
        if (menu.hidden || menu.contains(event.target)) return;
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
