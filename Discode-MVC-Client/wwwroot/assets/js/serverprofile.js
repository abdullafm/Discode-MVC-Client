(function () {
    "use strict";

    var form = document.getElementById("server-profile-form");
    if (!form) return;

    var serverId = new URLSearchParams(window.location.search).get("id");
    if (!serverId) return;

    var nameInput = document.getElementById("server-profile-name");
    var aboutInput = document.getElementById("server-profile-about");
    var privateInput = document.getElementById("server-private");
    var iconInput = document.getElementById("server-icon-file");
    var colors = document.getElementById("server-banner-colors");
    var preview = document.getElementById("server-profile-preview");
    var side = document.querySelector(".server-profile-side");
    var bar = document.getElementById("server-save-bar");
    var note = document.getElementById("server-save-note");
    var resetButton = document.getElementById("server-save-reset");
    var saveButton = document.getElementById("server-save-go");
    var bannerFile = document.getElementById("boost-banner-file");
    var bannerPreview = document.getElementById("boost-banner-preview");
    var bannerRemove = document.getElementById("boost-banner-remove");
    var bannerNote = document.getElementById("boost-banner-note");
    var inviteInput = document.getElementById("boost-invite-link");
    var inviteSave = document.getElementById("boost-invite-save");
    var inviteNote = document.getElementById("boost-invite-note");

    var boostInfo = null;
    var server = null;
    var dirty = false;
    var saving = false;
    var presenceTimer = 0;
    var inviteDirty = false;

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function initial(name) {
        var text = String(name || "").trim();
        return text ? text.charAt(0).toUpperCase() : "S";
    }

    function established(value) {
        return "Est. " + new Date(value).toLocaleDateString([], { month: "short", year: "numeric" });
    }

    function pluralMembers(count) {
        return count + (count === 1 ? " Member" : " Members");
    }

    function stat(online, text) {
        var holder = document.createElement("span");
        holder.className = "server-preview-stat" + (online ? " is-online" : "");
        holder.appendChild(document.createElement("i"));
        holder.appendChild(document.createTextNode(text));
        return holder;
    }

    function selectedColor() {
        var on = colors ? colors.querySelector("[data-color].on") : null;
        return on ? on.getAttribute("data-color") : "ink";
    }

    function paintIcons() {
        var faces = document.querySelectorAll("#server-icon-face, #server-preview-icon, #boost-preview-icon");
        var name = nameInput ? nameInput.value : server.name;
        for (var i = 0; i < faces.length; i++) {
            var image = faces[i].querySelector("img");
            var letter = faces[i].querySelector("span");
            if (server.iconUrl) {
                if (image) {
                    image.src = server.iconUrl;
                    image.hidden = false;
                }
                if (letter) letter.hidden = true;
            } else {
                if (image) image.hidden = true;
                if (letter) {
                    letter.hidden = false;
                    letter.textContent = initial(name);
                }
            }
        }
    }

    function say(node, text, kind) {
        if (!node) return;
        node.textContent = text || "";
        node.classList.toggle("is-error", kind === "error");
        node.classList.toggle("is-ok", kind === "ok");
    }

    function paintBanner() {
        var url = server.bannerUrl || "";
        if (bannerPreview) {
            if (url) bannerPreview.src = url;
            bannerPreview.hidden = !url;
        }
        if (bannerRemove) bannerRemove.hidden = !url;
        var wrap = document.querySelector(".server-banner-wrap");
        if (wrap) {
            wrap.classList.toggle("has-banner", !!url);
            wrap.style.backgroundImage = url ? "url('" + url + "')" : "";
        }
        var previewBanner = preview ? preview.querySelector(".server-preview-banner") : null;
        if (previewBanner) {
            previewBanner.classList.toggle("has-image", !!url);
            previewBanner.style.backgroundImage = url ? "url('" + url + "')" : "";
        }
    }

    function paintInvite() {
        if (!inviteInput) return;
        if (!inviteDirty) {
            inviteInput.value = server.customLink || "";
            if (inviteSave) inviteSave.disabled = true;
            say(inviteNote, window.location.origin + "/" + (server.customLink || server.inviteCode || ""), "");
        }
    }

    function paintAccess() {
        var deleteOpen = document.getElementById("server-delete-open");
        if (deleteOpen) deleteOpen.hidden = !server.isOwner;
        var leaveOpen = document.getElementById("server-leave-open");
        if (leaveOpen) leaveOpen.hidden = !!server.isOwner;
        var leaveSep = document.getElementById("server-leave-sep");
        if (leaveSep) leaveSep.hidden = !!server.isOwner;
    }

    function paintShared() {
        paintAccess();
        paintBanner();
        paintInvite();
        var title = document.getElementById("server-title");
        if (title) title.textContent = server.name;
        var settingsName = document.getElementById("server-settings-name");
        if (settingsName) settingsName.textContent = server.name;
        if (!preview) return;
        var meta = preview.querySelector(".server-preview-meta");
        if (meta) {
            while (meta.firstChild) meta.removeChild(meta.firstChild);
            meta.appendChild(stat(true, (server.onlineCount || 0) + " Online"));
            meta.appendChild(stat(false, pluralMembers(server.memberCount || 0)));
        }
        var since = preview.querySelector(".server-preview-since");
        if (since) {
            while (since.firstChild) since.removeChild(since.firstChild);
            var span = document.createElement("span");
            span.textContent = established(server.createdAt);
            since.appendChild(span);
        }
        paintAbout(dirty && aboutInput ? aboutInput.value : server.description);
    }

    function paintAbout(text) {
        if (!preview) return;
        var about = preview.querySelector(".server-preview-about");
        if (!about) {
            about = document.createElement("p");
            about.className = "server-preview-about";
            var since = preview.querySelector(".server-preview-since");
            preview.insertBefore(about, since ? since.nextSibling : null);
        }
        about.textContent = text || "";
        about.hidden = !text;
    }

    function fillForm() {
        if (nameInput) nameInput.value = server.name;
        if (aboutInput) aboutInput.value = server.description || "";
        if (privateInput) privateInput.checked = !!server.isPrivate;
        if (side) side.classList.toggle("is-private", !!server.isPrivate);
        var swatches = colors ? colors.querySelectorAll("[data-color]") : [];
        for (var i = 0; i < swatches.length; i++) swatches[i].classList.toggle("on", swatches[i].getAttribute("data-color") === server.bannerColor);
        if (preview) preview.setAttribute("data-banner", server.bannerColor || "ink");
        var previewName = document.getElementById("server-preview-name");
        if (previewName) previewName.textContent = server.name;
        if (iconInput) iconInput.value = "";
        paintIcons();
    }

    function paintAll() {
        if (!server) return;
        if (!dirty) fillForm();
        paintShared();
    }

    function markDirty() {
        if (!server) return;
        dirty = true;
        if (note) {
            note.textContent = "Careful — you have unsaved changes!";
            note.classList.remove("is-error");
        }
        if (bar) bar.hidden = false;
    }

    function clean() {
        dirty = false;
        if (bar) bar.hidden = true;
    }

    function load() {
        fetch("/Server/Get?id=" + encodeURIComponent(serverId), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) throw new Error("server");
            return response.json();
        }).then(function (data) {
            server = data;
            paintAll();
        }).catch(function () {});
    }

    function fail(message) {
        if (!note) return;
        note.textContent = message;
        note.classList.add("is-error");
    }

    function sendBanner(data) {
        return fetch("/Server/Banner", {
            method: "POST",
            credentials: "same-origin",
            headers: { "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: data
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok) throw new Error((body && body.errors && body.errors[0]) || "Could not change the banner.");
                return body;
            });
        });
    }

    if (bannerFile) {
        bannerFile.addEventListener("change", function () {
            var image = bannerFile.files && bannerFile.files[0];
            if (!image || !server) return;
            var data = new FormData();
            data.append("Id", server.id);
            data.append("Banner", image);
            say(bannerNote, "Uploading...", "");
            sendBanner(data).then(function (body) {
                server = body;
                say(bannerNote, "Banner updated.", "ok");
                paintAll();
            }).catch(function (error) {
                say(bannerNote, error.message, "error");
            }).then(function () {
                bannerFile.value = "";
            });
        });
    }

    if (bannerRemove) {
        bannerRemove.addEventListener("click", function () {
            if (!server) return;
            var data = new FormData();
            data.append("Id", server.id);
            data.append("Remove", "true");
            sendBanner(data).then(function (body) {
                server = body;
                say(bannerNote, "Banner removed.", "ok");
                paintAll();
            }).catch(function (error) {
                say(bannerNote, error.message, "error");
            });
        });
    }

    if (inviteInput) {
        inviteInput.addEventListener("input", function () {
            var cleaned = inviteInput.value.replace(/[^A-Za-z0-9_-]/g, "");
            if (cleaned !== inviteInput.value) inviteInput.value = cleaned;
            inviteDirty = !!server && cleaned !== (server.customLink || "");
            if (inviteSave) inviteSave.disabled = !inviteDirty || (cleaned.length > 0 && cleaned.length < 3) || !perksOpen();
            say(inviteNote, cleaned ? window.location.origin + "/" + cleaned : window.location.origin + "/" + (server && server.inviteCode || ""), "");
        });
        inviteInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                if (inviteSave && !inviteSave.disabled) inviteSave.click();
            }
        });
    }

    function revertInvite() {
        if (!server || !inviteDirty) return;
        inviteDirty = false;
        paintInvite();
    }

    var settingsRoom = document.getElementById("server-settings");
    if (settingsRoom) {
        new MutationObserver(function () {
            if (settingsRoom.hidden) revertInvite();
        }).observe(settingsRoom, { attributes: true, attributeFilter: ["hidden", "class"] });
    }

    var settingsNav = document.querySelector(".server-settings-nav");
    if (settingsNav) settingsNav.addEventListener("click", revertInvite);

    if (inviteSave) {
        inviteSave.addEventListener("click", function () {
            if (!server || !inviteInput) return;
            inviteSave.disabled = true;
            fetch("/Server/CustomInvite", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
                body: JSON.stringify({ id: server.id, code: inviteInput.value.trim() })
            }).then(function (response) {
                return response.json().catch(function () { return {}; }).then(function (body) {
                    if (!response.ok) throw new Error((body && body.errors && body.errors[0]) || "Could not change the invite link.");
                    return body;
                });
            }).then(function (body) {
                server = body;
                inviteDirty = false;
                paintInvite();
                say(inviteNote, "Saved. " + window.location.origin + "/" + (server.customLink || server.inviteCode), "ok");
            }).catch(function (error) {
                inviteSave.disabled = false;
                say(inviteNote, error.message, "error");
            });
        });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!server || saving || !dirty) return;
        var name = nameInput ? nameInput.value.trim() : "";
        if (!name) {
            fail("Enter a server name.");
            return;
        }
        var data = new FormData();
        data.append("Id", server.id);
        data.append("Name", name);
        data.append("Description", aboutInput ? aboutInput.value.trim() : "");
        data.append("BannerColor", selectedColor());
        data.append("IsPrivate", privateInput && privateInput.checked ? "true" : "false");
        var pickedIcon = iconInput && iconInput.files && iconInput.files[0];
        if (pickedIcon && /gif$/i.test(pickedIcon.type) && !perksOpen()) {
            fail("An animated server icon needs " + boostRequired() + " boosts.");
            return;
        }
        if (pickedIcon) data.append("Icon", pickedIcon);
        saving = true;
        if (saveButton) saveButton.disabled = true;
        fetch("/Server/Profile", {
            method: "POST",
            credentials: "same-origin",
            headers: { "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: data
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok) throw new Error((body && body.errors && body.errors[0]) || "Could not save the server profile.");
                return body;
            });
        }).then(function (body) {
            server = body;
            clean();
            paintAll();
            if (window.discodeReloadServers) window.discodeReloadServers();
        }).catch(function (error) {
            fail(error.message);
        }).then(function () {
            saving = false;
            if (saveButton) saveButton.disabled = false;
        });
    });

    if (resetButton) {
        resetButton.addEventListener("click", function () {
            clean();
            paintAll();
        });
    }

    if (nameInput) {
        nameInput.addEventListener("input", function () {
            markDirty();
            if (!server.iconUrl) {
                var letters = document.querySelectorAll("#server-icon-face span, #server-preview-icon span, #boost-preview-icon span");
                for (var i = 0; i < letters.length; i++) {
                    letters[i].hidden = false;
                    letters[i].textContent = initial(nameInput.value);
                }
            }
        });
    }

    if (aboutInput) {
        aboutInput.addEventListener("input", function () {
            markDirty();
            paintAbout(aboutInput.value);
        });
    }

    if (privateInput) privateInput.addEventListener("change", markDirty);
    if (iconInput) iconInput.addEventListener("change", function () { if (iconInput.files && iconInput.files[0]) markDirty(); });
    if (colors) colors.addEventListener("click", function (event) { if (event.target.closest("[data-color]")) markDirty(); });

    document.addEventListener("discode-server-updated", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        load();
    });

    document.addEventListener("discode-user-presence", function (event) {
        var detail = event && event.detail;
        if (!server || !detail || !server.members || !server.members.some(function (member) { return member.id === detail.userId; })) return;
        window.clearTimeout(presenceTimer);
        presenceTimer = window.setTimeout(load, 600);
    });

    document.addEventListener("discode-hub-connected", function () {
        window.clearTimeout(presenceTimer);
        presenceTimer = window.setTimeout(load, 400);
    });

    document.addEventListener("discode-status-set", function () {
        window.clearTimeout(presenceTimer);
        presenceTimer = window.setTimeout(load, 600);
    });

    var boostCount = document.getElementById("boost-count");
    var boostState = document.getElementById("boost-state");
    var boostFill = document.getElementById("boost-bar-fill");
    var boostHelp = document.getElementById("boost-help");
    var boostAdd = document.getElementById("boost-add");
    var boostRemove = document.getElementById("boost-remove");
    var boostPeople = document.getElementById("boost-people");

    function boostRequired() {
        return boostInfo ? boostInfo.required : 14;
    }

    function perksOpen() {
        return !!(boostInfo && boostInfo.perksUnlocked);
    }

    function paintPerks() {
        var open = perksOpen();
        var perks = document.querySelectorAll(".boost-perk");
        for (var i = 0; i < perks.length; i++) perks[i].classList.toggle("is-locked", !open);
        if (bannerFile) bannerFile.disabled = !open;
        if (inviteInput) inviteInput.disabled = !open;
        if (!open && inviteSave) inviteSave.disabled = true;
        if (boostInfo) {
            var text = "Needs " + boostRequired() + " boosts (" + boostInfo.boosts + "/" + boostRequired() + ").";
            if (!open) {
                say(bannerNote, text, "error");
            } else if (bannerNote && /^Needs /.test(bannerNote.textContent)) {
                say(bannerNote, "", "");
            }
        }
    }

    function paintBoost() {
        if (!boostInfo || !boostCount) return;
        var need = boostRequired();
        var nitro = window.discodeNitro || {};
        boostCount.textContent = boostInfo.boosts + " / " + need + " boosts";
        if (boostState) boostState.textContent = boostInfo.perksUnlocked ? "Perks unlocked" : (need - boostInfo.boosts) + " more to unlock the perks";
        if (boostFill) boostFill.style.width = Math.min(100, boostInfo.boosts / need * 100) + "%";
        var bar = boostFill ? boostFill.parentNode : null;
        if (bar) bar.setAttribute("aria-valuenow", String(boostInfo.boosts));
        if (boostAdd) {
            boostAdd.innerHTML = nitro.hasNitro ? '<i class="fa-solid fa-rocket"></i> Boost this server' : '<i class="fa-solid fa-gem"></i> Get Nitro to boost';
            boostAdd.disabled = !!nitro.hasNitro && !boostInfo.canBoost;
        }
        if (boostRemove) boostRemove.hidden = !(boostInfo.myBoosts > 0);
        if (boostHelp) {
            boostHelp.classList.remove("is-error");
            if (!nitro.hasNitro) boostHelp.textContent = "Boosting a server needs Nitro. Each Nitro gives 2 boosts.";
            else if (!boostInfo.canBoost) boostHelp.textContent = "You used both of your boosts" + (boostInfo.myBoosts > 0 ? " (" + boostInfo.myBoosts + " here)." : ".");
            else boostHelp.textContent = "You have " + boostInfo.myBoostsLeft + " boost" + (boostInfo.myBoostsLeft === 1 ? "" : "s") + " left" + (boostInfo.myBoosts > 0 ? " (" + boostInfo.myBoosts + " already on this server)." : ".");
        }
        if (boostPeople) {
            boostPeople.textContent = "";
            boostInfo.boosters.forEach(function (person) {
                var row = document.createElement("span");
                row.className = "boost-person";
                var face = document.createElement("img");
                face.alt = "";
                face.src = person.avatarUrl || "/assets/img/img-icon-profile.jpeg";
                var name = document.createElement("span");
                name.textContent = person.displayName + (person.count > 1 ? " x" + person.count : "");
                row.appendChild(face);
                row.appendChild(name);
                boostPeople.appendChild(row);
            });
        }
        paintPerks();
    }

    function loadBoost() {
        return fetch("/Server/BoostInfo?id=" + encodeURIComponent(serverId), { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (info) {
            if (!info) return;
            boostInfo = info;
            paintBoost();
        }).catch(function () {});
    }

    function sendBoost(url) {
        if (boostAdd) boostAdd.disabled = true;
        fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify({ id: Number(serverId) })
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok) throw new Error((body && body.errors && body.errors[0]) || "That did not work.");
                return body;
            });
        }).then(function (info) {
            boostInfo = info;
            paintBoost();
            load();
        }).catch(function (error) {
            if (boostHelp) {
                boostHelp.textContent = error.message;
                boostHelp.classList.add("is-error");
            }
            if (boostAdd) boostAdd.disabled = false;
        });
    }

    if (boostAdd) {
        boostAdd.addEventListener("click", function () {
            if (!(window.discodeNitro && window.discodeNitro.hasNitro)) {
                if (window.discodeGo) window.discodeGo("/Nitro/Index");
                else window.location.href = "/Nitro/Index";
                return;
            }
            sendBoost("/Server/Boost");
        });
    }
    if (boostRemove) boostRemove.addEventListener("click", function () { sendBoost("/Server/Unboost"); });

    document.addEventListener("discode-server-boost-changed", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        loadBoost();
        load();
    });
    document.addEventListener("discode-nitro-state", paintBoost);

    load();
    loadBoost();
})();
