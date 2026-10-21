"use strict";
var micO = false;
var headO = false;

function startDmPage() {
    setTimeout(function () {
        var loader = document.getElementById("loader");
        if (loader) loader.remove();
    }, 2000);
    if (!document.getElementById("dm-chat")) return;
    showDmPage();
    var syncCall = function () {
        var current = window.discodeCalls && window.discodeCalls.current();
        if (!current || !dmPartner || current.other.userName !== dmPartner.userName) return;
        dmShowCallStage();
        dmSetCallStatus(current);
    };
    syncCall();
    if (window.discodeCalls) window.discodeCalls.ready(syncCall);
    var call = new URLSearchParams(window.location.search).get("call");
    if (call === "voice" || call === "video") {
        var video = call === "video";
        var begin = function () {
            startDmCall(video);
            if (video && window.openCallCamera) window.openCallCamera();
        };
        if (window.discodeCalls) window.discodeCalls.ready(begin);
        else begin();
    }
}

var x = new Audio("/assets/css/audio/discordmute_IZNcLx2.mp3");
var y = new Audio("/assets/css/audio/discord-unmute-sound.mp3");
var joinVoiceSound = new Audio("/assets/css/audio/join-voice.mp3");

function mic() {
    if (!micO) {
        x.play();
        document.getElementById("mic").className = "fa-solid fa-microphone-slash mute";
        micO = true;
    } else {
        y.play();
        document.getElementById("mic").className = "fa-solid fa-microphone";
        micO = false;
        if (headO) {
            document.getElementById("head").className = "fa-solid fa-headphones";
            headO = false;
        }
    }
}

function headp() {
    if (!headO) {
        x.play();
        document.getElementById("head").className = "fa-solid fa-headphones mute";
        headO = true;
        if (!micO) {
            document.getElementById("mic").className = "fa-solid fa-microphone-slash mute";
            micO = true;
        }
    } else {
        document.getElementById("head").className = "fa-solid fa-headphones";
        y.play();
        headO = false;
        if (micO) {
            document.getElementById("mic").className = "fa-solid fa-microphone";
            micO = false;
        }
    }
}

function openToggle() {
    if (!window.matchMedia("(max-width: 720px)").matches) return;
    document.querySelector("main").classList.toggle("show-main");
}

document.addEventListener("DOMContentLoaded", function () {
    updateMicHeadphoneIcon();
});

function cloneTpl(id) {
    var tpl = document.getElementById(id);
    if (!tpl || !tpl.content || !tpl.content.firstElementChild) return null;
    return tpl.content.firstElementChild.cloneNode(true);
}

var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
var dmPartner = null;

function dmToken() {
    var input = document.querySelector("input[name='__RequestVerificationToken']");
    return input ? input.value : "";
}

