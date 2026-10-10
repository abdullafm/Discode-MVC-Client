"use strict";
(function () {
    var cats = document.querySelectorAll(".discover-cat");
    if (!cats.length) return;
    for (var i = 0; i < cats.length; i++) {
        cats[i].addEventListener("click", function () {
            var cat = this.getAttribute("data-cat");
            for (var n = 0; n < cats.length; n++) {
                cats[n].classList.toggle("on", cats[n].getAttribute("data-cat") === cat);
            }
        });
    }

    var logoutBtn = document.getElementById("me-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            if (confirm("Are you sure you want to log out?")) {
                window.location.href = "./login.html";
            }
        });
    }
})();
