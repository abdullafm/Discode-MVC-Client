"use strict";
(function () {
    var boxes = document.querySelectorAll(".birth-box");

    function closeBirth() {
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].classList.remove("open");
            var field = boxes[i].querySelector(".birth-field");
            var list = boxes[i].querySelector(".birth-list");
            if (field) field.setAttribute("aria-expanded", "false");
            if (list) list.hidden = true;
        }
    }

    for (var i = 0; i < boxes.length; i++) {
        boxes[i].addEventListener("click", function (event) {
            var field = event.target.closest(".birth-field");
            var choice = event.target.closest(".birth-list button");
            if (field) {
                var box = field.parentElement;
                var list = box.querySelector(".birth-list");
                var open = box.classList.contains("open");
                closeBirth();
                if (!open) {
                    box.classList.add("open");
                    field.setAttribute("aria-expanded", "true");
                    if (list) list.hidden = false;
                }
                return;
            }
            if (!choice) return;
            var picked = choice.closest(".birth-box");
            var label = picked.querySelector(".birth-field span");
            var hidden = picked.querySelector("input");
            var options = picked.querySelectorAll(".birth-list button");
            for (var n = 0; n < options.length; n++) options[n].classList.toggle("on", options[n] === choice);
            if (label) label.textContent = choice.getAttribute("data-value");
            if (hidden) hidden.value = choice.getAttribute("data-value");
            picked.classList.add("has-value");
            closeBirth();
        });
    }

    document.addEventListener("click", function (event) {
        if (!event.target.closest(".birth-box")) closeBirth();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeBirth();
    });

    var togglePasswordBtns = document.querySelectorAll(".toggle-password");
    for (var i = 0; i < togglePasswordBtns.length; i++) {
        togglePasswordBtns[i].addEventListener("click", function (event) {
            var wrapper = this.parentElement;
            var input = wrapper.querySelector("input");
            var icon = this.querySelector("i");
            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            } else {
                input.type = "password";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            }
        });
    }
})();
