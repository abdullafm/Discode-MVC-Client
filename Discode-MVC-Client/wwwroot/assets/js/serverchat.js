"use strict";

(function () {
    var chat = document.getElementById("server-chat");
    var box = document.getElementById("group-messages");
    if (!chat || !box || !window.GroupParts) return;

    var serverId = Number(new URLSearchParams(window.location.search).get("id")) || 0;
    if (!serverId) return;

    var meName = chat.getAttribute("data-me") || "";
    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
    var scroller = document.getElementById("group-scroll");
    var input = document.getElementById("group-input");
    var compose = document.getElementById("group-compose");
    var errorBox = document.getElementById("group-error");
    var lockNote = document.getElementById("server-chat-lock");
    var emptyNote = document.getElementById("server-chat-empty");
    var introTitle = document.getElementById("server-chat-title");
    var introText = document.getElementById("server-chat-welcome");
    var introBadge = document.getElementById("server-chat-badge");
    var placeholder = document.getElementById("group-placeholder");
    var PAGE_SIZE = 50;

    var channelId = 0;
    var channelName = "";
    var channelKind = "text";
    var channelReadOnly = false;
    var loaded = [];
    var hasMore = true;
    var loadingOlder = false;
    var generation = 0;

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

    function showError(text) {
        errorBox.textContent = text || "";
        errorBox.hidden = !text;
        if (text) setTimeout(function () { if (errorBox.textContent === text) showError(""); }, 5000);
    }

    function stamp(value) {
        if (typeof value === "number") return value;
        var text = String(value || "");
        return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(text) ? text : text + "Z");
    }

    function clock(value) {
        return new Date(stamp(value)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function dayLabel(value) {
        return new Date(stamp(value)).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
    }

    function perms() {
        var state = window.discodeServerRoles;
        return state ? Number(state.perms) || 0 : 0;
    }

    function canSend() {
        var needed = channelKind === "announce" || channelReadOnly ? 512 : 256;
        var have = perms();
        return have === 0 ? true : (have & needed) === needed;
    }

    function canPoll() {
        var have = perms();
        return have !== 0 && (have & 131072) === 131072;
    }

    function lastRow() {
        var last = box.lastElementChild;
        while (last && !last.hasAttribute("data-id")) last = last.previousElementSibling;
        return last;
    }

    function append(message, force) {
        if (message.channelId && message.channelId !== channelId) return;
        if (box.querySelector('[data-id="' + message.id + '"]')) return;
        if (!loaded.some(function (item) { return item.id === message.id; })) loaded.push(message);
        var atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 140;
        var last = lastRow();
        var when = stamp(message.createdAt);
        var newDay = !last || dayLabel(Number(last.getAttribute("data-time"))) !== dayLabel(when);
        if (newDay) {
            var divider = document.createElement("div");
            divider.className = "dm-divider";
            var label = document.createElement("span");
            label.textContent = dayLabel(when);
            divider.appendChild(label);
            box.appendChild(divider);
        }
        var compact = !newDay && !message.replyTo && last && last.getAttribute("data-sender") === message.senderUserName && when - Number(last.getAttribute("data-time")) < 5 * 60 * 1000 && box.lastElementChild === last;
        var row = document.createElement("div");
        row.className = "dm-msg" + (compact ? " compact" : "");
        row.setAttribute("data-sender", message.senderUserName);
        row.setAttribute("data-mine", message.senderUserName === meName ? "1" : "0");
        var face = document.createElement("img");
        face.className = "dm-msg-avatar";
        face.alt = "";
        face.src = message.senderAvatarUrl || DEFAULT_AVATAR;
        var body = document.createElement("div");
        body.className = "dm-msg-body";
        var head = document.createElement("div");
        head.className = "dm-msg-head";
        var who = document.createElement("strong");
        who.textContent = message.senderDisplayName || message.senderUserName;
        var time = document.createElement("time");
        time.textContent = clock(message.createdAt);
        head.appendChild(who);
        head.appendChild(time);
        body.appendChild(head);
        if (message.text) {
            var text = document.createElement("div");
            text.className = "dm-msg-text";
            window.GroupParts.textNodes(message.text).forEach(function (node) { text.appendChild(node); });
            body.appendChild(text);
        }
        row.appendChild(face);
        row.appendChild(body);
        window.GroupParts.decorate(row, body, message);
        row.setAttribute("data-id", String(message.id));
        row.setAttribute("data-public-id", message.publicId || "");
        row.setAttribute("data-time", String(when));
        box.appendChild(row);
        if (force || atBottom || message.senderUserName === meName) scroller.scrollTop = scroller.scrollHeight;
    }

    function renderAll() {
        var list = loaded.slice();
        box.textContent = "";
        list.forEach(function (message) { append(message, false); });
    }

    function path(suffix) {
        return "/ServerMessage/" + suffix;
    }

    function loadMessages(mine) {
        return request(path("List") + "?serverId=" + serverId + "&channelId=" + channelId).then(function (list) {
            if (mine !== generation) return;
            loaded = Array.isArray(list) ? list.slice() : [];
            hasMore = loaded.length >= PAGE_SIZE;
            renderAll();
            scroller.scrollTop = scroller.scrollHeight;
        }).catch(function (error) {
            if (mine === generation) showError(error.message);
        });
    }


    function repaintSenders(list) {
        list.forEach(function (message) {
            var row = box.querySelector('[data-id="' + message.id + '"]');
            if (!row) return;
            var face = row.querySelector(".dm-msg-avatar");
            var photo = message.senderAvatarUrl || DEFAULT_AVATAR;
            if (face && face.getAttribute("src") !== photo) face.src = photo;
            var who = row.querySelector(".dm-msg-head strong");
            var name = message.senderDisplayName || message.senderUserName;
            if (who && who.textContent !== name) who.textContent = name;
        });
    }

    function loadOlder() {
        if (loadingOlder || !hasMore || !loaded.length) return;
        var first = loaded.reduce(function (lowest, message) { return message.id < lowest ? message.id : lowest; }, loaded[0].id);
        var mine = generation;
        loadingOlder = true;
        request(path("List") + "?serverId=" + serverId + "&channelId=" + channelId + "&before=" + first).then(function (list) {
            if (mine !== generation) return;
            list = Array.isArray(list) ? list : [];
            hasMore = list.length >= PAGE_SIZE;
            if (!list.length) return;
            var before = scroller.scrollHeight;
            var top = scroller.scrollTop;
            loaded = list.concat(loaded);
            renderAll();
            scroller.scrollTop = scroller.scrollHeight - before + top;
        }).catch(function () {}).then(function () {
            loadingOlder = false;
        });
    }

    scroller.addEventListener("scroll", function () {
        if (scroller.scrollTop < 80) loadOlder();
    });

    function send() {
        if (!channelId || !canSend()) return;
        var text = window.GroupParts.text();
        var ready = window.GroupParts.takeFiles();
        if (ready === null) {
            showError("Wait for the upload to finish.");
            return;
        }
        if (!text && !ready.length) return;
        var replyId = window.GroupParts.replyId();
        var sentTo = channelId;
        window.GroupParts.clear();
        window.GroupParts.cancelReply();
        request(path("Send"), "POST", {
            serverId: serverId,
            channelId: sentTo,
            text: text,
            replyToMessageId: replyId,
            attachments: ready.map(function (item) { return item.data; })
        }).then(function (message) {
            ready.forEach(function (item) { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
            if (sentTo === channelId) append(message, true);
        }).catch(function (error) {
            showError(error.message);
            window.GroupParts.restore(text);
            window.GroupParts.giveBack(ready);
        });
    }

    function call(kind, body) {
        var ref = { serverId: serverId, channelId: channelId, messageId: body.messageId };
        if (kind === "react") {
            ref.emoji = body.emoji;
            return request(path("React"), "POST", ref);
        }
        return request(path("Delete"), "POST", ref);
    }

    function createPoll(poll) {
        return request(path("CreatePoll"), "POST", Object.assign({ serverId: serverId, channelId: channelId }, poll));
    }

    function votePoll(messageId, optionIds) {
        return request(path("VotePoll"), "POST", { serverId: serverId, channelId: channelId, messageId: messageId, optionIds: optionIds });
    }

    var context = {
        box: box,
        input: input,
        compose: compose,
        request: request,
        createPoll: createPoll,
        votePoll: votePoll,
        showError: showError,
        append: append,
        call: call,
        dropZone: chat,
        noForward: true,
        canDeleteAny: false,
        reportType: "ServerMessage"
    };
    window.GroupParts.init(context);

    function paintAccess() {
        context.canDeleteAny = (perms() & 512) === 512;
        var allowed = canSend();
        var pollItem = document.querySelector('#group-attach-menu [data-act="poll"]');
        if (pollItem) pollItem.hidden = !canPoll();
        compose.hidden = !channelId || !allowed;
        if (lockNote) lockNote.hidden = !channelId || allowed;
        if (placeholder) placeholder.textContent = "Message " + (channelKind === "announce" ? "" : "#") + channelName;
        input.setAttribute("data-placeholder", "Message " + (channelKind === "announce" ? "" : "#") + channelName);
    }

    compose.addEventListener("submit", function (event) {
        event.preventDefault();
        send();
    });
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            send();
        }
    });
    compose.addEventListener("mousedown", function (event) {
        if (event.target.closest("button") || event.target.closest("#emoji-panel") || document.activeElement === input) return;
        event.preventDefault();
        input.focus();
    });

    window.discodeServerChat = {
        watching: function (sentServer, sentChannel) {
            return !chat.hidden && !scroller.hidden && sentServer === serverId && sentChannel === channelId;
        },
        open: function (button) {
            var id = Number(button.getAttribute("data-id")) || 0;
            if (!id) {
                channelId = 0;
                scroller.hidden = true;
                compose.hidden = true;
                if (emptyNote) emptyNote.hidden = false;
                return;
            }
            if (id === channelId && !scroller.hidden) {
                channelReadOnly = button.getAttribute("data-readonly") === "1";
                channelName = (button.querySelector(".server-channel-name") || {}).textContent || channelName;
                paintAccess();
                return;
            }
            channelId = id;
            channelKind = button.getAttribute("data-kind") || "text";
            channelReadOnly = button.getAttribute("data-readonly") === "1";
            channelName = (button.querySelector(".server-channel-name") || {}).textContent || "";
            generation += 1;
            loaded = [];
            hasMore = true;
            box.textContent = "";
            window.GroupParts.cancelReply();
            window.GroupParts.clear();
            showError("");
            if (emptyNote) emptyNote.hidden = true;
            scroller.hidden = false;
            if (introTitle) introTitle.textContent = channelKind === "announce" ? "Welcome to " + channelName + "!" : "Welcome to #" + channelName + "!";
            if (introText) introText.textContent = channelKind === "announce" ? "This is the start of the " + channelName + " channel." : "This is the start of the #" + channelName + " channel.";
            if (introBadge) introBadge.className = "fa-solid " + (channelKind === "announce" ? "fa-bullhorn" : "fa-hashtag");
            paintAccess();
            loadMessages(generation);
        }
    };

    document.addEventListener("discode-server-message", function (event) {
        var data = event.detail || {};
        if (data.serverId !== serverId || data.channelId !== channelId || !data.message) return;
        append(data.message, false);
    });

    document.addEventListener("discode-server-message-deleted", function (event) {
        var data = event.detail || {};
        if (data.serverId !== serverId || data.channelId !== channelId) return;
        window.GroupParts.remove(String(data.messageId));
        loaded = loaded.filter(function (item) { return item.id !== data.messageId; });
    });

    document.addEventListener("discode-server-message-updated", function (event) {
        var data = event.detail || {};
        if (data.serverId !== serverId || data.channelId !== channelId || !data.message) return;
        window.GroupParts.update(data.message);
    });

    document.addEventListener("discode-roles-ready", paintAccess);

    document.addEventListener("discode-profile-changed", function () {
        if (!channelId || scroller.hidden) return;
        var mine = generation;
        request(path("List") + "?serverId=" + serverId + "&channelId=" + channelId).then(function (list) {
            if (mine === generation && Array.isArray(list)) repaintSenders(list);
        }).catch(function () {});
    });

    document.addEventListener("discode-mention-member", function (event) {
        var name = event.detail && event.detail.name;
        if (!name || compose.hidden || chat.hidden) return;
        input.focus();
        document.execCommand("insertText", false, "@" + name + " ");
    });

    var current = document.querySelector("#server-channel-list .server-channel.on");
    if (current && current.getAttribute("data-kind") !== "voice") window.discodeServerChat.open(current);
})();