function dmRequest(url, method, body) {
    return fetch(url, {
        method: method || "GET",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "RequestVerificationToken": dmToken(),
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

function utcMillis(value) {
    var text = String(value || "");
    return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(text) ? text : text + "Z");
}

function showDmError(text) {
    var box = document.getElementById("dm-error");
    box.textContent = text || "";
    box.hidden = !text;
}

function paintDmStatus(status) {
    var dot = document.querySelector(".dm-status");
    if (!dot) return;
    dot.className = "dm-status" + (status && status !== "online" ? " " + status : "");
}

function messageTime(stamp) {
    return new Date(stamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayLabel(stamp) {
    return new Date(stamp).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function messageTools(mine) {
    var tools = document.createElement("div");
    tools.className = "dm-msg-tools";
    tools.setAttribute("role", "toolbar");
    tools.setAttribute("aria-label", "Message actions");
    tools.innerHTML =
        '<button type="button" class="dm-react" data-act="react" aria-label="React with heart">\u2764\uFE0F</button>' +
        '<button type="button" class="dm-react" data-act="react" aria-label="React with 100">\uD83D\uDCAF</button>' +
        '<button type="button" class="dm-react" data-act="react" aria-label="React with laughing">\uD83D\uDE06</button>' +
        '<span class="dm-tools-sep"></span>' +
        '<button type="button" class="emoji-open" data-act="picker" aria-label="Add reaction"><i class="fa-regular fa-face-smile"></i></button>' +
        (mine
            ? '<button type="button" data-act="edit" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>'
            : '<button type="button" data-act="reply" aria-label="Reply"><i class="fa-solid fa-reply"></i></button>') +
        '<button type="button" data-act="forward" aria-label="Forward"><i class="fa-solid fa-share"></i></button>' +
        (mine ? '<button type="button" class="dm-tool-delete" data-act="delete" aria-label="Delete"><i class="fa-solid fa-trash-can"></i></button>' : '') +
        '<button type="button" data-act="more" aria-label="More"><i class="fa-solid fa-ellipsis"></i></button>';
    return tools;
}

function dmReplyHeader(reply) {
    var header = document.createElement("div");
    header.className = "dm-msg-reply";
    header.setAttribute("data-reply-id", String(reply.messageId));
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    var face = document.createElement("img");
    face.className = "dm-reply-avatar";
    face.alt = "";
    face.src = reply.senderAvatarUrl || DEFAULT_AVATAR;
    var who = document.createElement("strong");
    who.textContent = reply.senderDisplayName || reply.senderUserName;
    var text = document.createElement("span");
    text.className = "dm-reply-text";
    text.textContent = reply.text;
    header.appendChild(face);
    header.appendChild(who);
    header.appendChild(text);
    return header;
}

function dmEditedLabel() {
    var label = document.createElement("span");
    label.className = "dm-msg-edited";
    label.textContent = "(edited)";
    return label;
}

function messageNodes(text) {
    var holder = document.createElement("div");
    holder.className = "dm-msg-text";
    nodesForText(text).forEach(function (node) { holder.appendChild(node); });
    return holder;
}

function dmCallDuration(seconds) {
    if (seconds < 60) return "a few seconds";
    if (seconds < 120) return "a minute";
    if (seconds < 3600) return Math.floor(seconds / 60) + " minutes";
    if (seconds < 7200) return "an hour";
    return Math.floor(seconds / 3600) + " hours";
}

var dmOngoingCall = 0;

function dmRefreshJoinLinks() {
    if (!dmPartner) return;
    var calls = window.discodeCalls;
    var current = calls && calls.current();
    var inCall = !!current && current.other.userName === dmPartner.userName && current.joined !== false;
    var rows = document.querySelectorAll("#dm-messages .dm-call-msg");
    for (var i = 0; i < rows.length; i++) {
        var wanted = dmOngoingCall > 0 && Number(rows[i].getAttribute("data-id")) === dmOngoingCall && !inCall;
        var existing = rows[i].querySelector(".dm-call-join-wrap");
        if (wanted && !existing) {
            var wrap = document.createElement("span");
            wrap.className = "dm-call-join-wrap";
            wrap.appendChild(document.createTextNode(" \u2014 "));
            var link = document.createElement("a");
            link.className = "dm-call-join";
            link.setAttribute("href", "#");
            link.textContent = "Join call";
            wrap.appendChild(link);
            rows[i].querySelector(".dm-call-text").appendChild(wrap);
        } else if (!wanted && existing) {
            existing.remove();
        }
    }
}

function dmFillCallRow(row, message) {
    var missed = !!message.callMissed && !message.mine;
    row.classList.toggle("is-missed", missed);
    var text = row.querySelector(".dm-call-text");
    text.textContent = "";
    var who = document.createElement("strong");
    who.textContent = message.senderDisplayName || message.senderUserName;
    if (missed) {
        text.appendChild(document.createTextNode("You missed a call from "));
        text.appendChild(who);
        text.appendChild(document.createTextNode("."));
        return;
    }
    text.appendChild(who);
    text.appendChild(document.createTextNode(message.callSeconds == null ? " started a call." : " started a call that lasted " + dmCallDuration(message.callSeconds) + "."));
    dmRefreshJoinLinks();
}

function dmBuildCallRow(message, stamp) {
    var row = document.createElement("div");
    row.className = "dm-msg dm-call-msg";
    row.setAttribute("data-id", String(message.id));
    row.setAttribute("data-sender", message.senderUserName);
    row.setAttribute("data-time", String(stamp));
    row.setAttribute("data-mine", message.mine ? "1" : "0");
    row.setAttribute("data-pinned", "0");
    var icon = document.createElement("i");
    icon.className = "fa-solid fa-phone";
    var text = document.createElement("span");
    text.className = "dm-call-text";
    var when = document.createElement("time");
    when.textContent = messageTime(stamp);
    row.appendChild(icon);
    row.appendChild(text);
    row.appendChild(when);
    dmFillCallRow(row, message);
    return row;
}

function appendMessage(message, forceScroll) {
    var box = document.getElementById("dm-messages");
    if (box.querySelector('[data-id="' + message.id + '"]')) return;
    var scroller = document.querySelector(".dm-scroll");
    var atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
    var stamp = utcMillis(message.createdAt);
    var last = box.lastElementChild;
    while (last && !last.classList.contains("dm-msg")) last = last.previousElementSibling;
    var newDay = !last || dayLabel(Number(last.getAttribute("data-time"))) !== dayLabel(stamp);
    if (newDay) {
        var divider = document.createElement("div");
        divider.className = "dm-divider";
        var label = document.createElement("span");
        label.textContent = dayLabel(stamp);
        divider.appendChild(label);
        box.appendChild(divider);
    }
    if (message.isCall) {
        dmOngoingCall = message.id;
        box.appendChild(dmBuildCallRow(message, stamp));
        dmRefreshJoinLinks();
        document.getElementById("dm-wave-box").hidden = true;
        if (forceScroll || message.mine || atBottom) scrollDmToEnd();
        return;
    }
    var compact = !newDay && !message.replyTo && last && !last.classList.contains("dm-call-msg") && last.getAttribute("data-sender") === message.senderUserName &&
        stamp - Number(last.getAttribute("data-time")) < 5 * 60 * 1000 && box.lastElementChild === last;

    var row = document.createElement("div");
    row.className = "dm-msg" + (compact ? " compact" : "") + (message.replyTo ? " has-reply" : "") + (message.undelivered ? " is-undelivered" : "");
    row.setAttribute("data-id", String(message.id));
    row.setAttribute("data-sender", message.senderUserName);
    row.setAttribute("data-time", String(stamp));
    row.setAttribute("data-mine", message.mine ? "1" : "0");
    row.setAttribute("data-pinned", message.pinnedAt ? "1" : "0");

    if (message.replyTo) row.appendChild(dmReplyHeader(message.replyTo));

    var face = document.createElement("img");
    face.className = "dm-msg-avatar";
    face.alt = "";
    face.src = message.senderAvatarUrl || DEFAULT_AVATAR;
    row.appendChild(face);

    var body = document.createElement("div");
    body.className = "dm-msg-body";
    var head = document.createElement("div");
    head.className = "dm-msg-head";
    var who = document.createElement("strong");
    who.textContent = message.senderDisplayName || message.senderUserName;
    var when = document.createElement("time");
    when.textContent = messageTime(stamp);
    head.appendChild(who);
    head.appendChild(when);
    body.appendChild(head);
    if (message.forwarded) {
        var forwarded = document.createElement("div");
        forwarded.className = "dm-msg-forwarded";
        forwarded.innerHTML = '<i class="fa-solid fa-share"></i> Forwarded';
        body.appendChild(forwarded);
    }
    var textHolder = messageNodes(message.text);
    if (message.editedAt) textHolder.appendChild(dmEditedLabel());
    body.appendChild(textHolder);
    if (message.undelivered) {
        var failed = document.createElement("div");
        failed.className = "dm-msg-undelivered";
        failed.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Your message could not be delivered.';
        body.appendChild(failed);
    }
    row.appendChild(body);
    row.appendChild(messageTools(message.mine));
    box.appendChild(row);
    document.getElementById("dm-wave-box").hidden = true;
    if (forceScroll || message.mine || atBottom) scrollDmToEnd();
}

function scrollDmToEnd() {
    var scroller = document.querySelector(".dm-scroll");
    scroller.scrollTop = scroller.scrollHeight;
}

function showDmPage() {
    var chat = document.getElementById("dm-chat");
    var userName = chat ? chat.getAttribute("data-user-name") : "";
    if (!userName) return;
    dmPartner = { userName: userName, userId: chat.getAttribute("data-user-id") };
    dmOngoingCall = Number(chat.getAttribute("data-ongoing-call")) || 0;
    dmRefreshJoinLinks();
    if (window.discodePresence) window.discodePresence.watchProfile(dmPartner.userId);
    window.discodeOpenDm = userName;
    var stamps = document.querySelectorAll("#dm-messages .dm-msg");
    for (var i = 0; i < stamps.length; i++) {
        var when = stamps[i].querySelector("time");
        if (when) when.textContent = messageTime(Number(stamps[i].getAttribute("data-time")));
    }
    var texts = document.querySelectorAll("#dm-messages .dm-msg-text");
    for (var j = 0; j < texts.length; j++) {
        var edited = texts[j].querySelector(".dm-msg-edited");
        var text = edited ? texts[j].firstChild.textContent : texts[j].textContent;
        FLAG_RE.lastIndex = 0;
        if (!FLAG_RE.test(text)) continue;
        FLAG_RE.lastIndex = 0;
        while (texts[j].firstChild) texts[j].removeChild(texts[j].firstChild);
        nodesForText(text).forEach(function (node) { texts[j].appendChild(node); });
        if (edited) texts[j].appendChild(edited);
    }
    var faces = document.querySelectorAll("#dm-messages .dm-reaction-emoji");
    for (var k = 0; k < faces.length; k++) {
        var symbol = faces[k].textContent;
        FLAG_RE.lastIndex = 0;
        if (!FLAG_RE.test(symbol)) continue;
        FLAG_RE.lastIndex = 0;
        while (faces[k].firstChild) faces[k].removeChild(faces[k].firstChild);
        nodesForText(symbol).forEach(function (node) { faces[k].appendChild(node); });
    }
    scrollDmToEnd();
    if (window.matchMedia("(max-width: 1100px)").matches) setDmProfile(false, true);
    document.dispatchEvent(new CustomEvent("discode-dm-read", { detail: { userName: userName } }));
}

var dmQueue = Promise.resolve();

function focusDmInput() {
    dmInput.focus();
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(dmInput);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
}

function submitDm(text) {
    if (!dmPartner) return;
    var message = (text !== undefined ? text : fieldValue(dmInput)).trim();
    if (!message) return;
    showDmError("");
    var partner = dmPartner.userName;
    var typed = text === undefined ? dmInput.innerHTML : null;
    var replyId = dmReply ? dmReply.id : null;
    if (dmReply) dmCancelReply();
    if (typed !== null) {
        while (dmInput.firstChild) dmInput.removeChild(dmInput.firstChild);
        focusDmInput();
        markEmpty(dmInput);
    }
    dmQueue = dmQueue.then(function () {
        return dmRequest("/Dm/Send", "POST", { userName: partner, text: message, replyToMessageId: replyId });
    }).then(function (sent) {
        appendMessage(sent);
    }).catch(function (err) {
        showDmError(err.message);
        if (typed !== null && !fieldValue(dmInput).trim()) {
            dmInput.innerHTML = typed;
            markEmpty(dmInput);
            focusDmInput();
        }
    });
}

document.addEventListener("discode-dm-message", function (event) {
    var data = event.detail;
    if (!dmPartner || !data || !data.conversation || data.conversation.userName !== dmPartner.userName) return;
    appendMessage(data.message);
    if (!data.message.mine) dmRequest("/Dm/Read", "POST", { userName: dmPartner.userName }).catch(function () {});
});

function dmRefreshProfile() {
    if (!dmPartner) return;
    fetch("/Dm/ProfileInfo?name=" + encodeURIComponent(dmPartner.userName), {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then(function (response) {
        if (!response.ok) throw new Error("profile");
        return response.text();
    }).then(function (html) {
        var holder = document.getElementById("dm-profile-info");
        if (holder) holder.innerHTML = html;
        dmSyncPartnerMessages();
    }).catch(function () {});
}

function dmSyncPartnerMessages() {
    var avatar = document.getElementById("dm-profile-avatar");
    var name = document.getElementById("dm-profile-name");
    var title = document.getElementById("dm-title");
    var rows = document.querySelectorAll('#dm-messages .dm-msg[data-sender="' + dmPartner.userName + '"]');
    for (var i = 0; i < rows.length; i++) {
        var face = rows[i].querySelector(".dm-msg-avatar");
        var who = rows[i].querySelector(".dm-msg-head strong");
        if (face && avatar) face.src = avatar.getAttribute("src");
        if (who && name && name.textContent) who.textContent = name.textContent;
    }
    if (title && name && name.textContent) title.textContent = name.textContent;
}

function dmPaintRelation(relation) {
    var button = document.getElementById("dm-profile-close");
    var icon = button ? button.querySelector("i") : null;
    if (!button || !icon) return;
    var friend = relation === "friend";
    button.setAttribute("title", friend ? "Friends" : "Not friends");
    icon.className = "fa-solid " + (friend ? "fa-user-check" : "fa-user");
}

function dmRefreshRelation() {
    if (!dmPartner) return;
    fetch("/Dm/Relation?name=" + encodeURIComponent(dmPartner.userName), {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then(function (response) {
        if (!response.ok) throw new Error("relation");
        return response.text();
    }).then(function (html) {
        var holder = document.getElementById("dm-relation");
        if (!holder) return;
        holder.innerHTML = html;
        var marker = holder.querySelector("[data-relation]");
        dmPaintRelation(marker ? marker.getAttribute("data-relation") : "none");
    }).catch(function () {});
}

document.addEventListener("discode-friends-changed", function () {
    dmRefreshRelation();
    dmRefreshProfile();
});

document.addEventListener("discode-profile-changed", function (event) {
    if (dmPartner && event.detail && event.detail.userId === dmPartner.userId) dmRefreshProfile();
});

document.addEventListener("discode-user-presence", function (event) {
    if (!dmPartner || event.detail.userId !== dmPartner.userId) return;
    paintDmStatus(event.detail.status);
    dmRefreshProfile();
});

var profileOpenBeforeCall = false;

function setCallFace(src) {
    var faces = document.querySelector(".call-phone-faces");
    if (!faces) return;
    while (faces.firstChild) faces.removeChild(faces.firstChild);
    if (!src) return;
    var face = cloneTpl("call-face");
    if (!face) return;
    face.src = src;
    faces.appendChild(face);
}

function dmPanelPhoto() {
    var img = document.querySelector("#user-panel .avatar img");
    return (img && img.getAttribute("src")) || "/assets/img/img-icon-profile.jpeg";
}

function dmMyPhoto() {
    return fetch("/api/me").then(function (response) {
        if (!response.ok) throw new Error("me");
        return response.json();
    }).then(function (data) {
        return data.avatar || data.avatarUrl || data.photo || dmPanelPhoto();
    }).catch(function () {
        return dmPanelPhoto();
    });
}

var callInviteCardClosed = false;

function setCallInviteCardVisible(open) {
    var sheet = document.querySelector(".call-phone-sheet");
    if (!sheet) return;
    sheet.hidden = !open;
}

function dmSetCallStatus(call) {
    var stage = document.getElementById("call-stage");
    if (!call) return;
    var ringing = call.status === "ringing";
    var incoming = ringing && call.role === "callee";
    var joinable = call.status === "active" && call.joined === false;
    stage.classList.toggle("is-ringing", ringing);
    stage.classList.toggle("is-incoming", incoming);
    stage.classList.toggle("is-joinable", joinable);
    var answerBar = document.getElementById("call-answer-bar");
    if (answerBar) answerBar.hidden = !(incoming || joinable);
    var faces = document.getElementById("call-faces");
    if (faces) {
        faces.classList.toggle("is-callee", call.role === "callee");
        faces.classList.toggle("is-me-away", joinable);
    }
    var peerFace = document.getElementById("call-peer-face");
    if (peerFace) {
        peerFace.classList.toggle("is-waiting", ringing && call.role === "caller");
        peerFace.classList.toggle("is-away", call.status === "active" && !joinable && call.peerPresent === false);
    }
}

function dmNotice(text) {
    showDmError(text);
    if (text) setTimeout(function () { showDmError(""); }, 5000);
}

function dmCloseCallStage() {
    document.getElementById("call-stage").hidden = true;
    document.getElementById("call-stage").classList.remove("is-ringing");
    document.querySelector(".dm-chat").classList.remove("call-chat");
    callInviteCardClosed = false;
    setCallInviteCardVisible(true);
    if (profileOpenBeforeCall) setDmProfile(true);
}

function startDmCall(video) {
    if (!dmPartner) return;
    var calls = window.discodeCalls;
    if (!calls) return;
    var current = calls.current();
    if (current && current.other.userName === dmPartner.userName && current.joined !== false) {
        dmShowCallStage();
        dmSetCallStatus(current);
        return;
    }
    if (current && current.other.userName === dmPartner.userName) {
        showDmError("");
        calls.answer(video).catch(function (error) {
            dmNotice(error.message);
        });
        return;
    }
    showDmError("");
    calls.start(dmPartner.userName, video).catch(function (error) {
        dmNotice(error.message);
    });
}

document.addEventListener("discode-call-over", function (event) {
    if (!event.detail || Number(event.detail.messageId) !== dmOngoingCall) return;
    dmOngoingCall = 0;
    dmRefreshJoinLinks();
});

document.addEventListener("discode-call-state", function (event) {
    dmRefreshJoinLinks();
    if (!dmPartner) return;
    var call = event.detail.call;
    var stage = document.getElementById("call-stage");
    if (call && call.other.userName === dmPartner.userName) {
        if (stage.hidden) dmShowCallStage();
        dmSetCallStatus(call);
        return;
    }
    if (call) return;
    var previous = event.detail.previous;
    var wasHere = previous && previous.other.userName === dmPartner.userName;
    if (!stage.hidden) dmCloseCallStage();
    if (!wasHere) return;
    var title = document.getElementById("dm-title").textContent;
    var reason = event.detail.reason;
    if (reason === "unavailable") dmNotice("The call is no longer available.");
});

function dmShowCallStage() {
    var profile = document.getElementById("dm-profile");
    var peerAvatar = document.getElementById("call-peer-avatar");
    var partnerPhoto = document.getElementById("dm-profile-avatar") || document.getElementById("dm-avatar");
    if (peerAvatar && partnerPhoto) peerAvatar.src = partnerPhoto.getAttribute("src");
    var avatar = document.getElementById("call-avatar");
    avatar.src = dmPanelPhoto();
    var photo = dmPanelPhoto();
    setCallFace(photo);
    dmMyPhoto().then(function (next) {
        photo = next;
        avatar.src = next;
        setCallFace(next);
    });
    var title = document.getElementById("dm-title").textContent;
    document.querySelector(".call-phone-name").textContent = title;
    document.querySelector(".call-phone-label").textContent = title;
    callInviteCardClosed = false;
    setCallInviteCardVisible(true);
    document.querySelector(".dm-chat").classList.remove("call-chat");
    document.getElementById("call-stage").hidden = false;
    profileOpenBeforeCall = !profile.classList.contains("is-collapsed");
    setDmProfile(false);
}

function bindDmCall() {
    document.getElementById("dm-call").addEventListener("click", function () {
        startDmCall(false);
    });
    document.getElementById("dm-video").addEventListener("click", function () {
        startDmCall(true);
        if (window.openCallCamera) window.openCallCamera();
    });

    var answerWith = function (video) {
        if (!window.discodeCalls) return;
        window.discodeCalls.answer(video).then(function () {
            if (video && window.openCallCamera) window.openCallCamera();
        }).catch(function (error) {
            dmNotice(error.message);
        });
    };
    document.getElementById("call-answer-video").addEventListener("click", function () { answerWith(true); });
    document.getElementById("call-answer-voice").addEventListener("click", function () { answerWith(false); });
    document.getElementById("call-answer-decline").addEventListener("click", function () {
        if (window.discodeCalls) window.discodeCalls.decline();
    });

    document.getElementById("call-hangup").addEventListener("click", function () {
        if (window.discodeCalls) window.discodeCalls.end();
        var current = window.discodeCalls && window.discodeCalls.current();
        if (!current || !dmPartner || current.other.userName !== dmPartner.userName) dmCloseCallStage();
    });

    document.querySelector(".call-phone-add").addEventListener("click", function () {
        var current = document.getElementById("dm-title");
        var name = current ? current.textContent.trim() : "";
        if (typeof openNewMessage === "function") openNewMessage(name ? [name] : []);
    });

    document.getElementById("call-phone-add-close").addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        callInviteCardClosed = true;
        setCallInviteCardVisible(false);
    });

    var phoneChat = document.querySelector(".call-phone-chat");
    if (phoneChat) phoneChat.addEventListener("click", function () {
        document.querySelector(".dm-chat").classList.add("call-chat");
    });

    document.querySelector(".call-phone-back").addEventListener("click", function () {
        document.querySelector(".dm-chat").classList.add("call-chat");
    });

    document.querySelector(".call-return").addEventListener("click", function () {
        document.querySelector(".dm-chat").classList.remove("call-chat");
    });

    document.querySelector(".dm-full").addEventListener("click", function () {
        if (!dmPartner) return;
        var photo = document.getElementById("dm-profile-avatar").getAttribute("src");
        if (window.openUserProfile) window.openUserProfile(dmPartner.userName, photo);
    });
}

function setDmProfile(open, instant) {
    var panel = document.getElementById("dm-profile");
    var sheet = panel.querySelector(".dm-profile");
    if (instant) {
        panel.classList.add("no-motion");
        if (sheet) sheet.classList.add("no-motion");
    }
    panel.classList.toggle("is-collapsed", !open);
    panel.toggleAttribute("inert", !open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    document.getElementById("dm-profile-toggle").classList.toggle("on", open);
    if (instant) {
        panel.offsetWidth;
        panel.classList.remove("no-motion");
        if (sheet) sheet.classList.remove("no-motion");
    }
}

function bindDmCompose() {
    document.getElementById("dm-profile-toggle").addEventListener("click", function () {
        setDmProfile(document.getElementById("dm-profile").classList.contains("is-collapsed"));
    });

    document.getElementById("dm-profile-close").addEventListener("click", function () {
        setDmProfile(false);
    });

    document.getElementById("dm-compose").addEventListener("submit", function (event) {
        event.preventDefault();
        submitDm();
    });

    document.getElementById("dm-wave").addEventListener("click", function () {
        submitDm("\uD83D\uDC4B");
    });
}

var emojiField = null;
var savedRange = null;
var regionNames = null;

var FLAG_LABELS = {
    "🏁": "Chequered flag",
    "🚩": "Triangular flag",
    "🎌": "Crossed flags",
    "🏴": "Black flag",
    "🏳️": "White flag",
    "🏳️‍🌈": "Rainbow flag",
    "🏳️‍⚧️": "Transgender flag",
    "🏴‍☠️": "Pirate flag",
    "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "England",
    "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "Scotland",
    "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "Wales"
};

var FLAG_RE = /\uD83C\uDFF4(?:\uDB40[\uDC00-\uDCFF])+\uDB40\uDC7F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83C\uDFF3\uFE0F\u200D\u26A7\uFE0F|\uD83C\uDFF4\u200D\u2620\uFE0F|\uD83C[\uDDE6-\uDDFF]\uD83C[\uDDE6-\uDDFF]|\uD83C\uDFC1|\uD83D\uDEA9|\uD83C\uDF8C|\uD83C\uDFF4|\uD83C\uDFF3\uFE0F?/g;

function flagCode(emoji) {
    var chars = Array.from(emoji);
    if (chars.length !== 2) return "";
    var first = chars[0].codePointAt(0);
    var second = chars[1].codePointAt(0);
    if (first < 0x1F1E6 || first > 0x1F1FF || second < 0x1F1E6 || second > 0x1F1FF) return "";
    return String.fromCharCode(first - 0x1F1E6 + 65, second - 0x1F1E6 + 65);
}

function countryLabel(emoji) {
    if (FLAG_LABELS[emoji]) return FLAG_LABELS[emoji];
    var code = flagCode(emoji);
    if (!code) return "";
    if (!regionNames) regionNames = new Intl.DisplayNames(["tr"], { type: "region" });
    return regionNames.of(code) || code;
}

function flagSrc(emoji) {
    var code = flagCode(emoji);
    if (!code) return "";
    return "https://flagcdn.com/w80/" + code.toLowerCase() + ".png";
}

function twemojiSrc(emoji) {
    var text = emoji.indexOf("\u200D") < 0 ? emoji.replace(/\uFE0F/g, "") : emoji;
    var parts = [];
    Array.from(text).forEach(function (ch) {
        parts.push(ch.codePointAt(0).toString(16));
    });
    return "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/" + parts.join("-") + ".png";
}

function flagPicture(emoji) {
    if (flagCode(emoji)) return flagSrc(emoji);
    return twemojiSrc(emoji);
}

function fieldValue(el) {
    var parts = [];
    function walk(node) {
        node.childNodes.forEach(function (child) {
            if (child.nodeType === 3) parts.push(child.textContent);
            else if (child.nodeName === "IMG") parts.push(child.getAttribute("data-emoji") || "");
            else if (child.nodeName === "BR") parts.push("\n");
            else if (child.nodeType === 1) {
                if (/^(DIV|P)$/.test(child.nodeName) && parts.length && parts[parts.length - 1] !== "\n") parts.push("\n");
                walk(child);
            }
        });
    }
    walk(el);
    return parts.join("");
}

function markEmpty(el) {
    var empty = !fieldValue(el).replace(/\n/g, "").trim();
    var hint = document.getElementById("dm-placeholder");
    if (hint) hint.hidden = !empty;
    var focused = document.activeElement === el;
    el.setAttribute("data-empty", empty && !focused ? "1" : "0");
    if (empty && !focused) while (el.firstChild) el.removeChild(el.firstChild);
}

function rememberCaret() {
    var field = document.getElementById("dm-input");
    var sel = window.getSelection();
    if (!sel.rangeCount || !field.contains(sel.anchorNode)) return;
    savedRange = sel.getRangeAt(0).cloneRange();
}

function closeEmojiPanel() {
    emojiField = null;
    document.getElementById("emoji-panel").hidden = true;
}

function openEmojiPanel(button, field) {
    var panel = document.getElementById("emoji-panel");
    if (emojiField === field && !panel.hidden) {
        closeEmojiPanel();
        return;
    }
    emojiField = field;
    if (!panel.childElementCount) {
        fillEmojiPanel(panel, "emoji", function (choice, emoji) {
            var img = choice.querySelector("img");
            if (!img) return;
            img.alt = countryLabel(emoji) || "";
            img.src = flagCode(emoji) ? flagSrc(emoji) : twemojiSrc(emoji);
            if (flagCode(emoji)) {
                img.onerror = function () {
                    img.onerror = null;
                    img.src = twemojiSrc(emoji);
                };
            }
        });
    }
    placeEmojiPanel(button);
}

function placeEmojiPanel(button) {
    var panel = document.getElementById("emoji-panel");
    var box = document.getElementById("dm-compose");
    var gap = 8;
    box.appendChild(panel);
    panel.hidden = false;
    var buttonBox = button.getBoundingClientRect();
    var boxRect = box.getBoundingClientRect();
    var left = buttonBox.right - boxRect.left - panel.offsetWidth;
    if (left < 8) left = 8;
    var top = buttonBox.top - boxRect.top - panel.offsetHeight - gap;
    panel.style.left = left + "px";
    panel.style.top = top + "px";
}

function insertNodes(field, nodes) {
    field.focus();
    var sel = window.getSelection();
    var range = savedRange && field.contains(savedRange.startContainer) ? savedRange : null;
    if (!range) {
        range = document.createRange();
        range.selectNodeContents(field);
        range.collapse(false);
    }
    range.deleteContents();
    nodes.forEach(function (node) {
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
    });
    sel.removeAllRanges();
    sel.addRange(range);
    savedRange = range.cloneRange();
    markEmpty(field);
}

function nodesForText(text) {
    var nodes = [];
    var last = 0;
    FLAG_RE.lastIndex = 0;
    text.replace(FLAG_RE, function (flag, index) {
        if (index > last) nodes.push(document.createTextNode(text.slice(last, index)));
        var img = document.createElement("img");
        img.className = "flag-img";
        img.alt = countryLabel(flag) || "";
        img.title = countryLabel(flag) || "";
        img.setAttribute("data-emoji", flag);
        img.src = flagPicture(flag);
        if (flagCode(flag)) {
            img.onerror = function () {
                img.onerror = null;
                img.src = twemojiSrc(flag);
            };
        }
        img.setAttribute("contenteditable", "false");
        nodes.push(img);
        last = index + flag.length;
        return flag;
    });
    if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
    FLAG_RE.lastIndex = 0;
    return nodes;
}

function insertEmoji(emoji) {
    if (!emojiField) return;
    insertNodes(emojiField, nodesForText(emoji));
}

var dmInput = document.getElementById("dm-input");

var dmPicker = { mode: "", row: null };
var dmReply = null;

function dmCancelReply() {
    if (!dmReply) return;
    var marked = document.querySelector("#dm-messages .dm-msg.is-replying");
    if (marked) marked.classList.remove("is-replying");
    dmReply = null;
    document.getElementById("dm-reply-bar").hidden = true;
}

function dmStartReply(row) {
    dmCancelReply();
    var head = row.querySelector(".dm-msg-head strong");
    dmReply = { id: Number(row.getAttribute("data-id")) };
    row.classList.add("is-replying");
    document.getElementById("dm-reply-name").textContent = head ? head.textContent : "";
    document.getElementById("dm-reply-bar").hidden = false;
    focusDmInput();
}

function dmJumpTo(messageId) {
    var target = document.querySelector('#dm-messages .dm-msg[data-id="' + messageId + '"]');
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.add("is-flash");
    setTimeout(function () { target.classList.remove("is-flash"); }, 1600);
}

function dmMessageText(row) {
    var clone = row.querySelector(".dm-msg-text").cloneNode(true);
    var edited = clone.querySelector(".dm-msg-edited");
    if (edited) edited.remove();
    return fieldValue(clone);
}

function dmCancelEdit(row) {
    var editor = row.querySelector(".dm-edit");
    if (editor) editor.remove();
    var holder = row.querySelector(".dm-msg-text");
    if (holder) holder.hidden = false;
    row.classList.remove("is-editing");
}

function dmGrowEditor(area) {
    area.style.height = "auto";
    area.style.height = area.scrollHeight + "px";
}

function dmStartEdit(row) {
    if (row.getAttribute("data-mine") !== "1" || row.querySelector(".dm-edit")) return;
    var open = document.querySelector("#dm-messages .dm-msg.is-editing");
    if (open) dmCancelEdit(open);
    var holder = row.querySelector(".dm-msg-text");
    var box = document.createElement("div");
    box.className = "dm-edit";
    box.innerHTML =
        '<div class="dm-edit-box">' +
        '<textarea rows="1" maxlength="2000" aria-label="Edit message"></textarea>' +
        '<button type="button" class="dm-edit-emoji emoji-open" data-act="edit-picker" aria-label="Emoji"><i class="fa-regular fa-face-smile"></i></button>' +
        '</div>' +
        '<p class="dm-edit-hint">escape to <a href="#" data-edit="cancel">cancel</a> \u2022 enter to <a href="#" data-edit="save">save</a></p>';
    holder.hidden = true;
    holder.parentNode.insertBefore(box, holder.nextSibling);
    row.classList.add("is-editing");
    var area = box.querySelector("textarea");
    area.value = dmMessageText(row);
    dmGrowEditor(area);
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
    var scroller = document.querySelector(".dm-scroll");
    if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160) scrollDmToEnd();
}

function dmApplyEdit(row, message) {
    dmCancelEdit(row);
    var holder = row.querySelector(".dm-msg-text");
    while (holder.firstChild) holder.removeChild(holder.firstChild);
    nodesForText(message.text).forEach(function (node) { holder.appendChild(node); });
    if (message.editedAt) holder.appendChild(dmEditedLabel());
}

function dmSaveEdit(row) {
    var area = row.querySelector(".dm-edit textarea");
    if (!area) return;
    var text = area.value.trim();
    if (!text) return;
    if (text === dmMessageText(row).trim()) {
        dmCancelEdit(row);
        return;
    }
    showDmError("");
    dmRequest("/Dm/Edit", "POST", { id: Number(row.getAttribute("data-id")), text: text }).then(function (message) {
        dmApplyEdit(row, message);
    }).catch(function (err) {
        showDmError(err.message);
    });
}

function dmDeleteMessage(row) {
    showDmError("");
    dmRequest("/Dm/DeleteMessage", "POST", { id: Number(row.getAttribute("data-id")) }).then(function () {
        dmRemoveMessage(row.getAttribute("data-id"));
    }).catch(function (err) {
        showDmError(err.message);
    });
}

function dmRegroupMessage(row) {
    if (row.classList.contains("dm-call-msg")) return;
    var before = row.previousElementSibling;
    var grouped = !!before && before.classList.contains("dm-msg") && !before.classList.contains("dm-call-msg") && !row.classList.contains("has-reply") &&
        before.getAttribute("data-sender") === row.getAttribute("data-sender") &&
        Number(row.getAttribute("data-time")) - Number(before.getAttribute("data-time")) < 5 * 60 * 1000;
    row.classList.toggle("compact", grouped);
}

function dmTidyAfterRemove(before, after) {
    if (before && before.classList.contains("dm-divider") && !(after && after.classList.contains("dm-msg"))) before.remove();
    if (after && after.classList.contains("dm-msg")) dmRegroupMessage(after);
    var wave = document.getElementById("dm-wave-box");
    if (wave && !document.querySelector("#dm-messages .dm-msg")) wave.hidden = false;
}

function dmRemoveMessage(id) {
    var row = document.querySelector('#dm-messages .dm-msg[data-id="' + id + '"]');
    if (row) {
        var before = row.previousElementSibling;
        var after = row.nextElementSibling;
        row.remove();
        dmTidyAfterRemove(before, after);
    }
    document.querySelectorAll('.dm-msg-reply[data-reply-id="' + id + '"]').forEach(function (quote) { quote.remove(); });
    document.querySelectorAll('#dm-pins-popover [data-jump="' + id + '"]').forEach(function (card) { card.remove(); });
    if (dmReply && dmReply.id === Number(id)) dmCancelReply();
}

function dmRenderReactions(row, reactions) {
    var body = row.querySelector(".dm-msg-body");
    var box = body.querySelector(".dm-reactions");
    if (!reactions || reactions.length === 0) {
        if (box) box.remove();
        return;
    }
    if (!box) {
        box = document.createElement("div");
        box.className = "dm-reactions";
        body.appendChild(box);
    }
    while (box.firstChild) box.removeChild(box.firstChild);
    reactions.forEach(function (reaction) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "dm-reaction" + (reaction.reacted ? " mine" : "");
        chip.setAttribute("data-emoji", reaction.emoji);
        chip.setAttribute("aria-pressed", reaction.reacted ? "true" : "false");
        var face = document.createElement("span");
        face.className = "dm-reaction-emoji";
        nodesForText(reaction.emoji).forEach(function (node) { face.appendChild(node); });
        var count = document.createElement("span");
        count.className = "dm-reaction-count";
        count.textContent = String(reaction.count);
        chip.appendChild(face);
        chip.appendChild(count);
        box.appendChild(chip);
    });
    var add = document.createElement("button");
    add.type = "button";
    add.className = "dm-reaction-add emoji-open";
    add.setAttribute("data-act", "reaction-add");
    add.setAttribute("aria-label", "Add reaction");
    add.innerHTML = '<i class="fa-regular fa-face-smile"></i>';
    box.appendChild(add);
}

function dmReact(row, emoji) {
    showDmError("");
    dmRequest("/Dm/React", "POST", { id: Number(row.getAttribute("data-id")), emoji: emoji }).then(function (reply) {
        dmRenderReactions(row, reply.reactions || []);
    }).catch(function (err) {
        showDmError(err.message);
    });
}

function dmClosePicker() {
    dmPicker.mode = "";
    closeEmojiPanel();
}

function dmOpenPicker(anchor, mode, row) {
    var panel = document.getElementById("emoji-panel");
    if (!panel.hidden && dmPicker.mode === mode && dmPicker.row === row) {
        dmClosePicker();
        return;
    }
    emojiField = null;
    dmPicker = { mode: mode, row: row };
    if (!panel.childElementCount && typeof fillEmojiPanel === "function") {
        fillEmojiPanel(panel, "emoji", function (choice, emoji) {
            var img = choice.querySelector("img");
            if (!img) return;
            img.alt = countryLabel(emoji) || "";
            img.src = flagCode(emoji) ? flagSrc(emoji) : twemojiSrc(emoji);
            if (flagCode(emoji)) {
                img.onerror = function () {
                    img.onerror = null;
                    img.src = twemojiSrc(emoji);
                };
            }
        });
    }
    panel.hidden = false;
    panel.style.position = "fixed";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    var rect = anchor.getBoundingClientRect();
    var width = panel.offsetWidth || 340;
    var height = panel.offsetHeight || 300;
    var left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    var top = rect.top - height - 8;
    if (top < 8) top = Math.min(rect.bottom + 8, window.innerHeight - height - 8);
    panel.style.left = left + "px";
    panel.style.top = Math.max(8, top) + "px";
}

function dmCloseMenu() {
    var menu = document.getElementById("dm-msg-menu");
    if (menu) menu.hidden = true;
    menu.removeAttribute("data-row");
}

function dmOpenMenu(anchor, row) {
    var menu = document.getElementById("dm-msg-menu");
    if (!menu.hidden && menu.getAttribute("data-row") === row.getAttribute("data-id")) {
        dmCloseMenu();
        return;
    }
    dmShowMenu(row);
    var rect = anchor.getBoundingClientRect();
    var width = menu.offsetWidth;
    var height = menu.offsetHeight;
    var left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    var top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
    menu.style.left = left + "px";
    menu.style.top = top + "px";
}

function dmShowMenu(row) {
    var menu = document.getElementById("dm-msg-menu");
    var mine = row.getAttribute("data-mine") === "1";
    var gated = menu.querySelectorAll("[data-own-only]");
    for (var i = 0; i < gated.length; i++) gated[i].hidden = !mine;
    menu.setAttribute("data-row", row.getAttribute("data-id"));
    var pin = menu.querySelector('[data-menu="pin"] span');
    if (pin) pin.textContent = row.getAttribute("data-pinned") === "1" ? "Unpin Message" : "Pin Message";
    menu.hidden = false;
    return menu;
}

function dmOpenMenuAt(row, x, y) {
    if (dmPicker.mode) dmClosePicker();
    var menu = dmShowMenu(row);
    var width = menu.offsetWidth;
    var height = menu.offsetHeight;
    var left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
    var top = Math.max(8, Math.min(y, window.innerHeight - height - 8));
    menu.style.left = left + "px";
    menu.style.top = top + "px";
}

var dmForwardRow = null;

function dmForwardRefresh() {
    var checked = document.querySelectorAll("#dm-forward-list .dm-forward-check:checked").length;
    document.getElementById("dm-forward-submit").disabled = checked === 0;
}

function dmForwardError(text) {
    var box = document.getElementById("dm-forward-error");
    box.textContent = text || "";
    box.hidden = !text;
}

function dmCloseForward() {
    document.getElementById("dm-forward-modal").hidden = true;
    document.getElementById("dm-forward-list").textContent = "";
    document.getElementById("dm-forward-preview").textContent = "";
    document.getElementById("dm-forward-search").value = "";
    document.getElementById("dm-forward-note").value = "";
    dmForwardError("");
    dmForwardRow = null;
}

function dmOpenForward(row) {
    dmForwardRow = row;
    dmForwardError("");
    var preview = document.getElementById("dm-forward-preview");
    preview.textContent = "";
    nodesForText(dmMessageText(row)).forEach(function (node) { preview.appendChild(node); });
    var list = document.getElementById("dm-forward-list");
    list.textContent = "";
    document.getElementById("dm-forward-submit").disabled = true;
    document.getElementById("dm-forward-modal").hidden = false;
    document.getElementById("dm-forward-search").focus();
    fetch("/Dm/ForwardTargets", {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then(function (response) {
        if (!response.ok) throw new Error("targets");
        return response.text();
    }).then(function (html) {
        if (dmForwardRow !== row) return;
        list.innerHTML = html;
    }).catch(function () {
        dmForwardError("Could not load your friends. Try again.");
    });
}

function dmSubmitForward() {
    var row = dmForwardRow;
    if (!row) return;
    var names = [];
    document.querySelectorAll("#dm-forward-list .dm-forward-check:checked").forEach(function (box) { names.push(box.value); });
    if (names.length === 0) return;
    var button = document.getElementById("dm-forward-submit");
    button.disabled = true;
    dmForwardError("");
    dmRequest("/Dm/Forward", "POST", {
        id: Number(row.getAttribute("data-id")),
        userNames: names,
        note: document.getElementById("dm-forward-note").value.trim()
    }).then(function () {
        dmCloseForward();
    }).catch(function (err) {
        dmForwardError(err.message);
        button.disabled = false;
    });
}

function dmFilterForward() {
    var term = document.getElementById("dm-forward-search").value.trim().toLowerCase();
    document.querySelectorAll("#dm-forward-list .dm-forward-item").forEach(function (item) {
        item.hidden = term.length > 0 && item.getAttribute("data-name").indexOf(term) === -1 && item.getAttribute("data-key").toLowerCase().indexOf(term) === -1;
    });
}

var dmPinRow = null;

function dmClosePinModal() {
    var modal = document.getElementById("dm-pin-modal");
    modal.hidden = true;
    document.getElementById("dm-pin-preview").textContent = "";
    dmPinRow = null;
}

function dmSetPinned(row, pinned) {
    showDmError("");
    dmRequest("/Dm/Pin", "POST", { id: Number(row.getAttribute("data-id")), pinned: pinned }).then(function (reply) {
        row.setAttribute("data-pinned", reply.pinnedAt ? "1" : "0");
        dmRefreshPins();
    }).catch(function (err) {
        showDmError(err.message);
    });
}

function dmPinsOpen() {
    return !document.getElementById("dm-pins-popover").hidden;
}

function dmClosePins() {
    document.getElementById("dm-pins-popover").hidden = true;
}

function dmLoadPins() {
    var popover = document.getElementById("dm-pins-popover");
    if (!dmPartner) return Promise.resolve();
    return fetch("/Dm/Pins?name=" + encodeURIComponent(dmPartner.userName), {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then(function (response) {
        if (!response.ok) throw new Error("pins");
        return response.text();
    }).then(function (html) {
        popover.innerHTML = html;
        var texts = popover.querySelectorAll(".dm-pin-text");
        for (var i = 0; i < texts.length; i++) {
            var edited = texts[i].querySelector(".dm-msg-edited");
            var text = edited ? texts[i].firstChild.textContent : texts[i].textContent;
            FLAG_RE.lastIndex = 0;
            if (!FLAG_RE.test(text)) continue;
            FLAG_RE.lastIndex = 0;
            while (texts[i].firstChild) texts[i].removeChild(texts[i].firstChild);
            nodesForText(text).forEach(function (node) { texts[i].appendChild(node); });
            if (edited) texts[i].appendChild(edited);
        }
    });
}

function dmRefreshPins() {
    if (dmPinsOpen()) dmLoadPins().catch(function () {});
}

function dmTogglePins() {
    var popover = document.getElementById("dm-pins-popover");
    if (dmPinsOpen()) {
        dmClosePins();
        return;
    }
    dmLoadPins().then(function () {
        var anchor = document.getElementById("dm-pins-toggle").getBoundingClientRect();
        popover.hidden = false;
        var width = popover.offsetWidth;
        var left = Math.max(8, Math.min(anchor.right - width + 40, window.innerWidth - width - 8));
        popover.style.left = left + "px";
        popover.style.top = (anchor.bottom + 10) + "px";
    }).catch(function () {
        showDmError("Could not load the pinned messages.");
    });
}

function dmOpenPinModal(row) {
    dmPinRow = row;
    var preview = document.getElementById("dm-pin-preview");
    preview.textContent = "";
    var face = document.createElement("img");
    face.className = "dm-pin-avatar";
    face.alt = "";
    face.src = row.querySelector(".dm-msg-avatar").getAttribute("src");
    var body = document.createElement("div");
    body.className = "dm-pin-body";
    var head = document.createElement("div");
    head.className = "dm-pin-head";
    var who = document.createElement("strong");
    who.textContent = row.querySelector(".dm-msg-head strong").textContent;
    var when = document.createElement("time");
    when.textContent = row.querySelector(".dm-msg-head time").textContent;
    head.appendChild(who);
    head.appendChild(when);
    var text = document.createElement("div");
    text.className = "dm-pin-text";
    nodesForText(dmMessageText(row)).forEach(function (node) { text.appendChild(node); });
    body.appendChild(head);
    body.appendChild(text);
    preview.appendChild(face);
    preview.appendChild(body);
    document.getElementById("dm-pin-modal").hidden = false;
    document.getElementById("dm-pin-confirm").focus();
}

function dmCopy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () {});
}

function bindDmMessages() {
    var box = document.getElementById("dm-messages");
    var menu = document.getElementById("dm-msg-menu");
    var panel = document.getElementById("emoji-panel");

    box.addEventListener("click", function (event) {
        var join = event.target.closest(".dm-call-join");
        if (join) {
            event.preventDefault();
            startDmCall(false);
            return;
        }
        var hint = event.target.closest("[data-edit]");
        if (hint) {
            event.preventDefault();
            var editing = hint.closest(".dm-msg");
            if (hint.getAttribute("data-edit") === "save") dmSaveEdit(editing);
            else dmCancelEdit(editing);
            return;
        }
        var quoted = event.target.closest(".dm-msg-reply");
        if (quoted) {
            dmJumpTo(quoted.getAttribute("data-reply-id"));
            return;
        }
        var chip = event.target.closest(".dm-reaction");
        if (chip) {
            dmReact(chip.closest(".dm-msg"), chip.getAttribute("data-emoji"));
            return;
        }
        var button = event.target.closest(".dm-msg-tools button, .dm-edit-emoji, .dm-reaction-add");
        if (!button) return;
        var row = button.closest(".dm-msg");
        var act = button.getAttribute("data-act");
        if (act === "react") dmReact(row, button.textContent.trim());
        else if (act === "picker" || act === "reaction-add") dmOpenPicker(button, "reaction", row);
        else if (act === "edit-picker") dmOpenPicker(button, "edit", row);
        else if (act === "edit") dmStartEdit(row);
        else if (act === "reply") dmStartReply(row);
        else if (act === "forward") dmOpenForward(row);
        else if (act === "delete") dmDeleteMessage(row);
        else if (act === "more") dmOpenMenu(button, row);
    });

    box.addEventListener("contextmenu", function (event) {
        var row = event.target.closest(".dm-msg");
        if (!row || row.classList.contains("dm-call-msg") || event.target.closest(".dm-edit, a, .dm-msg-tools")) return;
        event.preventDefault();
        dmOpenMenuAt(row, event.clientX, event.clientY);
    });

    document.addEventListener("contextmenu", function (event) {
        if (!event.target.closest("#dm-msg-menu, #dm-messages")) dmCloseMenu();
    });

    box.addEventListener("keydown", function (event) {
        var quote = event.target.closest && event.target.closest(".dm-msg-reply");
        if (quote && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            dmJumpTo(quote.getAttribute("data-reply-id"));
            return;
        }
        if (event.target.tagName !== "TEXTAREA") return;
        var row = event.target.closest(".dm-msg");
        if (event.key === "Escape") {
            event.preventDefault();
            dmCancelEdit(row);
        } else if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            dmSaveEdit(row);
        }
    });

    box.addEventListener("input", function (event) {
        if (event.target.tagName === "TEXTAREA") dmGrowEditor(event.target);
    });

    menu.addEventListener("click", function (event) {
        var item = event.target.closest("[data-menu], [data-act]");
        if (!item) return;
        var row = box.querySelector('.dm-msg[data-id="' + menu.getAttribute("data-row") + '"]');
        var action = item.getAttribute("data-menu");
        dmCloseMenu();
        if (!row) return;
        if (item.getAttribute("data-act") === "react") dmReact(row, item.textContent.trim());
        else if (action === "edit") dmStartEdit(row);
        else if (action === "reply") dmStartReply(row);
        else if (action === "forward") dmOpenForward(row);
        else if (action === "pin") {
            if (row.getAttribute("data-pinned") === "1") dmSetPinned(row, false);
            else dmOpenPinModal(row);
        }
        else if (action === "delete") dmDeleteMessage(row);
        else if (action === "copy-text") dmCopy(dmMessageText(row));
        else if (action === "reaction") dmOpenPicker(row.querySelector('[data-act="picker"]') || row, "reaction", row);
    });

    panel.addEventListener("click", function (event) {
        if (!dmPicker.mode) return;
        var choice = event.target.closest(".emoji-choice");
        if (!choice) return;
        if (dmPicker.mode === "edit" && dmPicker.row) {
            var area = dmPicker.row.querySelector(".dm-edit textarea");
            if (area) {
                var emoji = choice.getAttribute("data-emoji") || choice.textContent;
                var start = area.selectionStart;
                var end = area.selectionEnd;
                area.value = area.value.slice(0, start) + emoji + area.value.slice(end);
                area.setSelectionRange(start + emoji.length, start + emoji.length);
                dmGrowEditor(area);
                area.focus();
            }
        }
        if (dmPicker.mode === "reaction" && dmPicker.row) {
            dmReact(dmPicker.row, choice.getAttribute("data-emoji") || choice.textContent);
        }
        dmClosePicker();
    }, true);

    function dmSyncShift(event) {
        document.body.classList.toggle("dm-shift", !!event.shiftKey);
    }
    document.addEventListener("keydown", dmSyncShift);
    document.addEventListener("keyup", dmSyncShift);
    document.addEventListener("mousemove", dmSyncShift);
    window.addEventListener("blur", function () {
        document.body.classList.remove("dm-shift");
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest("#dm-msg-menu, .dm-msg-tools [data-act='more']")) dmCloseMenu();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            if (!document.getElementById("dm-forward-modal").hidden) {
                dmCloseForward();
                return;
            }
            var pinModal = document.getElementById("dm-pin-modal");
            if (!pinModal.hidden) {
                dmClosePinModal();
                return;
            }
            if (dmPinsOpen()) {
                dmClosePins();
                return;
            }
            var busy = !document.getElementById("dm-msg-menu").hidden || dmPicker.mode || document.querySelector(".dm-msg.is-editing");
            dmCloseMenu();
            if (dmPicker.mode) dmClosePicker();
            if (!busy) dmCancelReply();
        }
    });
    document.getElementById("dm-reply-cancel").addEventListener("click", dmCancelReply);
    document.getElementById("dm-forward-modal").addEventListener("click", function (event) {
        if (event.target.closest("[data-close]")) dmCloseForward();
    });
    document.getElementById("dm-forward-list").addEventListener("change", dmForwardRefresh);
    document.getElementById("dm-forward-search").addEventListener("input", dmFilterForward);
    document.getElementById("dm-forward-submit").addEventListener("click", dmSubmitForward);
    document.getElementById("dm-forward-note").addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            dmSubmitForward();
        }
    });
    document.getElementById("dm-pin-modal").addEventListener("click", function (event) {
        if (event.target.closest("[data-close]")) dmClosePinModal();
    });
    document.getElementById("dm-pin-confirm").addEventListener("click", function () {
        var row = dmPinRow;
        dmClosePinModal();
        if (row) dmSetPinned(row, true);
    });

    var pinsToggle = document.getElementById("dm-pins-toggle");
    pinsToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        dmTogglePins();
    });
    pinsToggle.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            dmTogglePins();
        }
    });
    document.getElementById("dm-pins-popover").addEventListener("click", function (event) {
        var card = event.target.closest("[data-jump]");
        if (!card) return;
        dmClosePins();
        dmJumpTo(card.getAttribute("data-jump"));
    });
    document.addEventListener("click", function (event) {
        if (dmPinsOpen() && !event.target.closest("#dm-pins-popover, #dm-pins-toggle")) dmClosePins();
    });
    document.addEventListener("discode-dm-pinned", function (event) {
        var data = event.detail;
        if (!data) return;
        var row = box.querySelector('.dm-msg[data-id="' + data.messageId + '"]');
        if (row) row.setAttribute("data-pinned", data.pinnedAt ? "1" : "0");
        dmRefreshPins();
    });
    window.addEventListener("resize", function () {
        dmClosePins();
        dmCloseMenu();
        if (dmPicker.mode) dmClosePicker();
    });
    document.querySelector(".dm-scroll").addEventListener("scroll", function () {
        dmCloseMenu();
        if (dmPicker.mode) dmClosePicker();
    });

    document.addEventListener("discode-dm-reaction", function (event) {
        var data = event.detail;
        if (!data) return;
        var row = box.querySelector('.dm-msg[data-id="' + data.messageId + '"]');
        if (row) dmRenderReactions(row, data.reactions || []);
    });

    document.addEventListener("discode-dm-deleted", function (event) {
        if (event.detail) dmRemoveMessage(event.detail.messageId);
    });

    document.addEventListener("discode-dm-call-updated", function (event) {
        var data = event.detail;
        if (!data || !data.message) return;
        var row = box.querySelector('.dm-call-msg[data-id="' + data.message.id + '"]');
        if (row) dmFillCallRow(row, data.message);
    });

    document.addEventListener("discode-dm-edited", function (event) {
        var data = event.detail;
        if (!data || !data.message) return;
        var row = box.querySelector('.dm-msg[data-id="' + data.message.id + '"]');
        if (row && !row.classList.contains("is-editing")) dmApplyEdit(row, data.message);
    });
}

