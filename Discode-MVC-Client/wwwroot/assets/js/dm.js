"use strict";
var micO = false;
var headO = false;

window.onload = function () {
    setTimeout(function () {
        var loader = document.getElementById("loader");
        if (loader) loader.remove();
    }, 2000);
    openDm();
    var call = new URLSearchParams(window.location.search).get("call");
    if (call === "voice" || call === "video") startDmCall();
    if (call === "video" && window.openCallCamera) window.openCallCamera();
};

var x = new Audio("./assets/css/audio/discordmute_IZNcLx2.mp3");
var y = new Audio("./assets/css/audio/discord-unmute-sound.mp3");
var joinVoiceSound = new Audio("./assets/css/audio/join-voice.mp3");

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

function friendRows() {
    return document.querySelectorAll(".friend-list .friend-item:not([data-group])");
}

function rowName(row) {
    var label = row.querySelector("p");
    return label ? label.textContent.trim() : "";
}

function findFriend(name) {
    var rows = friendRows();
    var i;
    for (i = 0; i < rows.length; i++) {
        if (rowName(rows[i]) === name) return rows[i];
    }
    return rows[0] || null;
}

function openDm() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("group")) {
        if (window.discodeGo) window.discodeGo("./group.html?group=" + encodeURIComponent(params.get("group")), true);
        else window.location.replace("./group.html?group=" + encodeURIComponent(params.get("group")));
        return;
    }
    var row = findFriend(params.get("name") || "");
    if (!row) return;
    var name = rowName(row);
    var photo = row.querySelector("img");
    var avatar = photo ? photo.getAttribute("src") : "";

    document.title = "Discord | " + name;
    document.getElementById("dm-title").textContent = name;
    document.getElementById("dm-name").textContent = name;
    document.getElementById("dm-handle").textContent = name;
    document.getElementById("dm-start-name").textContent = name;
    document.getElementById("dm-system-name").textContent = name;
    document.getElementById("dm-wave").textContent = "Wave to " + name;
    document.getElementById("dm-input").setAttribute("data-placeholder", "Message @" + name);
    document.getElementById("dm-avatar").src = avatar;
    document.getElementById("dm-profile-avatar").src = avatar;
    document.getElementById("dm-profile-name").textContent = name;
    document.getElementById("dm-profile-handle").textContent = name;
    document.getElementById("dm-since").textContent = row.getAttribute("data-since") || "";
    document.getElementById("dm-clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (window.matchMedia("(max-width: 1100px)").matches) setDmProfile(false, true);

    var items = document.querySelectorAll(".friend-item");
    for (var i = 0; i < items.length; i++) {
        var label = items[i].querySelector("p");
        items[i].classList.toggle("active", label && label.textContent === name && !items[i].getAttribute("data-group"));
    }
}

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
    return (img && img.getAttribute("src")) || "./assets/img/img-icon-profile.jpeg";
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
    var name = document.getElementById("dm-profile-name").textContent;
    var photo = document.getElementById("dm-profile-avatar").getAttribute("src");
    if (window.openUserProfile) window.openUserProfile(name, photo);
});

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

document.getElementById("dm-profile-toggle").addEventListener("click", function () {
    setDmProfile(document.getElementById("dm-profile").classList.contains("is-collapsed"));
});

document.getElementById("dm-profile-close").addEventListener("click", function () {
    setDmProfile(false);
});

document.getElementById("dm-compose").addEventListener("submit", function (event) {
    event.preventDefault();
});

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

var dmInput = document.getElementById("dm-input");
dmInput.addEventListener("focus", function () {
    this.setAttribute("data-empty", "0");
});
dmInput.addEventListener("input", function () {
    markEmpty(this);
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

var logoutBtn = document.getElementById("me-logout");
if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        if (confirm("Are you sure you want to log out?")) {
            window.location.href = "./login.html";
        }
    });
}
