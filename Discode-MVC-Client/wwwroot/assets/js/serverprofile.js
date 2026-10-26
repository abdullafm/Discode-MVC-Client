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

    var server = null;
    var dirty = false;
    var saving = false;
    var presenceTimer = 0;

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

    function paintShared() {
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
        if (iconInput && iconInput.files && iconInput.files[0]) data.append("Icon", iconInput.files[0]);
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

    load();
})();
