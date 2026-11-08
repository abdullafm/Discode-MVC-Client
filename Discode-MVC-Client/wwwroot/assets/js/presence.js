"use strict";

(function () {
    if (typeof signalR === "undefined") return;

    var connection = null;
    var watchedProfile = "";

    var IDLE_MS = window.discodeIdleMs || 5 * 60 * 1000;
    var lastActive = Date.now();
    var away = false;

    function sendAway(value) {
        away = value;
        if (isConnected()) connection.invoke("SetAway", value).catch(function () {});
    }

    function markActive() {
        lastActive = Date.now();
        if (away) sendAway(false);
    }

    ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"].forEach(function (name) {
        document.addEventListener(name, markActive, { passive: true, capture: true });
    });
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) markActive();
    });
    window.setInterval(function () {
        if (!away && isConnected() && Date.now() - lastActive >= IDLE_MS) sendAway(true);
    }, Math.max(500, Math.min(10000, IDLE_MS / 3)));

    var offlineTimers = {};

    function applyPresence(data) {
        document.dispatchEvent(new CustomEvent("discode-user-presence", { detail: { userId: data.userId, status: data.status } }));
        if (window.discodeFriends) window.discodeFriends.setPresence(data.userId, data.status);
    }

    function isConnected() {
        return !!connection && connection.state === signalR.HubConnectionState.Connected;
    }

    function joinWatchedProfile() {
        if (watchedProfile && isConnected()) connection.invoke("WatchProfile", watchedProfile).catch(function () {});
    }

    var notifySound = new Audio("/assets/css/audio/notification.mp3");
    var lastSoundAt = 0;

    // no message sound or incoming ring while the status is Do Not Disturb
    function soundAllowed() {
        var panel = document.getElementById("user-panel");
        if (panel && panel.getAttribute("data-status") === "dnd") return false;
        return true;
    }

    window.discodeSoundAllowed = soundAllowed;

    function playNotifySound() {
        if (!soundAllowed()) return;
        var now = Date.now();
        if (now - lastSoundAt < 600) return;
        lastSoundAt = now;
        try {
            notifySound.currentTime = 0;
            var started = notifySound.play();
            if (started && started.catch) started.catch(function () {});
        } catch (error) {}
    }

    window.discodeNotifySound = playNotifySound;

    function playMessageSound() {
        playNotifySound();
    }

    var knownUnread = null;

    function checkNotificationSound() {
        fetch("/Notification/Unread", {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (ids) {
            if (!Array.isArray(ids)) return;
            var arrived = !!knownUnread && ids.some(function (id) { return !knownUnread[id]; });
            knownUnread = {};
            ids.forEach(function (id) { knownUnread[id] = true; });
            if (arrived) playNotifySound();
        }).catch(function () {});
    }

    document.addEventListener("discode-notifications-changed", checkNotificationSound);

    window.discodeIgnored = window.discodeIgnored || {};

    function loadIgnored() {
        fetch("/Home/IgnoredUsers", {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (list) {
            if (!Array.isArray(list)) return;
            var map = {};
            list.forEach(function (name) { map[String(name).toLowerCase()] = true; });
            window.discodeIgnored = map;
            document.dispatchEvent(new CustomEvent("discode-ignore-updated"));
        }).catch(function () {});
    }

    function isIgnored(userName) {
        return !!window.discodeIgnored[String(userName || "").toLowerCase()];
    }

    function soundForDirectMessage(data) {
        var message = data && data.message;
        var conversation = data && data.conversation;
        if (!message || message.mine || message.undelivered || message.isCall) return;
        if (isIgnored(message.senderUserName)) return;
        var watching = document.visibilityState === "visible" && window.discodeOpenDm && conversation && conversation.userName === window.discodeOpenDm;
        if (!watching) playMessageSound();
    }

    function soundForGroupMessage(data) {
        var message = data && data.message;
        if (!message || message.isSystem || message.isCall || isIgnored(message.senderUserName)) return;
        var field = document.getElementById("Update_UserName");
        if (field && message.senderUserName === field.value.trim()) return;
        var chat = document.getElementById("group-chat");
        var watching = document.visibilityState === "visible" && chat && Number(chat.getAttribute("data-group-id")) === data.groupId;
        if (!watching) playMessageSound();
    }

    function soundForServerMessage(data) {
        var message = data && data.message;
        if (!message || isIgnored(message.senderUserName)) return;
        var field = document.getElementById("Update_UserName");
        var me = field ? field.value.trim() : "";
        if (!me || message.senderUserName === me) return;
        var prefs = (window.discodeServerPrefs || {})[data.serverId];
        if (!prefs || prefs.muted || prefs.notify === "nothing") return;
        if (prefs.notify !== "all") {
            var text = String(message.text || "").toLowerCase();
            if (text.indexOf("@" + me.toLowerCase()) === -1 && !/@(everyone|here)\b/.test(text)) return;
        }
        var chat = window.discodeServerChat;
        var watching = document.visibilityState === "visible" && chat && chat.watching && chat.watching(data.serverId, data.channelId);
        if (!watching) playMessageSound();
    }

    function onConnected(pageSwap) {
        window.discodeLive = true;
        if (pageSwap !== true) {
            away = false;
            lastActive = Date.now();
        }
        document.dispatchEvent(new CustomEvent("discode-live-changed"));
        document.dispatchEvent(new CustomEvent("discode-stories-changed"));
        document.dispatchEvent(new CustomEvent("discode-posts-changed"));
        document.dispatchEvent(new CustomEvent("discode-notifications-changed"));
        document.dispatchEvent(new CustomEvent("discode-dm-changed"));
        loadIgnored();
        document.dispatchEvent(new CustomEvent("discode-hub-connected", { detail: { pageSwap: pageSwap === true } }));
        refreshFriends();
        joinWatchedProfile();
    }

    document.addEventListener("discode-page-ready", function () {
        if (isConnected()) onConnected(true);
    });

    var profileTimer = 0;

    function refreshFriends() {
        document.dispatchEvent(new CustomEvent("discode-friends-changed"));
        if (!window.discodeFriends) return;
        if (typeof window.discodeFriends.reload === "function") window.discodeFriends.reload();
        if (typeof window.discodeFriends.reloadFriends === "function") window.discodeFriends.reloadFriends();
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
                    window.clearTimeout(offlineTimers[data.userId]);
                    if (data.status === "offline") {
                        offlineTimers[data.userId] = window.setTimeout(function () { applyPresence(data); }, 3500);
                        return;
                    }
                    applyPresence(data);
                });

                connection.on("ServerMentions", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-mentions", { detail: data }));
                });

                connection.on("DiscoverServer", function (server) {
                    document.dispatchEvent(new CustomEvent("discode-discover-server", { detail: server }));
                });

                connection.on("DiscoverServerRemoved", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-discover-removed", { detail: data }));
                });

                connection.on("StatusChanged", function (status) {
                    document.dispatchEvent(new CustomEvent("discode-status-set", { detail: { status: status } }));
                });

                connection.on("ProfileChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-profile-changed", { detail: { userId: data.userId } }));
                    window.clearTimeout(profileTimer);
                    profileTimer = window.setTimeout(refreshFriends, 300);
                });

                connection.on("FriendsChanged", refreshFriends);

                connection.on("IncomingCall", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-call-incoming", { detail: data }));
                });

                connection.on("CallAccepted", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-call-accepted", { detail: data }));
                });

                connection.on("CallUpdated", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-call-updated", { detail: data }));
                });

                connection.on("CallPeerLeft", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-call-peer", { detail: { callId: data.callId, present: false } }));
                });

                connection.on("CallPeerJoined", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-call-peer", { detail: { callId: data.callId, present: true } }));
                });

                connection.on("CallSignal", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-call-signal", { detail: data }));
                });

                connection.on("CallEnded", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-call-ended", { detail: data }));
                });

                connection.on("AccountWarning", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-account-warning", { detail: data }));
                });

                connection.on("LiveClosedByAdmin", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-live-closed", { detail: data }));
                });

                connection.on("BrandingChanged", function (data) {
                    var logo = (data && data.logoUrl) || "";
                    document.querySelectorAll('[data-brand="logo"]').forEach(function (node) {
                        if (logo) {
                            if (node.tagName === "IMG") {
                                node.src = logo;
                            } else {
                                var img = document.createElement("img");
                                img.setAttribute("data-brand", "logo");
                                img.className = "site-logo";
                                img.alt = "";
                                img.src = logo;
                                img.style.cssText = "width:1em;height:1em;object-fit:contain";
                                node.replaceWith(img);
                            }
                        } else if (node.tagName === "IMG") {
                            var icon = document.createElement("i");
                            icon.setAttribute("data-brand", "logo");
                            icon.className = "fa-brands fa-discord";
                            icon.setAttribute("aria-hidden", "true");
                            node.replaceWith(icon);
                        }
                    });

                    var fav = document.querySelector('link[data-brand="favicon"]');
                    if (fav) fav.href = ((data && data.faviconUrl) || "/assets/icons/favicon.ico") + "?v=" + Date.now();
                });

                connection.on("AccountTimeout", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-account-timeout", { detail: data }));
                });

                connection.on("ForceLogout", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-force-logout", { detail: data }));
                });

                connection.on("AdminChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-admin-changed", { detail: data }));
                });

                connection.on("PostsChanged", function () {
                    document.dispatchEvent(new CustomEvent("discode-posts-changed"));
                });

                connection.on("DirectMessage", function (data) {
                    soundForDirectMessage(data);
                    document.dispatchEvent(new CustomEvent("discode-dm-message", { detail: data }));
                });

                connection.on("DirectMessageCallUpdated", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-dm-call-updated", { detail: data }));
                });

                connection.on("DirectMessageEdited", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-dm-edited", { detail: data }));
                });

                connection.on("DirectMessageDeleted", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-dm-deleted", { detail: data }));
                });

                connection.on("DirectMessagePinned", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-dm-pinned", { detail: data }));
                });

                connection.on("GroupMessage", function (data) {
                    soundForGroupMessage(data);
                    document.dispatchEvent(new CustomEvent("discode-group-message", { detail: data }));
                });

                connection.on("GroupCallIncoming", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-gcall-incoming", { detail: data }));
                });

                connection.on("GroupCallUpdated", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-gcall-updated", { detail: data }));
                });

                connection.on("GroupCallRingStopped", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-gcall-ring-stopped", { detail: data }));
                });

                connection.on("GroupCallSignal", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-gcall-signal", { detail: data }));
                });

                connection.on("GroupMessageDeleted", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-group-message-deleted", { detail: data }));
                });

                connection.on("GroupMessageUpdated", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-group-message-updated", { detail: data }));
                });

                connection.on("GroupUpdated", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-group-updated", { detail: data }));
                });

                connection.on("GroupsChanged", function () {
                    document.dispatchEvent(new CustomEvent("discode-groups-changed"));
                });

                connection.on("DirectMessagePoll", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-dm-poll-updated", { detail: data }));
                });

                connection.on("DirectMessageReaction", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-dm-reaction", { detail: data }));
                });

                connection.on("NotificationsChanged", function () {
                    document.dispatchEvent(new CustomEvent("discode-notifications-changed"));
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

                connection.on("ServersChanged", function () {
                    document.dispatchEvent(new CustomEvent("discode-servers-changed"));
                });

                connection.on("ServerMessage", function (data) {
                    soundForServerMessage(data);
                    document.dispatchEvent(new CustomEvent("discode-server-message", { detail: data }));
                });

                connection.on("ServerMessageDeleted", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-message-deleted", { detail: data }));
                });

                connection.on("ServerMessageUpdated", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-message-updated", { detail: data }));
                });

                connection.on("ServerChannelsChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-channels-changed", { detail: data }));
                });

                connection.on("ServerRemoved", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-removed", { detail: data }));
                });

                connection.on("ServerBansChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-bans-changed", { detail: data }));
                });

                connection.on("ServerAuditChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-audit-changed", { detail: data }));
                });

                connection.on("ServerVoiceSignal", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-voice-signal", { detail: data }));
                });

                connection.on("ServerVoiceModerated", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-voice-moderated", { detail: data }));
                });

                connection.on("ServerVoiceChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-voice-changed", { detail: data }));
                });

                connection.on("UserTyping", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-typing", { detail: data }));
                });

                connection.on("NitroChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-nitro-changed", { detail: data }));
                });

                connection.on("ServerBoostChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-boost-changed", { detail: data }));
                });

                connection.on("ServerRolesChanged", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-roles-changed", { detail: data }));
                });

                connection.on("ServerUpdated", function (data) {
                    document.dispatchEvent(new CustomEvent("discode-server-updated", { detail: data }));
                });

                connection.on("IgnoreChanged", function () {
                    loadIgnored();
                });

                connection.on("GuestRequested", function (guest) {
                    document.dispatchEvent(new CustomEvent("discode-live-guest-requested", { detail: guest }));
                });

                connection.on("LiveModeratorChanged", function (streamId, isModerator) {
                    document.dispatchEvent(new CustomEvent("discode-live-moderator", { detail: { streamId: streamId, isModerator: isModerator } }));
                });

                connection.on("LiveMuteChanged", function (streamId, muted, until) {
                    document.dispatchEvent(new CustomEvent("discode-live-mute", { detail: { streamId: streamId, muted: muted, until: until } }));
                });

                connection.on("GuestInvited", function (invite) {
                    document.dispatchEvent(new CustomEvent("discode-live-guest-invited", { detail: invite }));
                });

                connection.on("GuestInviteAnswered", function (streamId, accepted, name) {
                    document.dispatchEvent(new CustomEvent("discode-live-guest-invite-answered", { detail: { streamId: streamId, accepted: accepted, name: name } }));
                });

                connection.on("GuestResponse", function (streamId, accepted) {
                    document.dispatchEvent(new CustomEvent("discode-live-guest-response", { detail: { streamId: streamId, accepted: accepted } }));
                });

                connection.on("GuestStarted", function (guest) {
                    document.dispatchEvent(new CustomEvent("discode-live-guest-started", { detail: guest }));
                });

                connection.on("GuestEnded", function (streamId, connectionId) {
                    document.dispatchEvent(new CustomEvent("discode-live-guest-ended", { detail: { streamId: streamId, connectionId: connectionId } }));
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

                connection.on("StoryViewsChanged", function (storyId) {
                    document.dispatchEvent(new CustomEvent("discode-story-views-changed", { detail: { storyId: storyId } }));
                });

                connection.on("LiveHeart", function (streamId) {
                    document.dispatchEvent(new CustomEvent("discode-live-heart", { detail: { streamId: streamId } }));
                });

                connection.onreconnecting(function () { window.discodeLive = false; });
                connection.onclose(function () { window.discodeLive = false; });
                connection.onreconnected(function () { onConnected(); });

                return connection.start().then(function () { onConnected(); });
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
