"use strict";
var GROUP_KEY = "discode-groups";
var GROUP_LIMIT = 10;

var picked = [];
var already = [];

function loadGroups() {
    try {
        var saved = JSON.parse(localStorage.getItem(GROUP_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

function saveGroups(groups) {
    localStorage.setItem(GROUP_KEY, JSON.stringify(groups));
}

var PIN_KEY = "discode-pins";

function loadPins() {
    try {
        var saved = JSON.parse(localStorage.getItem(PIN_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        return [];
    }
}

function savePins(pins) {
    localStorage.setItem(PIN_KEY, JSON.stringify(pins));
}

function rowName(item) {
    var nameEl = item.querySelector("p");
    return nameEl ? nameEl.textContent.trim() : "";
}

function applyPins() {
    var list = document.querySelector(".friend-list");
    if (!list) return;
    var people = list.querySelectorAll(".friend-item:not(.group-row)");
    if (!list.dataset.ordered) {
        for (var i = 0; i < people.length; i++) people[i].setAttribute("data-order", String(i));
        list.dataset.ordered = "1";
    }
    var pins = loadPins();
    var rows = Array.prototype.slice.call(list.querySelectorAll(".friend-item:not(.group-row)"));
    var groups = Array.prototype.slice.call(list.querySelectorAll(".group-row"));
    rows.sort(function (a, b) {
        return Number(a.getAttribute("data-order")) - Number(b.getAttribute("data-order"));
    });
    var pinned = [];
    var rest = [];
    rows.forEach(function (row) {
        var name = rowName(row);
        var on = pins.indexOf(name) !== -1;
        row.classList.toggle("pinned", on);
        var old = row.querySelector(".row-pin");
        if (old) old.remove();
        if (on) {
            var icon = document.createElement("i");
            icon.className = "fa-solid fa-thumbtack row-pin";
            icon.setAttribute("aria-hidden", "true");
            row.appendChild(icon);
            pinned.push(row);
        } else {
            rest.push(row);
        }
    });
    pinned.sort(function (a, b) {
        return pins.indexOf(rowName(a)) - pins.indexOf(rowName(b));
    });
    var recent = groups.concat(rest);
    recent.sort(function (a, b) {
        var diff = Number(b.getAttribute("data-last") || 0) - Number(a.getAttribute("data-last") || 0);
        if (diff !== 0) return diff;
        return Number(a.getAttribute("data-order") || 0) - Number(b.getAttribute("data-order") || 0);
    });
    pinned.concat(recent).forEach(function (row) {
        list.appendChild(row);
    });
}

function togglePin(name) {
    var pins = loadPins();
    var index = pins.indexOf(name);
    if (index === -1) pins.unshift(name);
    else pins.splice(index, 1);
    savePins(pins);
    applyPins();
}

function paintGroupRows(groups) {
    var list = document.querySelector(".friend-list");
    var tpl = document.getElementById("group-row");
    if (!list || !tpl) return;
    var open = document.getElementById("group-chat");
    var openId = open ? open.getAttribute("data-group-id") : "";
    var wanted = {};
    groups.forEach(function (group) { wanted[String(group.id)] = true; });
    var existing = {};
    [].forEach.call(list.querySelectorAll("[data-group]"), function (row) {
        var id = row.getAttribute("data-group");
        if (wanted[id]) existing[id] = row;
        else row.remove();
    });
    groups.slice().reverse().forEach(function (group) {
        var id = String(group.id);
        var link = existing[id];
        if (!link) {
            link = tpl.content.firstElementChild.cloneNode(true);
            link.href = "/Group/Index?id=" + encodeURIComponent(group.id);
            link.setAttribute("data-group", id);
            list.insertBefore(link, list.firstChild);
        }
        var photo = link.querySelector(".group-avatar img");
        var mark = link.querySelector(".group-avatar i");
        if (photo) {
            photo.hidden = !group.iconUrl;
            if (group.iconUrl && photo.getAttribute("src") !== group.iconUrl) photo.src = group.iconUrl;
        }
        if (mark) mark.hidden = !!group.iconUrl;
        var label = link.querySelector("p");
        var meta = link.querySelector(".group-row-text span");
        if (label && label.textContent !== group.name) label.textContent = group.name;
        var count = group.memberCount + " Members";
        if (meta && meta.textContent !== count) meta.textContent = count;
        link.classList.toggle("active", id === openId);
        var unread = Number(group.unreadCount || 0);
        var badge = link.querySelector(".dm-unread");
        if (badge) {
            badge.textContent = unread > 99 ? "99+" : String(unread);
            badge.hidden = unread <= 0;
        }
        link.classList.toggle("has-unread", unread > 0);
        link.setAttribute("data-last", String(Date.parse(/Z$|[+-]\d\d:\d\d$/.test(String(group.lastMessageAt)) ? group.lastMessageAt : group.lastMessageAt + "Z") || 0));
    });
    applyPins();
}

function renderGroupList() {
    if (window.discodeGroupCache) paintGroupRows(window.discodeGroupCache);
    fetch("/Group/Mine", {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then(function (response) {
        return response.ok ? response.json() : null;
    }).then(function (groups) {
        if (!Array.isArray(groups)) return;
        window.discodeGroupCache = groups;
        paintGroupRows(groups);
    }).catch(function () {});
}

function renderPicker() {
    var query = document.getElementById("new-msg-search").value.trim().toLowerCase();
    var list = document.getElementById("new-msg-list");
    var chips = document.getElementById("new-msg-chips");
    var chip = document.getElementById("new-msg-chip");
    var empty = document.getElementById("new-msg-empty");
    while (chips.firstChild) chips.removeChild(chips.firstChild);
    picked.forEach(function (name) {
        var node = chip.content.firstElementChild.cloneNode(true);
        node.querySelector("span").textContent = name;
        node.querySelector("button").setAttribute("data-remove", name);
        chips.appendChild(node);
    });
    var rows = list.querySelectorAll(".new-msg-friend");
    var shown = 0;
    for (var i = 0; i < rows.length; i++) {
        var name = rows[i].getAttribute("data-friend");
        var hide = already.indexOf(name) !== -1 || name.toLowerCase().indexOf(query) === -1;
        rows[i].hidden = hide;
        var on = picked.indexOf(name) !== -1;
        rows[i].classList.toggle("on", on);
        rows[i].querySelector("input").checked = on;
        if (!hide) shown++;
    }
    if (empty) empty.hidden = shown > 0;
    document.getElementById("new-msg-create").disabled = picked.length === 0;
}

function loadPickerFriends() {
    return fetch("/Home/Friends", {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" }
    }).then(function (response) {
        return response.ok ? response.json() : [];
    }).then(function (friends) {
        var list = document.getElementById("new-msg-list");
        var old = list.querySelectorAll(".new-msg-friend");
        for (var i = 0; i < old.length; i++) old[i].remove();
        (friends || []).forEach(function (friend) {
            var userName = friend.userName || friend.username || "";
            var row = document.createElement("label");
            row.className = "new-msg-friend";
            row.setAttribute("data-friend", userName);
            var photo = document.createElement("img");
            photo.alt = "";
            photo.src = friend.avatarUrl || friend.avatar || "/assets/img/img-icon-profile.jpeg";
            var label = document.createElement("span");
            label.textContent = userName;
            var box = document.createElement("input");
            box.type = "checkbox";
            box.setAttribute("data-friend", userName);
            row.appendChild(photo);
            row.appendChild(label);
            row.appendChild(box);
            list.appendChild(row);
        });
    }).catch(function () {});
}

function openNewMessage(members) {
    already = members ? members.slice() : [];
    picked = [];
    document.getElementById("new-msg-search").value = "";
    renderPicker();
    document.getElementById("new-msg").hidden = false;
    document.getElementById("new-msg-search").focus();
    loadPickerFriends().then(renderPicker);
}

function closeNewMessage() {
    document.getElementById("new-msg").hidden = true;
}

function toggleFriend(name) {
    var index = picked.indexOf(name);
    if (index !== -1) picked.splice(index, 1);
    else if (already.length + picked.length < GROUP_LIMIT - 1) picked.push(name);
    renderPicker();
}

function createMessage() {
    if (!picked.length) return;
    var chat = document.getElementById("group-chat");
    var groupId = chat ? chat.getAttribute("data-group-id") : "";
    var members = already.concat(picked).filter(function (name, index, list) {
        return !!name && list.indexOf(name) === index;
    }).sort();
    if (groupId) {
        sendGroupRequest("/Group/AddMembers", { id: Number(groupId), userNames: picked.slice() }, function () {
            closeNewMessage();
        });
        return;
    }
    if (members.length === 1) {
        window.discodeGo("/Dm/Index?name=" + encodeURIComponent(members[0]));
        return;
    }
    sendGroupRequest("/Group/Create", { userNames: members }, function (group) {
        closeNewMessage();
        renderGroupList();
        window.discodeGo("/Group/Index?id=" + encodeURIComponent(group.id));
    });
}

function sendGroupRequest(url, body, done) {
    var failure = document.getElementById("new-msg-error");
    var create = document.getElementById("new-msg-create");
    if (failure) failure.hidden = true;
    if (create) create.disabled = true;
    var tokenInput = document.querySelector("input[name='__RequestVerificationToken']");
    fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "RequestVerificationToken": tokenInput ? tokenInput.value : "",
            "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify(body)
    }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok) throw new Error((data && data.errors && data.errors[0]) || "Something went wrong.");
            return data;
        });
    }).then(done).catch(function (error) {
        if (failure) {
            failure.textContent = error.message;
            failure.hidden = false;
        }
        if (create) create.disabled = false;
    });
}

var newButton = document.querySelector(".direct-messages h2 .dm-new");
if (newButton) {
    newButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openNewMessage();
    });
}

