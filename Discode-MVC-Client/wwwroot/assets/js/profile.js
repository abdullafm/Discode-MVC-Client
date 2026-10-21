"use strict";
(function () {
    var STATUSES = {
        online: { label: "Online", color: "#23a559" },
        idle: { label: "Idle", color: "#f0b232" },
        dnd: { label: "Do Not Disturb", color: "#f23f43", note: "You will not receive desktop notifications" },
        invisible: { label: "Invisible", color: "#80848e", note: "You will appear offline" }
    };

    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";

    var state = { status: "online" };

    function nodeText(sel) {
        var el = typeof sel === "string" ? document.querySelector(sel) : sel;
        return el ? el.textContent.trim() : "";
    }

    function meName() {
        return ownName || nodeText("#user-panel .me-display");
    }

    function meHandle() {
        return ownHandle || nodeText("#me-handle-name") || nodeText("#settings-username");
    }

    function profileValue(id, fallback) {
        var el = document.getElementById(id);
        if (!el) return fallback || "";
        if (el.value != null && el.tagName !== "SPAN") return el.value.trim();
        return (el.textContent || "").trim();
    }

    function showProfileError(message) {
        var el = document.querySelector(".home-error");
        if (!el) {
            el = document.createElement("p");
            el.className = "home-error";
            document.body.insertBefore(el, document.body.firstChild);
        }
        el.hidden = false;
        el.textContent = message;
    }

    var saveInFlight = false;
    var saveQueued = false;

    function saveProfile() {
        var box = document.getElementById("me-profile");
        if (box && !box.classList.contains("d-none") && box.classList.contains("visitor-view")) return;

        if (saveInFlight) {
            saveQueued = true;
            return;
        }
        saveInFlight = true;

        var tokenInput = document.querySelector("input[name='__RequestVerificationToken']");
        var pub = document.getElementById("account-public");
        fetch("/Home/UpdateProfile", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": tokenInput ? tokenInput.value : "",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({
                displayName: profileValue("me-display-input", meName()),
                userName: profileValue("me-handle-name") || profileValue("settings-username") || meHandle(),
                avatarUrl: savedAvatarUrl || profileValue("Update_AvatarUrl"),
                bio: profileValue("me-bio"),
                customStatus: profileValue("set-status-input"),
                pronouns: profileValue("set-pronouns-input"),
                isPublic: !!(pub && pub.classList.contains("on"))
            })
        }).then(function (res) {
            if (res.ok) {
                var el = document.querySelector(".home-error");
                if (el) el.hidden = true;
                return;
            }
            return res.json().then(function (data) {
                var msg = data && data.errors && data.errors[0] ? data.errors[0] : "Could not update the profile.";
                showProfileError(msg);
            }).catch(function () {
                showProfileError("Could not update the profile (" + res.status + ").");
            });
        }).catch(function () {
            showProfileError("Could not reach the server. Refresh and try again.");
        }).then(function () {
            saveInFlight = false;
            if (saveQueued) {
                saveQueued = false;
                saveProfile();
            }
        });
    }

    window.saveDiscodeProfile = saveProfile;

    function isMe(name) {
        return !name || name === meName() || name === meHandle();
    }

    function applyDisplay(name) {
        ownName = name;
        var nodes = document.querySelectorAll(".me-display");
        for (var i = 0; i < nodes.length; i++) nodes[i].textContent = name;
        var input = document.getElementById("me-display-input");
        if (input && document.activeElement !== input) input.value = name;
        var view = document.getElementById("me-view-name");
        if (view) view.textContent = name;
    }

    var panel = document.getElementById("user-panel");
    if (!panel) return;
    var identity = panel.querySelector(".user-identity");
    var statusEl = identity.querySelector("span");
    var ownName = nodeText("#user-panel .me-display");
    var ownHandle = nodeText("#me-handle-name") || nodeText("#settings-username");
    var ownPhoto = identity.querySelector("img") ? identity.querySelector("img").getAttribute("src") : "";

    function paintPanel() {
        panel.setAttribute("data-status", state.status);
        statusEl.textContent = STATUSES[state.status].label;
    }

    paintPanel();
    paintLock();

    var pop = document.getElementById("me-pop");
    if (!pop) return;

    var menu = document.getElementById("me-status-menu");
    if (!menu) return;

    var profile = document.getElementById("me-profile");
    if (!profile) return;

    function paintVisitorStatus(status) {
        var item = STATUSES[status] || STATUSES.invisible;
        var dot = profile.querySelector(".me-dot");
        if (dot) dot.style.background = item.color;
    }

    function paintPop() {
        var item = STATUSES[state.status];
        pop.querySelector(".me-dot").style.background = item.color;
        if (!profile.classList.contains("visitor-view")) profile.querySelector(".me-dot").style.background = item.color;
        pop.querySelector(".me-mini").style.background = item.color;
        document.getElementById("me-status-label").textContent = item.label;
        var pronouns = document.getElementById("me-pronouns");
        if (pronouns && !pronouns.textContent.trim()) pronouns.textContent = "Add pronouns";
    }

    paintPop();

    document.getElementById("me-edit").addEventListener("click", function () {
        viewing = meName();
        setVisitor(false);
        closePop(true);
        paintPop();
        loadMe();
        renderMyPosts();
        profile.classList.remove("d-none");
    });

    var logoutBtn = document.getElementById("me-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            if (confirm("Are you sure you want to log out?")) {
                var form = document.getElementById("logout-form");
                if (form) form.submit();
                else window.location.href = "/Account/Login";
            }
        });
    }

    var settingsMe = document.querySelector(".settings-me");
    if (settingsMe) {
        settingsMe.addEventListener("click", function () {
            var settings = document.getElementById("settings");
            if (settings) settings.hidden = true;
            viewing = meName();
            setVisitor(false);
            closePop();
            paintPop();
            loadMe();
            renderMyPosts();
            profile.classList.remove("d-none");
        });
    }

    profile.querySelectorAll(".me-tabs button").forEach(function (button) {
        button.addEventListener("click", function () {
            var tab = button.getAttribute("data-tab");
            profile.querySelectorAll(".me-tabs button").forEach(function (item) {
                item.classList.toggle("on", item === button);
            });
            profile.querySelectorAll(".me-panel").forEach(function (panel) {
                panel.classList.toggle("d-none", panel.id !== "me-" + tab);
            });
            if (tab === "board") renderMyPosts();
        });
    });

    function closeProfile() {
        if (profile.classList.contains("d-none")) return;
        if (!profile.classList.contains("visitor-view")) saveProfile();
        profile.classList.add("d-none");
        viewingUserId = "";
        if (window.discodePresence) window.discodePresence.unwatchProfile();
    }

    document.getElementById("me-profile-close").addEventListener("click", closeProfile);

    var addFriend = document.getElementById("me-add");
    if (addFriend) {
        addFriend.addEventListener("click", function () {
            var username = addFriend.getAttribute("data-username") || nodeText("#me-handle-name");
            if (window.discodeFriends && window.discodeFriends.send)
                window.discodeFriends.send({ username: username }, addFriend);
        });
    }

    var requestAccept = document.getElementById("me-request-accept");
    var requestIgnore = document.getElementById("me-request-ignore");
    if (requestAccept) requestAccept.addEventListener("click", function () { respondToRequest(true); });
    if (requestIgnore) requestIgnore.addEventListener("click", function () { respondToRequest(false); });

    profile.addEventListener("click", function (event) {
        if (event.target === profile) closeProfile();
    });
    function place() {
        var rect = panel.getBoundingClientRect();
        pop.style.left = Math.max(8, rect.left) + "px";
        pop.style.top = "auto";
        pop.style.bottom = (window.innerHeight - rect.top + 8) + "px";
    }

    function closeStatus() {
        menu.hidden = true;
    }

    var popTimer = 0;

    function closePop(skipSave) {
        closeStatus();
        window.clearTimeout(popTimer);
        if (window.discodePop) window.discodePop(pop, false);
        popTimer = window.setTimeout(function () {
            pop.classList.remove("is-open");
            pop.style.opacity = "";
            pop.style.transform = "";
            pop.classList.add("d-none");
        }, 200);
        if (!skipSave) saveProfile();
    }

    function openPop() {
        paintPop();
        place();
        window.clearTimeout(popTimer);
        pop.classList.remove("d-none");
        pop.classList.add("is-open");
        if (window.discodePop) window.discodePop(pop, true);
    }

    identity.addEventListener("click", function () {
        if (pop.classList.contains("d-none")) openPop();
        else closePop();
    });

    document.getElementById("me-status-open").addEventListener("click", function () {
        if (!menu.hidden) {
            closeStatus();
            return;
        }
        var rect = pop.getBoundingClientRect();
        menu.hidden = false;
        var left = rect.right + 8;
        if (left + menu.offsetWidth > window.innerWidth - 8) left = Math.max(8, rect.left - menu.offsetWidth - 8);
        menu.style.left = left + "px";
        menu.style.top = Math.max(8, rect.bottom - menu.offsetHeight) + "px";
    });

    menu.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button) return;
        state.status = button.getAttribute("data-status");
        paintPanel();
        paintPop();
        document.dispatchEvent(new CustomEvent("discode-presence"));
        document.dispatchEvent(new CustomEvent("discode-status-change", { detail: { status: state.status } }));
        closeStatus();
    });

    document.addEventListener("discode-status-set", function (event) {
        var status = event.detail && event.detail.status;
        if (!STATUSES[status]) return;
        state.status = status;
        paintPanel();
        paintPop();
        document.dispatchEvent(new CustomEvent("discode-presence"));
    });

    var setStatus = document.getElementById("set-status");
    var setInput = document.getElementById("set-status-input");
    var setEmojiBtn = document.getElementById("set-status-emoji");
    var setEmoji = document.getElementById("set-emoji");
    var setWhen = document.getElementById("set-when");
    var setWhenBtn = document.getElementById("set-status-when");
    var pickedEmoji = state.emoji || "😀";
    var pickedClear = state.clear || "tomorrow";

    function clearLabel(key) {
        var now = new Date();
        var clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        if (key === "none") return "Don't clear";
        if (key === "30") return "Clear in 30 minutes";
        if (key === "60") return "Clear in 1 hour";
        if (key === "240") return "Clear in 4 hours";
        if (key === "today") return "Clear today at " + clock;
        return "Clear tomorrow at " + clock;
    }

    function previewStatus() {
        var text = setInput.value.trim() || "Today I learned...";
        document.getElementById("set-status-mini-emoji").textContent = pickedEmoji + " ";
        document.getElementById("set-status-mini-text").textContent = text;
        setEmojiBtn.textContent = pickedEmoji;
        setWhenBtn.firstChild.textContent = clearLabel(pickedClear) + " ";
    }

    function fillEmoji() {
        if (setEmoji.childElementCount) return;
        var items = ["😀", "😄", "😁", "😎", "😍", "🥳", "😴", "🤔", "😭", "😡", "👍", "🔥", "❤️", "⭐", "🎮", "🎵"];
        if (window.EMOJI_GROUPS && EMOJI_GROUPS[0]) items = EMOJI_GROUPS[0].items.slice(0, 48);
        items.forEach(function (item) {
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = item;
            button.addEventListener("click", function () {
                pickedEmoji = item;
                setEmoji.classList.add("d-none");
                previewStatus();
            });
            setEmoji.appendChild(button);
        });
    }

    function openSetStatus() {
        pickedEmoji = state.emoji || "😀";
        pickedClear = state.clear || "tomorrow";
        previewStatus();
        fillEmoji();
        setEmoji.classList.add("d-none");
        setWhen.classList.add("d-none");
        setStatus.classList.remove("d-none");
        setInput.focus();
    }

    function applyCustomStatus() {
        var status = setInput.value.trim();
        var bubble = document.getElementById("me-status-bubble");
        var bubbleText = document.getElementById("me-status-bubble-text");
        var chip = document.getElementById("me-chip");
        var chipText = document.getElementById("me-chip-text");
        var about = document.getElementById("me-about");
        if (bubbleText) bubbleText.textContent = status || "Today I learned...";
        if (chipText) chipText.textContent = status || "Today I learned...";
        if (bubble) bubble.classList.toggle("has-bio", !!status);
        if (chip) chip.classList.toggle("has-bio", !!status);
        if (about) {
            about.hidden = !status;
            about.textContent = status;
        }
        paintPop();
        document.dispatchEvent(new CustomEvent("discode-presence"));
    }

    function closeSetStatus() {
        applyCustomStatus();
        setStatus.classList.add("d-none");
        setEmoji.classList.add("d-none");
        setWhen.classList.add("d-none");
        saveProfile();
    }

    document.getElementById("me-status-bubble").addEventListener("click", function () {
        if (profile.classList.contains("visitor-view")) return;
        openSetStatus();
    });
    document.getElementById("set-status-close").addEventListener("click", closeSetStatus);
    setStatus.addEventListener("click", function (event) {
        if (event.target === setStatus) closeSetStatus();
    });
    setEmojiBtn.addEventListener("click", function () {
        fillEmoji();
        setEmoji.classList.toggle("d-none");
    });
    setInput.addEventListener("input", previewStatus);
    setWhenBtn.addEventListener("click", function () {
        setWhen.classList.toggle("d-none");
    });
    setWhen.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button) return;
        pickedClear = button.getAttribute("data-clear");
        setWhen.classList.add("d-none");
        previewStatus();
    });
    document.getElementById("set-status-form").addEventListener("submit", function (event) {
        event.preventDefault();
        state.emoji = pickedEmoji;
        state.clear = pickedClear;
        closeSetStatus();
    });

    var setPronouns = document.getElementById("set-pronouns");
    var pronounsInput = document.getElementById("set-pronouns-input");

    document.getElementById("me-pronouns").addEventListener("click", function () {
        setPronouns.classList.remove("d-none");
        pronounsInput.focus();
    });

    function closePronouns() {
        var next = pronounsInput.value.trim();
        var pronouns = document.getElementById("me-pronouns");
        if (pronouns) pronouns.textContent = next || "Add pronouns";
        var viewPronouns = document.getElementById("me-view-pronouns");
        if (viewPronouns) viewPronouns.textContent = next;
        setPronouns.classList.add("d-none");
        saveProfile();
    }

    document.getElementById("set-pronouns-close").addEventListener("click", closePronouns);

    setPronouns.addEventListener("click", function (event) {
        if (event.target === setPronouns) closePronouns();
    });

    document.getElementById("set-pronouns-form").addEventListener("submit", function (event) {
        event.preventDefault();
        closePronouns();
    });

    var bioInput = document.getElementById("me-bio");
    var savedBio = bioInput ? bioInput.value.trim() : "";
    var bioEmoji = document.getElementById("me-bio-emoji");
    var bioEmojiList = document.getElementById("me-bio-emoji-list");

    function fillBioEmoji() {
        if (bioEmojiList.childElementCount) return;
        var items = ["😀", "😄", "😁", "😎", "😍", "🥳", "👍", "🔥", "❤️", "⭐"];
        if (window.EMOJI_GROUPS && EMOJI_GROUPS[0]) items = EMOJI_GROUPS[0].items.slice(0, 48);
        items.forEach(function (item) {
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = item;
            button.addEventListener("mousedown", function (event) {
                event.preventDefault();
            });
            button.addEventListener("click", function () {
                bioInput.value = (bioInput.value + item).slice(0, 190);
                bioEmojiList.classList.add("d-none");
                bioInput.focus();
            });
            bioEmojiList.appendChild(button);
        });
    }

    var viewing = meName();
    var viewingUserId = "";
    var ownSince = nodeText("#me-since");

    function applyOwnPhoto(src) {
        ownPhoto = src;
        var faces = document.querySelectorAll("#user-panel .avatar img, #me-pop .me-avatar img, #me-profile .me-profile-avatar img, .set-status-person > img, .settings-me img, #dm-messages .dm-msg[data-mine=\"1\"] .dm-msg-avatar");
        for (var i = 0; i < faces.length; i++) faces[i].src = src;
    }

    var savedAvatarUrl = profileValue("Update_AvatarUrl");

    var avatarFile = document.getElementById("me-avatar-file");
    if (avatarFile) {
        avatarFile.addEventListener("change", function () {
            var file = avatarFile.files && avatarFile.files[0];
            avatarFile.value = "";
            if (!file || file.type.indexOf("image/") !== 0) return;
            var reader = new FileReader();
            reader.onload = function () {
                var image = new Image();
                image.onload = function () {
                    var size = 256;
                    var canvas = document.createElement("canvas");
                    var scale = Math.max(size / image.width, size / image.height);
                    var width = image.width * scale;
                    var height = image.height * scale;
                    canvas.width = size;
                    canvas.height = size;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
                    canvas.toBlob(function (blob) {
                        if (!blob) return;
                        var tokenInput = document.querySelector("input[name='__RequestVerificationToken']");
                        var data = new FormData();
                        data.append("file", blob, "avatar.jpg");
                        if (tokenInput) data.append("__RequestVerificationToken", tokenInput.value);
                        fetch("/Home/UploadAvatar", {
                            method: "POST",
                            credentials: "same-origin",
                            headers: {
                                "RequestVerificationToken": tokenInput ? tokenInput.value : "",
                                "X-Requested-With": "XMLHttpRequest"
                            },
                            body: data
                        }).then(function (res) {
                            if (!res.ok) throw new Error("upload");
                            return res.json();
                        }).then(function (data) {
                            savedAvatarUrl = data.avatarUrl;
                            var hidden = document.getElementById("Update_AvatarUrl");
                            if (hidden) hidden.value = data.avatarUrl;
                            applyOwnPhoto(data.avatarUrl);
                            saveProfile();
                        }).catch(function () {
                            showProfileError("Could not save the photo.");
                        });
                    }, "image/jpeg", 0.85);
                };
                image.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }
    function friendRow(name) {
        var rows = document.querySelectorAll(".friend-item:not([data-group])");
        for (var i = 0; i < rows.length; i++) {
            var label = rows[i].querySelector("p");
            if (label && label.textContent.trim() === name) return rows[i];
        }
        return null;
    }

    function friendNames() {
        var names = [];
        var rows = document.querySelectorAll(".friend-item:not([data-group]) p, .new-msg-friend > span");
        for (var i = 0; i < rows.length; i++) {
            var name = rows[i].textContent.trim();
            if (name && names.indexOf(name) === -1) names.push(name);
        }
        return names;
    }

    function paintPerson(info) {
        info = info || {};
        var pronouns = document.getElementById("me-view-pronouns");
        var bubble = document.getElementById("me-status-bubble");
        var bubbleText = document.getElementById("me-status-bubble-text");
        var bio = document.getElementById("me-view-bio");
        var bioBlock = profile.querySelector(".me-bio-block");
        var pronounText = info.pronouns || "";
        var bioText = info.bio || "";
        var statusText = info.status || "";
        if (pronouns) {
            pronouns.hidden = !pronounText;
            pronouns.textContent = pronounText;
        }
        profile.classList.toggle("has-pronouns", !!pronounText);
        if (bubble && bubbleText) {
            bubble.classList.toggle("has-bio", !!statusText);
            bubbleText.textContent = (info.emoji ? info.emoji + " " : "") + statusText;
        }
        profile.classList.toggle("has-status", !!statusText);
        if (bio) {
            bio.hidden = !bioText;
            bio.textContent = bioText;
        }
        if (bioBlock) bioBlock.classList.toggle("has-text", !!bioText);
    }

    function formatJoined(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    function showJoined(name) {
        var since = document.getElementById("me-since");
        if (!since) return;
        var row = friendRow(name);
        since.textContent = row && row.getAttribute("data-joined") ? row.getAttribute("data-joined") : "—";
        paintPerson(row ? {
            pronouns: row.getAttribute("data-pronouns") || "",
            bio: row.getAttribute("data-bio") || "",
            status: row.getAttribute("data-bio") || "",
            emoji: row.getAttribute("data-emoji") || ""
        } : {});
        loadVisitor(name);
    }

    function loadVisitor(name) {
        fetch("/Home/UserProfile?name=" + encodeURIComponent(name), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) throw new Error("user");
            return response.json();
        }).then(function (data) {
            if (viewing !== name) return;
            paintVisitor(data);
            renderMyPosts();
        }).catch(function () {});
    }

    document.addEventListener("discode-posts-changed", function () {
        if (!profile.classList.contains("d-none")) renderMyPosts();
    });

    document.addEventListener("discode-user-presence", function (event) {
        if (profile.classList.contains("d-none") || !profile.classList.contains("visitor-view")) return;
        if (!event.detail || event.detail.userId !== viewingUserId) return;
        paintVisitorStatus(event.detail.status);
        loadVisitor(viewing);
    });

    document.addEventListener("discode-friends-changed", function () {
        if (profile.classList.contains("d-none") || !profile.classList.contains("visitor-view")) return;
        loadVisitor(viewing);
    });

    document.addEventListener("discode-profile-changed", function (event) {
        if (profile.classList.contains("d-none") || !profile.classList.contains("visitor-view")) return;
        if (!event.detail || event.detail.userId !== viewingUserId) return;
        loadVisitor(viewing);
    });

    function setPrivateView(on, name) {
        profile.classList.toggle("private-view", on);
        var head = document.getElementById("me-private-head");
        var note = document.getElementById("me-private-note");
        var board = document.getElementById("me-private-board");
        if (head) head.hidden = !on;
        if (note) {
            note.hidden = !on;
            note.textContent = on ? name + "'s profile is private, so some info is hidden. Add them as a friend to see more." : "";
        }
        if (board) board.hidden = !on;
    }

    function setRequestCard(on, requestId, name) {
        var card = document.getElementById("me-request");
        var text = document.getElementById("me-request-text");
        if (!card) return;
        card.hidden = !on;
        card.setAttribute("data-id", on ? String(requestId) : "");
        if (text) text.textContent = on ? name + " sent you a friend request." : "";
    }

    function pendingRequestId(userName) {
        var rows = document.querySelectorAll("#friends-pending-list .request-row");
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute("data-user") === userName) return Number(rows[i].getAttribute("data-id")) || 0;
        }
        return 0;
    }

    function respondToRequest(accept) {
        var card = document.getElementById("me-request");
        var requestId = Number(card ? card.getAttribute("data-id") : 0);
        if (!requestId || !window.discodeFriends || !window.discodeFriends.respond) return;
        var name = viewing;
        window.discodeFriends.respond(requestId, accept).then(function (ok) {
            if (!ok || viewing !== name) return;
            if (accept) {
                showJoined(name);
            } else {
                setRequestCard(false);
                var add = document.getElementById("me-add");
                if (add) add.hidden = false;
            }
        });
    }

    function paintVisitor(data) {
        viewingUserId = data.userId || "";
        paintVisitorStatus(data.status);
        if (window.discodePresence) window.discodePresence.watchProfile(viewingUserId);
        var displayName = data.displayName || data.userName || "";
        var viewName = document.getElementById("me-view-name");
        var handle = document.getElementById("me-handle-name");
        var face = profile.querySelector(".me-profile-avatar img");
        var since = document.getElementById("me-since");
        var add = document.getElementById("me-add");
        if (viewName) viewName.textContent = displayName;
        if (handle) handle.textContent = data.userName || "";
        if (face) face.src = data.avatarUrl || DEFAULT_AVATAR;
        var joined = formatJoined(data.memberSince);
        if (since && joined) since.textContent = joined;
        paintPerson({ pronouns: data.pronouns || "", bio: data.bio || "", status: data.customStatus || "", emoji: "" });
        setPrivateView(!!data.isPrivate, displayName);
        var requestId = data.relation === "pending-received" ? (data.requestId || pendingRequestId(data.userName)) : 0;
        var incoming = !!requestId;
        setRequestCard(incoming, requestId, displayName);
        if (!add) return;
        add.setAttribute("data-username", data.userName || "");
        if (data.relation === "friend" || incoming) {
            add.hidden = true;
        } else if (data.relation === "pending-sent" || data.relation === "pending-received") {
            add.disabled = true;
            add.classList.add("button-sent");
            add.innerHTML = '<i class="fa-solid fa-user-clock"></i> <span>' +
                (data.relation === "pending-sent" ? "Request Sent" : "Request Pending") + "</span>";
        }
    }

    var ownBubble = null;

    function setVisitor(on) {
        profile.classList.toggle("visitor-view", on);
        var add = document.getElementById("me-add");
        var handle = document.getElementById("me-handle-name");
        var title = profile.querySelector(".me-profile-id h2");
        var face = profile.querySelector(".me-profile-avatar img");
        var since = document.getElementById("me-since");
        if (since && !ownSince) ownSince = since.textContent;
        var msg = document.getElementById("me-msg");
        if (msg) {
            var icon = msg.querySelector("i");
            var label = msg.querySelector("span");
            if (icon) icon.className = on ? "fa-solid fa-comment" : "fa-solid fa-pen";
            if (label) label.textContent = on ? "Message" : "Edit Profile";
        }
        if (add) add.hidden = !on;
        var ownBubbleEl = document.getElementById("me-status-bubble");
        var ownBubbleText = document.getElementById("me-status-bubble-text");
        if (on && !ownBubble && ownBubbleEl && ownBubbleText) {
            ownBubble = { text: ownBubbleText.textContent, hasStatus: ownBubbleEl.classList.contains("has-bio") };
        }
        if (on) paintVisitorStatus("offline");
        if (!on) {
            paintPop();
            if (title) title.textContent = ownName;
            var ownInput = document.getElementById("me-display-input");
            if (ownInput) ownInput.value = ownName;
            var ownView = document.getElementById("me-view-name");
            if (ownView) ownView.hidden = true;
            if (handle) handle.textContent = ownHandle;
            if (face) face.src = ownPhoto;
            if (since) since.textContent = ownSince;
            profile.classList.remove("has-pronouns", "has-status");
            if (ownBubble && ownBubbleEl && ownBubbleText) {
                ownBubbleText.textContent = ownBubble.text;
                ownBubbleEl.classList.toggle("has-bio", ownBubble.hasStatus);
                profile.classList.toggle("has-status", ownBubble.hasStatus);
                ownBubble = null;
            }
            var viewPronouns = document.getElementById("me-view-pronouns");
            if (viewPronouns) viewPronouns.hidden = true;
            var bioBlock = profile.querySelector(".me-bio-block");
            if (bioBlock) bioBlock.classList.remove("has-text");
            paintPop();
        }
    }

    function relationTo(author) {
        if (isMe(author)) return "self";
        if (friendNames().indexOf(author) !== -1) return "friend";
        return "stranger";
    }

    function isLocked() {
        var pub = document.getElementById("account-public");
        return pub ? !pub.classList.contains("on") : false;
    }

    function paintLock() {
        var button = document.getElementById("me-lock");
        if (!button) return;
        var locked = isLocked();
        button.setAttribute("aria-pressed", locked ? "true" : "false");
        var icon = button.querySelector("i");
        if (icon) icon.className = "fa-solid " + (locked ? "fa-lock" : "fa-lock-open");
    }

    function renderMyPosts() {
        var box = document.getElementById("me-posts");
        if (!box) return;
        var rel = relationTo(viewing);
        var locked = isMe(viewing) && isLocked();
        var limited = rel === "stranger" && locked;
        profile.classList.toggle("locked-view", limited);
        var go = profile.querySelector(".me-posts-go");
        var lockBtn = document.getElementById("me-lock");
        if (go) go.hidden = rel !== "self";
        if (lockBtn) lockBtn.hidden = rel !== "self";
        function clearPosts() {
            while (box.firstChild) box.removeChild(box.firstChild);
        }
        if (limited) {
            clearPosts();
            var emptyHide = document.getElementById("me-posts-empty");
            if (emptyHide) emptyHide.hidden = true;
            return;
        }
        var name = viewing;
        var target = isMe(viewing) ? meHandle() : viewing;
        fetch("/Home/UserPosts?name=" + encodeURIComponent(target), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            return response.ok ? response.json() : [];
        }).then(function (posts) {
            if (viewing !== name) return;
            drawPosts(Array.isArray(posts) ? posts : []);
        }).catch(function () {});

        function drawPosts(posts) {
            var empty = document.getElementById("me-posts-empty");
            if (empty) empty.hidden = posts.length > 0;
            clearPosts();
            var tpl = document.getElementById("me-post");
            posts.forEach(function (post) {
                if (!tpl) return;
                var card = tpl.content.firstElementChild.cloneNode(true);
                var image = card.querySelector("img");
                var text = card.querySelector("p");
                var when = card.querySelector("time");
                if (image) {
                    image.hidden = !post.imageUrl;
                    if (post.imageUrl) image.src = post.imageUrl;
                }
                if (text) text.textContent = post.text || "";
                if (when) when.textContent = formatJoined(postTime(post.createdAt));
                box.appendChild(card);
            });
        }
    }

    function postTime(value) {
        var text = String(value || "");
        return /Z$|[+-]\d\d:\d\d$/.test(text) ? text : text + "Z";
    }

    function loadMe() {}

    function commitBio() {
        var next = bioInput.value.trim();
        if (next === savedBio) return;
        savedBio = next;
        saveProfile();
    }

    bioEmoji.addEventListener("click", function () {
        fillBioEmoji();
        bioEmojiList.classList.toggle("d-none");
    });

    bioInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            bioInput.blur();
        }
    });

    bioInput.addEventListener("blur", function () {
        setTimeout(function () {
            if (bioEmojiList.contains(document.activeElement)) return;
            bioEmojiList.classList.add("d-none");
            commitBio();
        }, 0);
    });

    document.getElementById("me-bio-form").addEventListener("submit", function (event) {
        event.preventDefault();
        commitBio();
    });

    var nameInput = document.getElementById("me-display-input");
    var nameForm = document.getElementById("me-name-form");
    function commitDisplay() {
        if (!nameInput || !isMe(viewing)) return;
        var next = nameInput.value.trim();
        if (!next) {
            nameInput.value = meName();
            return;
        }
        if (next === meName()) return;
        applyDisplay(next);
        saveProfile();
    }
    if (nameForm) {
        nameForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (nameInput) nameInput.blur();
        });
    }
    var msgBtn = document.getElementById("me-msg");
    if (msgBtn) {
        msgBtn.addEventListener("click", function () {
            if (!isMe(viewing)) return;
            profile.classList.add("d-none");
            var settings = document.getElementById("settings");
            if (settings) settings.hidden = false;
        });
    }
    if (nameInput) {
        nameInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                nameInput.blur();
            }
        });
        nameInput.addEventListener("blur", commitDisplay);
    }

    document.getElementById("me-chip").addEventListener("click", function (event) {
        event.stopPropagation();
        openSetStatus();
    });

    document.addEventListener("click", function (event) {
        if (pop.classList.contains("d-none")) return;
        if (pop.contains(event.target) || menu.contains(event.target) || identity.contains(event.target)) return;
        closePop();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        if (!setStatus.classList.contains("d-none")) closeSetStatus();
        else if (!setPronouns.classList.contains("d-none")) closePronouns();
        else if (!profile.classList.contains("d-none")) closeProfile();
        else closePop();
    });

    document.addEventListener("discode-privacy", function () {
        paintLock();
        renderMyPosts();
    });

    window.openUserProfile = function (name, photo) {
        viewing = name || meName();
        var self = isMe(viewing);
        setVisitor(!self);
        setPrivateView(false, "");
        setRequestCard(false);
        viewingUserId = "";
        if (window.discodePresence) window.discodePresence.unwatchProfile();
        var title = profile.querySelector(".me-profile-id h2");
        if (title) title.textContent = self ? meName() : viewing;
        var nameInput = document.getElementById("me-display-input");
        var viewName = document.getElementById("me-view-name");
        if (self) {
            if (nameInput) nameInput.value = meName();
            if (viewName) viewName.hidden = true;
        } else if (viewName) {
            viewName.hidden = false;
            viewName.textContent = viewing;
        }
        var handle = document.getElementById("me-handle-name");
        if (handle) handle.textContent = self ? meHandle() : viewing;
        var add = document.getElementById("me-add");
        if (add) {
            add.setAttribute("data-username", self ? "" : viewing);
            add.classList.remove("button-sent");
            add.disabled = false;
            add.innerHTML = '<i class="fa-solid fa-user-plus"></i> <span>Add Friend</span>';
        }
        var face = profile.querySelector(".me-profile-avatar img");
        if (face) face.src = self ? ownPhoto : (photo || DEFAULT_AVATAR);
        var since = document.getElementById("me-since");
        if (since && !self) showJoined(viewing);
        renderMyPosts();
        profile.classList.remove("d-none");
    };

    window.addEventListener("resize", function () {
        if (!pop.classList.contains("d-none")) place();
    });
})();
