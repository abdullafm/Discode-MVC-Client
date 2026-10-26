(function () {
    "use strict";

    var boxes = [document.getElementById("dm-messages"), document.getElementById("group-messages")].filter(Boolean);
    if (!boxes.length) return;

    var MAX_CARDS = 3;
    var pattern = new RegExp(window.location.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/([A-Za-z0-9]{7})(?![A-Za-z0-9])", "g");

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function initials(name) {
        var words = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (!words.length) return "?";
        if (words.length === 1) return words[0].slice(0, 2);
        return words[0].charAt(0) + words[1].charAt(0);
    }

    function established(value) {
        var date = new Date(value);
        return "Est. " + date.toLocaleDateString([], { month: "short", year: "numeric" });
    }

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function stat(kind, count, label) {
        var holder = element("div", "dm-invite-stat " + kind);
        holder.appendChild(element("i", "dm-invite-dot"));
        holder.appendChild(element("em", "", count + " " + label));
        return holder;
    }

    function paint(card, info) {
        card.textContent = "";
        card._info = info;
        var banner = element("div", "dm-invite-banner");
        banner.setAttribute("data-banner", info.bannerColor || "ink");
        card.appendChild(banner);
        var body = element("div", "dm-invite-body");
        var icon = element("div", "dm-invite-icon");
        if (info.iconUrl) {
            var image = document.createElement("img");
            image.alt = "";
            image.src = info.iconUrl;
            icon.appendChild(image);
        } else {
            icon.textContent = initials(info.name);
        }
        body.appendChild(icon);
        body.appendChild(element("strong", "dm-invite-name", info.name));
        var stats = element("div", "dm-invite-stats");
        stats.appendChild(stat("is-online", info.onlineCount, "Online"));
        stats.appendChild(stat("is-members", info.memberCount, info.memberCount === 1 ? "Member" : "Members"));
        body.appendChild(stats);
        body.appendChild(element("p", "dm-invite-est", established(info.createdAt)));
        if (info.description) body.appendChild(element("p", "dm-invite-about", info.description));
        var button = element("button", "dm-invite-go", info.isMember ? "Go to Server" : "Join");
        button.type = "button";
        button.classList.toggle("is-join", !info.isMember);
        button.addEventListener("click", function () { act(card, button); });
        body.appendChild(button);
        card.appendChild(body);
    }

    function paintInvalid(card) {
        card.textContent = "";
        card._info = null;
        card.classList.add("is-invalid");
        card.appendChild(element("div", "dm-invite-body is-plain", "This invite is invalid or has expired."));
    }

    function load(card) {
        fetch("/Server/Preview?code=" + encodeURIComponent(card.getAttribute("data-code")), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) throw new Error("invite");
            return response.json();
        }).then(function (info) {
            card.classList.remove("is-invalid");
            paint(card, info);
        }).catch(function () {
            paintInvalid(card);
        });
    }

    function act(card, button) {
        var info = card._info;
        if (!info) return;
        if (info.isMember) {
            var url = "/Server/Index?id=" + encodeURIComponent(info.serverId);
            if (window.discodeGo) window.discodeGo(url);
            else window.location.href = url;
            return;
        }
        button.disabled = true;
        button.textContent = "Joining...";
        fetch("/Server/Join", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify({ invite: info.inviteCode })
        }).then(function (response) {
            if (!response.ok) throw new Error("join");
            return response.json();
        }).then(function () {
            load(card);
        }).catch(function () {
            button.disabled = false;
            button.textContent = "Couldn't join";
            window.setTimeout(function () { button.textContent = "Join"; }, 2200);
        });
    }

    function linkify(textElement) {
        var walker = document.createTreeWalker(textElement, NodeFilter.SHOW_TEXT, null);
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (node) {
            if (node.parentNode.closest && node.parentNode.closest("a")) return;
            var text = node.nodeValue;
            pattern.lastIndex = 0;
            var pieces = [];
            var last = 0;
            var match;
            while ((match = pattern.exec(text))) {
                if (match.index > last) pieces.push(document.createTextNode(text.slice(last, match.index)));
                var link = document.createElement("a");
                link.className = "dm-invite-link";
                link.href = "/" + match[1];
                link.textContent = match[0];
                pieces.push(link);
                last = match.index + match[0].length;
            }
            if (!pieces.length) return;
            if (last < text.length) pieces.push(document.createTextNode(text.slice(last)));
            pieces.forEach(function (piece) { node.parentNode.insertBefore(piece, node); });
            node.parentNode.removeChild(node);
        });
    }

    function process(textElement) {
        var text = textElement.textContent;
        if (textElement._inviteText === text) return;
        textElement._inviteText = text;
        var codes = [];
        pattern.lastIndex = 0;
        var match;
        while ((match = pattern.exec(text))) {
            if (/\d/.test(match[1]) && /[A-Za-z]/.test(match[1]) && codes.indexOf(match[1]) === -1) codes.push(match[1]);
        }
        if (!codes.length) return;
        linkify(textElement);
        codes.slice(0, MAX_CARDS).forEach(function (code) {
            var sibling = textElement.nextElementSibling;
            while (sibling) {
                if (sibling.getAttribute && sibling.getAttribute("data-code") === code) return;
                sibling = sibling.nextElementSibling;
            }
            var card = element("div", "dm-invite-card");
            card.setAttribute("data-code", code);
            card.appendChild(element("div", "dm-invite-body is-plain", "Loading invite..."));
            textElement.parentNode.insertBefore(card, textElement.nextSibling);
            load(card);
        });
    }

    function scan(box) {
        [].forEach.call(box.querySelectorAll(".dm-msg-text"), process);
    }

    function refreshAll() {
        boxes.forEach(function (box) {
            [].forEach.call(box.querySelectorAll(".dm-invite-card"), load);
        });
    }

    var queued = false;

    function schedule() {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
            queued = false;
            boxes.forEach(scan);
        });
    }

    boxes.forEach(function (box) {
        new MutationObserver(schedule).observe(box, { childList: true, subtree: true, characterData: true });
    });

    document.addEventListener("discode-servers-changed", refreshAll);
    document.addEventListener("discode-server-updated", refreshAll);

    var presenceTimer = 0;
    document.addEventListener("discode-user-presence", function () {
        window.clearTimeout(presenceTimer);
        presenceTimer = window.setTimeout(refreshAll, 1500);
    });
    schedule();
})();
