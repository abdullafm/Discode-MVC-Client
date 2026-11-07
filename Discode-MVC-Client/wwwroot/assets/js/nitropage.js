(function () {
    "use strict";

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function fail(message) {
        var box = document.getElementById("nitro-error");
        if (!box) return;
        box.hidden = !message;
        box.textContent = message || "";
    }

    // asks the site for an address (Stripe's pages) and goes there
    function go(url, button) {
        fail("");
        button.disabled = true;
        fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok || !body.url) throw new Error((body && body.errors && body.errors[0]) || "That did not work. Try again.");
                window.location.href = body.url;
            });
        }).catch(function (error) {
            button.disabled = false;
            fail(error.message);
        });
    }

    var subscribe = document.getElementById("nitro-subscribe");
    if (subscribe) subscribe.addEventListener("click", function () { go("/Nitro/Subscribe", subscribe); });
    var manage = document.getElementById("nitro-manage");
    if (manage) manage.addEventListener("click", function () { go("/Nitro/Manage", manage); });

    // when Nitro starts or ends somewhere else (the webhook, an admin) the page shows it
    document.addEventListener("discode-nitro-changed", function () {
        window.setTimeout(function () { if (window.location.pathname.toLowerCase().indexOf("/nitro") === 0) window.location.reload(); }, 600);
    });
})();
