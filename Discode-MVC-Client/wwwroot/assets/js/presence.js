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
        document.dispatchEvent(new CustomEvent("discode-live-changed"));
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

                connection.on("StoriesChanged", function () {
                    document.dispatchEvent(new CustomEvent("discode-stories-changed"));
                });

                connection.on("LiveChanged", function () {
                    document.dispatchEvent(new CustomEvent("discode-live-changed"));
                });

                connection.on("LiveViewers", function (streamId, count) {
                    document.dispatchEvent(new CustomEvent("discode-live-viewers", { detail: { streamId: streamId, count: count } }));
                });

                connection.on("LiveEnded", function (streamId) {
                    document.dispatchEvent(new CustomEvent("discode-live-ended", { detail: { streamId: streamId } }));
                });

                connection.on("ViewerJoined", function (streamId, connectionId) {
                    document.dispatchEvent(new CustomEvent("discode-live-viewer-joined", { detail: { streamId: streamId, connectionId: connectionId } }));
                });

                connection.on("ViewerLeft", function (streamId, connectionId) {
                    document.dispatchEvent(new CustomEvent("discode-live-viewer-left", { detail: { streamId: streamId, connectionId: connectionId } }));
                });

                connection.on("ReceiveSignal", function (streamId, from, payload) {
                    document.dispatchEvent(new CustomEvent("discode-live-signal", { detail: { streamId: streamId, from: from, payload: payload } }));
                });

                connection.on("LiveMessage", function (message) {
                    document.dispatchEvent(new CustomEvent("discode-live-message", { detail: message }));
                });

                connection.on("LiveJoined", function (viewer) {
                    document.dispatchEvent(new CustomEvent("discode-live-joined", { detail: viewer }));
                });

                connection.on("LiveHeart", function (streamId) {
                    document.dispatchEvent(new CustomEvent("discode-live-heart", { detail: { streamId: streamId } }));
                });

                connection.onreconnecting(function () { window.discodeLive = false; });
                connection.onclose(function () { window.discodeLive = false; });
                connection.onreconnected(onConnected);

                return connection.start().then(onConnected);
            })
            .catch(function () {});
    }

    window.discodePresence = {
        invoke: function () {
            if (!isConnected()) return Promise.reject(new Error("Live connection is not ready yet."));
            return connection.invoke.apply(connection, arguments);
        },
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
