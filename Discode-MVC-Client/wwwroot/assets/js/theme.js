"use strict";
try {
    if (localStorage.getItem("discode-theme") === "dark") document.documentElement.classList.add("theme-dark");
} catch (e) {}

(function () {
    var pops = ".me-profile, .new-msg, .settings, .name-modal, .server-modal, .group-edit-modal, .channel-modal, .server-delete-modal, .set-status, .story-viewer, .story-editor, .story-modal, .me-status-menu, #story-viewer, #story-editor, #story-modal, #emoji-panel, .emoji-panel, .row-menu, .msg-search-panel, .watch-viewer-list, .watch-guest, .dm-modal, .live-modal";

    function hiddenBefore(record) {
        if (record.attributeName === "hidden") return record.oldValue !== null;
        return (" " + (record.oldValue || "") + " ").indexOf(" d-none ") !== -1;
    }

    function animTarget(el) {
        if (el.id === "story-viewer" || el.id === "story-editor") return el.firstElementChild || el;
        return el;
    }

    function cardOf(target) {
        var card = target.firstElementChild;
        if (!card) return null;
        if (card.matches(".dm-modal-card, .me-profile-card, .new-msg-card, .settings-card, .name-modal-card, .server-modal-card, .group-edit-card, .channel-card, .server-delete-card, .set-status-card, .story-frame")) return card;
        return null;
    }

    function tween(node, opening, move) {
        if (!node) return;
        var start = performance.now();
        var ms = opening ? 260 : 180;
        node._popToken = start;
        function frame(now) {
            if (node._popToken !== start) return;
            var p = Math.min(1, (now - start) / ms);
            var e = opening ? 1 - Math.pow(1 - p, 3) : p;
            var opacity = opening ? e : 1 - e;
            node.style.opacity = String(opacity);
            if (move) {
                var y = (opening ? 18 * (1 - e) : 12 * e);
                var s = (opening ? 0.94 + 0.06 * e : 1 - 0.04 * e);
                node.style.transform = "translateY(" + y.toFixed(2) + "px) scale(" + s.toFixed(3) + ")";
            }
            if (p < 1) {
                window.requestAnimationFrame(frame);
                return;
            }
            node.style.opacity = opening ? "" : "0";
            node.style.transform = "";
        }
        window.requestAnimationFrame(frame);
    }

    function playMotion(target, opening) {
        var card = cardOf(target);
        var self = !card && target.matches(".emoji-panel, #emoji-panel, .row-menu, .me-status-menu, .me-pop, .msg-search-panel, .watch-viewer-list, .watch-guest");
        tween(target, opening, self);
        if (card) tween(card, opening, true);
    }

    window.discodeDismiss = function (node, ms) {
        if (!node || !node.parentNode || node._dismissing) return;
        node._dismissing = true;
        node.classList.add("is-leaving");
        window.setTimeout(function () {
            if (node.parentNode) node.parentNode.removeChild(node);
        }, ms || 190);
    };

    window.discodePop = function (node, opening) {
        playMotion(node, opening !== false);
    };

    document.addEventListener("DOMContentLoaded", function () {
        function playOpen(el) {
            playMotion(animTarget(el), true);
        }

        var watch = new MutationObserver(function (records) {
            records.forEach(function (record) {
                var el = record.target;
                if (!el.matches || !el.matches(pops) || el.getAttribute("data-pop-lock") === "1") return;
                if (hiddenBefore(record)) {
                    if (el.hidden || el.classList.contains("d-none")) return;
                    playOpen(el);
                    return;
                }
                if (!el.hidden && !el.classList.contains("d-none")) return;
                var useHidden = el.hidden;
                var useClass = el.classList.contains("d-none");
                var target = animTarget(el);
                el.setAttribute("data-pop-lock", "1");
                if (useHidden) el.hidden = false;
                if (useClass) el.classList.remove("d-none");
                playMotion(target, false);
                window.setTimeout(function () {
                    if (useHidden) el.hidden = true;
                    if (useClass) el.classList.add("d-none");
                    window.requestAnimationFrame(function () {
                        el.removeAttribute("data-pop-lock");
                    });
                }, 200);
            });
        });
        watch.observe(document.documentElement, {
            subtree: true,
            attributes: true,
            attributeFilter: ["hidden", "class"],
            attributeOldValue: true
        });
    });
})();
