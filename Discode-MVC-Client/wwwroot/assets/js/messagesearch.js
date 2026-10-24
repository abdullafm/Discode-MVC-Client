(function () {
    "use strict";

    var MAX_RESULTS = 50;

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function formatWhen(millis) {
        if (!millis) return "";
        var date = new Date(millis);
        return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) + " " + date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function readRows(box) {
        var rows = [];
        var names = {};
        [].forEach.call(box.querySelectorAll(".dm-msg"), function (row) {
            var sender = row.getAttribute("data-sender") || "";
            var head = row.querySelector(".dm-msg-head strong");
            if (head) names[sender] = head.textContent.trim();
            if (row.classList.contains("dm-call-msg")) return;
            var text = row.querySelector(".dm-msg-text");
            if (!text) return;
            rows.push({
                row: row,
                sender: names[sender] || sender,
                time: Number(row.getAttribute("data-time")) || 0,
                text: text.textContent.replace(/\(edited\)\s*$/, "").trim()
            });
        });
        return rows;
    }

    function snippet(text, query) {
        var holder = document.createElement("span");
        var index = text.toLowerCase().indexOf(query.toLowerCase());
        var start = Math.max(0, index - 30);
        var piece = (start > 0 ? "..." : "") + text.slice(start, start + 120) + (text.length > start + 120 ? "..." : "");
        piece.split(new RegExp("(" + escapeRegExp(query) + ")", "ig")).forEach(function (part) {
            if (!part) return;
            if (part.toLowerCase() === query.toLowerCase()) {
                var mark = document.createElement("mark");
                mark.textContent = part;
                holder.appendChild(mark);
            } else {
                holder.appendChild(document.createTextNode(part));
            }
        });
        return holder;
    }

    function attach(input, box) {
        if (input._messageSearch) return;
        input._messageSearch = true;
        var label = input.closest("label") || input.parentNode;
        label.classList.add("msg-search-host");
        var panel = document.createElement("div");
        panel.className = "msg-search-panel";
        panel.hidden = true;
        label.appendChild(panel);
        var timer = null;

        function close() {
            panel.hidden = true;
            panel.textContent = "";
        }

        function jump(row) {
            close();
            row.scrollIntoView({ block: "center", behavior: "smooth" });
            row.classList.remove("is-found");
            void row.offsetWidth;
            row.classList.add("is-found");
            window.setTimeout(function () { row.classList.remove("is-found"); }, 2200);
        }

        function run() {
            var query = input.value.trim();
            panel.textContent = "";
            if (!query) {
                panel.hidden = true;
                return;
            }
            var found = readRows(box).filter(function (item) {
                return item.text.toLowerCase().indexOf(query.toLowerCase()) !== -1;
            }).reverse();
            var head = document.createElement("div");
            head.className = "msg-search-head";
            head.textContent = found.length ? found.length + (found.length === 1 ? " result" : " results") : "No results";
            panel.appendChild(head);
            found.slice(0, MAX_RESULTS).forEach(function (item) {
                var entry = document.createElement("button");
                entry.type = "button";
                entry.className = "msg-search-item";
                var top = document.createElement("div");
                var who = document.createElement("strong");
                who.textContent = item.sender;
                var when = document.createElement("small");
                when.textContent = formatWhen(item.time);
                top.appendChild(who);
                top.appendChild(when);
                entry.appendChild(top);
                entry.appendChild(snippet(item.text, query));
                entry.addEventListener("mousedown", function (event) {
                    event.preventDefault();
                    jump(item.row);
                });
                panel.appendChild(entry);
            });
            panel.hidden = false;
        }

        input.addEventListener("input", function () {
            window.clearTimeout(timer);
            timer = window.setTimeout(run, 200);
        });
        input.addEventListener("focus", function () {
            if (input.value.trim()) run();
        });
        input.addEventListener("blur", function () {
            window.setTimeout(close, 150);
        });
        input.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                input.value = "";
                close();
                input.blur();
            } else if (event.key === "Enter") {
                event.preventDefault();
                var first = panel.querySelector(".msg-search-item");
                if (first) first.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
            }
        });
    }

    function init() {
        var dmInput = document.querySelector("#dm-chat .dm-search input");
        var dmBox = document.getElementById("dm-messages");
        if (dmInput && dmBox) attach(dmInput, dmBox);
        var groupInput = document.getElementById("group-search");
        var groupBox = document.getElementById("group-messages");
        if (groupInput && groupBox) attach(groupInput, groupBox);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
