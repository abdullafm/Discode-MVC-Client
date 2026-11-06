(function () {
    "use strict";

    var serverId = new URLSearchParams(window.location.search).get("id");
    if (!serverId) return;

    var list = document.getElementById("server-ban-list");
    var input = document.getElementById("ban-search-input");
    var searchButton = document.getElementById("ban-search-go");
    var sentinel = document.getElementById("ban-sentinel");
    var emptyBox = document.querySelector(".ban-empty");
    var panel = document.getElementById("server-settings-panel-6");
    var nav = document.querySelector(".server-settings-nav [data-panel='bans']");
    var PAGE = 50;
    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";

    var bans = [];
    var finished = true;
    var loading = false;
    var generation = 0;
    var queued = false;
    var typing = 0;
    var observer = null;

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function notice(text) {
        var note = element("div", "server-menu-notice", text);
        document.body.appendChild(note);
        window.setTimeout(function () {
            if (window.discodeDismiss) window.discodeDismiss(note);
            else if (note.parentNode) note.parentNode.removeChild(note);
        }, 3000);
    }

    function post(url, body) {
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

    function row(ban) {
        var item = element("div", "ban-row");
        var photo = document.createElement("img");
        photo.alt = "";
        photo.src = ban.avatarUrl || DEFAULT_AVATAR;
        item.appendChild(photo);
        var names = element("div", "ban-names");
        names.appendChild(element("strong", "", ban.displayName));
        names.appendChild(element("small", "", ban.userName));
        item.appendChild(names);
        var why = element("div", "ban-why");
        why.appendChild(element("span", "", ban.reason ? ban.reason : "No reason given"));
        why.appendChild(element("small", "", "Banned by " + ban.bannedByUserName + " on " + new Date(ban.createdAt).toLocaleDateString()));
        item.appendChild(why);
        var undo = element("button", "ban-undo", "Unban");
        undo.type = "button";
        undo.addEventListener("click", function () {
            undo.disabled = true;
            post("/Server/Unban", { serverId: Number(serverId), userId: ban.userId }).then(function () {
                bans = bans.filter(function (item) { return item.userId !== ban.userId; });
                render();
                notice(ban.displayName + " was unbanned.");
            }).catch(function (error) {
                undo.disabled = false;
                notice(error.message);
            });
        });
        item.appendChild(undo);
        return item;
    }

    function render() {
        if (!list) return;
        list.textContent = "";
        bans.forEach(function (ban) { list.appendChild(row(ban)); });
        if (emptyBox) {
            var strong = emptyBox.querySelector("strong");
            var text = emptyBox.querySelector("p");
            var searching = input && input.value.trim();
            if (strong) strong.textContent = searching ? "NO MATCHES" : "NO BANS";
            if (text) text.textContent = searching ? "No banned member matches that name or ID." : "You haven't banned anybody... but if and when you must, do not hesitate!";
        }
    }

    function query(before) {
        var parts = ["id=" + encodeURIComponent(serverId), "take=" + PAGE];
        if (input && input.value.trim()) parts.push("search=" + encodeURIComponent(input.value.trim()));
        if (before) parts.push("beforeId=" + before);
        return "/Server/Bans?" + parts.join("&");
    }

    function load(more) {
        if (loading) {
            if (!more) queued = true;
            return;
        }
        loading = true;
        var mine = ++generation;
        var before = more && bans.length ? bans[bans.length - 1].id : 0;
        fetch(query(before), { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("bans");
            return response.json();
        }).then(function (page) {
            if (mine !== generation) return;
            page = Array.isArray(page) ? page : [];
            bans = more ? bans.concat(page) : page;
            finished = page.length < PAGE;
            render();
        }).catch(function () {}).then(function () {
            loading = false;
            if (queued) {
                queued = false;
                load(false);
            } else if (!finished && sentinel && observer) {
                observer.unobserve(sentinel);
                observer.observe(sentinel);
            }
        });
    }

    function open() {
        load(false);
    }

    function leave(reason) {
        var text = reason === "banned" ? "You were banned from this server." : reason === "kicked" ? "You were removed from this server." : "This server was deleted.";
        notice(text);
        window.setTimeout(function () {
            if (window.discodeGo) window.discodeGo("/Home/Index");
            else window.location.href = "/Home/Index";
        }, 900);
    }

    if (list) {
        if (nav) nav.addEventListener("click", open);
        if (searchButton) searchButton.addEventListener("click", function () { load(false); });
        if (input) {
            input.addEventListener("input", function () {
                window.clearTimeout(typing);
                typing = window.setTimeout(function () { load(false); }, 300);
            });
            input.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    window.clearTimeout(typing);
                    load(false);
                }
            });
        }
        if (sentinel && "IntersectionObserver" in window) {
            observer = new IntersectionObserver(function (entries) {
                if (entries.some(function (entry) { return entry.isIntersecting; }) && !finished && !loading) load(true);
            });
            observer.observe(sentinel);
        }
        document.addEventListener("discode-server-bans-changed", function (event) {
            var detail = event && event.detail;
            if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
            if (panel && !panel.hidden) load(false);
        });
    }

    document.addEventListener("discode-server-removed", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        leave(detail && detail.reason);
    });
})();
