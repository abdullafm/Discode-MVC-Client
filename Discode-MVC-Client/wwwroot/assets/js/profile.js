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
    // set when the status dialog is saved: how many minutes the status stays (sent once with the next save)
    var pendingClear = null;

    // the emoji is part of the status text that is saved, so it shows everywhere the status shows
    function composeStatus() {
        var input = document.getElementById("set-status-input");
        var text = ((input && input.value) || "").trim();
        var emoji = state.emoji || "";
        if (!text && !emoji) return "";
        return emoji ? emoji + (text ? " " + text : "") : text;
    }

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
        var sentClear = pendingClear;
        pendingClear = null;

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
                bannerUrl: savedBannerUrl,
                bannerColor: savedBannerColor,
                bio: profileValue("me-bio"),
                customStatus: composeStatus(),
                statusClearMinutes: sentClear,
                pronouns: profileValue("set-pronouns-input"),
                isPublic: !!(pub && pub.classList.contains("on"))
            })
        }).then(function (res) {
            if (!res.ok && sentClear !== null && pendingClear === null) pendingClear = sentClear;
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
        var viewingOwn = isMe(viewing);
        ownName = name;
        if (viewingOwn) viewing = name;
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
            if (tab === "friends") renderFriends();
            if (tab === "reposts") renderReposts();
        });
    });

    function renderReposts() {
        var box = document.getElementById("me-reposts-list");
        var empty = document.getElementById("me-reposts-empty");
        if (!box) return;
        var name = viewing;
        var target = isMe(viewing) ? meHandle() : viewing;
        while (box.firstChild) box.removeChild(box.firstChild);
        if (empty) empty.hidden = true;
        fetch("/Home/UserReposts?name=" + encodeURIComponent(target), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            return response.ok ? response.json() : [];
        }).then(function (posts) {
            if (viewing !== name) return;
            posts = Array.isArray(posts) ? posts : [];
            if (empty) empty.hidden = posts.length > 0;
            var tpl = document.getElementById("me-post");
            posts.forEach(function (post) {
                if (!tpl) return;
                var card = tpl.content.firstElementChild.cloneNode(true);
                var image = card.querySelector("img");
                var text = card.querySelector("p");
                var when = card.querySelector("time");
                if (image) {
                    if (post.imageUrl && window.discodeIsVideo(post.imageUrl)) {
                        image.hidden = true;
                        image.parentNode.insertBefore(window.discodeReel(post.imageUrl), image);
                    } else {
                        image.hidden = !post.imageUrl;
                        if (post.imageUrl) image.src = post.imageUrl;
                    }
                }
                if (text) text.textContent = (post.authorDisplayName || post.authorUserName) + ": " + (post.text || "");
                if (when) when.textContent = formatJoined(postTime(post.createdAt));
                box.appendChild(card);
            });
        }).catch(function () {});
    }

    function renderFriends() {
        var list = document.getElementById("me-friends-list");
        var empty = document.getElementById("me-friends-empty");
        var privateNote = document.getElementById("me-friends-private");
        if (!list) return;
        var name = viewing;
        var target = isMe(viewing) ? meHandle() : viewing;
        list.textContent = "";
        if (empty) empty.hidden = true;
        if (privateNote) privateNote.hidden = true;
        fetch("/Home/UserFriends?name=" + encodeURIComponent(target), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) {
                if (privateNote && viewing === name) privateNote.hidden = false;
                return null;
            }
            return response.json();
        }).then(function (friends) {
            if (!friends || viewing !== name) return;
            if (empty) empty.hidden = friends.length > 0;
            friends.forEach(function (friend) {
                var row = document.createElement("button");
                row.type = "button";
                row.className = "me-friend";
                var face = document.createElement("img");
                face.alt = "";
                face.src = friend.avatarUrl || DEFAULT_AVATAR;
                var text = document.createElement("span");
                var title = document.createElement("strong");
                title.textContent = friend.name;
                var handle = document.createElement("small");
                handle.textContent = friend.userName;
                text.appendChild(title);
                text.appendChild(handle);
                row.appendChild(face);
                row.appendChild(text);
                row.addEventListener("click", function () {
                    window.openUserProfile(friend.userName, friend.avatarUrl || "");
                });
                list.appendChild(row);
            });
        }).catch(function () {});
    }

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
    var EMOJI_LEAD = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*/u;
    // a saved status starts with its emoji: the emoji goes to the picker, the words stay in the box
    (function () {
        var found = EMOJI_LEAD.exec(setInput.value);
        if (found) {
            state.emoji = found[1];
            setInput.value = setInput.value.slice(found[0].length);
        }
        var until = Date.parse(setStatus.getAttribute("data-clear-at") || "");
        if (until > Date.now()) {
            state.clear = "keep";
            state.clearAt = until;
        }
    })();
    var pickedEmoji = state.emoji || "😀";
    var pickedClear = state.clear || "tomorrow";
    var emojiTouched = false;

    function clearMinutes(key) {
        if (key === "keep") return null;
        if (key === "none") return 0;
        if (key === "today") {
            var end = new Date();
            end.setHours(23, 59, 59, 999);
            return Math.max(1, Math.ceil((end.getTime() - Date.now()) / 60000));
        }
        if (key === "tomorrow") return 24 * 60;
        return Number(key) || 0;
    }

    function clearLabel(key) {
        var now = new Date();
        var clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        if (key === "none") return "Don't clear";
        if (key === "keep") return "Clears at " + new Date(state.clearAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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
                emojiTouched = true;
                setEmoji.classList.add("d-none");
                previewStatus();
            });
            setEmoji.appendChild(button);
        });
    }

    function openSetStatus() {
        pickedEmoji = state.emoji || "😀";
        emojiTouched = false;
        pickedClear = state.clear || "tomorrow";
        previewStatus();
        fillEmoji();
        setEmoji.classList.add("d-none");
        setWhen.classList.add("d-none");
        setStatus.classList.remove("d-none");
        setInput.focus();
    }

    function applyCustomStatus() {
        var status = composeStatus();
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

    // the server emptied my status (its "clear after" time came), or I changed it on another device: show what is saved
    function syncOwnStatus() {
        if (!setStatus.classList.contains("d-none")) return;
        fetch("/Home/UserProfile?name=" + encodeURIComponent(meHandle()), { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (data) {
            if (!data || !setStatus.classList.contains("d-none")) return;
            var saved = data.customStatus || "";
            if (saved === composeStatus()) return;
            var found = EMOJI_LEAD.exec(saved);
            state.emoji = found ? found[1] : "";
            setInput.value = found ? saved.slice(found[0].length) : saved;
            state.clear = "";
            applyCustomStatus();
        }).catch(function () {});
    }

    document.addEventListener("discode-profile-changed", function () { syncOwnStatus(); });

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
        if (emojiTouched || state.emoji) state.emoji = pickedEmoji;
        state.clear = pickedClear;
        pendingClear = clearMinutes(pickedClear);
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
        var faces = document.querySelectorAll("#user-panel .avatar img, #me-edit-avatar-preview, #server-voice-face, #call-avatar, .call-phone-faces img, #me-pop .me-avatar img, #me-profile .me-profile-avatar img, .set-status-person > img, .settings-me img, #dm-messages .dm-msg[data-mine=\"1\"] .dm-msg-avatar");
        for (var i = 0; i < faces.length; i++) faces[i].src = src;
    }

    var savedAvatarUrl = profileValue("Update_AvatarUrl");
    var savedBannerUrl = profile.getAttribute("data-banner") || "";
    var savedBannerColor = profile.getAttribute("data-color") || "";

    function paintBannerOf(url) {
        var targets = document.querySelectorAll("#me-profile-banner, #me-pop .me-banner, #me-edit-banner-preview");
        for (var i = 0; i < targets.length; i++) {
            window.discodeSetBanner(targets[i], url ? "url('" + url.replace(/'/g, "%27") + "')" : "", savedBannerColor);
            targets[i].classList.toggle("has-image", !!url);
        }
        var remove = document.getElementById("me-banner-remove");
        if (remove) remove.hidden = !url;
    }

    function paintOwnPerks() {
        if (profile.classList.contains("visitor-view")) return;
        var state = window.discodeNitro || {};
        paintBannerOf(savedBannerUrl);
        if (window.discodeBadges) window.discodeBadges(document.getElementById("me-badges"), !!state.hasNitro, !!state.isBooster);
    }

    function paintVisitorPerks(data) {
        var banner = document.getElementById("me-profile-banner");
        if (banner) {
            window.discodeSetBanner(banner, data.bannerUrl ? "url('" + data.bannerUrl.replace(/'/g, "%27") + "')" : "", data.bannerColor || "");
            banner.classList.toggle("has-image", !!data.bannerUrl);
        }
        if (window.discodeBadges) window.discodeBadges(document.getElementById("me-badges"), !!data.hasNitro, !!data.isBooster);
    }

    // Nitro ran out: the server took the banner and the animated avatar away, the page forgets them too
    document.addEventListener("discode-nitro-state", function () {
        if (!hasNitro()) {
            savedBannerUrl = "";
            if (/\.gif(\?|$)/i.test(savedAvatarUrl || "")) {
                savedAvatarUrl = "";
                applyOwnPhoto(DEFAULT_AVATAR);
            }
        }
        paintOwnPerks();
    });
    new MutationObserver(function () {
        if (!profile.classList.contains("d-none")) paintOwnPerks();
    }).observe(profile, { attributes: true, attributeFilter: ["class"] });
    paintOwnPerks();

    var bannerFile = document.getElementById("me-banner-file");
    if (bannerFile) {
        bannerFile.addEventListener("click", function (event) {
            if (!hasNitro()) {
                event.preventDefault();
                goNitro();
            }
        });
        bannerFile.addEventListener("change", function () {
            var file = bannerFile.files && bannerFile.files[0];
            bannerFile.value = "";
            if (!file || file.type.indexOf("image/") !== 0) return;
            if (file.size > 8 * 1024 * 1024) { showProfileError("Choose an image that is at most 8 MB."); return; }
            var tokenInput = document.querySelector("input[name='__RequestVerificationToken']");
            var data = new FormData();
            data.append("file", file, file.name || "banner");
            fetch("/Home/UploadBanner", {
                method: "POST",
                credentials: "same-origin",
                headers: { "RequestVerificationToken": tokenInput ? tokenInput.value : "", "X-Requested-With": "XMLHttpRequest" },
                body: data
            }).then(function (res) {
                if (!res.ok) return uploadFailure(res);
                return res.json();
            }).then(function (body) {
                savedBannerUrl = body.bannerUrl;
                paintOwnPerks();
                saveProfile();
            }).catch(function (error) {
                showProfileError(error && error.message && error.message !== "upload" ? error.message : "Could not save the banner.");
            });
        });
    }

    var bannerRemove = document.getElementById("me-banner-remove");
    if (bannerRemove) {
        bannerRemove.addEventListener("click", function () {
            savedBannerUrl = "";
            paintOwnPerks();
            saveProfile();
        });
    }

    function goNitro() {
        if (window.discodeGo) window.discodeGo("/Nitro/Index");
        else window.location.href = "/Nitro/Index";
    }

    function hasNitro() {
        return !!(window.discodeNitro && window.discodeNitro.hasNitro);
    }

    function uploadFailure(response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
            throw new Error((body && body.errors && body.errors[0]) || "upload");
        });
    }

    function sendAvatar(blob, filename) {
        var tokenInput = document.querySelector("input[name='__RequestVerificationToken']");
        var data = new FormData();
        data.append("file", blob, filename);
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
            if (!res.ok) return uploadFailure(res);
            return res.json();
        }).then(function (data) {
            savedAvatarUrl = data.avatarUrl;
            var hidden = document.getElementById("Update_AvatarUrl");
            if (hidden) hidden.value = data.avatarUrl;
            applyOwnPhoto(data.avatarUrl);
            saveProfile();
        }).catch(function (error) {
            showProfileError(error && error.message && error.message !== "upload" ? error.message : "Could not save the photo.");
        });
    }

    var avatarFile = document.getElementById("me-avatar-file");
    if (avatarFile) {
        avatarFile.addEventListener("change", function () {
            var file = avatarFile.files && avatarFile.files[0];
            avatarFile.value = "";
            if (!file || file.type.indexOf("image/") !== 0) return;
            // an animated avatar (Nitro) is sent as it is: the canvas below would flatten it to one still picture
            if (file.type === "image/gif" && hasNitro()) {
                if (file.size > 8 * 1024 * 1024) { showProfileError("Choose an animated image that is at most 8 MB."); return; }
                sendAvatar(file, "avatar.gif");
                return;
            }
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
                        if (blob) sendAvatar(blob, "avatar.jpg");
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
        if (profile.classList.contains("d-none")) return;
        renderMyPosts();
        var repostsTab = profile.querySelector(".me-tabs button[data-tab='reposts']");
        if (repostsTab && repostsTab.classList.contains("on")) renderReposts();
    });

    document.addEventListener("discode-user-presence", function (event) {
        if (profile.classList.contains("d-none") || !profile.classList.contains("visitor-view")) return;
        if (!event.detail || event.detail.userId !== viewingUserId) return;
        paintVisitorStatus(event.detail.status);
        loadVisitor(viewing);
    });

    document.addEventListener("discode-friends-changed", function () {
        if (profile.classList.contains("d-none")) return;
        if (!profile.classList.contains("visitor-view")) {
            if (friendsPanelOpen()) renderFriends();
            return;
        }
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
        var repostsTab = profile.querySelector(".me-tabs button[data-tab='reposts']");
        if (repostsTab) repostsTab.hidden = on;
        var friendsTab = profile.querySelector(".me-tabs button[data-tab='friends']");
        if (friendsTab) {
            friendsTab.hidden = on;
            if (on && (friendsTab.classList.contains("on") || (repostsTab && repostsTab.classList.contains("on")))) {
                var boardTab = profile.querySelector(".me-tabs button[data-tab='board']");
                if (boardTab) boardTab.click();
            }
        }
    }

    function friendsPanelOpen() {
        var panel = document.getElementById("me-friends");
        return !!panel && !panel.classList.contains("d-none");
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
        paintVisitorPerks(data);
        paintPerson({ pronouns: data.pronouns || "", bio: data.bio || "", status: data.customStatus || "", emoji: "" });
        setPrivateView(!!data.isPrivate, displayName);
        if (!data.isPrivate && friendsPanelOpen()) renderFriends();
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
            var viewBio = document.getElementById("me-view-bio");
            if (viewBio) {
                viewBio.hidden = true;
                viewBio.textContent = "";
            }
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
                    if (post.imageUrl && window.discodeIsVideo(post.imageUrl)) {
                        image.hidden = true;
                        image.parentNode.insertBefore(window.discodeReel(post.imageUrl), image);
                    } else {
                        image.hidden = !post.imageUrl;
                        if (post.imageUrl) image.src = post.imageUrl;
                    }
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

    // ---------- the editor beside the big profile: a place for name, avatar, banner and banner colour
    (function () {
        var panel = document.getElementById("me-edit-panel");
        if (!panel) return;
        var name = document.getElementById("me-edit-name");
        var colors = document.getElementById("me-edit-colors");
        var picker = document.getElementById("me-edit-color-input");
        var bannerChange = document.getElementById("me-edit-banner-change");
        var bannerSection = document.getElementById("me-edit-banner-section");
        var colorSection = document.getElementById("me-edit-color-section");
        var avatarHint = document.getElementById("me-edit-avatar-hint");

        function paintPanel() {
            if (profile.classList.contains("visitor-view")) return;
            if (name && document.activeElement !== name) name.value = meName();
            var avatar = document.getElementById("me-edit-avatar-preview");
            if (avatar && ownPhoto) avatar.src = ownPhoto;
            var remove = document.getElementById("me-edit-avatar-remove");
            if (remove) remove.hidden = !ownPhoto || ownPhoto.indexOf("img-icon-profile") >= 0;
            var removeBanner = document.getElementById("me-edit-banner-remove");
            if (removeBanner) removeBanner.hidden = !savedBannerUrl;
            var current = (savedBannerColor || "").toLowerCase();
            [].forEach.call(colors.querySelectorAll("button[data-color]"), function (swatch) {
                swatch.classList.toggle("on", swatch.getAttribute("data-color") === current);
            });
            var reset = document.getElementById("me-edit-color-reset");
            if (reset) reset.hidden = !current;
            if (picker && current) picker.value = current;
            // the banner colour is for everybody, the banner picture only with Nitro
            var nitro = !!(window.discodeNitro && window.discodeNitro.hasNitro);
            if (bannerSection) bannerSection.hidden = !nitro;
            if (colorSection) colorSection.hidden = nitro;
            if (avatarHint) avatarHint.hidden = nitro;
            paintBannerOf(savedBannerUrl);
        }

        function setColor(next) {
            savedBannerColor = next;
            paintBannerOf(savedBannerUrl);
            paintPanel();
            saveProfile();
        }

        if (name) {
            name.addEventListener("input", function () {
                if (nameInput) nameInput.value = name.value;
            });
            name.addEventListener("change", function () {
                if (nameInput) {
                    nameInput.value = name.value;
                    commitDisplay();
                    name.value = meName();
                }
            });
            name.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    name.blur();
                }
            });
        }

        document.getElementById("me-edit-avatar-change").addEventListener("click", function () {
            var file = document.getElementById("me-avatar-file");
            if (file) file.click();
        });
        document.getElementById("me-edit-avatar-remove").addEventListener("click", function () {
            savedAvatarUrl = "";
            var hidden = document.getElementById("Update_AvatarUrl");
            if (hidden) hidden.value = "";
            applyOwnPhoto(DEFAULT_AVATAR);
            paintPanel();
            saveProfile();
        });
        bannerChange.addEventListener("click", function () {
            var file = document.getElementById("me-banner-file");
            if (file) file.click();
        });
        document.getElementById("me-edit-banner-remove").addEventListener("click", function () {
            savedBannerUrl = "";
            paintOwnPerks();
            paintPanel();
            saveProfile();
        });
        colors.addEventListener("click", function (event) {
            var swatch = event.target.closest("button[data-color]");
            if (swatch) setColor(swatch.getAttribute("data-color"));
        });
        document.getElementById("me-edit-color-reset").addEventListener("click", function () { setColor(""); });
        if (picker) {
            picker.addEventListener("input", function () { savedBannerColor = picker.value.toLowerCase(); paintBannerOf(savedBannerUrl); });
            picker.addEventListener("change", function () { setColor(picker.value.toLowerCase()); });
        }

        // collapse to a thin strip, and a button for narrow screens where the panel opens over the profile
        document.getElementById("me-edit-collapse").addEventListener("click", function () {
            profile.classList.toggle("edit-collapsed");
            panel.classList.toggle("is-collapsed", profile.classList.contains("edit-collapsed"));
        });
        var toggle = document.getElementById("me-edit-toggle");
        if (toggle) toggle.addEventListener("click", function () { profile.classList.toggle("edit-open"); });

        document.addEventListener("discode-nitro-state", paintPanel);
        var wasShown = !profile.classList.contains("d-none");
        new MutationObserver(function () {
            var shown = !profile.classList.contains("d-none");
            // the profile just opened: start with the drawer closed (touching the class list only when needed, it wakes this observer)
            if (shown && !wasShown && profile.classList.contains("edit-open")) profile.classList.remove("edit-open");
            if (shown) paintPanel();
            wasShown = shown;
        }).observe(profile, { attributes: true, attributeFilter: ["class"] });
        paintPanel();
    })();
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
        if (!self) paintVisitorPerks({}); else paintOwnPerks();
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
        profile.querySelectorAll(".me-tabs button").forEach(function (item) {
            item.classList.toggle("on", item.getAttribute("data-tab") === "board");
        });
        profile.querySelectorAll(".me-panel").forEach(function (panel) {
            panel.classList.toggle("d-none", panel.id !== "me-board");
        });
        profile.classList.remove("d-none");
    };

    window.addEventListener("resize", function () {
        if (!pop.classList.contains("d-none")) place();
    });
})();

