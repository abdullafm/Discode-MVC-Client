(function () {
    "use strict";

    var BITS = { view: 1, send: 256, manage: 512, connect: 2048, speak: 4096 };
    var LABELS = {
        view: ["View Channel", "Allows members to see this channel."],
        send: ["Send Messages", "Allows members to send messages."],
        manage: ["Manage Messages", "Allows members to delete messages by other members."],
        connect: ["Connect", "Allows members to join the voice channel."],
        speak: ["Speak", "Allows members to talk in the voice channel."]
    };
    var ROWS = {
        text: ["view", "send", "manage"],
        voice: ["view", "connect", "speak"],
        category: ["view", "send", "manage", "connect", "speak"]
    };

    function node(tag, className, text) {
        var element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function api() {
        return window.discodeServerChannels;
    }

    function create(host, mode) {
        var rows = ROWS[mode] || ROWS.text;
        var items = [];
        var selected = 0;
        var synced = false;
        var canSync = false;
        var loaded = false;
        var categoryId = null;
        var snapshot = null;
        var ticket = 0;
        var timer = 0;

        host.innerHTML = "";
        host.classList.add("ow-editor");

        var syncRow = node("label", "ow-sync");
        var syncCopy = node("span", "ow-sync-copy");
        syncCopy.appendChild(node("strong", "", "Sync permissions with category"));
        syncCopy.appendChild(node("small", "", "Use the permissions of the category this channel is in."));
        var syncSwitch = node("span", "perm-switch");
        var syncInput = document.createElement("input");
        syncInput.type = "checkbox";
        syncInput.setAttribute("role", "switch");
        syncInput.setAttribute("aria-label", "Sync permissions with category");
        syncSwitch.appendChild(syncInput);
        syncRow.appendChild(syncCopy);
        syncRow.appendChild(syncSwitch);
        syncRow.hidden = true;

        var body = node("div", "ow-body");
        var side = node("div", "ow-side");
        var picker = node("div", "ow-picker");
        var search = document.createElement("input");
        search.type = "text";
        search.placeholder = "Add roles or members";
        search.maxLength = 40;
        search.autocomplete = "off";
        var results = node("div", "ow-results");
        results.hidden = true;
        picker.appendChild(search);
        picker.appendChild(results);
        var targets = node("div", "ow-targets");
        side.appendChild(picker);
        side.appendChild(targets);
        var main = node("div", "ow-main");
        var title = node("h4", "ow-title");
        var list = node("div", "ow-rows");
        main.appendChild(title);
        main.appendChild(list);
        body.appendChild(side);
        body.appendChild(main);
        host.appendChild(syncRow);
        host.appendChild(body);

        function stateOf(item, key) {
            if ((item.allow & BITS[key]) !== 0) return "allow";
            if ((item.deny & BITS[key]) !== 0) return "deny";
            return "neutral";
        }

        function setState(item, key, state) {
            item.allow = item.allow & ~BITS[key];
            item.deny = item.deny & ~BITS[key];
            if (state === "allow") item.allow = item.allow | BITS[key];
            if (state === "deny") item.deny = item.deny | BITS[key];
        }

        function paintTargets() {
            targets.innerHTML = "";
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var row = node("div", "ow-target" + (i === selected ? " on" : ""));
                row.setAttribute("data-index", i);
                var label = node("span", "ow-target-name", (item.type === "role" && !item.isEveryone ? "@" : "") + item.name);
                row.appendChild(label);
                if (!item.isEveryone && !synced) {
                    var remove = node("button", "ow-target-remove");
                    remove.type = "button";
                    remove.setAttribute("data-remove", i);
                    remove.setAttribute("aria-label", "Remove");
                    remove.innerHTML = "<i class=\"fa-solid fa-xmark\"></i>";
                    row.appendChild(remove);
                }
                targets.appendChild(row);
            }
        }

        function paintRows() {
            list.innerHTML = "";
            var item = items[selected];
            if (!item) {
                title.textContent = "";
                return;
            }
            title.textContent = (item.type === "role" && !item.isEveryone ? "@" : "") + item.name;
            for (var r = 0; r < rows.length; r++) {
                var key = rows[r];
                var line = node("div", "ow-row");
                var copy = node("span", "ow-row-copy");
                copy.appendChild(node("strong", "", LABELS[key][0]));
                copy.appendChild(node("small", "", LABELS[key][1]));
                var tri = node("span", "ow-tri");
                var current = stateOf(item, key);
                var kinds = [["deny", "fa-xmark"], ["neutral", "fa-minus"], ["allow", "fa-check"]];
                for (var k = 0; k < kinds.length; k++) {
                    var button = node("button", "ow-tri-" + kinds[k][0] + (current === kinds[k][0] ? " on" : ""));
                    button.type = "button";
                    button.disabled = synced;
                    button.setAttribute("data-key", key);
                    button.setAttribute("data-state", kinds[k][0]);
                    button.setAttribute("aria-label", kinds[k][0] + " " + LABELS[key][0]);
                    button.innerHTML = "<i class=\"fa-solid " + kinds[k][1] + "\"></i>";
                    tri.appendChild(button);
                }
                line.appendChild(copy);
                line.appendChild(tri);
                list.appendChild(line);
            }
        }

        function paint() {
            host.classList.toggle("is-synced", synced);
            syncRow.hidden = !canSync;
            syncInput.checked = synced;
            search.disabled = synced;
            paintTargets();
            paintRows();
        }

        function fill(data) {
            items = [];
            var overwrites = data.overwrites || [];
            for (var i = 0; i < overwrites.length; i++) {
                var entry = overwrites[i];
                items.push({
                    type: entry.targetType,
                    id: entry.targetId,
                    name: entry.name,
                    isEveryone: !!entry.isEveryone,
                    allow: Number(entry.allow) || 0,
                    deny: Number(entry.deny) || 0
                });
            }
            selected = 0;
        }

        targets.addEventListener("click", function (event) {
            var remove = event.target.closest("[data-remove]");
            if (remove) {
                var at = Number(remove.getAttribute("data-remove"));
                items.splice(at, 1);
                if (selected >= items.length) selected = items.length - 1;
                if (selected > at) selected -= 1;
                paint();
                return;
            }
            var row = event.target.closest(".ow-target");
            if (!row) return;
            selected = Number(row.getAttribute("data-index"));
            paint();
        });

        list.addEventListener("click", function (event) {
            var button = event.target.closest("button[data-key]");
            if (!button || synced || !items[selected]) return;
            setState(items[selected], button.getAttribute("data-key"), button.getAttribute("data-state"));
            paintRows();
        });

        function option(type, entry) {
            var button = node("button", "ow-option");
            button.type = "button";
            button.setAttribute("data-type", type);
            var name = type === "role" ? entry.name : (entry.displayName || entry.userName);
            button.appendChild(node("strong", "", (type === "role" ? "@" : "") + name));
            button.appendChild(node("small", "", type === "role" ? "Role" : "@" + entry.userName));
            button.entry = { type: type, id: String(entry.id), name: name, isEveryone: false, allow: 0, deny: 0 };
            return button;
        }

        function paintResults(data) {
            results.innerHTML = "";
            var taken = {};
            for (var i = 0; i < items.length; i++) taken[items[i].type + items[i].id] = true;
            var count = 0;
            var roles = data.roles || [];
            for (var r = 0; r < roles.length; r++) {
                if (taken["role" + roles[r].id]) continue;
                results.appendChild(option("role", roles[r]));
                count++;
            }
            var members = data.members || [];
            for (var m = 0; m < members.length; m++) {
                if (taken["member" + members[m].id]) continue;
                results.appendChild(option("member", members[m]));
                count++;
            }
            if (!count) results.appendChild(node("small", "ow-none", "No matches."));
            results.hidden = false;
        }

        function find() {
            if (synced || !api()) return;
            api().searchTargets(search.value.trim()).then(paintResults).catch(function () {});
        }

        search.addEventListener("focus", find);
        search.addEventListener("input", function () {
            clearTimeout(timer);
            timer = setTimeout(find, 200);
        });
        search.addEventListener("blur", function () {
            setTimeout(function () { results.hidden = true; }, 150);
        });
        results.addEventListener("mousedown", function (event) {
            event.preventDefault();
        });
        results.addEventListener("click", function (event) {
            var chosen = event.target.closest(".ow-option");
            if (!chosen) return;
            items.push(chosen.entry);
            selected = items.length - 1;
            chosen.remove();
            if (!results.querySelector(".ow-option")) results.hidden = true;
            paint();
        });

        syncInput.addEventListener("change", function () {
            if (!canSync) return;
            if (syncInput.checked) {
                synced = true;
                if (snapshot) {
                    fill(snapshot);
                    paint();
                } else if (categoryId && api()) {
                    api().getCategoryPermissions(categoryId).then(function (data) {
                        snapshot = data;
                        if (synced) {
                            fill(data);
                            paint();
                        }
                    }).catch(function () {});
                }
                paint();
            } else {
                synced = false;
                paint();
            }
        });

        return {
            mode: mode,
            load: function (request, parentCategoryId) {
                var mine = ++ticket;
                loaded = false;
                categoryId = parentCategoryId || null;
                snapshot = null;
                items = [];
                synced = false;
                canSync = false;
                paint();
                request.then(function (data) {
                    if (mine !== ticket) return;
                    loaded = true;
                    canSync = !!data.canSync;
                    synced = canSync && !!data.synced;
                    if (synced) snapshot = data;
                    fill(data);
                    paint();
                }).catch(function (error) {
                    if (window.discodeServerFlash) window.discodeServerFlash(error.message);
                });
            },
            reset: function () {
                ticket++;
                loaded = false;
                items = [];
                targets.innerHTML = "";
                list.innerHTML = "";
                title.textContent = "";
                results.hidden = true;
                search.value = "";
            },
            collect: function () {
                if (!loaded) return { sync: null, overwrites: null };
                if (synced) return { sync: true, overwrites: null };
                var out = [];
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (!item.allow && !item.deny) continue;
                    out.push({
                        roleId: item.type === "role" ? Number(item.id) : null,
                        userId: item.type === "member" ? item.id : null,
                        allow: item.allow,
                        deny: item.deny
                    });
                }
                return { sync: canSync ? false : null, overwrites: out };
            }
        };
    }

    window.discodeOverwrites = { create: create };
})();
