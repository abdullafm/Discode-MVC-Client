"use strict";
var micO = false;
var headO = false;
var openGroupData = null;

window.onload = function () {
    setTimeout(function () {
        var loader = document.getElementById("loader");
        if (loader) loader.remove();
    }, 2000);
    showGroup();
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

function loadStoredGroups() {
    try {
        var saved = JSON.parse(localStorage.getItem("discode-groups") || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

function meName() {
    var me = document.querySelector(".me-display");
    return me ? me.textContent.trim() : "";
}

function personPhoto(name) {
    var meImg = document.querySelector("#user-panel .avatar img");
    if (meName() === name && meImg) return meImg.getAttribute("src") || "";
    var rows = document.querySelectorAll(".friend-list .friend-item:not([data-group])");
    for (var i = 0; i < rows.length; i++) {
        var label = rows[i].querySelector("p");
        var img = rows[i].querySelector("img");
        if (label && img && label.textContent.trim() === name) return img.getAttribute("src") || "";
    }
    return meImg ? meImg.getAttribute("src") || "" : "";
}

function paintMembers(names) {
    var list = document.getElementById("group-member-list");
    var tpl = document.getElementById("group-member");
    if (!list || !tpl) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    names.forEach(function (name) {
        var row = tpl.content.firstElementChild.cloneNode(true);
        var img = row.querySelector("img");
        if (img) img.src = personPhoto(name);
        var label = row.querySelector("p");
        if (label) label.textContent = name;
        list.appendChild(row);
    });
}

function showGroup() {
    var id = new URLSearchParams(window.location.search).get("group");
    var groups = loadStoredGroups();
    var group = null;
    for (var i = 0; i < groups.length; i++) {
        if (groups[i].id === id) group = groups[i];
    }
    if (!group) {
        var names = [];
        var listed = document.querySelectorAll("#group-member-list .group-member p");
        for (var m = 0; m < listed.length; m++) {
            var listedName = listed[m].textContent.trim();
            if (listedName && listedName !== meName()) names.push(listedName);
        }
        group = { id: "", name: document.getElementById("group-title").textContent.trim(), members: names };
    }
    openGroupData = group;
    var title = group.name || group.members.join(", ");
    document.title = "Discord | " + title;
    document.getElementById("group-title").textContent = title;
    document.getElementById("group-name").textContent = title;
    paintGroupIcon(group.icon || "");
    document.getElementById("group-welcome").textContent = "Welcome to the beginning of the " + title + " group.";
    document.getElementById("group-search").placeholder = "Search " + title;
    document.getElementById("group-input").setAttribute("data-placeholder", "Message " + title);
    document.getElementById("group-count").textContent = String(group.members.length + 1);

    var people = group.members.concat([meName() || "Anonymou5"]);
    paintMembers(people);

    if (window.matchMedia("(max-width: 1100px)").matches) setGroupMembers(false, true);

    var items = document.querySelectorAll(".friend-item");
    for (var n = 0; n < items.length; n++) {
        items[n].classList.toggle("active", items[n].getAttribute("data-group") === group.id);
    }
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

var membersOpenBeforeCall = false;

function startGroupCall() {
    var face = document.getElementById("call-avatar");
    var membersPanel = document.getElementById("group-members");
    var members = openGroupData && openGroupData.members ? openGroupData.members : [];
    face.src = panelPhoto();
    myPhoto().then(function (next) {
        face.src = next;
    });
    var title = document.getElementById("group-title").textContent;
    document.querySelector(".call-phone-name").textContent = title;
    document.querySelector(".call-phone-label").textContent = title;
    var faces = document.querySelector(".call-phone-faces");
    if (faces) {
        while (faces.firstChild) faces.removeChild(faces.firstChild);
        members.slice(0, 2).forEach(function (name) {
            var face = cloneTpl("call-face");
            if (!face) return;
            face.src = personPhoto(name);
            faces.appendChild(face);
        });
    }
    callInviteCardClosed = false;
    setCallInviteCardVisible(true);
    document.querySelector(".group-chat").classList.remove("call-chat");
    document.getElementById("call-stage").hidden = false;
    membersOpenBeforeCall = !membersPanel.classList.contains("is-collapsed");
    setGroupMembers(false);
    joinVoiceSound.currentTime = 0;
    joinVoiceSound.play().catch(function() {});
}

document.getElementById("group-call").addEventListener("click", startGroupCall);
document.getElementById("group-video").addEventListener("click", function () {
    startGroupCall();
    if (window.openCallCamera) window.openCallCamera();
});

document.getElementById("call-hangup").addEventListener("click", function () {
    document.getElementById("call-stage").hidden = true;
    document.querySelector(".group-chat").classList.remove("call-chat");
    callInviteCardClosed = false;
    setCallInviteCardVisible(true);
    if (membersOpenBeforeCall) setGroupMembers(true);
});

var phoneChat = document.querySelector(".call-phone-chat");
if (phoneChat) phoneChat.addEventListener("click", function () {
    document.querySelector(".group-chat").classList.add("call-chat");
});

document.querySelector(".call-phone-back").addEventListener("click", function () {
    document.querySelector(".group-chat").classList.add("call-chat");
});

document.querySelector(".call-return").addEventListener("click", function () {
    document.querySelector(".group-chat").classList.remove("call-chat");
});

function paintGroupIcon(icon) {
    ["group-mark", "group-badge", "group-edit-icon"].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle("has-photo", !!icon);
        el.style.backgroundImage = icon ? "url(\"" + icon.replace(/"/g, "") + "\")" : "";
    });
}

var pendingIcon = "";
var callInviteCardClosed = false;

function setCallInviteCardVisible(open) {
    var sheet = document.querySelector(".call-phone-sheet");
    if (!sheet) return;
    sheet.hidden = !open;
}

function groupApi(id) {
    return "/api/groups/" + encodeURIComponent(id);
}

function applyEditedGroup(group) {
    if (!openGroupData) return;
    openGroupData.name = group.name;
    openGroupData.icon = group.icon || "";
    if (group.members) openGroupData.members = group.members;
    var title = group.name || openGroupData.members.join(", ");
    document.title = "Discord | " + title;
    document.getElementById("group-title").textContent = title;
    document.getElementById("group-name").textContent = title;
    document.getElementById("group-welcome").textContent = "Welcome to the beginning of the " + title + " group.";
    document.getElementById("group-search").placeholder = "Search " + title;
    document.getElementById("group-input").setAttribute("data-placeholder", "Message " + title);
    paintGroupIcon(openGroupData.icon);
    var row = document.querySelector('.friend-item[data-group="' + openGroupData.id + '"]');
    if (row) {
        var label = row.querySelector("p");
        var face = row.querySelector(".group-avatar");
        var count = row.querySelector(".group-row-text span");
        if (label) label.textContent = title;
        if (count) count.textContent = (openGroupData.members.length + 1) + " Members";
        if (face) {
            var photo = face.querySelector("img");
            var mark = face.querySelector("i");
            if (photo) {
                photo.hidden = !openGroupData.icon;
                if (openGroupData.icon) photo.src = openGroupData.icon;
            }
            if (mark) mark.hidden = !!openGroupData.icon;
        }
    }
}

function saveGroupEdit(body) {
    if (!openGroupData || !openGroupData.id) return;
    fetch(groupApi(openGroupData.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    }).then(function (res) {
        if (!res.ok) throw new Error();
        return res.json();
    }).then(function (group) {
        applyEditedGroup({
            name: group.name || body.name || openGroupData.name,
            icon: group.icon || body.icon || openGroupData.icon || "",
            members: group.members || openGroupData.members
        });
    });
}

function closeGroupEdit() {
    document.getElementById("group-edit-modal").hidden = true;
}

function setGroupMembers(open, instant) {
    var panel = document.getElementById("group-members");
    var sheet = panel.querySelector(".group-members");
    if (instant) {
        panel.classList.add("no-motion");
        if (sheet) sheet.classList.add("no-motion");
    }
    panel.classList.toggle("is-collapsed", !open);
    panel.toggleAttribute("inert", !open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    document.getElementById("group-members-toggle").classList.toggle("on", open);
    if (instant) {
        panel.offsetWidth;
        panel.classList.remove("no-motion");
        if (sheet) sheet.classList.remove("no-motion");
    }
}

document.getElementById("group-members-toggle").addEventListener("click", function () {
    setGroupMembers(document.getElementById("group-members").classList.contains("is-collapsed"));
});

function inviteHere() {
    if (typeof openNewMessage === "function" && openGroupData) openNewMessage(openGroupData.members);
}

document.getElementById("group-invite").addEventListener("click", inviteHere);
document.getElementById("group-invite-side").addEventListener("click", inviteHere);
document.getElementById("group-add").addEventListener("click", inviteHere);
document.querySelector(".call-phone-add").addEventListener("click", inviteHere);
document.getElementById("call-phone-add-close").addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    callInviteCardClosed = true;
    setCallInviteCardVisible(false);
});

document.getElementById("group-edit").addEventListener("click", function () {
    pendingIcon = openGroupData && openGroupData.icon ? openGroupData.icon : "";
    var preview = document.getElementById("group-edit-icon");
    preview.classList.toggle("has-photo", !!pendingIcon);
    preview.style.backgroundImage = pendingIcon ? "url(\"" + pendingIcon.replace(/"/g, "") + "\")" : "";
    document.getElementById("group-name-input").value = document.getElementById("group-name").textContent;
    document.getElementById("group-edit-modal").hidden = false;
    document.getElementById("group-name-input").focus();
});

document.getElementById("group-rename-cancel").addEventListener("click", closeGroupEdit);
document.getElementById("group-edit-cancel").addEventListener("click", closeGroupEdit);
document.getElementById("group-edit-modal").addEventListener("click", function (event) {
    if (event.target === this) closeGroupEdit();
});

document.getElementById("group-icon-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
        var image = new Image();
        image.onload = function () {
            var size = 256;
            var canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            var ctx = canvas.getContext("2d");
            var scale = Math.max(size / image.width, size / image.height);
            var w = image.width * scale;
            var h = image.height * scale;
            ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
            pendingIcon = canvas.toDataURL("image/jpeg", 0.8);
            var preview = document.getElementById("group-edit-icon");
            preview.classList.add("has-photo");
            preview.style.backgroundImage = "url(\"" + pendingIcon + "\")";
        };
        image.src = reader.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById("group-rename").addEventListener("submit", function (event) {
    event.preventDefault();
    var name = document.getElementById("group-name-input").value.trim();
    if (!name) return;
    var current = openGroupData && openGroupData.name ? openGroupData.name : document.getElementById("group-name").textContent;
    var iconChanged = !openGroupData || pendingIcon !== (openGroupData.icon || "");
    var nameChanged = name !== current;
    closeGroupEdit();
    if (!nameChanged && !iconChanged) return;
    var body = {};
    if (nameChanged) body.name = name;
    if (iconChanged) body.icon = pendingIcon;
    saveGroupEdit(body);
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !document.getElementById("group-edit-modal").hidden) closeGroupEdit();
});

document.getElementById("group-compose").addEventListener("submit", function (event) {
    event.preventDefault();
});

document.getElementById("group-emoji").addEventListener("click", function () {
    var panel = document.getElementById("emoji-panel");
    if (!panel.childElementCount && typeof fillEmojiPanel === "function") fillEmojiPanel(panel, "group-emoji");
    var box = document.getElementById("group-compose");
    var button = this.getBoundingClientRect();
    var parent = box.getBoundingClientRect();
    panel.hidden = !panel.hidden;
    if (panel.hidden) return;
    var left = button.right - parent.left - panel.offsetWidth;
    if (left < 8) left = 8;
    panel.style.left = left + "px";
    panel.style.top = (button.top - parent.top - panel.offsetHeight - 8) + "px";
});

var groupInput = document.getElementById("group-input");
function groupHasText() {
    return !!((groupInput.textContent || "").replace(/\u200b/g, "").trim());
}
groupInput.addEventListener("focus", function () {
    this.setAttribute("data-empty", "0");
});
groupInput.addEventListener("input", function () {
    if (groupHasText()) this.setAttribute("data-empty", "0");
});
groupInput.addEventListener("blur", function () {
    this.setAttribute("data-empty", groupHasText() ? "0" : "1");
});
document.getElementById("group-compose").addEventListener("mousedown", function (event) {
    if (event.target.closest("button")) return;
    if (document.activeElement === groupInput) return;
    event.preventDefault();
    groupInput.focus();
});

document.getElementById("emoji-panel").addEventListener("click", function (event) {
    var tab = event.target.closest("[data-emoji-tab]");
    if (tab) {
        var section = document.getElementById("group-emoji-" + tab.getAttribute("data-emoji-tab"));
        if (section) this.querySelector(".emoji-scroll").scrollTop = section.offsetTop;
        var tabs = this.querySelectorAll("[data-emoji-tab]");
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i] === tab);
        return;
    }
    var choice = event.target.closest(".emoji-choice");
    if (!choice) return;
    var field = document.getElementById("group-input");
    field.focus();
    document.execCommand("insertText", false, choice.textContent);
    field.setAttribute("data-empty", "0");
});

document.addEventListener("click", function (event) {
    if (event.target.closest("#emoji-panel, #group-emoji")) return;
    var panel = document.getElementById("emoji-panel");
    if (panel) panel.hidden = true;
});

var logoutBtn = document.getElementById("me-logout");
if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        if (confirm("Are you sure you want to log out?")) {
            window.location.href = "./login.html";
        }
    });
}
