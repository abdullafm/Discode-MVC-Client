"use strict";
try {
    if (localStorage.getItem("discode-theme") === "dark") document.documentElement.classList.add("theme-dark");
} catch (e) {}

(function () {
    var overlays = ".friend-context, .friend-more, .dm-msg-menu, .dm-attach-menu, .dm-pins-popover, .dm-poll-emojis, .story-tool-menu, .story-edit-panel, .story-delete, .set-emoji, #lang-select-list, .stream-menu, .call-phone-sheet, .dm-wave, .dm-reply-bar, .watch-reply-bar, .me-request, .incoming-call, .call-answer-bar, .sidebar-call, .call-dock, .gcall-pill";
    var tabs = "section[id^='settings-'], section[id^='view-'], section[id^='friends-'], section[id^='server-'], .me-panel, .call-stage, .online-row, .dm-unread, .friend-badge, p.dm-error, p.group-error, p.dm-forward-error, p.dm-poll-error, p.name-modal-error, p.server-modal-error, p.group-edit-error, p.composer-error, .me-private-head, .me-private-note, .me-private-board, .live-hero, .live-chips, .live-section-head, .live-friends-empty, .live-streams-empty, .feed-empty, .me-friends-empty, .me-posts-empty, .new-msg-empty, .new-msg-friend, section#active-now, #me-add, #me-view-bio, #me-view-pronouns, .dm-call-join-wrap, .in-call-label";
    var pops = ".me-profile, .new-msg, .settings, .name-modal, .server-modal, .group-edit-modal, .channel-modal, .server-delete-modal, .set-status, .story-viewer, .story-editor, .story-modal, .me-status-menu, #story-viewer, #story-editor, #story-modal, #emoji-panel, .emoji-panel, .row-menu, .msg-search-panel, .watch-viewer-list, .watch-guest, .dm-modal, .live-modal, " + overlays;
    var selfPops = ".emoji-panel, #emoji-panel, .row-menu, .me-status-menu, .me-pop, .msg-search-panel, .watch-viewer-list, .watch-guest, " + overlays;

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
        var self = !card && target.matches(selfPops);
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

        function playTab(el) {
            el.classList.remove("is-tab-in");
            void el.offsetWidth;
            el.classList.add("is-tab-in");
            window.clearTimeout(el._tabTimer);
            el._tabTimer = window.setTimeout(function () { el.classList.remove("is-tab-in"); }, 320);
        }

        var hiddenDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidden");

        function guardHidden(el) {
            el._popReopen = false;
            Object.defineProperty(el, "hidden", {
                configurable: true,
                get: function () { return hiddenDescriptor.get.call(el); },
                set: function (value) {
                    if (el._popOwn) {
                        hiddenDescriptor.set.call(el, value);
                        return;
                    }
                    if (!value) el._popReopen = true;
                }
            });
        }

        function ownHidden(el, value) {
            el._popOwn = true;
            hiddenDescriptor.set.call(el, value);
            el._popOwn = false;
        }

        var watch = new MutationObserver(function (records) {
            records.forEach(function (record) {
                var el = record.target;
                if (!el.matches) return;
                if (el.matches(tabs)) {
                    if (hiddenBefore(record) && !el.hidden && !el.classList.contains("d-none")) playTab(el);
                    return;
                }
                if (!el.matches(pops) || el.getAttribute("data-pop-lock") === "1") return;
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
                if (useHidden) {
                    guardHidden(el);
                    ownHidden(el, false);
                }
                if (useClass) el.classList.remove("d-none");
                playMotion(target, false);
                window.setTimeout(function () {
                    var reopen = !!el._popReopen;
                    if (useHidden) {
                        delete el.hidden;
                        if (!reopen) el.hidden = true;
                    }
                    if (useClass) el.classList.add("d-none");
                    if (reopen) {
                        target.style.opacity = "";
                        target.style.transform = "";
                        playMotion(target, true);
                    }
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
