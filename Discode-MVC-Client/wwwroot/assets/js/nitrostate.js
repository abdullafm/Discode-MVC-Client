(function () {
    "use strict";
    if (window.discodeNitroLoaded) return;
    window.discodeNitroLoaded = true;

    var FREE = {
        hasNitro: false, isBooster: false, source: "", expiresAt: null, cancelAtPeriodEnd: false, canManageBilling: false,
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
        span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#dc-badge-' + kind + '"></use></svg>';
        return span;
    }

    // puts the Nitro / Boost badges of a person into a holder element
    window.discodeBadges = function (holder, hasNitro, isBooster) {
        if (!holder) return;
        ensureSprite();
        holder.textContent = "";
        if (hasNitro) holder.appendChild(badge("nitro", "Nitro subscriber"));
        if (isBooster) holder.appendChild(badge("boost", "Boosting a server"));
        holder.hidden = !hasNitro && !isBooster;
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
            target.style.backgroundImage = url ? "url('" + url.replace(/'/g, "%27") + "')" : "";
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
