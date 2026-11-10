"use strict";
(function () {
    var layer = null;
    var pending = null;

    function close() {
        if (layer) layer.hidden = true;
        pending = null;
    }

    function open(form) {
        if (!layer || !document.body.contains(layer)) {
            layer = document.createElement("div");
            layer.className = "adm-modal-layer";
            layer.innerHTML = '<div class="adm-modal" role="alertdialog" aria-modal="true">' +
                '<div class="adm-modal-icon"><i class="fa-solid"></i></div>' +
                '<h3 class="adm-modal-title"></h3>' +
                '<p class="adm-modal-text"></p>' +
                '<div class="adm-modal-actions">' +
                '<button type="button" class="adm-modal-cancel">Cancel</button>' +
                '<button type="button" class="adm-modal-ok"></button>' +
                '</div></div>';
            document.body.appendChild(layer);
            layer.addEventListener("click", function (event) {
                if (event.target === layer || event.target.closest(".adm-modal-cancel")) {
                    close();
                } else if (event.target.closest(".adm-modal-ok")) {
                    var form = pending;
                    close();
                    if (form) {
                        form.setAttribute("data-confirmed", "1");
                        if (form.requestSubmit) form.requestSubmit();
                        else form.submit();
                    }
                }
            });
        }

        var tone = form.getAttribute("data-confirm-tone") || "danger";
        var modal = layer.querySelector(".adm-modal");
        modal.className = "adm-modal is-" + tone;
        layer.querySelector(".adm-modal-icon i").className = "fa-solid " + (form.getAttribute("data-confirm-icon") || (tone === "success" ? "fa-rotate-left" : "fa-triangle-exclamation"));
        layer.querySelector(".adm-modal-title").textContent = form.getAttribute("data-confirm-title") || "Are you sure?";
        layer.querySelector(".adm-modal-text").textContent = form.getAttribute("data-confirm");
        layer.querySelector(".adm-modal-ok").textContent = form.getAttribute("data-confirm-button") || "Confirm";
        pending = form;
        layer.hidden = false;
        layer.querySelector(".adm-modal-ok").focus();
    }

    document.addEventListener("submit", function (event) {
        var form = event.target;
        if (!form.getAttribute || !form.getAttribute("data-confirm")) return;
        if (form.getAttribute("data-confirmed") === "1") {
            form.removeAttribute("data-confirmed");
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        open(form);
    }, true);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && layer && !layer.hidden) {
            event.stopImmediatePropagation();
            close();
        }
    }, true);
})();

(function () {
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
        loadPanel(url).then(function () {
            if (window.matchMedia("(max-width: 720px)").matches && !panel.hidden) {
                panel.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }

    (function centerActiveChip() {
        var strip = document.querySelector(".admin-phone-cats");
        var current = strip && strip.querySelector(".discover-cat.on");
        if (current) strip.scrollLeft = Math.max(0, current.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft - (strip.clientWidth - current.offsetWidth) / 2);
    })();

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
            else if (!old && fresh && selector === ".adm-banner") {
                var head = root.querySelector(".adm-detail-head");
                if (head) head.parentNode.insertBefore(fresh, head);
            }
        });
    }

    function refreshList(root, url) {
        var forms = root.querySelector(".adm-live-list, .adm-content-list");
        if (forms) {
            var typing = [].some.call(forms.querySelectorAll("textarea"), function (field) { return field.value.trim().length > 0; });
            if (typing || forms.querySelector("details[open]")) return;
        }

        fetch(url, REFRESH).then(function (response) {
            if (!response.ok) throw new Error("list");
            return response.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            if (!doc.querySelector(".adm-table-wrap")) return;
            swapParts(root, doc, [".adm-error", ".adm-report-tabs", ".adm-table-wrap", ".adm-count", ".adm-pager"]);
        }).catch(function () {});
    }

    function refreshBranding(root, url) {
        fetch(url, REFRESH).then(function (response) {
            if (!response.ok) throw new Error("branding");
            return response.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            var fresh = doc.querySelectorAll(".adm-brand-grid > .adm-panel");
            root.querySelectorAll(".adm-brand-grid > .adm-panel").forEach(function (card, index) {
                var picked = card.querySelector("[data-picked]");
                if (!fresh[index] || (picked && !picked.hidden)) return;
                card.replaceWith(fresh[index]);
            });
            if (window.initBrandForms) window.initBrandForms(root);
        }).catch(function () {});
    }

    function refreshDetail(root, url, metricsOnly) {
        fetch(url, REFRESH).then(function (response) {
            if (!response.ok) throw new Error("detail");
            return response.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            if (!doc.querySelector(".adm-detail-head")) {
                var back = root.querySelector(".adm-back-link");
                if (back) {
                    if (!panel || root !== panel) window.location.href = back.getAttribute("href");
                    else loadPanel(back.getAttribute("href"));
                }
                return;
            }

            swapParts(root, doc, [".adm-metrics", ".adm-detail-chips", ".adm-history"]);
            if (metricsOnly) return;

            swapParts(root, doc, [".adm-banner", ".adm-person", ".adm-dl"]);

            root.querySelectorAll(".adm-ban-banner").forEach(function (node) { node.remove(); });
            var anchor = root.querySelector(".adm-metrics");
            doc.querySelectorAll(".adm-ban-banner").forEach(function (node) {
                if (anchor) anchor.parentNode.insertBefore(node, anchor);
            });

            var oldActions = root.querySelector(".adm-detail-grid > .adm-panel:nth-child(2)");
            var freshActions = doc.querySelector(".adm-detail-grid > .adm-panel:nth-child(2)");
            if (oldActions && freshActions) {
                var typing = [].some.call(oldActions.querySelectorAll("textarea, input[type=text]"), function (field) { return field.value.trim().length > 0; });
                var busy = typing || oldActions.querySelector("details[open]") || oldActions.contains(document.activeElement);
                if (!busy) oldActions.replaceWith(freshActions);
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

        if (root.querySelector(".adm-brand-grid")) refreshBranding(root, url);
        else if (root.querySelector(".adm-detail-head")) refreshDetail(root, url);
        else if (root.querySelector(".adm-table-wrap")) refreshList(root, url);
    }

    var liveTimer = null;
    function refreshSoon() {
        window.clearTimeout(liveTimer);
        liveTimer = window.setTimeout(refreshLive, 500);
    }

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

    function onLiveMoved() {
        if (document.querySelector(".adm-live-list")) refreshSoon();
    }
    document.addEventListener("discode-live-changed", onLiveMoved);
    document.addEventListener("discode-live-viewers", onLiveMoved);
    document.addEventListener("discode-live-ended", onLiveMoved);

    document.addEventListener("discode-hub-connected", refreshSoon);
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) refreshSoon();
    });
    window.setInterval(function () {
        if (!document.hidden) refreshLive();
    }, 20000);
})();
