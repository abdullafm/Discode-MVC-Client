(function () {
    "use strict";

    var editor = document.querySelector(".role-editor");
    if (!editor) return;

    var serverId = new URLSearchParams(window.location.search).get("id");
    if (!serverId) return;

    var BITS = {
        "View Channels": 1,
        "Manage Channels": 2,
        "Manage Roles": 4,
        "Create Expressions": 8,
        "Manage Expressions": 16,
        "View Audit Log": 32,
        "Manage Webhooks": 64,
        "Manage Server": 128,
        "Send Messages": 256,
        "Manage Messages": 512,
        "Mention @everyone": 1024,
        "Connect": 2048,
        "Speak": 4096,
        "Mute Members": 8192
    };
    var COLORS = {
        gray: "#80848e",
        pink: "#eb459e",
        red: "#ed4245",
        orange: "#f26522",
        yellow: "#fee75c",
        purple: "#9b59d0",
        blue: "#5865f2",
        cyan: "#1abc9c",
        green: "#23a559"
    };
    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";

    var list = document.getElementById("server-role-list");
    var picker = null;
    var pickArea = null;
    var pickHandle = null;
    var pickHue = null;
    var pickHueHandle = null;
    var pickHex = null;
    var customSwatch = null;
    var pick = { h: 0, s: 1, v: 1 };
    var title = document.getElementById("role-editor-name");
    var nameInput = document.getElementById("role-name");
    var colors = document.getElementById("role-colors");
    var separate = document.getElementById("role-separate");
    var deleteButton = document.getElementById("role-delete");
    var createButton = document.getElementById("role-create");
    var moreButton = document.getElementById("role-more");
    var moreMenu = document.getElementById("role-more-menu");
    var backButton = document.getElementById("role-back");
    var countNode = document.getElementById("role-member-count");
    var memberList = document.getElementById("role-member-list");
    var memberSearch = document.querySelector(".role-member-search input");
    var addOpen = document.getElementById("role-add-open");
    var addLink = document.getElementById("role-add-link");
    var addBox = document.getElementById("role-add");
    var addList = document.getElementById("role-add-list");
    var settingsNav = document.querySelector(".server-settings-nav");
    var toggles = [].slice.call(editor.querySelectorAll(".perm-switch input[type=checkbox]"));

    var roles = [];
    var selectedId = 0;
    var draft = null;
    var dirty = false;
    var perms = 0;
    var roleMembers = [];
    var allMembers = [];
    var bar = null;
    var note = null;
    var saveButton = null;

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function can(bit) {
        return (perms & bit) === bit;
    }

    function canEdit() {
        return can(4);
    }

    function selected() {
        for (var i = 0; i < roles.length; i++) if (roles[i].id === selectedId) return roles[i];
        return null;
    }

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function request(url, body) {
        return fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify(body)
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (data) {
                if (!response.ok) throw new Error((data && data.errors && data.errors[0]) || "Something went wrong.");
                return data;
            });
        });
    }

    function get(url) {
        return fetch(url, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("request");
            return response.json();
        });
    }

    function buildBar() {
        var main = editor.querySelector(".role-main");
        if (!main || bar) return;
        bar = element("div", "server-save-bar role-save-bar");
        bar.hidden = true;
        note = element("span", "", "Careful — you have unsaved changes!");
        var reset = element("button", "server-save-reset", "Reset");
        reset.type = "button";
        reset.addEventListener("click", function () {
            select(selectedId);
        });
        saveButton = element("button", "server-save-go", "Save Changes");
        saveButton.type = "button";
        saveButton.addEventListener("click", save);
        bar.appendChild(note);
        bar.appendChild(reset);
        bar.appendChild(saveButton);
        main.appendChild(bar);
    }

    function markDirty() {
        if (!draft || !canEdit()) return;
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

    function permsFromToggles() {
        var bits = 0;
        toggles.forEach(function (box) {
            var bit = BITS[(box.getAttribute("aria-label") || "").trim()];
            if (bit && box.checked) bits |= bit;
        });
        return bits;
    }

    function paintToggles(bits) {
        toggles.forEach(function (box) {
            var bit = BITS[(box.getAttribute("aria-label") || "").trim()];
            box.checked = !!bit && (bits & bit) === bit;
            box.disabled = !canEdit();
        });
    }

    function renderList() {
        if (!list) return;
        list.textContent = "";
        roles.forEach(function (role) {
            var row = element("button", "role-row" + (role.id === selectedId ? " on" : ""));
            row.type = "button";
            row.setAttribute("data-id", role.id);
            var dot = element("span", "role-dot");
            dot.style.background = colorOf(role.color);
            row.appendChild(dot);
            row.appendChild(element("span", "role-label", role.name));
            list.appendChild(row);
        });
    }

    function paintEditor() {
        var role = selected();
        if (!role) return;
        var editable = canEdit();
        if (title) title.textContent = role.name;
        if (nameInput) {
            nameInput.value = draft.name;
            nameInput.readOnly = role.isEveryone || !editable;
        }
        if (colors) {
            [].forEach.call(colors.querySelectorAll("[data-role-color]"), function (swatch) {
                swatch.classList.toggle("on", swatch.getAttribute("data-role-color") === draft.color);
                swatch.disabled = !editable;
            });
            paintCustomSwatch();
        }
        if (separate) {
            separate.checked = !!draft.displaySeparately;
            separate.disabled = !editable;
        }
        if (deleteButton) deleteButton.disabled = role.isEveryone || !editable;
        if (createButton) createButton.hidden = !editable;
        paintToggles(draft.permissions);
        if (addOpen) addOpen.hidden = role.isEveryone || !editable;
    }

    function colorOf(value) {
        if (value && String(value).charAt(0) === "#") return value;
        return COLORS[value] || COLORS.gray;
    }

    function hsvToHex(h, s, v) {
        var c = v * s;
        var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        var m = v - c;
        var r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        function part(n) {
            var hex = Math.round((n + m) * 255).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }
        return part(r) + part(g) + part(b);
    }

    function hexToHsv(hex) {
        var r = parseInt(hex.slice(0, 2), 16) / 255;
        var g = parseInt(hex.slice(2, 4), 16) / 255;
        var b = parseInt(hex.slice(4, 6), 16) / 255;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var d = max - min;
        var h = 0;
        if (d) {
            if (max === r) h = 60 * (((g - b) / d) % 6);
            else if (max === g) h = 60 * ((b - r) / d + 2);
            else h = 60 * ((r - g) / d + 4);
        }
        if (h < 0) h += 360;
        return { h: h, s: max ? d / max : 0, v: max };
    }

    function currentHex() {
        return colorOf(draft ? draft.color : "gray").replace("#", "");
    }

    function paintCustomSwatch() {
        if (!customSwatch || !draft) return;
        var custom = String(draft.color).charAt(0) === "#";
        customSwatch.classList.toggle("on", custom);
        customSwatch.style.background = custom ? draft.color : "";
        customSwatch.disabled = !canEdit();
    }

    function paintPicker(fromInput) {
        if (!picker) return;
        var hex = hsvToHex(pick.h, pick.s, pick.v);
        pickArea.style.backgroundColor = "#" + hsvToHex(pick.h, 1, 1);
        pickHandle.style.left = pick.s * 100 + "%";
        pickHandle.style.top = (1 - pick.v) * 100 + "%";
        pickHueHandle.style.left = pick.h / 360 * 100 + "%";
        if (!fromInput) pickHex.value = hex;
        return hex;
    }

    function applyPick(fromInput) {
        var hex = paintPicker(fromInput);
        if (!draft || !hex) return;
        draft.color = "#" + hex;
        [].forEach.call(colors.querySelectorAll("[data-role-color]"), function (swatch) { swatch.classList.remove("on"); });
        paintCustomSwatch();
        var row = list ? list.querySelector(".role-row.on .role-dot") : null;
        if (row) row.style.background = draft.color;
        markDirty();
    }

    function drag(node, move) {
        function at(event) {
            var rect = node.getBoundingClientRect();
            var x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
            var y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
            move(x, y);
        }
        node.addEventListener("pointerdown", function (event) {
            event.preventDefault();
            node.setPointerCapture(event.pointerId);
            at(event);
            function onMove(e) { at(e); }
            function onUp() {
                node.removeEventListener("pointermove", onMove);
                node.removeEventListener("pointerup", onUp);
            }
            node.addEventListener("pointermove", onMove);
            node.addEventListener("pointerup", onUp);
        });
    }

    function buildPicker() {
        if (!colors || picker) return;
        customSwatch = element("button", "role-color-custom");
        customSwatch.type = "button";
        customSwatch.setAttribute("aria-label", "Custom color");
        customSwatch.appendChild(element("i", "fa-solid fa-eye-dropper"));
        colors.appendChild(customSwatch);
        picker = element("div", "color-picker");
        picker.hidden = true;
        pickArea = element("div", "cp-area");
        pickHandle = element("span", "cp-handle");
        pickArea.appendChild(pickHandle);
        pickHue = element("div", "cp-hue");
        pickHueHandle = element("span", "cp-hue-handle");
        pickHue.appendChild(pickHueHandle);
        var field = element("label", "cp-hex");
        field.appendChild(element("span", "", "#"));
        pickHex = document.createElement("input");
        pickHex.type = "text";
        pickHex.maxLength = 6;
        pickHex.spellcheck = false;
        pickHex.setAttribute("aria-label", "Hex color");
        field.appendChild(pickHex);
        picker.appendChild(pickArea);
        picker.appendChild(pickHue);
        picker.appendChild(field);
        colors.parentNode.insertBefore(picker, colors.nextSibling);
        drag(pickArea, function (x, y) {
            pick.s = x;
            pick.v = 1 - y;
            applyPick(false);
        });
        drag(pickHue, function (x) {
            pick.h = Math.min(359.9, x * 360);
            applyPick(false);
        });
        pickHex.addEventListener("focus", function () {
            pickHex.select();
        });
        pickHex.addEventListener("input", function () {
            var value = pickHex.value.replace(/[^0-9a-fA-F]/g, "");
            if (value !== pickHex.value) pickHex.value = value;
            if (value.length !== 6) return;
            var hsv = hexToHsv(value);
            pick.h = hsv.h;
            pick.s = hsv.s;
            pick.v = hsv.v;
            applyPick(true);
        });
        customSwatch.addEventListener("click", function (event) {
            event.stopPropagation();
            if (!canEdit()) return;
            picker.hidden = !picker.hidden;
            if (!picker.hidden) {
                var hsv = hexToHsv(currentHex());
                pick.h = hsv.h;
                pick.s = hsv.s;
                pick.v = hsv.v;
                paintPicker(false);
            }
        });
        picker.addEventListener("click", function (event) {
            event.stopPropagation();
        });
        document.addEventListener("click", function () {
            picker.hidden = true;
        });
    }

    function select(id) {
        selectedId = id;
        if (picker) picker.hidden = true;
        var role = selected();
        if (!role) return;
        draft = { name: role.name, color: role.color, permissions: role.permissions, displaySeparately: role.displaySeparately };
        clean();
        renderList();
        paintEditor();
        loadRoleMembers();
    }

    function showTab(name) {
        var tabs = editor.querySelectorAll("[data-role-tab]");
        var panels = editor.querySelectorAll("[data-role-panel]");
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i].getAttribute("data-role-tab") === name);
        for (var j = 0; j < panels.length; j++) panels[j].hidden = panels[j].getAttribute("data-role-panel") !== name;
    }

    function loadRoles(keep) {
        return get("/ServerRole/List?serverId=" + encodeURIComponent(serverId)).then(function (data) {
            roles = Array.isArray(data) ? data : [];
            expose();
            var keepId = keep && selected() ? selectedId : 0;
            if (keepId && dirty) {
                renderList();
                return;
            }
            var next = keepId || (roles.length ? roles[0].id : 0);
            if (next) select(next);
            else renderList();
        }).catch(function () {});
    }

    function loadPerms() {
        return get("/Server/Get?id=" + encodeURIComponent(serverId)).then(function (server) {
            perms = Number(server.permissions) || 0;
            allMembers = server.members || [];
            expose();
            applyAccess();
            if (selected()) paintEditor();
            renderAdd();
        }).catch(function () {});
    }

    function applyAccess() {
        if (!settingsNav) return;
        var rules = { profile: 128, boost: 128, roles: 4, audit: 32 };
        Object.keys(rules).forEach(function (key) {
            var button = settingsNav.querySelector("[data-panel='" + key + "']");
            if (button) button.hidden = !can(rules[key]);
        });
        var active = settingsNav.querySelector("[data-panel].on");
        if (active && active.hidden) {
            var fallback = [].slice.call(settingsNav.querySelectorAll("[data-panel]")).filter(function (button) { return !button.hidden; })[0];
            if (fallback) fallback.click();
        }
    }

    function loadRoleMembers() {
        var role = selected();
        if (!role) return;
        var wanted = role.id;
        get("/ServerRole/Members?serverId=" + encodeURIComponent(serverId) + "&roleId=" + wanted).then(function (data) {
            if (selectedId !== wanted) return;
            roleMembers = Array.isArray(data) ? data : [];
            renderMembers();
            renderAdd();
        }).catch(function () {});
    }

    function personRow(member, removable) {
        var row = element("div", "role-person");
        var photo = document.createElement("img");
        photo.alt = "";
        photo.src = member.avatarUrl || DEFAULT_AVATAR;
        row.appendChild(photo);
        var names = element("div", "role-person-names");
        names.appendChild(element("strong", "", member.displayName));
        names.appendChild(element("small", "", member.userName));
        row.appendChild(names);
        if (removable) {
            var remove = element("button", "role-person-remove");
            remove.type = "button";
            remove.setAttribute("aria-label", "Remove from role");
            remove.appendChild(element("i", "fa-solid fa-xmark"));
            remove.addEventListener("click", function () {
                toggle(selectedId, member.id, true).catch(function (error) { say(error.message); });
            });
            row.appendChild(remove);
        }
        return row;
    }

    function renderMembers() {
        if (!memberList) return;
        var role = selected();
        if (countNode) countNode.textContent = roleMembers.length;
        memberList.textContent = "";
        var text = memberSearch ? memberSearch.value.trim().toLowerCase() : "";
        roleMembers.filter(function (member) {
            return !text || member.displayName.toLowerCase().indexOf(text) !== -1 || member.userName.toLowerCase().indexOf(text) !== -1;
        }).forEach(function (member) {
            memberList.appendChild(personRow(member, !!role && !role.isEveryone && canEdit()));
        });
    }

    function renderAdd() {
        if (!addList) return;
        addList.textContent = "";
        var role = selected();
        if (!role || role.isEveryone) return;
        var held = {};
        roleMembers.forEach(function (member) { held[member.id] = true; });
        allMembers.filter(function (member) { return !held[member.id]; }).forEach(function (member) {
            var row = personRow(member, false);
            row.classList.add("is-pickable");
            row.addEventListener("click", function () {
                toggle(selectedId, member.id, false).catch(function (error) { say(error.message); });
            });
            addList.appendChild(row);
        });
    }

    function say(text) {
        if (!note || !bar) return;
        note.textContent = text;
        note.classList.add("is-error");
        bar.hidden = false;
        window.setTimeout(function () {
            if (!dirty && bar) bar.hidden = true;
        }, 3500);
    }

    function save() {
        var role = selected();
        if (!role || !dirty) return;
        if (!draft.name.trim()) {
            say("Enter a role name.");
            return;
        }
        saveButton.disabled = true;
        request("/ServerRole/Update", {
            serverId: Number(serverId),
            roleId: role.id,
            name: draft.name.trim(),
            color: draft.color,
            permissions: draft.permissions,
            displaySeparately: draft.displaySeparately
        }).then(function (updated) {
            for (var i = 0; i < roles.length; i++) if (roles[i].id === updated.id) roles[i] = Object.assign(roles[i], updated);
            clean();
            select(updated.id);
        }).catch(function (error) {
            say(error.message);
        }).then(function () {
            saveButton.disabled = false;
        });
    }

    function nextName() {
        var base = "new role";
        var taken = roles.map(function (role) { return role.name.toLowerCase(); });
        if (taken.indexOf(base) === -1) return base;
        var n = 2;
        while (taken.indexOf(base + " " + n) !== -1) n++;
        return base + " " + n;
    }

    function toggle(roleId, userId, has) {
        return request(has ? "/ServerRole/Unassign" : "/ServerRole/Assign", { serverId: Number(serverId), roleId: roleId, userId: userId }).then(function () {
            loadRoleMembers();
            document.dispatchEvent(new CustomEvent("discode-server-roles-changed", { detail: { serverId: Number(serverId), local: true } }));
        });
    }

    function expose() {
        window.discodeServerRoles = { roles: roles, perms: perms, canManage: canEdit(), toggle: toggle };
        document.dispatchEvent(new CustomEvent("discode-roles-ready"));
    }

    if (nameInput) {
        nameInput.addEventListener("input", function () {
            if (!draft) return;
            draft.name = nameInput.value;
            markDirty();
        });
    }

    if (colors) {
        colors.addEventListener("click", function (event) {
            var swatch = event.target.closest("[data-role-color]");
            if (!swatch || !draft || !canEdit()) return;
            draft.color = swatch.getAttribute("data-role-color");
            [].forEach.call(colors.querySelectorAll("[data-role-color]"), function (item) { item.classList.toggle("on", item === swatch); });
            paintCustomSwatch();
            if (picker) picker.hidden = true;
            var dot = list ? list.querySelector(".role-row.on .role-dot") : null;
            if (dot) dot.style.background = colorOf(draft.color);
            markDirty();
        });
    }

    if (separate) {
        separate.addEventListener("change", function () {
            if (!draft) return;
            draft.displaySeparately = separate.checked;
            markDirty();
        });
    }

    toggles.forEach(function (box) {
        box.addEventListener("change", function () {
            if (!draft) return;
            draft.permissions = permsFromToggles();
            markDirty();
        });
    });

    editor.addEventListener("click", function (event) {
        var clear = event.target.closest(".perm-clear");
        if (clear) {
            if (!draft || !canEdit()) return;
            var group = clear.closest(".perm-group");
            [].forEach.call(group ? group.querySelectorAll("input[type=checkbox]") : [], function (box) { box.checked = false; });
            draft.permissions = permsFromToggles();
            markDirty();
            return;
        }
        var row = event.target.closest(".role-row");
        if (row && list && list.contains(row)) {
            var id = Number(row.getAttribute("data-id"));
            if (id !== selectedId) select(id);
            return;
        }
        var tab = event.target.closest("[data-role-tab]");
        if (tab) showTab(tab.getAttribute("data-role-tab"));
    });

    if (createButton) {
        createButton.addEventListener("click", function () {
            if (!canEdit()) return;
            request("/ServerRole/Create", { serverId: Number(serverId), name: nextName() }).then(function (role) {
                roles.splice(Math.max(0, roles.length - 1), 0, role);
                select(role.id);
                showTab("display");
                if (nameInput) {
                    nameInput.focus();
                    nameInput.select();
                }
            }).catch(function (error) { say(error.message); });
        });
    }

    if (deleteButton) {
        deleteButton.addEventListener("click", function () {
            var role = selected();
            if (!role || role.isEveryone || !canEdit()) return;
            if (moreMenu) moreMenu.hidden = true;
            request("/ServerRole/Delete", { serverId: Number(serverId), roleId: role.id }).then(function () {
                roles = roles.filter(function (item) { return item.id !== role.id; });
                var everyone = roles.filter(function (item) { return item.isEveryone; })[0];
                select(everyone ? everyone.id : (roles[0] && roles[0].id));
            }).catch(function (error) { say(error.message); });
        });
    }

    if (moreButton && moreMenu) {
        moreButton.addEventListener("click", function (event) {
            event.stopPropagation();
            moreMenu.hidden = !moreMenu.hidden;
            moreButton.setAttribute("aria-expanded", moreMenu.hidden ? "false" : "true");
        });
        moreMenu.addEventListener("click", function (event) {
            event.stopPropagation();
        });
        document.addEventListener("click", function () {
            moreMenu.hidden = true;
            moreButton.setAttribute("aria-expanded", "false");
        });
    }

    if (backButton && settingsNav) {
        backButton.addEventListener("click", function () {
            var profile = [].slice.call(settingsNav.querySelectorAll("[data-panel]")).filter(function (button) { return !button.hidden; })[0];
            if (profile) profile.click();
        });
    }

    function toggleAdd() {
        if (addBox) addBox.hidden = !addBox.hidden;
        renderAdd();
    }

    if (addOpen) addOpen.addEventListener("click", toggleAdd);
    if (addLink) addLink.addEventListener("click", function () {
        if (addBox) addBox.hidden = false;
        renderAdd();
    });
    if (memberSearch) memberSearch.addEventListener("input", renderMembers);

    document.addEventListener("discode-server-roles-changed", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        loadPerms().then(function () { return loadRoles(true); });
    });
    document.addEventListener("discode-server-updated", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        loadPerms().then(loadRoleMembers);
    });

    buildBar();
    buildPicker();
    loadPerms().then(function () { return loadRoles(false); });
})();
