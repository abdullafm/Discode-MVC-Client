(function () {
    "use strict";

    // The "Server Boosts" page of the settings: my boosts, the servers I am in, and moving a boost after a day.
    var root = document.getElementById("mb-root");
    if (!root) return;

    var data = null;
    var openMenu = 0;
    var timer = 0;

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function el(tag, cls, text) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    }

    function gem(cls) {
        var i = el("i", "fa-solid fa-gem " + (cls || ""));
        i.setAttribute("aria-hidden", "true");
        return i;
    }

    // "5h 12m", "42m"
    function left(when) {
        var ms = new Date(when).getTime() - Date.now();
        if (ms <= 0) return "now";
        var minutes = Math.ceil(ms / 60000);
        var h = Math.floor(minutes / 60);
        return h > 0 ? h + "h " + (minutes % 60) + "m" : minutes + "m";
    }

    function api(url, method, body) {
        return fetch(url, {
            method: method || "GET",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: body ? JSON.stringify(body) : undefined
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (payload) {
                if (!response.ok) throw new Error((payload && payload.errors && payload.errors[0]) || "That did not work.");
                return payload;
            });
        });
    }

    function goNitro() {
        if (window.discodeGo) window.discodeGo("/Nitro/Index");
        else window.location.href = "/Nitro/Index";
    }

    function say(message, bad) {
        var note = root.querySelector(".mb-flash");
        if (!note) return;
        note.textContent = message || "";
        note.classList.toggle("is-error", !!bad);
        note.hidden = !message;
    }

    function run(promise) {
        return promise.then(function (result) {
            return load().then(function () { return result; });
        }).catch(function (error) {
            say(error.message, true);
        });
    }

    function face(server) {
        var holder = el("span", "mb-face");
        if (server.iconUrl) {
            var img = el("img");
            img.alt = "";
            img.src = server.iconUrl;
            holder.appendChild(img);
        } else {
            holder.textContent = (server.name || "?").trim().charAt(0).toUpperCase();
        }
        return holder;
    }

    // my boosts on the other servers, one entry per server (two boosts on the same server are one entry that moves one of them)
    function mineElsewhere(serverId) {
        var byServer = {};
        data.boosts.forEach(function (boost) {
            if (boost.serverId === serverId) return;
            var group = byServer[boost.serverId];
            if (!group) {
                group = byServer[boost.serverId] = { serverId: boost.serverId, serverName: boost.serverName, count: 0, canMove: false, movableAt: boost.movableAt };
            }
            group.count += 1;
            if (boost.canMove) group.canMove = true;
            if (new Date(boost.movableAt) < new Date(group.movableAt)) group.movableAt = boost.movableAt;
        });
        return Object.keys(byServer).map(function (key) { return byServer[key]; });
    }

    function actionFor(server) {
        var box = el("div", "mb-actions");
        var mine = server.myBoosts;

        if (!data.hasNitro) {
            var get = el("button", "mb-btn", "Boost this server");
            get.type = "button";
            get.prepend(gem());
            get.addEventListener("click", goNitro);
            box.appendChild(get);
            return box;
        }

        if (data.free > 0) {
            var boost = el("button", "mb-btn", "Boost this server");
            boost.type = "button";
            boost.prepend(gem());
            boost.addEventListener("click", function () {
                boost.disabled = true;
                run(api("/Server/Boost", "POST", { id: server.serverId }));
            });
            box.appendChild(boost);
        } else {
            var others = mineElsewhere(server.serverId);
            if (others.length > 0) {
                var move = el("button", "mb-btn is-soft", "Move a boost here");
                move.type = "button";
                move.prepend(gem());
                move.addEventListener("click", function (event) {
                    event.stopPropagation();
                    openMenu = openMenu === server.serverId ? 0 : server.serverId;
                    paint();
                });
                box.appendChild(move);
                if (openMenu === server.serverId) {
                    var menu = el("div", "mb-menu");
                    others.forEach(function (from) {
                        var row = el("button", "mb-menu-item");
                        row.type = "button";
                        var title = el("span", "mb-menu-name", "From " + from.serverName + (from.count > 1 ? " (" + from.count + " boosts)" : ""));
                        var note = el("span", "mb-menu-note", from.canMove ? "Move now" : "Can move in " + left(from.movableAt));
                        row.appendChild(title);
                        row.appendChild(note);
                        row.disabled = !from.canMove;
                        row.addEventListener("click", function () {
                            openMenu = 0;
                            run(api("/Server/MoveBoost", "POST", { fromServerId: from.serverId, toServerId: server.serverId }));
                        });
                        menu.appendChild(row);
                    });
                    box.appendChild(menu);
                }
            } else if (data.cooldowns.length > 0) {
                box.appendChild(el("span", "mb-wait", "A boost is free in " + left(data.cooldowns[0])));
            }
        }

        if (mine > 0) {
            var remove = el("button", "mb-link", "Remove my boost");
            remove.type = "button";
            remove.addEventListener("click", function () {
                if (!window.confirm("Take your boost off this server? It can be used again after " + data.cooldownHours + " hours.")) return;
                run(api("/Server/Unboost", "POST", { id: server.serverId }));
            });
            box.appendChild(remove);
        }
        return box;
    }

    function paint() {
        root.textContent = "";
        root.appendChild(el("h2", "", "Server Boosts"));

        var intro = el("p", "mb-intro");
        intro.textContent = "Boosting a server opens perks for everybody in it. You can take a boost off a server or move it to another one after " + (data ? data.cooldownHours : 24) + " hours.";
        root.appendChild(intro);

        var flash = el("p", "mb-flash");
        flash.hidden = true;
        flash.setAttribute("role", "status");
        root.appendChild(flash);

        if (!data) {
            root.appendChild(el("p", "settings-note", "Loading..."));
            return;
        }

        // the Nitro card: how many boosts there are and what is going on with them
        var card = el("div", "mb-card" + (data.hasNitro ? " has-nitro" : ""));
        var mark = el("span", "mb-card-gem");
        mark.appendChild(gem());
        var text = el("div", "mb-card-text");
        if (data.hasNitro) {
            text.appendChild(el("strong", "", data.free + " of " + data.slots + " boosts available"));
            var slots = el("div", "mb-slots");
            for (var i = 0; i < data.slots; i++) {
                var slot = el("span", "mb-slot");
                if (i < data.used) { slot.classList.add("is-used"); slot.title = "In use"; }
                else if (i - data.used < data.cooldowns.length) { slot.classList.add("is-wait"); slot.title = "Free in " + left(data.cooldowns[i - data.used]); }
                slot.appendChild(gem());
                slots.appendChild(slot);
            }
            text.appendChild(slots);
            if (data.cooldowns.length > 0) text.appendChild(el("small", "", "A boost you took off is free again in " + left(data.cooldowns[0]) + "."));
        } else {
            text.appendChild(el("strong", "", "Get " + 2 + " boosts with Nitro!"));
            text.appendChild(el("small", "", "Nitro members get 2 server boosts to give to the servers they love."));
            var buy = el("button", "mb-btn is-light", "Get Nitro");
            buy.type = "button";
            buy.addEventListener("click", goNitro);
            card.appendChild(mark);
            card.appendChild(text);
            card.appendChild(buy);
            root.appendChild(card);
            appendRest();
            return;
        }
        card.appendChild(mark);
        card.appendChild(text);
        root.appendChild(card);
        appendRest();
    }

    function appendRest() {
        root.appendChild(el("h3", "mb-title", "Boosting helps the servers you love"));
        var list = el("div", "mb-list");
        data.servers.forEach(function (server) {
            var row = el("div", "mb-row");
            row.appendChild(face(server));
            var info = el("div", "mb-info");
            info.appendChild(el("strong", "", server.name));
            var sub = el("span", "mb-sub");
            sub.appendChild(gem(server.boosts > 0 ? "is-on" : ""));
            sub.appendChild(document.createTextNode(server.boosts === 0 ? " No boosts" : " " + server.boosts + (server.boosts === 1 ? " Boost" : " Boosts")));
            if (server.perksUnlocked) {
                var perks = el("span", "mb-chip", "Perks unlocked");
                sub.appendChild(perks);
            } else if (server.boosts > 0) {
                sub.appendChild(el("span", "mb-more", " • " + (data.required - server.boosts) + " more for perks"));
            }
            if (server.myBoosts > 0) sub.appendChild(el("span", "mb-mine", " • You boosted this server" + (server.myBoosts > 1 ? " x" + server.myBoosts : "")));
            info.appendChild(sub);
            row.appendChild(info);
            row.appendChild(actionFor(server));
            list.appendChild(row);
        });
        if (!data.servers.length) list.appendChild(el("p", "settings-note", "You are not in a server yet."));
        root.appendChild(list);

        var table = el("div", "mb-perks");
        table.appendChild(el("h3", "mb-title", "Perks"));
        [["Server banner", "A picture at the top of the channel list"], ["Animated server icon", "A GIF as the icon"], ["Custom invite link", "Your own short link like /my-server"]].forEach(function (perk) {
            var line = el("div", "mb-perk");
            var name = el("div", "mb-perk-name");
            name.appendChild(el("strong", "", perk[0]));
            name.appendChild(el("small", "", perk[1]));
            line.appendChild(name);
            line.appendChild(el("span", "mb-perk-need", data.required + " Boosts"));
            table.appendChild(line);
        });
        root.appendChild(table);
    }

    function load() {
        return api("/Server/MyBoosts").then(function (payload) {
            data = payload;
            paint();
        }).catch(function (error) {
            paint();
            say(error.message, true);
        });
    }

    function visible() {
        var section = document.getElementById("settings-boosts");
        return !!section && !section.hidden;
    }

    document.addEventListener("click", function (event) {
        var tab = event.target.closest && event.target.closest("[data-settings-tab='boosts']");
        if (tab) {
            window.setTimeout(load, 30);
            return;
        }
        if (openMenu && !event.target.closest(".mb-menu, .mb-actions")) {
            openMenu = 0;
            if (data) paint();
        }
    });

    // somebody boosted, or Nitro changed: the open page follows
    ["discode-server-boost-changed", "discode-nitro-state"].forEach(function (name) {
        document.addEventListener(name, function () { if (visible()) load(); });
    });

    // the "free in 5h" labels move on while the page is open
    timer = window.setInterval(function () { if (visible() && data && !openMenu) paint(); }, 60000);
})();
