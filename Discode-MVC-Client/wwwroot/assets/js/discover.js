"use strict";
(function () {
    if (window.discodeDiscover) {
        window.discodeDiscover.init();
        return;
    }

    var COLORS = {
        ink: "#111214",
        pink: "#eb459e",
        red: "#ed4245",
        orange: "#f26522",
        yellow: "#fee75c",
        purple: "#9b59d0",
        blue: "#3b82f6",
        cyan: "#1abc9c",
        green: "#23a559",
        gray: "#4e5058"
    };

    var servers = {};
    var query = "";
    var searchTimer = null;
    var watching = false;

    function grid() {
        return document.getElementById("discover-grid");
    }

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function count(value) {
        return Number(value || 0).toLocaleString();
    }

    function matches(server) {
        if (!query) return true;
        var term = query.toLowerCase();
        return String(server.name || "").toLowerCase().indexOf(term) !== -1 ||
            String(server.description || "").toLowerCase().indexOf(term) !== -1;
    }

    function paintCover(cover, server) {
        cover.style.backgroundImage = "";
        cover.style.backgroundColor = COLORS[server.bannerColor] || COLORS.ink;
        if (server.bannerUrl) {
            cover.style.backgroundImage = "url(\"" + String(server.bannerUrl).replace(/"/g, "%22") + "\")";
        }
    }

    function paintIcon(icon, server) {
        icon.textContent = "";
        if (server.iconUrl) {
            var image = document.createElement("img");
            image.alt = "";
            image.src = server.iconUrl;
            icon.appendChild(image);
        } else {
            icon.appendChild(element("span", "", String(server.name || "?").trim().charAt(0).toUpperCase()));
        }
    }

    function build(server) {
        var card = element("a", "discover-card");
        card.setAttribute("data-server", String(server.id));
        var cover = element("div", "discover-cover");
        var icon = element("div", "discover-icon");
        var body = element("div", "discover-card-body");
        body.appendChild(element("h3", "discover-name"));
        body.appendChild(element("p", "discover-description"));
        var stats = element("div", "discover-stats");
        var online = element("span", "discover-online");
        online.appendChild(element("i", "fa-solid fa-circle"));
        online.appendChild(element("b"));
        online.appendChild(document.createTextNode(" Online"));
        var members = element("span", "discover-members");
        members.appendChild(element("i", "fa-solid fa-circle"));
        members.appendChild(element("b"));
        members.appendChild(document.createTextNode(" Members"));
        stats.appendChild(online);
        stats.appendChild(members);
        body.appendChild(stats);
        card.appendChild(cover);
        card.appendChild(icon);
        card.appendChild(body);
        return card;
    }

    function fill(card, server) {
        card.href = "/" + encodeURIComponent(server.inviteCode);
        paintCover(card.querySelector(".discover-cover"), server);
        paintIcon(card.querySelector(".discover-icon"), server);
        card.querySelector(".discover-name").textContent = server.name;
        var description = card.querySelector(".discover-description");
        description.textContent = server.description || "";
        description.hidden = !server.description;
        card.querySelector(".discover-online b").textContent = count(server.onlineCount);
        card.querySelector(".discover-members b").textContent = count(server.memberCount);
    }

    function render() {
        var box = grid();
        if (!box) return;
        var visible = Object.keys(servers).map(function (id) { return servers[id]; }).filter(matches);
        visible.sort(function (a, b) {
            return (b.memberCount - a.memberCount) || String(a.name).localeCompare(String(b.name));
        });

        var existing = {};
        [].forEach.call(box.querySelectorAll("[data-server]"), function (card) {
            existing[card.getAttribute("data-server")] = card;
        });

        var wanted = {};
        visible.forEach(function (server) { wanted[String(server.id)] = true; });
        Object.keys(existing).forEach(function (id) {
            if (!wanted[id]) existing[id].remove();
        });

        visible.forEach(function (server, index) {
            var card = existing[String(server.id)];
            if (!card) card = build(server);
            fill(card, server);
            if (box.children[index] !== card) box.insertBefore(card, box.children[index] || null);
        });

        var empty = document.getElementById("discover-empty");
        if (empty) {
            empty.hidden = visible.length > 0;
            empty.textContent = query ? "No communities match your search." : "No communities yet.";
        }
    }

    function load() {
        var url = "/Discover/List" + (query ? "?search=" + encodeURIComponent(query) : "");
        fetch(url, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (list) {
            if (!Array.isArray(list)) return;
            servers = {};
            list.forEach(function (server) { servers[server.id] = server; });
            render();
        }).catch(function () {});
    }

    function watch() {
        if (watching || !window.discodePresence) return;
        window.discodePresence.invoke("WatchDiscover").then(function () {
            watching = true;
        }).catch(function () {});
    }

    function unwatch() {
        if (!watching || !window.discodePresence) return;
        watching = false;
        window.discodePresence.invoke("UnwatchDiscover").catch(function () {});
    }

    function active() {
        if (grid()) return true;
        unwatch();
        return false;
    }

    document.addEventListener("discode-discover-server", function (event) {
        if (!active()) return;
        var server = event.detail;
        if (!server || server.id == null) return;
        servers[server.id] = server;
        render();
    });

    document.addEventListener("discode-discover-removed", function (event) {
        if (!active()) return;
        var data = event.detail;
        if (!data || data.serverId == null) return;
        delete servers[data.serverId];
        render();
    });

    document.addEventListener("discode-hub-connected", function () {
        if (!grid()) return;
        watching = false;
        watch();
        load();
    });

    function init() {
        var cats = document.querySelectorAll(".discover-cat");
        for (var i = 0; i < cats.length; i++) {
            cats[i].addEventListener("click", function () {
                var cat = this.getAttribute("data-cat");
                for (var n = 0; n < cats.length; n++) {
                    cats[n].classList.toggle("on", cats[n].getAttribute("data-cat") === cat);
                }
            });
        }

        query = "";
        servers = {};
        var input = document.getElementById("discover-search-input");
        if (input) {
            input.addEventListener("input", function () {
                window.clearTimeout(searchTimer);
                searchTimer = window.setTimeout(function () {
                    query = input.value.trim();
                    load();
                }, 250);
            });
        }

        if (grid()) {
            load();
            watch();
        }
    }

    window.discodeDiscover = { init: init };
    init();
})();