(function () {
    var control = document.getElementById("account-public");
    if (!control || control.querySelector(".vis-opt")) return;

    function option(value, icon, label) {
        var pick = document.createElement("span");
        pick.className = "vis-opt vis-" + value;
        pick.setAttribute("data-v", value);
        var glyph = document.createElement("i");
        glyph.className = "fa-solid " + icon;
        var text = document.createElement("span");
        text.textContent = label;
        pick.appendChild(glyph);
        pick.appendChild(text);
        return pick;
    }

    control.appendChild(option("public", "fa-earth-americas", "Public"));
    control.appendChild(option("private", "fa-lock", "Private"));

    var row = control.closest(".notify-row");
    var title = row ? row.querySelector("strong") : null;
    var note = row ? row.querySelector("p") : null;
    if (title) {
        title.removeAttribute("data-i18n");
        title.textContent = "Account visibility";
    }

    function paint() {
        var isPublic = control.classList.contains("on");
        control.setAttribute("data-state", isPublic ? "public" : "private");
        control.setAttribute("aria-label", "Account visibility: " + (isPublic ? "Public" : "Private"));
        if (note) note.textContent = isPublic
            ? "Anyone can find you and see your bio, status and posts."
            : "Only your friends can see your bio, status and posts.";
    }

    control.addEventListener("click", function (event) {
        var pick = event.target.closest(".vis-opt");
        if (!pick) return;
        var wantPublic = pick.getAttribute("data-v") === "public";
        if (wantPublic === control.classList.contains("on")) event.stopImmediatePropagation();
    }, true);

    document.addEventListener("discode-privacy", paint);
    paint();
})();

