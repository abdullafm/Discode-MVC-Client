"use strict";
(function () {
    var KEY = "discode-me";
    var STATUSES = {
        online: { label: "Online", color: "#23a559" },
        idle: { label: "Idle", color: "#f0b232" },
        dnd: { label: "Do Not Disturb", color: "#f23f43", note: "You will not receive desktop notifications" },
        invisible: { label: "Invisible", color: "#80848e", note: "You will appear offline" }
    };

    function load() {
        try {
            return JSON.parse(localStorage.getItem(KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function save(data) {
        localStorage.setItem(KEY, JSON.stringify(data));
    }

    var state = load();
    if (!STATUSES[state.status]) state.status = "online";

    function paintDisplay() {
        var name = state.displayName || "Anonymou5";
        var nodes = document.querySelectorAll(".me-display");
        for (var i = 0; i < nodes.length; i++) nodes[i].textContent = name;
        var input = document.getElementById("me-display-input");
        if (input && document.activeElement !== input) input.value = name;
    }

    var panel = document.getElementById("user-panel");
    if (!panel) return;
    var identity = panel.querySelector(".user-identity");
    var nameEl = identity.querySelector("p");
    var statusEl = identity.querySelector("span");
    var photo = identity.querySelector("img").getAttribute("src");
    var displayName = nameEl.textContent;

    function paintPanel() {
        panel.setAttribute("data-status", state.status);
        statusEl.textContent = STATUSES[state.status].label;
    }

    paintDisplay();
    paintPanel();
    paintLock();

    var pop = document.getElementById("me-pop");
    if (!pop) return;
    pop.querySelector("img").src = photo;
    pop.querySelector("h2").textContent = state.displayName || displayName;

    var menu = document.getElementById("me-status-menu");
    if (!menu) return;

    var profile = document.getElementById("me-profile");
    if (!profile) return;

    function paintPop() {
        var item = STATUSES[state.status];
        pop.querySelector(".me-dot").style.background = item.color;
        profile.querySelector(".me-dot").style.background = item.color;
        pop.querySelector(".me-mini").style.background = item.color;
        document.getElementById("me-status-label").textContent = item.label;
        var chip = document.getElementById("me-chip");
        var about = document.getElementById("me-about");
        about.hidden = !state.bio;
        about.textContent = state.bio || "";
        var pronouns = document.getElementById("me-pronouns");
        if (pronouns) pronouns.textContent = state.pronouns || "Add pronouns";
        var bubble = document.getElementById("me-status-bubble");
        var bubbleText = document.getElementById("me-status-bubble-text");
        if (bubble && bubbleText) {
            bubble.classList.toggle("has-bio", !!(state.bio || state.emoji));
            bubbleText.textContent = (state.emoji ? state.emoji + " " : "") + (state.bio || "Today I learned...");
            var chipText = document.getElementById("me-chip-text");
            if (chipText) {
                chip.classList.toggle("has-bio", !!(state.bio || state.emoji));
                chipText.textContent = bubbleText.textContent;
            }
        }
    }

    document.getElementById("me-edit").addEventListener("click", function () {
        viewing = "Anonymou5";
        setVisitor(false);
        closePop();
        paintPop();
        loadMe();
        renderMyPosts();
        profile.classList.remove("d-none");
    });

    var logoutBtn = document.getElementById("me-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = "./login.html";
            }
        });
    }

    var settingsMe = document.querySelector(".settings-me");
    if (settingsMe) {
        settingsMe.addEventListener("click", function () {
            var settings = document.getElementById("settings");
            if (settings) settings.hidden = true;
            viewing = "Anonymou5";
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

    document.getElementById("me-profile-close").addEventListener("click", function () {
        profile.classList.add("d-none");
    });

    profile.addEventListener("click", function (event) {
        if (event.target === profile) profile.classList.add("d-none");
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

    function closePop() {
        closeStatus();
        window.clearTimeout(popTimer);
        if (window.discodePop) window.discodePop(pop, false);
        popTimer = window.setTimeout(function () {
            pop.classList.remove("is-open");
            pop.style.opacity = "";
            pop.style.transform = "";
            pop.classList.add("d-none");
        }, 200);
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
        save(state);
        paintPanel();
        paintPop();
        document.dispatchEvent(new CustomEvent("discode-presence"));
        closeStatus();
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
        setInput.value = state.bio || "";
        previewStatus();
        fillEmoji();
        setEmoji.classList.add("d-none");
        setWhen.classList.add("d-none");
        setStatus.classList.remove("d-none");
        setInput.focus();
    }

    function closeSetStatus() {
        setStatus.classList.add("d-none");
        setEmoji.classList.add("d-none");
        setWhen.classList.add("d-none");
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
        state.bio = setInput.value.trim();
        state.emoji = pickedEmoji;
        state.clear = pickedClear;
        save(state);
        paintPop();
        document.dispatchEvent(new CustomEvent("discode-presence"));
        closeSetStatus();
    });

    var setPronouns = document.getElementById("set-pronouns");
    var pronounsInput = document.getElementById("set-pronouns-input");

    document.getElementById("me-pronouns").addEventListener("click", function () {
        pronounsInput.value = state.pronouns || "";
        setPronouns.classList.remove("d-none");
        pronounsInput.focus();
    });

    document.getElementById("set-pronouns-close").addEventListener("click", function () {
        setPronouns.classList.add("d-none");
    });

    setPronouns.addEventListener("click", function (event) {
        if (event.target === setPronouns) setPronouns.classList.add("d-none");
    });

    document.getElementById("set-pronouns-form").addEventListener("submit", function (event) {
        event.preventDefault();
        state.pronouns = pronounsInput.value.trim();
        save(state);
        paintPop();
        setPronouns.classList.add("d-none");
    });

    var savedBio = "";
    var bioInput = document.getElementById("me-bio");
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

    var viewing = "Anonymou5";
    var ownSince = "";
    var ownPhoto = state.photo || "./assets/img/img-icon-profile.jpeg";

    function applyOwnPhoto(src) {
        ownPhoto = src;
        var faces = document.querySelectorAll("#user-panel .avatar img, #me-pop .me-avatar img, #me-profile .me-profile-avatar img, .set-status-person > img");
        for (var i = 0; i < faces.length; i++) faces[i].src = src;
    }

    if (state.photo) applyOwnPhoto(state.photo);

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
                    state.photo = canvas.toDataURL("image/jpeg", 0.85);
                    save(state);
                    applyOwnPhoto(state.photo);
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
        var about = document.getElementById("me-view-about");
        var aboutBlock = document.getElementById("me-about-block");
        var pronounText = info.pronouns || "";
        var bioText = info.bio || "";
        var aboutText = info.about || "";
        if (pronouns) {
            pronouns.hidden = !pronounText;
            pronouns.textContent = pronounText;
        }
        profile.classList.toggle("has-pronouns", !!pronounText);
        if (bubble && bubbleText) {
            bubble.classList.toggle("has-bio", !!bioText);
            bubbleText.textContent = (info.emoji ? info.emoji + " " : "") + bioText;
        }
        profile.classList.toggle("has-status", !!bioText);
        if (bio) {
            bio.hidden = !bioText;
            bio.textContent = bioText;
        }
        if (bioBlock) bioBlock.classList.toggle("has-text", !!bioText);
        if (about) about.textContent = aboutText;
        if (aboutBlock) {
            aboutBlock.hidden = !aboutText;
            aboutBlock.classList.toggle("has-text", !!aboutText);
        }
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
            emoji: row.getAttribute("data-emoji") || "",
            about: row.getAttribute("data-about") || ""
        } : {});
        fetch("/api/users/" + encodeURIComponent(name)).then(function (response) {
            if (!response.ok) throw new Error("user");
            return response.json();
        }).then(function (data) {
            if (viewing !== name) return;
            var text = formatJoined(data.registeredAt);
            if (text) since.textContent = text;
            paintPerson({
                pronouns: data.pronouns || "",
                bio: data.bio || "",
                emoji: data.emoji || "",
                about: data.about || ""
            });
        }).catch(function () {});
    }

    function setVisitor(on) {
        profile.classList.toggle("visitor-view", on);
        var add = document.getElementById("me-add");
        var note = document.getElementById("me-note-block");
        var noteAdd = document.getElementById("me-note-add");
        var noteInput = document.getElementById("me-note-input");
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
        if (note) note.hidden = !on;
        if (noteAdd) noteAdd.hidden = false;
        if (noteInput) {
            noteInput.hidden = true;
            noteInput.value = "";
        }
        if (!on) {
            if (title) title.textContent = state.displayName || "Anonymou5";
            var ownInput = document.getElementById("me-display-input");
            if (ownInput) ownInput.value = state.displayName || "Anonymou5";
            var ownView = document.getElementById("me-view-name");
            if (ownView) ownView.hidden = true;
            if (handle) handle.textContent = "anonymou5";
            if (face) face.src = ownPhoto;
            if (since) since.textContent = ownSince;
            profile.classList.remove("has-pronouns", "has-status");
            var viewPronouns = document.getElementById("me-view-pronouns");
            if (viewPronouns) viewPronouns.hidden = true;
            var aboutBlock = document.getElementById("me-about-block");
            if (aboutBlock) aboutBlock.hidden = true;
            var bioBlock = profile.querySelector(".me-bio-block");
            if (bioBlock) bioBlock.classList.remove("has-text");
            paintPop();
        }
    }

    var noteAddBtn = document.getElementById("me-note-add");
    if (noteAddBtn) {
        noteAddBtn.addEventListener("click", function () {
            var input = document.getElementById("me-note-input");
            if (!input) return;
            noteAddBtn.hidden = true;
            input.hidden = false;
            input.focus();
        });
    }

    function relationTo(author) {
        if (!author || author === "Anonymou5") return "self";
        if (friendNames().indexOf(author) !== -1) return "friend";
        return "stranger";
    }

    function paintLock() {
        var button = document.getElementById("me-lock");
        if (!button) return;
        var locked = !!state.locked;
        button.setAttribute("aria-pressed", locked ? "true" : "false");
        var icon = button.querySelector("i");
        if (icon) icon.className = "fa-solid " + (locked ? "fa-lock" : "fa-lock-open");
    }

    function renderMyPosts() {
        var box = document.getElementById("me-posts");
        if (!box) return;
        var rel = relationTo(viewing);
        var locked = viewing === "Anonymou5" && !!state.locked;
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
        var saved = {};
        try {
            saved = JSON.parse(localStorage.getItem("discode-social")) || {};
        } catch (e) {
            saved = {};
        }
        var posts = (saved.posts || []).filter(function (post) {
            if (post.author !== viewing) return false;
            if (rel === "self" || rel === "friend") return true;
            return post.visibility !== "friends";
        });
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
                image.hidden = !post.image;
                if (post.image) image.src = post.image;
            }
            if (text) text.textContent = post.text || "";
            if (when) when.textContent = post.createdAt ? new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
            box.appendChild(card);
        });
    }

    var meLoaded = false;

    function loadMe() {
        if (meLoaded) return;
        meLoaded = true;
        fetch("/api/me").then(function (response) {
            if (!response.ok) throw new Error("me");
            return response.json();
        }).then(function (data) {
            var since = document.getElementById("me-since");
            var date = new Date(data.registeredAt);
            if (since && data.registeredAt && !isNaN(date.getTime())) {
                since.textContent = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            }
        }).catch(function () {
            meLoaded = false;
        });
    }

    function commitBio() {
        var next = bioInput.value.trim();
        if (next === savedBio) return;
        fetch("/api/me", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bio: next })
        }).then(function (response) {
            if (!response.ok) throw new Error("bio");
            return response.json().catch(function () { return {}; });
        }).then(function (data) {
            savedBio = data.bio != null ? data.bio : next;
            bioInput.value = savedBio;
        }).catch(function () {
            bioInput.value = savedBio;
        });
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
        if (!nameInput || viewing !== "Anonymou5") return;
        var next = nameInput.value.trim();
        if (!next) {
            nameInput.value = state.displayName || "Anonymou5";
            return;
        }
        if (next === (state.displayName || "Anonymou5")) return;
        state.displayName = next;
        save(state);
        paintDisplay();
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
            if (viewing !== "Anonymou5") return;
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
        else if (!setPronouns.classList.contains("d-none")) setPronouns.classList.add("d-none");
        else if (!profile.classList.contains("d-none")) profile.classList.add("d-none");
        else closePop();
    });

    document.addEventListener("discode-privacy", function () {
        state = load();
        paintLock();
        renderMyPosts();
    });
    document.addEventListener("discode-display", function () {
        state = load();
        paintDisplay();
    });

    window.openUserProfile = function (name, photo) {
        viewing = name || "Anonymou5";
        var self = viewing === "Anonymou5";
        setVisitor(!self);
        var title = profile.querySelector(".me-profile-id h2");
        if (title) title.textContent = self ? (state.displayName || "Anonymou5") : viewing;
        var nameInput = document.getElementById("me-display-input");
        var viewName = document.getElementById("me-view-name");
        if (self) {
            if (nameInput) nameInput.value = state.displayName || "Anonymou5";
            if (viewName) viewName.hidden = true;
        } else if (viewName) {
            viewName.hidden = false;
            viewName.textContent = viewing;
        }
        var handle = document.getElementById("me-handle-name");
        if (handle) handle.textContent = self ? "anonymou5" : viewing.toLowerCase().replace(/\s+/g, "");
        var face = profile.querySelector(".me-profile-avatar img");
        if (face) face.src = self ? ownPhoto : (photo || ownPhoto);
        var since = document.getElementById("me-since");
        if (since && !self) showJoined(viewing);
        renderMyPosts();
        profile.classList.remove("d-none");
    };

    window.addEventListener("resize", function () {
        if (!pop.classList.contains("d-none")) place();
    });
})();
