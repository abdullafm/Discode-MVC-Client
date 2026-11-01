"use strict";
(function () {
    var picker = document.getElementById("adm-picker");
    if (!picker) return;
    var trigger = picker.querySelector(".adm-picker-trigger");
    var menu = picker.querySelector(".adm-picker-menu");

    function setOpen(open) {
        menu.hidden = !open;
        picker.classList.toggle("open", open);
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
    }

    trigger.addEventListener("click", function (event) {
        event.stopPropagation();
        setOpen(menu.hidden);
    });

    document.addEventListener("click", function (event) {
        if (!picker.contains(event.target)) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") setOpen(false);
    });
})();