(function () {
    var profile = document.getElementById("me-profile");
    var original = window.openUserProfile;
    if (!profile || typeof original !== "function" || original.discodeHistory) return;

    var trail = [];
    var at = -1;

    function makeButton(id, icon, label) {
        var button = document.createElement("button");
        button.type = "button";
        button.id = id;
        button.className = "me-profile-nav";
        button.setAttribute("aria-label", label);
        button.title = label;
        button.hidden = true;
        button.innerHTML = '<i class="fa-solid ' + icon + '"></i>';
        profile.querySelector(".me-profile-card").appendChild(button);
        return button;
    }

    var back = makeButton("me-profile-back", "fa-arrow-left", "Back");
    var forward = makeButton("me-profile-forward", "fa-arrow-right", "Forward");

    function paint() {
        var show = trail.length > 1;
        back.hidden = !show;
        forward.hidden = !show;
        back.disabled = at <= 0;
        forward.disabled = at >= trail.length - 1;
    }

    function wrapped(name, photo) {
        var open = !profile.classList.contains("d-none");
        if (!open) {
            trail = [];
            at = -1;
        }
        var current = trail[at];
        var same = current && current.name === name;
        if (!same) {
            trail = trail.slice(0, at + 1);
            trail.push({ name: name, photo: photo });
            at = trail.length - 1;
        }
        original(name, photo);
        paint();
    }
    wrapped.discodeHistory = true;
    window.openUserProfile = wrapped;

    function go(step) {
        var next = at + step;
        if (next < 0 || next >= trail.length) return;
        at = next;
        original(trail[at].name, trail[at].photo);
        paint();
    }

    back.addEventListener("click", function () { go(-1); });
    forward.addEventListener("click", function () { go(1); });

    new MutationObserver(function () {
        if (profile.classList.contains("d-none")) {
            trail = [];
            at = -1;
            paint();
        }
    }).observe(profile, { attributes: true, attributeFilter: ["class"] });
})();