document.getElementById("new-msg-close").addEventListener("click", closeNewMessage);
document.getElementById("new-msg-cancel").addEventListener("click", closeNewMessage);
document.getElementById("new-msg").addEventListener("click", function (event) {
    if (event.target === this) closeNewMessage();
});
document.getElementById("new-msg-search").addEventListener("input", renderPicker);
document.getElementById("new-msg-chips").addEventListener("click", function (event) {
    var button = event.target.closest("[data-remove]");
    if (!button) return;
    toggleFriend(button.getAttribute("data-remove"));
});
document.getElementById("new-msg-list").addEventListener("change", function (event) {
    var box = event.target.closest("[data-friend]");
    if (!box) return;
    toggleFriend(box.getAttribute("data-friend"));
});
document.getElementById("new-msg-create").addEventListener("click", createMessage);
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !document.getElementById("new-msg").hidden) closeNewMessage();
});

renderGroupList();
document.addEventListener("discode-groups-changed", renderGroupList);
document.addEventListener("discode-group-message", function (event) {
    var data = event.detail;
    if (!data || !data.message || !Array.isArray(window.discodeGroupCache)) return;
    var field = document.getElementById("Update_UserName");
    var me = field ? field.value.trim() : "";
    var open = document.getElementById("group-chat");
    var openId = open ? Number(open.getAttribute("data-group-id")) : 0;
    window.discodeGroupCache.forEach(function (group) {
        if (group.id !== data.groupId) return;
        group.lastMessageAt = data.message.createdAt;
        if (data.message.senderUserName !== me && !data.message.isSystem && !(openId === group.id && !document.hidden)) {
            group.unreadCount = Number(group.unreadCount || 0) + 1;
        }
    });
    paintGroupRows(window.discodeGroupCache);
});
document.addEventListener("discode-hub-connected", function (event) {
    if (event.detail && event.detail.pageSwap) return;
    renderGroupList();
});
document.addEventListener("visibilitychange", function () {
    if (!document.hidden) renderGroupList();
});

