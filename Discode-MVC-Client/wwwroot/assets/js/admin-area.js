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

    // Admins / SuperAdmins card: the dropdown swaps the number and the list link
    var staff = document.getElementById("stat-staff");
    if (staff) {
        var label = document.getElementById("stat-staff-label");
        var count = document.getElementById("stat-staff-count");
        var link = document.getElementById("stat-staff-link");
        staff.querySelectorAll("[data-staff]").forEach(function (option) {
            option.addEventListener("click", function (event) {
                event.preventDefault();
                var key = option.getAttribute("data-staff");
                var number = Number(staff.getAttribute("data-" + key));
                label.textContent = key === "admins" ? "Admins" : "SuperAdmins";
                count.textContent = number.toLocaleString("en-US");
                link.setAttribute("href", staff.getAttribute("data-" + key + "-url"));
                staff.querySelectorAll("[data-staff]").forEach(function (item) { item.classList.toggle("on", item === option); });
                pickers.forEach(close);
            });
        });
    }
})();
