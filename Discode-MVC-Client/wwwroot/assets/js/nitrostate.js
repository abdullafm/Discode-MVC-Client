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
        '<linearGradient id="dc-grad-nitro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#5865f2"/></linearGradient>' +
        '<linearGradient id="dc-grad-boost" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8bf2"/><stop offset="1" stop-color="#a855f7"/></linearGradient>' +
        '<symbol id="dc-badge-nitro" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11.5" fill="url(#dc-grad-nitro)"/>' +
        '<path d="M6.3 12.4a5.7 5.7 0 0 1 5.7-5.7c2 0 3.7 1 4.7 2.6l-2.1 1.2a3.4 3.4 0 0 0-2.6-1.4 3.3 3.3 0 0 0 0 6.6 3.4 3.4 0 0 0 2.6-1.4l2.1 1.2a5.7 5.7 0 0 1-4.7 2.6 5.7 5.7 0 0 1-5.7-5.7z" fill="#fff"/>' +
        '<circle cx="12" cy="12.4" r="1.9" fill="#fff"/></symbol>' +
        '<symbol id="dc-badge-boost" viewBox="0 0 24 24"><path d="M12 1.2l9.6 5.5v10.6L12 22.8l-9.6-5.5V6.7z" fill="url(#dc-grad-boost)"/>' +
        '<path d="M12 6l4.6 6.4h-3.1V18h-3V12.4H7.4z" fill="#fff"/></symbol></defs></svg>';

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
