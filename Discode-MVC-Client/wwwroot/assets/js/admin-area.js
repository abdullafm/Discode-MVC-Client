"use strict";
document.addEventListener("submit", function (event) {
    var message = event.target.getAttribute && event.target.getAttribute("data-confirm");
    if (message && !window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}, true);

(function () {
    // Server detail: search and page through the member list without leaving the page
    function loadMembers(box, search, page) {
        var list = box.querySelector(".adm-members-list");
        var url = box.getAttribute("data-url") + "?search=" + encodeURIComponent(search) + "&page=" + page;
        fetch(url, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("members");
            return response.text();
        }).then(function (html) {
            list.innerHTML = html;
            box.setAttribute("data-search", search);
            box.setAttribute("data-page", String(page));
        }).catch(function () {});
    }

    var memberTimer = null;
    document.addEventListener("input", function (event) {
        var field = event.target.closest(".adm-members-search");
        if (!field) return;
        var box = field.closest(".adm-members");
        window.clearTimeout(memberTimer);
        memberTimer = window.setTimeout(function () { loadMembers(box, field.value.trim(), 1); }, 280);
    });

    document.addEventListener("click", function (event) {
        var button = event.target.closest("[data-members-page]");
        if (!button || button.classList.contains("is-off")) return;
        var box = button.closest(".adm-members");
        loadMembers(box, box.getAttribute("data-search") || "", Number(button.getAttribute("data-members-page")));
    });

    var pickers = document.querySelectorAll(".adm-picker");

    function close(picker) {
        var menu = picker.querySelector(".adm-picker-menu");
        var trigger = picker.querySelector(".adm-picker-trigger");
        menu.hidden = true;
        picker.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
    }

    pickers.forEach(function (picker) {
        var trigger = picker.querySelector(".adm-picker-trigger");
        var menu = picker.querySelector(".adm-picker-menu");

        trigger.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            var open = menu.hidden;
            pickers.forEach(close);
            if (open) {
                menu.hidden = false;
                picker.classList.add("open");
                trigger.setAttribute("aria-expanded", "true");
            }
        });
    });

    document.addEventListener("click", function (event) {
        pickers.forEach(function (picker) {
            if (!picker.contains(event.target)) close(picker);
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") pickers.forEach(close);
    });

    // Dashboard: a card loads its list under the cards, the page stays the same
    var panel = document.getElementById("stat-panel");
    var activeCard = null;
    var activeUrl = "";

    var lastPanelUrl = "";

    function loadPanel(url) {
        lastPanelUrl = url;
        return fetch(url, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("panel");
            return response.text();
        }).then(function (html) {
            panel.innerHTML = html;
            panel.hidden = false;
        }).catch(function () {});
    }

    function openPanel(card, url) {
        if (!panel) return;
        if (activeCard === card && activeUrl === url) {
            card.classList.remove("on");
            panel.hidden = true;
            panel.innerHTML = "";
            activeCard = null;
            activeUrl = "";
            return;
        }
        if (activeCard) activeCard.classList.remove("on");
        activeCard = card;
        activeUrl = url;
        card.classList.add("on");
        loadPanel(url);
    }

    if (panel) {
        document.querySelectorAll("[data-panel]").forEach(function (card) {
            card.addEventListener("click", function (event) {
                event.preventDefault();
                openPanel(card, card.getAttribute("data-panel"));
            });
        });

        panel.addEventListener("click", function (event) {
            var link = event.target.closest("a[href]");
            if (!link || link.classList.contains("is-off")) return;
            event.preventDefault();
            loadPanel(link.href);
        });

        panel.addEventListener("submit", function (event) {
            event.preventDefault();
            var form = event.target;
            if ((form.getAttribute("method") || "get").toLowerCase() === "post") {
                fetch(form.action, { method: "POST", body: new FormData(form), credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
                    return response.text();
                }).then(function (html) {
                    panel.innerHTML = html;
                    panel.hidden = false;
                }).catch(function () {});
                return;
            }
            loadPanel(form.action + "?" + new URLSearchParams(new FormData(form)).toString());
        });
    }

    // Admins / SuperAdmins card: the dropdown swaps the number and the list it opens
    var staff = document.getElementById("stat-staff");
    if (staff) {
        var label = document.getElementById("stat-staff-label");
        var count = document.getElementById("stat-staff-count");
        var current = "admins";
        staff.querySelectorAll("[data-staff]").forEach(function (option) {
            option.addEventListener("click", function (event) {
                event.preventDefault();
                var key = option.getAttribute("data-staff");
                var number = Number(staff.getAttribute("data-" + key));
                label.textContent = key === "admins" ? "Admins" : "SuperAdmins";
                count.textContent = number.toLocaleString("en-US");
                current = key;
                staff.querySelectorAll("[data-staff]").forEach(function (item) { item.classList.toggle("on", item === option); });
                pickers.forEach(close);
                if (activeCard === staff) {
                    activeUrl = staff.getAttribute("data-" + current + "-url");
                    loadPanel(activeUrl);
                }
            });
        });

        staff.addEventListener("click", function (event) {
            if (event.target.closest(".adm-picker")) return;
            openPanel(staff, staff.getAttribute("data-" + current + "-url"));
        });
    }

    // ===== Live updates: the API pushes "AdminChanged" over SignalR, the panel refreshes what is on screen =====
    var REFRESH = { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest", "X-Admin-Refresh": "1" } };

    function setText(selector, value) {
        var node = document.querySelector(selector);
        if (node && node.textContent !== value) node.textContent = value;
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString("en-US");
    }

    function refreshStats() {
        if (!document.querySelector(".stat-grid")) return;
        fetch("/Admin/Home/Stats", REFRESH).then(function (response) {
            if (!response.ok) throw new Error("stats");
            return response.json();
        }).then(function (stats) {
            setText('[data-stat="users"]', formatNumber(stats.users.total));
            setText('[data-stat="users-note"]', "+" + stats.users.newLast7Days + " this week");
            setText('[data-stat="servers"]', formatNumber(stats.servers.total));
            setText('[data-stat="servers-note"]', stats.servers.public + " public \u00b7 " + stats.servers.private + " private");
            setText('[data-stat="banned-users"]', formatNumber(stats.bans.usersBanned));
            setText('[data-stat="banned-users-note"]', stats.bans.totalBans + " server bans in total");
            setText('[data-stat="banned-servers"]', formatNumber(stats.servers.banned));
            setText('[data-stat="reports"]', formatNumber(stats.reports.total));
            setText('[data-stat="reports-note"]', stats.reports.open + " waiting review");
            var note = document.querySelector('[data-stat="reports-note"]');
            if (note) note.classList.toggle("tone-red-text", stats.reports.open > 0);

            var card = document.getElementById("stat-staff");
            if (card) {
                card.setAttribute("data-admins", stats.users.admins);
                card.setAttribute("data-superadmins", stats.users.superAdmins);
                var showing = document.getElementById("stat-staff-label");
                var key = showing && showing.textContent === "SuperAdmins" ? "superadmins" : "admins";
                setText("#stat-staff-count", formatNumber(card.getAttribute("data-" + key)));
            }
        }).catch(function () {});
    }

    function swapParts(root, doc, selectors) {
        selectors.forEach(function (selector) {
            var fresh = doc.querySelector(selector);
            var old = root.querySelector(selector);
            if (old && fresh) old.replaceWith(fresh);
            else if (old && !fresh) old.remove();
            else if (!old && fresh && selector === ".adm-pager") root.appendChild(fresh);
        });
    }

    function refreshList(root, url) {
        fetch(url, REFRESH).then(function (response) {
            if (!response.ok) throw new Error("list");
            return response.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            if (!doc.querySelector(".adm-table-wrap")) return;
            swapParts(root, doc, [".adm-error", ".adm-table-wrap", ".adm-count", ".adm-pager"]);
        }).catch(function () {});
    }

    function refreshDetail(root, url, metricsOnly) {
        fetch(url, REFRESH).then(function (response) {
            if (!response.ok) throw new Error("detail");
            return response.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            if (!doc.querySelector(".adm-detail-head")) {
                // the server is gone (deleted): go back to the list
                var back = root.querySelector(".adm-back-link");
                if (back) {
                    if (!panel || root !== panel) window.location.href = back.getAttribute("href");
                    else loadPanel(back.getAttribute("href"));
                }
                return;
            }

            swapParts(root, doc, [".adm-metrics", ".adm-detail-chips"]);
            if (metricsOnly) return;

            var oldBanner = root.querySelector(".adm-ban-banner");
            var freshBanner = doc.querySelector(".adm-ban-banner");
            if (oldBanner && freshBanner) oldBanner.replaceWith(freshBanner);
            else if (oldBanner) oldBanner.remove();
            else if (freshBanner) {
                var anchor = root.querySelector(".adm-metrics");
                if (anchor) anchor.parentNode.insertBefore(freshBanner, anchor);
            }

            // the actions card holds the reason box: leave it alone while somebody is typing
            var typing = root.querySelector("#ban-reason");
            var busy = typing && (typing === document.activeElement || typing.value.trim().length > 0);
            if (!busy) {
                var oldActions = root.querySelector(".adm-detail-grid > .adm-panel:nth-child(2)");
                var freshActions = doc.querySelector(".adm-detail-grid > .adm-panel:nth-child(2)");
                if (oldActions && freshActions) oldActions.replaceWith(freshActions);
            }

            var box = root.querySelector(".adm-members");
            if (box) loadMembers(box, box.getAttribute("data-search") || "", Number(box.getAttribute("data-page") || 1));
        }).catch(function () {});
    }

    function refreshLive() {
        refreshStats();

        var root = panel && !panel.hidden && lastPanelUrl ? panel : document.querySelector(".admin-body");
        var url = root === panel ? lastPanelUrl : window.location.href;
        if (!root) return;

        if (root.querySelector(".adm-detail-head")) refreshDetail(root, url);
        else if (root.querySelector(".adm-table-wrap")) refreshList(root, url);
    }

    var liveTimer = null;
    function refreshSoon() {
        window.clearTimeout(liveTimer);
        liveTimer = window.setTimeout(refreshLive, 500);
    }

    // channels, roles and messages only move the counters of the open server: refresh just those, right away
    var counterTimer = null;
    document.addEventListener("discode-admin-changed", function (event) {
        var detail = event.detail || {};
        var topics = detail.topics || [];
        if (topics.length === 1 && topics[0] === "server-detail") {
            var root = panel && !panel.hidden && lastPanelUrl ? panel : document.querySelector(".admin-body");
            var head = root && root.querySelector(".adm-detail-head");
            if (!head) return;
            var id = Number(head.getAttribute("data-server-id"));
            if ((detail.serverIds || []).indexOf(id) === -1) return;
            window.clearTimeout(counterTimer);
            counterTimer = window.setTimeout(function () {
                refreshDetail(root, root === panel ? lastPanelUrl : window.location.href, true);
            }, 150);
            return;
        }
        refreshSoon();
    });

    // changes that never pass through the API (data edited in the database, missed pushes) are caught here:
    // when the connection comes back, when the tab is shown again, and every 20 seconds while it is visible
    document.addEventListener("discode-hub-connected", refreshSoon);
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) refreshSoon();
    });
    window.setInterval(function () {
        if (!document.hidden) refreshLive();
    }, 20000);
})();