(function () {
    var menu = document.getElementById("row-menu");
    if (!menu) return;
    var muteName = document.getElementById("row-menu-mute-name");

    function closeRowMenu() {
        menu.hidden = true;
        var subs = menu.querySelectorAll(".row-menu-sub");
        for (var i = 0; i < subs.length; i++) subs[i].classList.remove("open");
    }

    function placeRowMenu(x, y) {
        menu.hidden = false;
        var width = menu.offsetWidth;
        var height = menu.offsetHeight;
        var left = x;
        var top = y;
        if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
        if (top + height > window.innerHeight - 8) top = window.innerHeight - height - 8;
        if (left < 8) left = 8;
        if (top < 8) top = 8;
        menu.style.left = left + "px";
        menu.style.top = top + "px";
    }

    function oneToOneCall(user) {
        var calls = window.discodeCalls;
        var current = calls && calls.current ? calls.current() : null;
        return current && current.other && String(current.other.userName).toLowerCase() === String(user).toLowerCase() ? current : null;
    }

    function paintCallItems(user) {
        var current = oneToOneCall(user);
        var ring = current && current.status === "active" && current.joined !== false && current.peerPresent === false;
        var stop = current && current.status === "ringing" && current.role === "caller";
        function setHidden(action, hidden) {
            var button = menu.querySelector('[data-action="' + action + '"]');
            if (button && button.parentNode) button.parentNode.hidden = hidden;
        }
        setHidden("call", !!current);
        setHidden("ring", !ring);
        setHidden("stopring", !stop);
    }

    function openRowMenu(item, x, y) {
        if (menu.getAttribute("data-pop-lock") === "1") {
            window.setTimeout(function () { openRowMenu(item, x, y); }, 230);
            return;
        }
        var nameEl = item.querySelector("p");
        var name = nameEl ? nameEl.textContent.trim() : "user";
        var photo = item.querySelector("img");
        menu.dataset.name = name;
        menu.dataset.user = item.getAttribute("data-dm") || "";
        paintCallItems(menu.dataset.user);
        menu.dataset.photo = photo ? photo.getAttribute("src") || "" : "";
        if (muteName) muteName.textContent = name;
        var pinLabel = menu.querySelector('[data-action="pin"] .row-menu-label');
        if (pinLabel) pinLabel.textContent = loadPins().indexOf(name) !== -1 ? "Unpin" : "Pin";
        var subs = menu.querySelectorAll(".row-menu-sub");
        for (var i = 0; i < subs.length; i++) subs[i].classList.remove("open");
        placeRowMenu(x, y);
    }

    document.addEventListener("contextmenu", function (event) {
        var face = event.target.closest("#call-faces .call-face");
        if (face && face.querySelector("#call-avatar") && window.discodeOpenDm) {
            var row = document.querySelector('.friend-list .friend-item[data-dm="' + window.discodeOpenDm + '"]');
            if (row) {
                event.preventDefault();
                openRowMenu(row, event.clientX, event.clientY);
                return;
            }
        }
        var item = event.target.closest(".friend-list .friend-item:not(.group-row)");
        if (!item) {
            if (!menu.hidden && !menu.contains(event.target)) closeRowMenu();
            return;
        }
        event.preventDefault();
        openRowMenu(item, event.clientX, event.clientY);
    });

    var pressTimer = 0;
    document.addEventListener("touchstart", function (event) {
        var item = event.target.closest(".friend-list .friend-item:not(.group-row)");
        if (!item || event.touches.length !== 1) return;
        var touch = event.touches[0];
        pressTimer = window.setTimeout(function () {
            openRowMenu(item, touch.clientX, touch.clientY);
        }, 500);
    }, { passive: true });
    document.addEventListener("touchend", function () { window.clearTimeout(pressTimer); });
    document.addEventListener("touchmove", function () { window.clearTimeout(pressTimer); });

    function placeSub(branch) {
        var box = branch.querySelector(".row-menu-sub");
        if (!box) return;
        box.style.left = "";
        box.style.right = "";
        box.style.top = "0";
        box.style.bottom = "auto";
        var rect = box.getBoundingClientRect();
        if (rect.right > window.innerWidth - 8) {
            box.style.left = "auto";
            box.style.right = "calc(100% + 6px)";
        }
        rect = box.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 8) {
            box.style.top = "auto";
            box.style.bottom = "0";
        }
    }

    menu.addEventListener("mouseover", function (event) {
        var branch = event.target.closest(".row-menu-branch");
        if (!branch || !menu.contains(branch)) return;
        if (event.relatedTarget && branch.contains(event.relatedTarget)) return;
        placeSub(branch);
    });

    menu.addEventListener("click", function (event) {
        var branch = event.target.closest("[data-sub]");
        if (branch) {
            var box = branch.parentNode.querySelector(".row-menu-sub");
            var willOpen = !box.classList.contains("open");
            var subs = menu.querySelectorAll(".row-menu-sub");
            for (var i = 0; i < subs.length; i++) subs[i].classList.remove("open");
            if (willOpen) {
                box.classList.add("open");
                placeSub(branch.parentNode);
            }
            return;
        }
        var action = event.target.closest("[data-action]");
        if (!action) {
            if (!event.target.closest("button")) closeRowMenu();
            return;
        }
        var kind = action.getAttribute("data-action");
        var user = menu.dataset.user || menu.dataset.name;
        var name = menu.dataset.name;
        var photo = menu.dataset.photo;
        closeRowMenu();
        var live = oneToOneCall(user);
        if (kind === "call" && window.discodeGo) window.discodeGo("/Dm/Index?name=" + encodeURIComponent(user) + "&call=1&t=" + Date.now());
        if (kind === "ring" && live && window.discodeCalls) window.discodeCalls.start(user, !!live.video).catch(function () {});
        if (kind === "stopring" && live && window.discodePresence) window.discodePresence.invoke("EndCall", live.callId, true).catch(function () {});
        if (kind === "pin") togglePin(name);
        if (kind === "profile" && typeof openUserProfile === "function") openUserProfile(user, photo);
    });

    function closeOutside(event) {
        if (menu.hidden || menu.contains(event.target)) return;
        if (event.button === 2) return;
        closeRowMenu();
    }

    document.addEventListener("mousedown", closeOutside, true);
    document.addEventListener("touchstart", closeOutside, { capture: true, passive: true });
    document.addEventListener("click", closeOutside, true);
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeRowMenu();
    });
    window.addEventListener("blur", closeRowMenu);
    window.addEventListener("resize", closeRowMenu);
    document.addEventListener("scroll", closeRowMenu, true);
})();

