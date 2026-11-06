(function () {
    "use strict";

    window.discodeFriends = window.discodeFriends || {};

    function reload() {
        if (window.discodeFriends.reload) window.discodeFriends.reload();
    }

    function token() {
        var input = document.querySelector("input[name='__RequestVerificationToken']");
        return input ? input.value : "";
    }

    function post(action, fields) {
        var body = new URLSearchParams();
        Object.keys(fields).forEach(function (key) { body.append(key, fields[key]); });
        body.append("__RequestVerificationToken", token());
        return fetch("/Friend/" + action, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: body.toString()
        });
    }

    window.discodeFriends.post = post;

    window.discodeFriends.respond = function (requestId, accept) {
        return post(accept ? "Accept" : "Decline", { id: requestId })
            .then(function (response) {
                if (response.ok) reload();
                return response.ok;
            })
            .catch(function () { return false; });
    };

    window.discodeFriends.send = function (user, button) {
        var username = user && (user.username || user.userName || "");
        var userId = user && (user.id || user.userId || "");
        if ((!username && !userId) || !button) return;
        button.disabled = true;
        post("Send", { userName: username, userId: userId || "" })
            .then(function (response) {
                return response.json().then(function (data) {
                    return { ok: response.ok, data: data || {} };
                }).catch(function () {
                    return { ok: response.ok, data: {} };
                });
            })
            .then(function (result) {
                var message = result.data && result.data.errors && result.data.errors[0]
                    ? String(result.data.errors[0])
                    : "";
                var already = !result.ok && message.toLowerCase().indexOf("already") !== -1;
                if (!result.ok && !already) {
                    button.disabled = false;
                    var span = button.querySelector("span") || button;
                    var prev = span === button ? button.innerHTML : span.textContent;
                    if (span === button) button.innerHTML = message || "Couldn't send";
                    else span.textContent = message || "Couldn't send";
                    setTimeout(function () {
                        if (span === button) button.innerHTML = prev;
                        else span.textContent = prev;
                    }, 2500);
                    return;
                }
                button.classList.add("button-sent");
                button.disabled = true;
                button.innerHTML = '<i class="fa-solid fa-check"></i><span>Request Sent</span>';
                reload();
            })
            .catch(function () {
                button.disabled = false;
            });
    };
})();
