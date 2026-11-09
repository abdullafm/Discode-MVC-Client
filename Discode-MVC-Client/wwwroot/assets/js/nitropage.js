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

    // ---------- gifts
    var giftBuy = document.getElementById("nitro-gift-buy");
    if (giftBuy) giftBuy.addEventListener("click", function () { go("/Nitro/GiftCheckout", giftBuy); });

    function copyText(text, button) {
        var done = function () {
            var old = button.textContent;
            button.textContent = "Copied";
            window.setTimeout(function () { button.textContent = old; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function () {});
        else done();
    }

    var giftCopy = document.getElementById("nitro-gift-copy");
    if (giftCopy) giftCopy.addEventListener("click", function () { copyText(document.getElementById("nitro-gift-link").value, giftCopy); });

    var picker = null;
    var pickerLink = "";

    function pickerError(text) {
        var box = picker.querySelector("#gift-send-error");
        box.textContent = text || "";
        box.hidden = !text;
    }

    function openPicker(link) {
        pickerLink = link;
        if (!picker || !picker.isConnected) {
            picker = document.createElement("div");
            picker.className = "dm-modal";
            picker.id = "gift-send-modal";
            picker.setAttribute("role", "dialog");
            picker.setAttribute("aria-modal", "true");
            picker.hidden = true;
            picker.innerHTML =
                '<div class="dm-modal-backdrop" data-close></div>' +
                '<div class="dm-modal-card dm-forward-card">' +
                '<button type="button" class="dm-modal-x" aria-label="Close" data-close><i class="fa-solid fa-xmark"></i></button>' +
                '<h2>Send the gift</h2>' +
                '<p class="dm-modal-text">Pick the friends who get the gift link in their messages.</p>' +
                '<label class="dm-forward-search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="gift-send-search" placeholder="Search" aria-label="Search" autocomplete="off"></label>' +
                '<div class="dm-forward-list" id="gift-send-list"></div>' +
                '<div class="dm-forward-foot"><p class="dm-forward-error" id="gift-send-error" hidden></p><div class="dm-forward-send"><button type="button" id="gift-send-submit" disabled>Send <i class="fa-solid fa-paper-plane"></i></button></div></div>' +
                '</div>';
            document.body.appendChild(picker);
            picker.addEventListener("click", function (event) {
                if (event.target.closest("[data-close]")) picker.hidden = true;
            });
            picker.querySelector("#gift-send-list").addEventListener("change", function () {
                picker.querySelector("#gift-send-submit").disabled = picker.querySelectorAll(".dm-forward-check:checked").length === 0;
            });
            picker.querySelector("#gift-send-search").addEventListener("input", function () {
                var term = this.value.trim().toLowerCase();
                [].forEach.call(picker.querySelectorAll(".dm-forward-item"), function (item) {
                    item.hidden = term.length > 0 && item.getAttribute("data-name").indexOf(term) === -1 && item.getAttribute("data-key").toLowerCase().indexOf(term) === -1;
                });
            });
            picker.querySelector("#gift-send-submit").addEventListener("click", sendGift);
        }
        pickerError("");
        picker.querySelector("#gift-send-list").textContent = "";
        picker.querySelector("#gift-send-search").value = "";
        picker.querySelector("#gift-send-submit").disabled = true;
        picker.hidden = false;
        fetch("/Dm/ForwardTargets", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("targets");
            return response.text();
        }).then(function (html) {
            picker.querySelector("#gift-send-list").innerHTML = html;
        }).catch(function () {
            pickerError("Could not load your friends. Try again.");
        });
    }

    function sendGift() {
        var names = [];
        [].forEach.call(picker.querySelectorAll(".dm-forward-check:checked"), function (box) { names.push(box.value); });
        if (!names.length) return;
        var button = picker.querySelector("#gift-send-submit");
        button.disabled = true;
        pickerError("");
        var sent = 0;
        names.reduce(function (chain, name) {
            return chain.then(function () {
                return fetch("/Dm/Send", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
                    body: JSON.stringify({ userName: name, text: pickerLink })
                }).then(function (response) {
                    if (!response.ok) throw new Error("send");
                    sent++;
                });
            });
        }, Promise.resolve()).then(function () {
            picker.hidden = true;
            fail("");
            var note = document.createElement("p");
            note.className = "nitro-flash is-ok";
            note.setAttribute("role", "status");
            note.innerHTML = '<i class="fa-solid fa-circle-check"></i> ';
            note.appendChild(document.createTextNode(sent === 1 ? "The gift link was sent." : "The gift link was sent to " + sent + " friends."));
            var ready = document.getElementById("nitro-gift-ready");
            if (ready) ready.appendChild(note);
        }).catch(function () {
            pickerError(sent ? "Sent to " + sent + " of " + names.length + " friends. Try the rest again." : "Could not send the link. Try again.");
            button.disabled = false;
        });
    }

    var giftSend = document.getElementById("nitro-gift-send");
    if (giftSend) giftSend.addEventListener("click", function () { openPicker(document.getElementById("nitro-gift-link").value); });

    var giftMine = document.getElementById("nitro-gift-mine");
    if (giftMine) {
        fetch("/Nitro/Gifts", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.ok ? response.json() : [];
        }).then(function (gifts) {
            if (!gifts || !gifts.length) return;
            giftMine.hidden = false;
            var list = document.getElementById("nitro-gift-list");
            list.textContent = "";
            gifts.forEach(function (gift) {
                var row = document.createElement("div");
                row.className = "nitro-gift-item is-" + gift.status;
                var text = document.createElement("span");
                var label = gift.status === "redeemed" ? "Claimed by " + (gift.redeemedByUserName || "someone") : gift.status === "revoked" ? "Taken back" : "Not claimed yet";
                text.textContent = gift.days + " days · " + label;
                row.appendChild(text);
                if (gift.status === "available") {
                    var copy = document.createElement("button");
                    copy.type = "button";
                    copy.textContent = "Copy link";
                    copy.addEventListener("click", function () { copyText(gift.link, copy); });
                    var send = document.createElement("button");
                    send.type = "button";
                    send.textContent = "Send";
                    send.addEventListener("click", function () { openPicker(gift.link); });
                    row.appendChild(copy);
                    row.appendChild(send);
                }
                list.appendChild(row);
            });
        }).catch(function () {});
    }

    // when Nitro starts or ends somewhere else (the webhook, an admin) the page shows it
    document.addEventListener("discode-nitro-changed", function () {
        window.setTimeout(function () { if (window.location.pathname.toLowerCase().indexOf("/nitro") === 0) window.location.reload(); }, 600);
    });
})();
