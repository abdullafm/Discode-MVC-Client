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

    var form = document.getElementById("register-form");
    var textInputs = form ? form.querySelectorAll("#register-email, #register-display, #register-user, #register-pass") : [];
    for (var t = 0; t < textInputs.length; t++) {
        textInputs[t].addEventListener("keydown", function (event) {
            if (event.key === " " && this.selectionStart === 0) event.preventDefault();
        });
        textInputs[t].addEventListener("input", function () {
            this.value = this.value.replace(/^\s+/, "");
        });
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            closeBirth();
            var day = document.getElementById("register-day");
            var month = document.getElementById("register-month");
            var year = document.getElementById("register-year");
            if (!day.value.trim() || !month.value.trim() || !year.value.trim()) {
                event.preventDefault();
                var firstEmpty = document.querySelector(".birth-box:not(.has-value) .birth-field") || document.querySelector(".birth-field");
                if (firstEmpty) firstEmpty.focus();
            }
        });
    }

    var photoInput = document.getElementById("register-photo");
    var photoPreview = document.getElementById("register-photo-preview");
    var photoIcon = document.getElementById("register-photo-icon");
    var photoClear = document.getElementById("register-photo-clear");
    var photoHint = document.getElementById("register-photo-hint");

    function resetPhoto(message) {
        if (photoInput) photoInput.value = "";
        if (photoPreview) {
            photoPreview.hidden = true;
            photoPreview.removeAttribute("src");
        }
        if (photoIcon) photoIcon.hidden = false;
        if (photoClear) photoClear.hidden = true;
        if (photoHint) photoHint.textContent = message || "Optional. PNG or JPG up to 5 MB.";
    }

    if (photoInput) {
        photoInput.addEventListener("change", function () {
            var file = photoInput.files && photoInput.files[0];
            if (!file) {
                resetPhoto();
                return;
            }
            if (file.type.indexOf("image/") !== 0 || file.size > 5000000) {
                resetPhoto("Choose an image that is at most 5 MB.");
                return;
            }
            photoPreview.src = URL.createObjectURL(file);
            photoPreview.hidden = false;
            photoIcon.hidden = true;
            photoClear.hidden = false;
            photoHint.textContent = file.name;
        });
        if (photoClear) photoClear.addEventListener("click", function () { resetPhoto(); });
    }

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
