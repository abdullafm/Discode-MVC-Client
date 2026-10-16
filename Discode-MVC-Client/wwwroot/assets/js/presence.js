"use strict";

(function () {
    if (typeof signalR === "undefined") return;

    var connection = null;

    function loadFriends() {
        if (window.discodeFriends) window.discodeFriends.reloadFriends();
    }

    function connect() {
        fetch("/Home/HubToken", {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (info) {
                if (!info) return null;

                connection = new signalR.HubConnectionBuilder()
                    .withUrl(info.hubUrl, { accessTokenFactory: function () { return info.token; } })
                    .withAutomaticReconnect()
                    .build();

                connection.on("PresenceChanged", function (data) {
                    if (window.discodeFriends) window.discodeFriends.setPresence(data.userId, data.status);
                });

                connection.on("StatusChanged", function (status) {
                    document.dispatchEvent(new CustomEvent("discode-status-set", { detail: { status: status } }));
                });

                connection.onreconnected(loadFriends);

                return connection.start().then(loadFriends);
            })
            .catch(function () {});
    }

    document.addEventListener("discode-status-change", function (event) {
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
        connection.invoke("SetStatus", event.detail.status).catch(function () {});
    });

    connect();
})();
