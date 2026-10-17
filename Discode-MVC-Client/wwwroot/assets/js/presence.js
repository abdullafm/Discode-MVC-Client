"use strict";

(function () {
    if (typeof signalR === "undefined") return;

    var connection = null;
    var watchedProfile = "";

    function isConnected() {
        return !!connection && connection.state === signalR.HubConnectionState.Connected;
    }

    function joinWatchedProfile() {
        if (watchedProfile && isConnected()) connection.invoke("WatchProfile", watchedProfile).catch(function () {});
    }

    function onConnected() {
        window.discodeLive = true;
        refreshFriends();
        joinWatchedProfile();
    }

    function refreshFriends() {
        if (!window.discodeFriends) return;
        window.discodeFriends.reload();
        window.discodeFriends.reloadFriends();
        document.dispatchEvent(new CustomEvent("discode-friends-changed"));
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

                connection.on("ProfileChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-profile-changed", { detail: { userId: data.userId } }));
                });

                connection.on("FriendsChanged", refreshFriends);

                connection.on("PostsChanged", function () {
                    document.dispatchEvent(new CustomEvent("discode-posts-changed"));
                });

                connection.onreconnecting(function () { window.discodeLive = false; });
                connection.onclose(function () { window.discodeLive = false; });
                connection.onreconnected(onConnected);

                return connection.start().then(onConnected);
            })
            .catch(function () {});
    }

    window.discodePresence = {
        watchProfile: function (userId) {
            if (!userId || userId === watchedProfile) return;
            window.discodePresence.unwatchProfile();
            watchedProfile = userId;
            joinWatchedProfile();
        },
        unwatchProfile: function () {
            var previous = watchedProfile;
            watchedProfile = "";
            if (previous && isConnected()) connection.invoke("UnwatchProfile", previous).catch(function () {});
        }
    };

    document.addEventListener("discode-status-change", function (event) {
        if (!isConnected()) return;
        connection.invoke("SetStatus", event.detail.status).catch(function () {});
    });

    connect();
})();
