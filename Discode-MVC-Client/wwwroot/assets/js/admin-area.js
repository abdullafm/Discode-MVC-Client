"use strict";
(function () {
    var pickers = document.querySelectorAll(".adm-picker");
    if (!pickers.length) return;

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

    function loadPanel(url) {
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
})();
