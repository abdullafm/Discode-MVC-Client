"use strict";

(function () {
    var chat = document.getElementById("group-chat");
    if (!chat || !chat.getAttribute("data-group-id")) return;

    var groupId = Number(chat.getAttribute("data-group-id"));
    var meName = chat.getAttribute("data-me") || "";
    var group = null;
    try {
        group = JSON.parse(chat.getAttribute("data-group"));
    } catch (error) {
        group = null;
    }
    if (!group) return;

    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
    var box = document.getElementById("group-messages");
    var scroller = document.getElementById("group-scroll");
    var input = document.getElementById("group-input");
    var errorBox = document.getElementById("group-error");
    var pendingIcon = null;

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

    function paintIcon(url) {
        [["group-mark", ".group-mark"], ["group-badge", ".group-badge"]].forEach(function (pair) {
            var holder = document.getElementById(pair[0]);
            if (!holder) return;
            var photo = holder.querySelector("img");
            var mark = holder.querySelector("i");
            if (photo) {
                photo.hidden = !url;
                if (url) photo.src = url;
            }
            if (mark) mark.hidden = !!url;
        });
    }

    function paintGroup() {
        document.title = "Discord | " + group.name;
        document.getElementById("group-title").textContent = group.name;
        document.getElementById("group-name").textContent = group.name;
        document.getElementById("group-welcome").textContent = "Welcome to the beginning of the " + group.name + " group.";
        document.getElementById("group-search").placeholder = "Search " + group.name;
        input.setAttribute("data-placeholder", "Message " + group.name);
        document.getElementById("group-count").textContent = String(group.memberCount);
        paintIcon(group.iconUrl);

        var list = document.getElementById("group-member-list");
        list.textContent = "";
        var iAmOwner = group.ownerUserName === meName;
        group.members.forEach(function (member) {
            var row = document.createElement("div");
            row.className = "group-member";
            row.setAttribute("data-user", member.userName);
            var avatar = document.createElement("div");
            avatar.className = "avatar";
            var photo = document.createElement("img");
            photo.alt = "";
            photo.src = member.avatarUrl || DEFAULT_AVATAR;
            avatar.appendChild(photo);
            var label = document.createElement("p");
            label.textContent = member.displayName || member.userName;
            if (member.isOwner) {
                var crown = document.createElement("i");
                crown.className = "fa-solid fa-crown crown";
                crown.title = "Group owner";
                label.appendChild(crown);
            }
            row.appendChild(avatar);
            row.appendChild(label);
            if (iAmOwner && member.userName !== meName) {
                var kick = document.createElement("button");
                kick.type = "button";
                kick.className = "group-kick";
                kick.setAttribute("aria-label", "Remove " + member.userName);
                kick.setAttribute("data-kick", member.userName);
                kick.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                row.appendChild(kick);
            }
            list.appendChild(row);
        });
    }

    function lastRow() {
        var last = box.lastElementChild;
        while (last && !last.hasAttribute("data-id")) last = last.previousElementSibling;
        return last;
    }

    function append(message, force) {
        if (box.querySelector('[data-id="' + message.id + '"]')) return;
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
        var row;
        if (message.isSystem) {
            row = document.createElement("div");
            row.className = "group-sys";
            row.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i><span></span><time></time>';
            row.querySelector("span").textContent = message.text;
            row.querySelector("time").textContent = clock(message.createdAt);
        } else {
            var compact = !newDay && last && !last.classList.contains("group-sys") && last.getAttribute("data-sender") === message.senderUserName && when - Number(last.getAttribute("data-time")) < 5 * 60 * 1000 && box.lastElementChild === last;
            row = document.createElement("div");
            row.className = "dm-msg" + (compact ? " compact" : "");
            row.setAttribute("data-sender", message.senderUserName);
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
            var text = document.createElement("div");
            text.className = "dm-msg-text";
            text.textContent = message.text;
            body.appendChild(head);
            body.appendChild(text);
            row.appendChild(face);
            row.appendChild(body);
        }
        row.setAttribute("data-id", String(message.id));
        row.setAttribute("data-time", String(when));
        box.appendChild(row);
        if (force || atBottom || message.senderUserName === meName) scroller.scrollTop = scroller.scrollHeight;
    }

    function loadMessages() {
        return request("/Group/Messages?id=" + groupId).then(function (list) {
            box.textContent = "";
            (Array.isArray(list) ? list : []).forEach(function (message) { append(message, true); });
            scroller.scrollTop = scroller.scrollHeight;
        }).catch(function (error) {
            showError(error.message);
        });
    }

    function otherMembers() {
        return group.members.map(function (member) { return member.userName; }).filter(function (name) { return name !== meName; });
    }

    function invite() {
        if (typeof openNewMessage === "function") openNewMessage(otherMembers());
    }

    function setMembers(open) {
        var panel = document.getElementById("group-members");
        panel.classList.toggle("is-collapsed", !open);
        document.getElementById("group-members-toggle").classList.toggle("on", open);
    }

    function send() {
        var text = (input.innerText || "").replace(/\u200b/g, "").trim();
        if (!text) return;
        input.textContent = "";
        input.setAttribute("data-empty", "1");
        request("/Group/Send", "POST", { id: groupId, text: text }).then(function (message) {
            append(message, true);
        }).catch(function (error) {
            showError(error.message);
            input.textContent = text;
            input.setAttribute("data-empty", "0");
        });
    }

    document.getElementById("group-compose").addEventListener("submit", function (event) {
        event.preventDefault();
        send();
    });
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    });
    input.addEventListener("focus", function () { this.setAttribute("data-empty", "0"); });
    input.addEventListener("input", function () { this.setAttribute("data-empty", (this.textContent || "").trim() ? "0" : "1"); });
    input.addEventListener("blur", function () { this.setAttribute("data-empty", (this.textContent || "").trim() ? "0" : "1"); });
    input.addEventListener("paste", function (event) {
        event.preventDefault();
        var pasted = (event.clipboardData || window.clipboardData).getData("text") || "";
        document.execCommand("insertText", false, pasted);
    });
    document.getElementById("group-compose").addEventListener("mousedown", function (event) {
        if (event.target.closest("button") || document.activeElement === input) return;
        event.preventDefault();
        input.focus();
    });

    document.getElementById("group-search").addEventListener("input", function () {
        var query = this.value.trim().toLowerCase();
        [].forEach.call(box.querySelectorAll(".dm-msg, .group-sys"), function (row) {
            row.hidden = !!query && row.textContent.toLowerCase().indexOf(query) === -1;
        });
    });

    document.getElementById("group-members-toggle").addEventListener("click", function () {
        setMembers(document.getElementById("group-members").classList.contains("is-collapsed"));
    });
    document.getElementById("group-invite").addEventListener("click", invite);
    document.getElementById("group-invite-side").addEventListener("click", invite);
    document.getElementById("group-add").addEventListener("click", invite);

    var confirmModal = document.getElementById("group-confirm-modal");
    var confirmAction = null;

    function askConfirm(title, text, label, action) {
        document.getElementById("group-confirm-title").textContent = title;
        document.getElementById("group-confirm-text").textContent = text;
        document.getElementById("group-confirm-ok").textContent = label;
        confirmAction = action;
        confirmModal.hidden = false;
        document.getElementById("group-confirm-ok").focus();
    }

    function closeConfirm() {
        confirmModal.hidden = true;
        confirmAction = null;
    }

    confirmModal.addEventListener("click", function (event) {
        if (event.target.closest("[data-close]")) closeConfirm();
    });
    document.getElementById("group-confirm-ok").addEventListener("click", function () {
        var run = confirmAction;
        closeConfirm();
        if (run) run();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !confirmModal.hidden) closeConfirm();
    });

    document.getElementById("group-member-list").addEventListener("click", function (event) {
        var kick = event.target.closest("[data-kick]");
        if (!kick) return;
        var name = kick.getAttribute("data-kick");
        askConfirm("Remove " + name, "Are you sure you want to remove " + name + " from the group?", "Remove", function () {
            request("/Group/RemoveMember", "POST", { id: groupId, userName: name }).catch(function (error) {
                showError(error.message);
            });
        });
    });

    document.getElementById("group-leave").addEventListener("click", function () {
        askConfirm("Leave Group", "Are you sure you want to leave " + group.name + "? You will not be able to rejoin unless a member invites you again.", "Leave Group", function () {
            request("/Group/Leave", "POST", { id: groupId }).then(function () {
                window.discodeGo("/Home/Index");
            }).catch(function (error) {
                showError(error.message);
            });
        });
    });

    var modal = document.getElementById("group-edit-modal");
    var nameInput = document.getElementById("group-name-input");
    var editError = document.getElementById("group-edit-error");

    function paintEditIcon(url) {
        var label = document.getElementById("group-edit-icon");
        var photo = label.querySelector("img");
        var mark = label.querySelector("i");
        photo.hidden = !url;
        if (url) photo.src = url;
        if (mark) mark.hidden = !!url;
    }

    function closeEdit() {
        modal.hidden = true;
        pendingIcon = null;
        editError.hidden = true;
    }

    document.getElementById("group-edit").addEventListener("click", function () {
        pendingIcon = null;
        editError.hidden = true;
        nameInput.value = group.name;
        paintEditIcon(group.iconUrl);
        modal.hidden = false;
        nameInput.focus();
    });
    document.getElementById("group-rename-cancel").addEventListener("click", closeEdit);
    document.getElementById("group-edit-cancel").addEventListener("click", closeEdit);
    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeEdit();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) closeEdit();
    });

    document.getElementById("group-icon-file").addEventListener("change", function () {
        var picker = this;
        var file = picker.files && picker.files[0];
        picker.value = "";
        if (!file || file.type.indexOf("image/") !== 0) return;
        var image = new Image();
        image.onload = function () {
            var size = 256;
            var canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            var scale = Math.max(size / image.width, size / image.height);
            canvas.getContext("2d").drawImage(image, (size - image.width * scale) / 2, (size - image.height * scale) / 2, image.width * scale, image.height * scale);
            canvas.toBlob(function (blob) {
                if (!blob) return;
                var form = new FormData();
                form.append("file", blob, "icon.jpg");
                fetch("/Group/UploadIcon", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
                    body: form
                }).then(function (response) {
                    return response.json().then(function (data) {
                        if (!response.ok) throw new Error((data && data.errors && data.errors[0]) || "Could not upload the icon.");
                        return data;
                    });
                }).then(function (data) {
                    pendingIcon = data.iconUrl;
                    paintEditIcon(pendingIcon);
                }).catch(function (error) {
                    editError.textContent = error.message;
                    editError.hidden = false;
                });
            }, "image/jpeg", 0.85);
        };
        image.src = URL.createObjectURL(file);
    });

    document.getElementById("group-rename").addEventListener("submit", function (event) {
        event.preventDefault();
        request("/Group/Update", "POST", { id: groupId, name: nameInput.value, iconUrl: pendingIcon !== null ? pendingIcon : group.iconUrl }).then(function (updated) {
            group = updated;
            paintGroup();
            closeEdit();
        }).catch(function (error) {
            editError.textContent = error.message;
            editError.hidden = false;
        });
    });

    document.addEventListener("discode-group-message", function (event) {
        var data = event.detail;
        if (!data || data.groupId !== groupId || !data.message) return;
        append(data.message, false);
    });

    document.addEventListener("discode-group-updated", function (event) {
        var data = event.detail;
        if (!data || data.groupId !== groupId) return;
        if (!data.group || !data.group.members.some(function (member) { return member.userName === meName; })) {
            window.discodeGo("/Home/Index");
            return;
        }
        group = data.group;
        paintGroup();
    });

    if (window.matchMedia("(max-width: 1100px)").matches) setMembers(false);
    paintGroup();
    loadMessages();
})();
