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
    var call = new URLSearchParams(window.location.search).get("call");
    if (call === "voice" || call === "video") startDmCall();
    if (call === "video" && window.openCallCamera) window.openCallCamera();
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

function messageNodes(text) {
    var holder = document.createElement("div");
    holder.className = "dm-msg-text";
    nodesForText(text).forEach(function (node) { holder.appendChild(node); });
    return holder;
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
    var compact = !newDay && last && last.getAttribute("data-sender") === message.senderUserName &&
        stamp - Number(last.getAttribute("data-time")) < 5 * 60 * 1000 && box.lastElementChild === last;

    var row = document.createElement("div");
    row.className = "dm-msg" + (compact ? " compact" : "");
    row.setAttribute("data-id", String(message.id));
    row.setAttribute("data-sender", message.senderUserName);
    row.setAttribute("data-time", String(stamp));

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
    body.appendChild(messageNodes(message.text));
    row.appendChild(body);
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
    window.discodeOpenDm = userName;
    var stamps = document.querySelectorAll("#dm-messages .dm-msg");
    for (var i = 0; i < stamps.length; i++) {
        var when = stamps[i].querySelector("time");
        if (when) when.textContent = messageTime(Number(stamps[i].getAttribute("data-time")));
    }
    var texts = document.querySelectorAll("#dm-messages .dm-msg-text");
    for (var j = 0; j < texts.length; j++) {
        var text = texts[j].textContent;
        FLAG_RE.lastIndex = 0;
        if (!FLAG_RE.test(text)) continue;
        FLAG_RE.lastIndex = 0;
        while (texts[j].firstChild) texts[j].removeChild(texts[j].firstChild);
        nodesForText(text).forEach(function (node) { texts[j].appendChild(node); });
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
    if (typed !== null) {
        while (dmInput.firstChild) dmInput.removeChild(dmInput.firstChild);
        focusDmInput();
        markEmpty(dmInput);
    }
    dmQueue = dmQueue.then(function () {
        return dmRequest("/Dm/Send", "POST", { userName: partner, text: message });
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

document.addEventListener("discode-user-presence", function (event) {
    if (dmPartner && event.detail.userId === dmPartner.userId) paintDmStatus(event.detail.status);
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

function panelPhoto() {
    var img = document.querySelector("#user-panel .avatar img");
    return (img && img.getAttribute("src")) || "/assets/img/img-icon-profile.jpeg";
}

function myPhoto() {
    return fetch("/api/me").then(function (response) {
        if (!response.ok) throw new Error("me");
        return response.json();
    }).then(function (data) {
        return data.avatar || data.avatarUrl || data.photo || panelPhoto();
    }).catch(function () {
        return panelPhoto();
    });
}

var callInviteCardClosed = false;

function setCallInviteCardVisible(open) {
    var sheet = document.querySelector(".call-phone-sheet");
    if (!sheet) return;
    sheet.hidden = !open;
}

function startDmCall() {
    var profile = document.getElementById("dm-profile");
    var avatar = document.getElementById("call-avatar");
    avatar.src = panelPhoto();
    var photo = panelPhoto();
    setCallFace(photo);
    myPhoto().then(function (next) {
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
    joinVoiceSound.currentTime = 0;
    joinVoiceSound.play().catch(function() {});
}

function bindDmCall() {
    document.getElementById("dm-call").addEventListener("click", startDmCall);
    document.getElementById("dm-video").addEventListener("click", function () {
        startDmCall();
        if (window.openCallCamera) window.openCallCamera();
    });

    document.getElementById("call-hangup").addEventListener("click", function () {
        document.getElementById("call-stage").hidden = true;
        document.querySelector(".dm-chat").classList.remove("call-chat");
        callInviteCardClosed = false;
        setCallInviteCardVisible(true);
        if (profileOpenBeforeCall) setDmProfile(true);
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
        if (event.target.closest("#emoji-panel, #dm-emoji")) return;
        closeEmojiPanel();
    });
}

if (document.getElementById("dm-chat")) {
    bindDmCall();
    bindDmCompose();
    bindDmInput();
}

if (document.readyState === "complete") startDmPage();
else window.addEventListener("load", startDmPage);
