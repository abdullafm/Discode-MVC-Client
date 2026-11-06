"use strict";

(function () {
    var box = document.querySelector(".notify-box");
    if (!box) return;

    var closeTimer = null;

    function panel() { return document.getElementById("notify-panel"); }
    function opener() { return document.getElementById("notify-open"); }

    function openPanel() {
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }
        var target = panel();
        target.hidden = false;
        void target.offsetWidth;
        box.classList.add("open");
        opener().setAttribute("aria-expanded", "true");
    }

    function closePanel() {
        box.classList.remove("open");
        opener().setAttribute("aria-expanded", "false");
        closeTimer = setTimeout(function () {
            if (!box.classList.contains("open")) panel().hidden = true;
        }, 180);
    }

    function refresh() {
        return fetch("/Home/Index", {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        })
            .then(function (response) { return response.ok ? response.text() : ""; })
            .then(function (html) {
                if (!html) return;
                var fresh = new DOMParser().parseFromString(html, "text/html").querySelector(".notify-box");
                if (!fresh) return;
                var wasOpen = box.classList.contains("open");
                box.innerHTML = fresh.innerHTML;
                if (wasOpen) {
                    panel().hidden = false;
                    opener().setAttribute("aria-expanded", "true");
                }
            })
            .catch(function () {});
    }

    document.addEventListener("click", function (event) {
        if (event.target.closest("#notify-open")) {
            if (box.classList.contains("open")) closePanel();
            else openPanel();
            return;
        }
        if (!box.contains(event.target)) {
            if (box.classList.contains("open")) closePanel();
            return;
        }
        var item = event.target.closest(".notify-item");
        if (item && !event.target.closest("a, button, form")) {
            var link = item.querySelector("a.notify-content");
            if (link) window.discodeGo(link.href);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && box.classList.contains("open")) closePanel();
    });

    document.addEventListener("submit", function (event) {
        var form = event.target.closest && event.target.closest("form[data-notify-form]");
        if (!form || event.defaultPrevented) return;
        event.preventDefault();
        fetch(form.getAttribute("action"), {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: new URLSearchParams(new FormData(form)).toString()
        }).then(function (response) {
            if (!response.ok) throw new Error("notification action");
            return refresh();
        }).catch(function () {
            form.removeAttribute("data-notify-form");
            form.submit();
        });
    });

    document.addEventListener("discode-notifications-changed", refresh);
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) refresh();
    });
})();