(function () {
    var settings = document.getElementById("settings");
    var open = document.getElementById("settings-open");
    if (!settings || !open) return;

    function closeSettings() {
        settings.hidden = true;
    }

    open.addEventListener("click", function () {
        settings.hidden = false;
    });
    document.getElementById("settings-close").addEventListener("click", closeSettings);
    settings.addEventListener("click", function (event) {
        if (event.target === settings) closeSettings();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !settings.hidden) closeSettings();
    });
    settings.querySelectorAll("[data-settings-tab]").forEach(function (button) {
        button.addEventListener("click", function () {
            var tab = button.getAttribute("data-settings-tab");
            settings.querySelectorAll("[data-settings-tab]").forEach(function (item) {
                item.classList.toggle("on", item === button);
            });
            settings.querySelectorAll("section[id^='settings-']").forEach(function (panel) {
                panel.hidden = panel.id !== "settings-" + tab;
            });
            if (window.innerWidth <= 800) button.scrollIntoView({ inline: "nearest", block: "nearest" });
        });
    });

    if (window.DiscodeLang && typeof window.DiscodeLang.apply === "function") {
        window.DiscodeLang.apply();
    }

    var notifyKey = "discode-notify";
    var notifyState = { all: true, dm: true, friends: true, sound: true };
    try {
        var savedNotify = JSON.parse(localStorage.getItem(notifyKey) || "");
        if (savedNotify && typeof savedNotify === "object") notifyState = savedNotify;
    } catch (error) {}

    function paintNotify() {
        var switches = settings.querySelectorAll("[data-notify]");
        for (var i = 0; i < switches.length; i++) {
            var key = switches[i].getAttribute("data-notify");
            var on = !!notifyState[key];
            switches[i].classList.toggle("on", on);
            switches[i].setAttribute("aria-pressed", on ? "true" : "false");
            var row = switches[i].closest(".notify-row");
            if (row && key !== "all") row.classList.toggle("is-off", !notifyState.all);
        }
        var rows = settings.querySelectorAll(".notify-row");
        if (rows[0]) rows[0].classList.toggle("is-off", !notifyState.all);
    }

    paintNotify();
    settings.addEventListener("click", function (event) {
        var button = event.target.closest("[data-notify]");
        if (!button) return;
        var key = button.getAttribute("data-notify");
        if (key !== "all" && !notifyState.all) return;
        notifyState[key] = !notifyState[key];
        localStorage.setItem(notifyKey, JSON.stringify(notifyState));
        paintNotify();
    });

    var themeKey = "discode-theme";
    function applyTheme(theme) {
        var dark = theme === "dark";
        document.documentElement.classList.toggle("theme-dark", dark);
        localStorage.setItem(themeKey, dark ? "dark" : "light");
        var radios = document.querySelectorAll('input[name="theme"]');
        for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === (dark ? "dark" : "light");
    }
    applyTheme(localStorage.getItem(themeKey) === "dark" ? "dark" : "light");
    settings.addEventListener("change", function (event) {
        if (event.target.name !== "theme") return;
        applyTheme(event.target.value);
    });

    var emailToggle = document.getElementById("settings-email-toggle");
    var emailText = document.getElementById("settings-email");
    if (emailToggle && emailText) {
        var email = (emailText.getAttribute("data-email") || emailText.textContent || "").trim();
        var at = email.indexOf("@");
        var hiddenEmail = at > 0 ? "********" + email.slice(at) : email;
        var emailVisible = false;
        emailText.textContent = hiddenEmail;
        emailToggle.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            emailVisible = !emailVisible;
            emailText.textContent = emailVisible ? email : hiddenEmail;
            var icon = emailToggle.querySelector("i");
            if (icon) icon.className = emailVisible ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
            emailToggle.setAttribute("aria-label", emailVisible ? "Hide email" : "Reveal email");
        });
    }

    function setModalError(modal, errorEl, message) {
        var inputs = modal ? modal.querySelectorAll("input") : [];
        var i;
        if (message) {
            if (errorEl) {
                errorEl.hidden = false;
                errorEl.textContent = message;
            }
            for (i = 0; i < inputs.length; i++) inputs[i].classList.add("is-invalid");
            return;
        }
        if (errorEl) errorEl.hidden = true;
        for (i = 0; i < inputs.length; i++) inputs[i].classList.remove("is-invalid");
    }

    var nameModal = document.getElementById("name-modal");
    var nameEdit = document.getElementById("settings-username-edit");
    var nameValue = document.getElementById("settings-username");
    var nameUser = document.getElementById("name-modal-user");
    var namePass = document.getElementById("name-modal-pass");
    var nameError = document.getElementById("name-modal-error");
    if (nameModal && nameEdit && nameValue && nameUser && namePass) {
        function closeNameModal() {
            nameModal.hidden = true;
            namePass.value = "";
            namePass.type = "password";
            var eye = document.getElementById("name-modal-eye");
            if (eye) {
                var icon = eye.querySelector("i");
                if (icon) icon.className = "fa-regular fa-eye";
                eye.setAttribute("aria-label", "Show password");
            }
            setModalError(nameModal, nameError, "");
        }
        function openNameModal() {
            nameUser.value = nameValue.textContent;
            namePass.value = "";
            setModalError(nameModal, nameError, "");
            nameModal.hidden = false;
            nameUser.focus();
        }
        nameEdit.addEventListener("click", openNameModal);
        document.getElementById("name-modal-close").addEventListener("click", closeNameModal);
        document.getElementById("name-modal-cancel").addEventListener("click", closeNameModal);
        nameModal.addEventListener("click", function (event) {
            if (event.target === nameModal) closeNameModal();
        });
        document.getElementById("name-modal-done").addEventListener("click", function () {
            var next = nameUser.value.trim();
            var pass = namePass.value;
            var ok = /^[a-zA-Z0-9_.]+$/.test(next);
            if (!next || !pass || !ok) {
                setModalError(nameModal, nameError, !pass ? "Enter your current password." : "Please only use numbers, letters, underscores _ , or periods.");
                return;
            }
            var tokenInput = document.querySelector("input[name='__RequestVerificationToken']");
            fetch("/Home/ChangeUsername", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": tokenInput ? tokenInput.value : "",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({ userName: next, currentPassword: pass })
            }).then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok || (data && data.isSuccess === false)) {
                        setModalError(nameModal, nameError, data && data.errors && data.errors[0]
                            ? data.errors[0]
                            : "Current password is incorrect.");
                        return;
                    }
                    nameValue.textContent = next;
                    var handle = document.getElementById("me-handle-name");
                    if (handle) handle.textContent = next;
                    closeNameModal();
                }).catch(function () {
                    setModalError(nameModal, nameError, "Could not change the username.");
                });
            }).catch(function () {
                setModalError(nameModal, nameError, "Could not reach the server. Refresh and try again.");
            });
        });
        var nameEye = document.getElementById("name-modal-eye");
        if (nameEye) {
            nameEye.addEventListener("click", function () {
                var show = namePass.type === "password";
                namePass.type = show ? "text" : "password";
                var icon = nameEye.querySelector("i");
                if (icon) icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
                nameEye.setAttribute("aria-label", show ? "Hide password" : "Show password");
            });
        }
    }

    var passModal = document.getElementById("pass-modal");
    var passEdit = document.getElementById("settings-password-edit");
    var passCurrent = document.getElementById("pass-modal-current");
    var passNew = document.getElementById("pass-modal-new");
    var passConfirm = document.getElementById("pass-modal-confirm");
    var passError = document.getElementById("pass-modal-error");
    if (passModal && passEdit && passCurrent && passNew && passConfirm) {
        function closePassModal() {
            passModal.hidden = true;
            passCurrent.value = "";
            passNew.value = "";
            passConfirm.value = "";
            passCurrent.type = "password";
            passNew.type = "password";
            passConfirm.type = "password";
            var eyes = passModal.querySelectorAll(".pass-eye");
            for (var i = 0; i < eyes.length; i++) {
                var icon = eyes[i].querySelector("i");
                if (icon) icon.className = "fa-regular fa-eye";
                eyes[i].setAttribute("aria-label", "Show password");
            }
            setModalError(passModal, passError, "");
        }
        passEdit.addEventListener("click", function () {
            closePassModal();
            passModal.hidden = false;
            passCurrent.focus();
        });
        document.getElementById("pass-modal-close").addEventListener("click", closePassModal);
        document.getElementById("pass-modal-cancel").addEventListener("click", closePassModal);
        passModal.addEventListener("click", function (event) {
            if (event.target === passModal) closePassModal();
        });
        document.getElementById("pass-modal-done").addEventListener("click", function () {
            if (!passCurrent.value || !passNew.value || !passConfirm.value) {
                setModalError(passModal, passError, "Fill in all password fields.");
                return;
            }
            if (passNew.value !== passConfirm.value) {
                setModalError(passModal, passError, "New passwords do not match.");
                return;
            }
            if (passNew.value === passCurrent.value) {
                setModalError(passModal, passError, "Choose a different password.");
                return;
            }
            var tokenInput = document.querySelector("input[name='__RequestVerificationToken']");
            fetch("/Home/ChangePassword", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": tokenInput ? tokenInput.value : "",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({
                    currentPassword: passCurrent.value,
                    newPassword: passNew.value,
                    confirmPassword: passConfirm.value
                })
            }).then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok || (data && data.isSuccess === false)) {
                        setModalError(passModal, passError, data && data.errors && data.errors[0]
                            ? data.errors[0]
                            : "Current password is incorrect.");
                        return;
                    }
                    closePassModal();
                }).catch(function () {
                    setModalError(passModal, passError, "Could not change the password.");
                });
            }).catch(function () {
                setModalError(passModal, passError, "Could not reach the server. Refresh and try again.");
            });
        });
        var passEyes = passModal.querySelectorAll(".pass-eye");
        for (var e = 0; e < passEyes.length; e++) {
            passEyes[e].addEventListener("click", function () {
                var field = this.parentNode.querySelector("input");
                if (!field) return;
                var show = field.type === "password";
                field.type = show ? "text" : "password";
                var icon = this.querySelector("i");
                if (icon) icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
                this.setAttribute("aria-label", show ? "Hide password" : "Show password");
            });
        }
    }

    var accountPublic = document.getElementById("account-public");
    if (accountPublic) {
        accountPublic.addEventListener("click", function () {
            var nextPublic = !accountPublic.classList.contains("on");
            accountPublic.classList.toggle("on", nextPublic);
            accountPublic.setAttribute("aria-pressed", nextPublic ? "true" : "false");
            document.dispatchEvent(new CustomEvent("discode-privacy"));
            if (window.saveDiscodeProfile) window.saveDiscodeProfile();
        });
    }
})();

