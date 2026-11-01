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
})();
