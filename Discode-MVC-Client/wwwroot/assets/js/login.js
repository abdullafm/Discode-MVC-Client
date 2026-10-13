"use strict";
(function () {
    var form = document.getElementById("login-form");
    if (!form) return;

    var email = document.getElementById("login-email");
    var password = document.getElementById("login-pass");
    var inputs = [email, password];

    for (var i = 0; i < inputs.length; i++) {
        if (!inputs[i]) continue;
        inputs[i].addEventListener("keydown", function (event) {
            if (event.key === " " && this.selectionStart === 0) event.preventDefault();
        });
        inputs[i].addEventListener("input", function () {
            this.value = this.value.replace(/^\s+/, "");
        });
    }

    form.addEventListener("submit", function (event) {
        if (!email || !password || !email.value.trim() || !password.value.trim()) {
            event.preventDefault();
            var empty = email && !email.value.trim() ? email : password;
            if (empty) empty.focus();
        }
    });
})();

(function () {
    var code = document.getElementById("verify-code");
    if (!code) return;
    code.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "").slice(0, 4);
    });
})();