(function () {
    var modal = document.getElementById("server-modal");
    var add = document.getElementById("server-add");
    var list = document.getElementById("server-list");
    var chip = document.getElementById("server-chip");
    if (!modal || !add || !list || !chip) return;
    var pick = document.getElementById("server-pick");
    var create = document.getElementById("server-create");
    var join = document.getElementById("server-join");
    var nameInput = document.getElementById("server-name");
    var inviteInput = document.getElementById("server-invite");
    var createError = document.getElementById("server-create-error");
    var joinError = document.getElementById("server-join-error");
    var pendingTemplate = "own";

    function addChip(server) {
        var button = chip.content.firstElementChild.cloneNode(true);
        var name = server && server.name ? server.name : "Server";
        button.textContent = name.trim().charAt(0).toUpperCase();
        button.title = name;
        button.setAttribute("aria-label", name);
        if (server && server.id != null) button.setAttribute("data-id", server.id);
        var current = "";
        if (window.location.pathname.indexOf("server.html") !== -1) {
            current = new URLSearchParams(window.location.search).get("id") || "";
        }
        if (current && server && String(server.id) === String(current)) button.classList.add("on");
        button.addEventListener("click", function () {
            var id = button.getAttribute("data-id");
            if (!id) return;
            if (window.discodeGo) window.discodeGo("./server.html?id=" + encodeURIComponent(id));
            else window.location.href = "./server.html?id=" + encodeURIComponent(id);
        });
        list.appendChild(button);
    }

    function loadServers() {
        fetch("/api/servers").then(function (response) {
            if (!response.ok) throw new Error("servers");
            return response.json();
        }).then(function (servers) {
            while (list.firstChild) list.removeChild(list.firstChild);
            if (!servers || !servers.length) return;
            servers.forEach(addChip);
        }).catch(function () {});
    }

    function showStep(step) {
        pick.hidden = step !== "pick";
        create.hidden = step !== "create";
        join.hidden = step !== "join";
        if (createError) createError.hidden = true;
        if (joinError) joinError.hidden = true;
    }

    function openModal() {
        showStep("pick");
        modal.hidden = false;
    }

    function closeModal() {
        modal.hidden = true;
    }

    loadServers();
    add.addEventListener("click", openModal);
    document.getElementById("server-modal-close").addEventListener("click", closeModal);
    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal();
    });
    var choices = modal.querySelectorAll(".server-choice");
    for (var i = 0; i < choices.length; i++) {
        choices[i].addEventListener("click", function () {
            pendingTemplate = this.getAttribute("data-server") || "own";
            nameInput.value = "";
            showStep("create");
        });
    }
    document.getElementById("server-join-open").addEventListener("click", function () {
        inviteInput.value = "";
        showStep("join");
        inviteInput.focus();
    });
    document.getElementById("server-create-back").addEventListener("click", function () { showStep("pick"); });
    document.getElementById("server-join-back").addEventListener("click", function () { showStep("pick"); });
    document.getElementById("server-create-done").addEventListener("click", function () {
        var name = nameInput.value.trim();
        if (!name) {
            if (createError) createError.hidden = false;
            return;
        }
        fetch("/api/servers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, template: pendingTemplate })
        }).then(function (response) {
            if (!response.ok) throw new Error("create");
            return response.json();
        }).then(function (server) {
            addChip(server);
            closeModal();
        }).catch(function () {
            if (createError) createError.hidden = false;
        });
    });
    document.getElementById("server-join-done").addEventListener("click", function () {
        var invite = inviteInput.value.trim();
        if (!invite) {
            if (joinError) joinError.hidden = false;
            return;
        }
        fetch("/api/servers/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invite: invite })
        }).then(function (response) {
            if (!response.ok) throw new Error("join");
            return response.json();
        }).then(function (server) {
            addChip(server);
            closeModal();
        }).catch(function () {
            if (joinError) joinError.hidden = false;
        });
    });

    var logoutBtn = document.getElementById("me-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = "./login.html";
            }
        });
    }
})();
