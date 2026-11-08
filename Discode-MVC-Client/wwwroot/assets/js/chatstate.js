(function () {
    "use strict";
    if (window.discodeChat) return;

    // What the open chat knows about itself: "X is typing..." and the "NEW" line where my unread messages start.
    // A chat (direct, group or server channel) tells it that it was opened with open(kind, key, box).

    var ctx = null;            // { kind, key, box, lastRead, observer }
    var typers = {};
    var bar = null;
    var settleTimer = 0;
    var markTimer = 0;
    var lastSent = 0;
    var TYPING_EVERY_MS = 3000;
    var TYPING_FOR_MS = 6500;

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    // ---------- where I stopped reading
    function loadMarker(mine) {
        return fetch("/Chat/ReadMarker?kind=" + encodeURIComponent(mine.kind) + "&key=" + encodeURIComponent(mine.key), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (data) {
            if (ctx !== mine) return;
            mine.lastRead = data && data.readAt ? Date.parse(data.readAt) : 0;
            mine.loaded = true;
            settle();
        }).catch(function () {
            if (ctx === mine) {
                mine.loaded = true;
                settle();
            }
        });
    }

    function place(first) {
        if (!ctx || !ctx.loaded) return;
        var old = ctx.box.querySelector(".dm-new-line");
        if (old) old.remove();
        if (!ctx.lastRead) return;
        var rows = ctx.box.querySelectorAll(".dm-msg");
        var target = null;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (row.getAttribute("data-mine") === "1") continue;
            if (Number(row.getAttribute("data-time")) > ctx.lastRead) {
                target = row;
                break;
            }
        }
        if (!target) return;
        var line = document.createElement("div");
        line.className = "dm-new-line";
        line.setAttribute("role", "separator");
        var label = document.createElement("span");
        label.textContent = "NEW";
        line.appendChild(label);
        target.parentNode.insertBefore(line, target);
        if (first && !ctx.scrolled) {
            ctx.scrolled = true;
            line.scrollIntoView({ block: "center" });
        }
    }

    function canMark() {
        return document.visibilityState === "visible" && document.hasFocus();
    }

    function mark() {
        if (!ctx || !ctx.loaded || !canMark()) return;
        var mine = ctx;
        fetch("/Chat/MarkRead", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify({ kind: mine.kind, key: mine.key })
        }).catch(function () {});
    }

    function markSoon() {
        window.clearTimeout(markTimer);
        markTimer = window.setTimeout(mark, 700);
    }

    function settle() {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(function () {
            if (!ctx) return;
            var first = !ctx.placed && ctx.box.querySelector(".dm-msg") !== null;
            place(first);
            if (first) ctx.placed = true;
            markSoon();
        }, 350);
    }

    function watchRows(mine) {
        mine.observer = new MutationObserver(function (changes) {
            var anything = false;
            changes.forEach(function (change) {
                [].forEach.call(change.addedNodes, function (node) {
                    if (node.nodeType !== 1) return;
                    var row = node.classList && node.classList.contains("dm-msg") ? node : (node.querySelector ? node.querySelector(".dm-msg") : null);
                    if (!row) return;
                    anything = true;
                    // somebody who wrote a message is not typing any more
                    var sender = row.getAttribute("data-sender");
                    if (sender && typers[sender.toLowerCase()]) {
                        delete typers[sender.toLowerCase()];
                        paintTyping();
                    }
                });
            });
            if (anything && ctx === mine) settle();
        });
        mine.observer.observe(mine.box, { childList: true, subtree: true });
    }

    // ---------- who is typing
    function composeOf() {
        return document.getElementById("dm-compose") || document.getElementById("group-compose");
    }

    function ensureBar() {
        var compose = composeOf();
        if (!compose || !compose.parentNode) return null;
        if (bar && bar.isConnected && bar.nextElementSibling === compose) return bar;
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        bar = document.createElement("div");
        bar.className = "typing-bar";
        bar.setAttribute("aria-live", "polite");
        compose.parentNode.insertBefore(bar, compose);
        return bar;
    }

    function paintTyping() {
        var holder = ensureBar();
        if (!holder) return;
        var names = Object.keys(typers).map(function (key) { return typers[key].name; });
        holder.textContent = "";
        holder.classList.toggle("is-on", names.length > 0);
        if (!names.length) return;
        var dots = document.createElement("span");
        dots.className = "typing-dots";
        dots.innerHTML = "<i></i><i></i><i></i>";
        var text = document.createElement("span");
        var line;
        if (names.length === 1) line = [names[0], " is typing..."];
        else if (names.length === 2) line = [names[0] + " and " + names[1], " are typing..."];
        else if (names.length === 3) line = [names[0] + ", " + names[1] + " and " + names[2], " are typing..."];
        else line = ["Several people", " are typing..."];
        var strong = document.createElement("strong");
        strong.textContent = line[0];
        text.appendChild(strong);
        text.appendChild(document.createTextNode(line[1]));
        holder.appendChild(dots);
        holder.appendChild(text);
    }

    function prune() {
        var now = Date.now();
        var changed = false;
        Object.keys(typers).forEach(function (key) {
            if (typers[key].until <= now) {
                delete typers[key];
                changed = true;
            }
        });
        if (changed) paintTyping();
    }

    window.setInterval(prune, 1000);

    document.addEventListener("discode-typing", function (event) {
        var data = event.detail || {};
        if (!ctx || data.kind !== ctx.kind || String(data.key).toLowerCase() !== ctx.key.toLowerCase()) return;
        var userName = String(data.userName || "").toLowerCase();
        if (!userName || (window.discodeIgnored && window.discodeIgnored[userName])) return;
        typers[userName] = { name: data.displayName || data.userName, until: Date.now() + TYPING_FOR_MS };
        paintTyping();
    });

    // my own typing: told to the others at most every few seconds, and only while there is something in the box
    document.addEventListener("input", function (event) {
        if (!ctx || !event.target.closest || !event.target.closest("#dm-input, #group-input")) return;
        var box = event.target.closest("#dm-input, #group-input");
        if (!(box.textContent || "").trim()) return;
        var now = Date.now();
        if (now - lastSent < TYPING_EVERY_MS) return;
        lastSent = now;
        if (window.discodePresence && window.discodePresence.invoke) {
            window.discodePresence.invoke("Typing", ctx.kind, ctx.key).catch(function () {});
        }
    });

    window.addEventListener("focus", markSoon);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) markSoon(); });

    function close() {
        if (ctx && ctx.observer) ctx.observer.disconnect();
        ctx = null;
        typers = {};
        lastSent = 0;
        window.clearTimeout(settleTimer);
        window.clearTimeout(markTimer);
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        bar = null;
    }

    function open(kind, key, box) {
        close();
        if (!box || !key) return;
        ctx = { kind: kind, key: String(key).toLowerCase(), box: box, lastRead: 0, loaded: false, placed: false, scrolled: false, observer: null };
        watchRows(ctx);
        loadMarker(ctx);
        paintTyping();
    }

    window.discodeChat = { open: open, close: close };
})();
