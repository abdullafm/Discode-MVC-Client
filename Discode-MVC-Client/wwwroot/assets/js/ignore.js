(function () {
    "use strict";

    var boxes = [document.getElementById("dm-messages"), document.getElementById("group-messages")].filter(Boolean);
    if (!boxes.length) return;

    function apply() {
        var ignored = window.discodeIgnored || {};
        boxes.forEach(function (box) {
            [].forEach.call(box.querySelectorAll(".dm-msg[data-sender]"), function (row) {
                var hide = !!ignored[String(row.getAttribute("data-sender")).toLowerCase()];
                row.classList.toggle("is-ignored", hide);
                if (!hide) row.classList.remove("show-ignored");
            });
        });
    }

    var queued = false;

    function schedule() {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
            queued = false;
            apply();
        });
    }

    boxes.forEach(function (box) {
        new MutationObserver(schedule).observe(box, { childList: true, subtree: true });
        box.addEventListener("click", function (event) {
            var row = event.target.closest(".dm-msg.is-ignored");
            if (!row || row.classList.contains("show-ignored")) return;
            event.preventDefault();
            event.stopPropagation();
            row.classList.add("show-ignored");
        }, true);
    });

    document.addEventListener("discode-ignore-updated", apply);
    apply();
})();