function syncDmPlaceholder() {
    var field = document.getElementById("dm-input");
    var hint = document.getElementById("dm-placeholder");
    if (!field || !hint) return;
    hint.hidden = !!fieldValue(field).replace(/\n/g, "").trim();
}

function bindDmInput() {
    var observed = document.getElementById("dm-input");
    new MutationObserver(syncDmPlaceholder).observe(observed, { childList: true, characterData: true, subtree: true });
    observed.addEventListener("input", syncDmPlaceholder);
    syncDmPlaceholder();
    document.getElementById("dm-emoji").addEventListener("mousedown", rememberCaret);
    document.getElementById("dm-emoji").addEventListener("click", function () {
        dmPicker.mode = "";
        document.getElementById("emoji-panel").style.position = "";
        openEmojiPanel(this, document.getElementById("dm-input"));
    });

    document.getElementById("emoji-panel").addEventListener("mousedown", function (event) {
        if (event.target.closest(".emoji-choice")) event.preventDefault();
    });

    document.getElementById("emoji-panel").addEventListener("click", function (event) {
        var tab = event.target.closest("[data-emoji-tab]");
        if (tab) {
            var scroller = this.querySelector(".emoji-scroll");
            var section = document.getElementById("emoji-" + tab.getAttribute("data-emoji-tab"));
            if (section) scroller.scrollTop = section.offsetTop;
            var tabs = this.querySelectorAll("[data-emoji-tab]");
            for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i] === tab);
            return;
        }
        var choice = event.target.closest(".emoji-choice");
        if (!choice) return;
        insertEmoji(choice.getAttribute("data-emoji") || choice.textContent);
    });

    dmInput.addEventListener("focus", function () {
        this.setAttribute("data-empty", "0");
    });
    dmInput.addEventListener("input", function () {
        markEmpty(this);
    });
    dmInput.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
        event.preventDefault();
        submitDm();
    });
    dmInput.addEventListener("blur", function () {
        markEmpty(this);
    });
    document.getElementById("dm-compose").addEventListener("mousedown", function (event) {
        if (event.target.closest("button") || event.target.closest("#dm-input")) return;
        event.preventDefault();
        dmInput.focus();
    });

    document.getElementById("dm-input").addEventListener("paste", function (event) {
        event.preventDefault();
        var text = (event.clipboardData || window.clipboardData).getData("text") || "";
        if (!text) return;
        insertNodes(this, nodesForText(text));
    });

    document.addEventListener("click", function (event) {
        if (event.target.closest("#emoji-panel, #dm-emoji, .emoji-open")) return;
        closeEmojiPanel();
    });
}

if (document.getElementById("dm-chat")) {
    bindDmCall();
    bindDmCompose();
    bindDmInput();
    bindDmMessages();
}

if (document.readyState === "complete") startDmPage();
else window.addEventListener("load", startDmPage);
