(function () {
    "use strict";
    if (window.discodeNitroLoaded) return;
    window.discodeNitroLoaded = true;

    var FREE = {
        hasNitro: false, isBooster: false, staffRole: "", source: "", expiresAt: null, cancelAtPeriodEnd: false, canManageBilling: false,
        boostSlots: 0, boostsUsed: 0, maxMessageLength: 2000, maxFileBytes: 5 * 1024 * 1024, priceCents: 299, currency: "usd"
    };

    window.discodeNitro = Object.assign({}, FREE);

    // "5 MB", "2 GB"
    window.discodeBytesLabel = function (bytes) {
        if (bytes >= 1024 * 1024 * 1024) return Math.round(bytes / (1024 * 1024 * 1024) * 10) / 10 + " GB";
        return Math.round(bytes / (1024 * 1024) * 10) / 10 + " MB";
    };

    // the badges are drawn once here and used everywhere with <use>
    var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
        '<linearGradient id="dc-grad-nitro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7f9fe0"/><stop offset="1" stop-color="#4c6cb8"/></linearGradient>' +
        '<linearGradient id="dc-grad-boost" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#f2465f"/></linearGradient>' +
        '<symbol id="dc-badge-nitro" viewBox="0 0 24 24"><path d="M2 6.200H13.500a7.900 7.900 0 1 1 0 15.800 7.900 7.900 0 0 1-6.600-3.500H9.500L6 14.800 2 11.200z" fill="url(#dc-grad-nitro)" stroke="#2f3f66" stroke-width="1.600" stroke-linejoin="round"/>' +
        '<circle cx="14" cy="14.100" r="3.300" fill="#2f3f66"/></symbol>' +
        '<symbol id="dc-badge-boost" viewBox="0 0 24 24"><path d="M12 1.5c1.6 3 4.9 4.8 4.9 9.2 0 1.5-.6 2.8-1.5 3.8l3.6 1.6-2.2 4.4-3.1-1.6L12 22.5l-1.7-4.1-3.1 1.6L5 15.6l3.6-1.6c-.9-1-1.5-2.3-1.5-3.8C7.1 6.3 10.4 4.5 12 1.5z" fill="url(#dc-grad-boost)"/><circle cx="12" cy="10.8" r="2" fill="#fff"/></symbol></defs></svg>';

    function ensureSprite() {
        if (document.getElementById("dc-grad-nitro") || !document.body) return;
        var holder = document.createElement("div");
        holder.id = "dc-badge-sprite";
        holder.innerHTML = SPRITE;
        document.body.insertBefore(holder, document.body.firstChild);
    }

    function badge(kind, title) {
        var span = document.createElement("span");
        span.className = "nitro-badge nitro-badge-" + kind;
        span.title = title;
        span.setAttribute("role", "img");
        span.setAttribute("aria-label", title);
        span.innerHTML = '<img src="/assets/img/badge-' + kind + '.png" alt="" aria-hidden="true">';
        return span;
    }

    // puts the Nitro / Boost badges of a person into a holder element
    // (staffRole: "admin" and "superadmin" get their badge by themselves, in front of the others)
    window.discodeBadges = function (holder, hasNitro, isBooster, staffRole) {
        if (!holder) return;
        ensureSprite();
        holder.textContent = "";
        if (staffRole === "superadmin") holder.appendChild(badge("superadmin", "Super admin"));
        else if (staffRole === "admin") holder.appendChild(badge("admin", "Admin"));
        if (hasNitro) holder.appendChild(badge("nitro", "Nitro subscriber"));
        if (isBooster) holder.appendChild(badge("boost", "Boosting a server"));
        holder.hidden = !hasNitro && !isBooster && !staffRole;
    };

    // paints a banner picture so that no theme rule can change how it fills the area
    window.discodeSetBanner = function (element, cssUrl, color) {
        if (!element) return;
        if (cssUrl) element.style.setProperty("background", cssUrl + " center / cover no-repeat", "important");
        else element.style.removeProperty("background");
    };

    // a banner sits in a different place on every page: the markup carries it as data, this paints it
    window.discodePaintBanners = function (root) {
        var scope = root || document;
        var marks = scope.querySelectorAll(".dm-banner-data");
        for (var i = 0; i < marks.length; i++) {
            var url = marks[i].getAttribute("data-banner") || "";
            var card = marks[i].closest(".mini-profile, .dm-profile");
            var target = card ? card.querySelector(".mini-banner, .dm-banner") : null;
            if (!target) continue;
            window.discodeSetBanner(target, url ? "url('" + url.replace(/'/g, "%27") + "')" : "", marks[i].getAttribute("data-color") || "");
            target.classList.toggle("has-image", !!url);
        }
    };

    function load() {
        return fetch("/Nitro/Status", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (state) {
            if (!state) return;
            window.discodeNitro = Object.assign({}, FREE, state);
            document.dispatchEvent(new CustomEvent("discode-nitro-state"));
        }).catch(function () {});
    }

    window.discodeNitroReady = load();
    document.addEventListener("discode-nitro-changed", load);
    document.addEventListener("discode-hub-connected", function () { window.setTimeout(load, 500); });
    document.addEventListener("DOMContentLoaded", function () {
        ensureSprite();
        window.discodePaintBanners();
    });
})();

// ---------- a Nitro gift: the window that opens from a gift link or from the Claim button of a chat card
(function () {
    "use strict";
    var modal = null;
    var current = "";

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function build() {
        if (modal && modal.isConnected) return;
        modal = el("div", "dm-modal");
        modal.id = "gift-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "gift-title");
        modal.hidden = true;
        modal.innerHTML =
            '<div class="dm-modal-backdrop" data-close></div>' +
            '<div class="dm-modal-card gift-card">' +
            '<button type="button" class="dm-modal-x" aria-label="Close" data-close><i class="fa-solid fa-xmark"></i></button>' +
            '<img class="gift-art" src="/assets/img/nitro-gift.png" alt="">' +
            '<h2 id="gift-title"></h2>' +
            '<div class="gift-from" id="gift-from" hidden><img id="gift-from-avatar" alt=""><span id="gift-from-name"></span></div>' +
            '<p class="dm-modal-text" id="gift-text"></p>' +
            '<p class="dm-forward-error" id="gift-error" hidden></p>' +
            '<div class="gift-actions"><button type="button" class="gift-accept" id="gift-accept" hidden>Accept</button><button type="button" class="gift-later" id="gift-later" data-close>Close</button></div>' +
            '</div>';
        document.body.appendChild(modal);
        modal.addEventListener("click", function (event) {
            if (event.target.closest("[data-close]")) modal.hidden = true;
        });
        modal.querySelector("#gift-accept").addEventListener("click", accept);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modal && !modal.hidden) modal.hidden = true;
        });
    }

    function say(title, text) {
        modal.querySelector("#gift-title").textContent = title;
        modal.querySelector("#gift-text").textContent = text || "";
    }

    function problem(text) {
        var box = modal.querySelector("#gift-error");
        box.textContent = text || "";
        box.hidden = !text;
    }

    function until(value) {
        return value ? new Date(value).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "";
    }

    function readError(body, fallback) {
        return (body && body.errors && body.errors[0]) || fallback;
    }

    function open(code) {
        if (!code) return;
        build();
        current = code;
        problem("");
        modal.querySelector("#gift-from").hidden = true;
        modal.querySelector("#gift-accept").hidden = true;
        modal.querySelector("#gift-accept").disabled = false;
        modal.querySelector("#gift-later").textContent = "Close";
        say("Opening the gift...", "");
        modal.hidden = false;
        fetch("/Nitro/GiftInfo?code=" + encodeURIComponent(code), { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) { return { ok: response.ok, body: body }; });
        }).then(function (result) {
            if (current !== code) return;
            if (!result.ok) {
                say("This gift link is not valid.", readError(result.body, "Check the link and try again."));
                return;
            }
            var info = result.body;
            modal.querySelector("#gift-from").hidden = false;
            modal.querySelector("#gift-from-avatar").src = info.fromAvatarUrl || "/assets/img/img-icon-profile.jpeg";
            modal.querySelector("#gift-from-name").textContent = "from " + (info.fromDisplayName || info.fromUserName);
            if (info.canRedeem) {
                say("You received a Nitro gift!", info.days + " days of Nitro: longer messages, bigger files, an animated avatar and banner, and 2 server boosts. Press Accept to claim it.");
                modal.querySelector("#gift-accept").hidden = false;
                modal.querySelector("#gift-later").textContent = "Not now";
            } else {
                say(info.status === "available" ? "You can not claim this gift yet." : "This gift can not be claimed.", info.reason);
            }
        }).catch(function () {
            say("The gift could not be opened.", "Try again in a moment.");
        });
    }

    function accept() {
        var button = modal.querySelector("#gift-accept");
        button.disabled = true;
        problem("");
        fetch("/Nitro/Redeem", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify({ code: current })
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) { return { ok: response.ok, body: body }; });
        }).then(function (result) {
            if (!result.ok) {
                problem(readError(result.body, "That did not work. Try again."));
                button.disabled = false;
                return;
            }
            button.hidden = true;
            modal.querySelector("#gift-later").textContent = "Done";
            say("Nitro is yours!", "Your Nitro runs until " + until(result.body.expiresAt) + ". Enjoy!");
            document.dispatchEvent(new CustomEvent("discode-nitro-changed"));
        }).catch(function () {
            problem("The service is unavailable right now. Try again in a moment.");
            button.disabled = false;
        });
    }

    window.discodeGift = { open: open };

    function fromAddress() {
        var url = new URL(window.location.href);
        var code = url.searchParams.get("gift");
        if (!code) return;
        url.searchParams.delete("gift");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
        open(code);
    }

    document.addEventListener("discode-page-ready", fromAddress);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fromAddress);
    else fromAddress();
})();
