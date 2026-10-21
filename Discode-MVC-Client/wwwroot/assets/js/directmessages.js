"use strict";

(function () {
    var list = document.querySelector(".direct-messages .friend-list");
    if (!list) return;

    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
    var conversations = [];

    function token() {
        var input = document.querySelector("input[name='__RequestVerificationToken']");
        return input ? input.value : "";
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
            return response.ok ? response.json().catch(function () { return {}; }) : Promise.reject(new Error("request failed"));
        });
    }

    function openUser() {
        if (window.discodeOpenDm) return window.discodeOpenDm;
        if (window.location.pathname.toLowerCase().indexOf("/dm") !== 0) return "";
        return new URLSearchParams(window.location.search).get("name") || "";
    }

    function buildRow(conversation, index) {
        var row = document.createElement("a");
        row.className = "friend-item" + (conversation.unreadCount > 0 ? " has-unread" : "");
        row.href = "/Dm/Index?name=" + encodeURIComponent(conversation.userName);
        row.setAttribute("data-dm", conversation.userName);
        row.setAttribute("data-user-id", conversation.userId);
        row.setAttribute("data-presence", conversation.status || "offline");
        row.setAttribute("data-order", String(index));
        row.classList.toggle("active", conversation.userName === openUser());

        var avatar = document.createElement("div");
        avatar.className = "avatar";
        var image = document.createElement("img");
        image.src = conversation.avatarUrl || DEFAULT_AVATAR;
        image.alt = "";
        avatar.appendChild(image);

        var label = document.createElement("p");
        label.textContent = conversation.displayName || conversation.userName;

        var unread = document.createElement("span");
        unread.className = "dm-unread";
        unread.textContent = conversation.unreadCount > 99 ? "99+" : String(conversation.unreadCount);
        unread.hidden = conversation.unreadCount <= 0;

        var close = document.createElement("i");
        close.className = "fa fa-xmark";
        close.setAttribute("title", "Close DM");

        row.appendChild(avatar);
        row.appendChild(label);
        row.appendChild(unread);
        row.appendChild(close);
        return row;
    }

    function render() {
        var old = list.querySelectorAll("[data-dm]");
        for (var i = 0; i < old.length; i++) old[i].remove();
        conversations.forEach(function (conversation, index) {
            list.appendChild(buildRow(conversation, index));
        });
        list.dataset.ordered = "1";
        if (typeof applyPins === "function") applyPins();
    }

    function load() {
        return request("/Dm/Conversations").then(function (data) {
            conversations = Array.isArray(data) ? data : [];
            render();
        }).catch(function () {});
    }

    function upsert(conversation) {
        if (conversation.userName === openUser() && !conversation.lastMessageMine) conversation.unreadCount = 0;
        conversations = conversations.filter(function (item) { return item.userName !== conversation.userName; });
        conversations.unshift(conversation);
        render();
    }

    list.addEventListener("click", function (event) {
        var close = event.target.closest("[data-dm] > i.fa-xmark");
        if (!close) return;
        event.preventDefault();
        event.stopPropagation();
        var userName = close.parentNode.getAttribute("data-dm");
        conversations = conversations.filter(function (item) { return item.userName !== userName; });
        render();
        request("/Dm/Close", "POST", { userName: userName }).catch(function () {});
    }, true);

    document.addEventListener("discode-dm-message", function (event) {
        var data = event.detail;
        if (data && data.conversation) upsert(data.conversation);
    });

    document.addEventListener("discode-dm-read", function (event) {
        var userName = event.detail.userName;
        conversations.forEach(function (item) {
            if (item.userName === userName) item.unreadCount = 0;
        });
        render();
    });

    document.addEventListener("discode-user-presence", function (event) {
        var rows = list.querySelectorAll("[data-dm]");
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute("data-user-id") === event.detail.userId) rows[i].setAttribute("data-presence", event.detail.status);
        }
        conversations.forEach(function (item) {
            if (item.userId === event.detail.userId) item.status = event.detail.status;
        });
    });

    document.addEventListener("discode-dm-changed", load);
    document.addEventListener("discode-profile-changed", load);
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) load();
    });

    load();
})();
