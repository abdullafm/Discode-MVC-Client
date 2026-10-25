"use strict";
(function () {
    var channelList = document.getElementById("server-channel-list");
    var chat = document.getElementById("server-chat");
    var voice = document.getElementById("server-voice");
    var settings = document.getElementById("server-settings");
    var roomName = document.getElementById("server-room-name");
    var voiceName = document.getElementById("server-voice-name");
    var menu = document.getElementById("server-menu");
    var menuOpen = document.getElementById("server-menu-open");
    var input = document.getElementById("server-input");
    var roomKind = "text";
    var openId = new URLSearchParams(window.location.search).get("id");
    var isOwner = false;

    function canManageServer(server) {
        if (!server) return false;
        if (server.canManage === true || server.owner === true || server.isOwner === true) return true;
        var role = String(server.role || server.membership || "").toLowerCase();
        return role === "owner" || role === "admin";
    }

    function checkServerOwnership() {
        var urlParams = new URLSearchParams(window.location.search);
        var role = (urlParams.get("role") || urlParams.get("membership") || "").toLowerCase();
        var owner = urlParams.get("owner") || urlParams.get("isOwner") || urlParams.get("manage");
        if (role === "member" || owner === "false" || owner === "0") return false;
        if (role === "owner" || owner === "true" || owner === "1") return true;

        var serverId = (openId || "azaan").toLowerCase();
        var savedRole = localStorage.getItem("discode-server-role-" + serverId);
        if (savedRole === "member") return false;
        if (savedRole === "owner") return true;

        if (openId && openId.toLowerCase() !== "azaan") {
            try {
                var createdServers = JSON.parse(localStorage.getItem("discode-servers") || "[]");
                var isCreated = createdServers.some(function (s) {
                    return String(s.id).toLowerCase() === openId.toLowerCase();
                });
                if (isCreated) return true;
            } catch (e) {}
            return false;
        }

        return pageCanManage();
    }

    function setManage(open) {
        isOwner = !!open;
        var manageOnly = document.querySelectorAll("#server-settings-open, [data-create='channel'], [data-create='category'], [data-edit-channel], [data-delete-channel], [data-delete-category], #server-welcome-edit, #channel-edit-delete");
        for (var m = 0; m < manageOnly.length; m++) manageOnly[m].hidden = !isOwner;


        if (channelList) channelList.classList.toggle("can-sort", isOwner);
        if (currentChannel) selectChannel(currentChannel, true);
    }

    function pageCanManage() {
        var wrap = document.querySelector(".server-banner-wrap");
        if (!wrap) return false;
        var attr = wrap.getAttribute("data-can-manage");
        if (attr === "false" || attr === "0") return false;
        return wrap.hasAttribute("data-can-manage");
    }

    // Dynamic server name from query param if provided (e.g. ?name=T O P L U M #YIKILMIYOR)
    var urlServerName = new URLSearchParams(window.location.search).get("name");
    if (urlServerName) {
        var st = document.getElementById("server-title");
        if (st) st.textContent = urlServerName;
    }

    setManage(checkServerOwnership());
    var currentServer = null;

    function loadServer(first) {
        fetch("/Server/Get?id=" + encodeURIComponent(openId || "azaan"), { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("server");
            return response.json();
        }).then(function (server) {
            currentServer = server;
            var title = document.getElementById("server-title");
            if (title && server.name) title.textContent = server.name;
            applyChannelAccess(server);
            setManage(canManageServer(server));
            if (first) runPendingAction();
        }).catch(function () {
            if (first) setManage(checkServerOwnership());
        });
    }

    loadServer(true);

    function refreshMembers(event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(openId)) return;
        fetch("/Server/Get?id=" + encodeURIComponent(openId || "azaan"), { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (server) {
            if (!server || !Array.isArray(server.members)) return;
            serverMembers = server.members;
            paintServerMembers();
        }).catch(function () {});
    }

    document.addEventListener("discode-server-updated", refreshMembers);
    document.addEventListener("discode-profile-changed", function () { refreshMembers(null); });
    document.addEventListener("discode-user-presence", function (event) {
        var data = event.detail || {};
        var touched = false;
        for (var i = 0; i < serverMembers.length; i++) {
            if (serverMembers[i] && serverMembers[i].id === data.userId) {
                serverMembers[i].status = data.status;
                touched = true;
            }
        }
        if (touched) paintServerMembers();
    });

    function runPendingAction() {
        var wanted = new URLSearchParams(window.location.search).get("do");
        if (!wanted) return;
        try {
            var cleaned = new URL(window.location.href);
            cleaned.searchParams.delete("do");
            window.history.replaceState(window.history.state, "", cleaned.pathname + cleaned.search);
        } catch (error) {}
        window.setTimeout(function () {
            if (wanted.indexOf("settings:") === 0) {
                var open = document.getElementById("server-settings-open");
                if (open) open.click();
                var panel = document.querySelector(".server-settings-nav [data-panel='" + wanted.slice(9) + "']");
                if (panel) panel.click();
                return;
            }
            var targets = {
                invite: "[data-invite='server']",
                channel: "[data-create='channel']",
                category: "[data-create='category']",
                leave: "#server-leave-open"
            };
            var button = targets[wanted] ? document.querySelector(targets[wanted]) : null;
            if (button) button.click();
        }, 250);
    }

    window.setServerRole = function (role) {
        var serverId = (openId || "azaan").toLowerCase();
        localStorage.setItem("discode-server-role-" + serverId, role === "owner" ? "owner" : "member");
        setManage(role === "owner");
    };
    if (openId) {
        var marks = document.querySelectorAll(".server-nav a[data-id]");
        for (var n = 0; n < marks.length; n++) {
            if (marks[n].getAttribute("data-id") === openId) marks[n].classList.add("on");
        }
    }

    function showRoom(kind) {
        if (kind !== "settings") roomKind = kind;
        if (chat) chat.hidden = kind !== "text";
        if (voice) voice.hidden = kind !== "voice";
        if (settings) settings.hidden = kind !== "settings";
    }

    function openOnPhone() {
        if (window.matchMedia("(max-width: 720px)").matches) document.querySelector("main").classList.add("show-main");
    }

    var currentChannel = null;
    var joinedVoice = null;
    var voiceMembers = [];
    var serverMembers = [];
    var serverCreator = "";
    var voiceFeeds = { camera: "", screen: "" };
    var threads = {};
    var messageBox = document.getElementById("server-message-list");
    var voiceStatus = document.getElementById("server-voice-status");
    var voiceJoin = document.getElementById("server-voice-join");
    var voiceLeave = document.getElementById("server-voice-leave");
    var joinVoiceSound = new Audio("/assets/css/audio/join-voice.mp3");

    function channelTitle(button) {
        var nameNode = button ? button.querySelector(".server-channel-name") : null;
        return nameNode ? nameNode.textContent.trim() : "";
    }

    function channelKey(button) {
        return (button.getAttribute("data-kind") || "text") + ":" + channelTitle(button);
    }

    function meProfile() {
        var nameNode = document.querySelector("#user-panel .me-display");
        var photo = document.querySelector("#user-panel .avatar img");
        return {
            name: nameNode && nameNode.textContent.trim() ? nameNode.textContent.trim() : "Anonymou5",
            photo: photo ? photo.getAttribute("src") : "/assets/img/img-icon-profile.jpeg"
        };
    }

    function serverApi(path) {
        return "/api/servers/" + encodeURIComponent(openId || "azaan") + path;
    }

    function canPostIn(button) {
        return !!button && button.getAttribute("data-kind") !== "voice" && button.getAttribute("data-send") !== "0";
    }

    function canJoinVoice(button) {
        return !!button && button.getAttribute("data-kind") === "voice" && button.getAttribute("data-join") === "1";
    }

    function applyChannelAccess(server) {
        if (!server || !channelList) return;
        var buttons = channelList.querySelectorAll(".server-channel");
        var channels = server.channels || [];
        for (var c = 0; c < channels.length; c++) {
            var channel = channels[c];
            for (var i = 0; i < buttons.length; i++) {
                if (channelTitle(buttons[i]) !== channel.name) continue;
                buttons[i].setAttribute("data-send", channel.canSend ? "1" : "0");
                if (buttons[i].getAttribute("data-kind") === "voice") buttons[i].setAttribute("data-join", channel.canJoin ? "1" : "0");
            }
        }
        var oldVoiceMembersLength = voiceMembers.length;
        voiceMembers = server.voice && server.voice.members ? server.voice.members : [];
        serverMembers = server.members || server.people || [];
        serverCreator = creatorKey(server.createdBy || server.creator || server.ownerId || (server.owner && server.owner !== true ? server.owner : ""));
        paintServerMembers();
        if (voiceMembers.length > oldVoiceMembersLength && joinedVoice) {
            joinVoiceSound.currentTime = 0;
            joinVoiceSound.play().catch(function() {});
        }
        voiceFeeds.camera = feedUrl(server.voice && server.voice.camera, "camera");
        voiceFeeds.screen = feedUrl(server.voice && server.voice.screen, "screen");
        joinedVoice = null;
        if (server.voice && server.voice.channel) {
            for (var j = 0; j < buttons.length; j++) {
                if (buttons[j].getAttribute("data-kind") === "voice" && channelTitle(buttons[j]) === server.voice.channel) joinedVoice = buttons[j];
            }
        }
    }

    function messageList(payload) {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.messages)) return payload.messages;
        return [];
    }

    function paintMessages(button) {
        if (!messageBox) return;
        var list = threads[channelKey(button)] || [];
        var tpl = document.getElementById("server-message-row");
        while (messageBox.firstChild) messageBox.removeChild(messageBox.firstChild);
        for (var i = 0; i < list.length; i++) {
            if (!tpl) break;
            var item = list[i];
            var row = tpl.content.firstElementChild.cloneNode(true);
            var photo = row.querySelector("img");
            if (photo) photo.src = item.photo || item.avatar || "/assets/img/img-icon-profile.jpeg";
            var name = row.querySelector("strong");
            if (name) name.textContent = item.name || item.author || "";
            var time = row.querySelector("time");
            if (time) time.textContent = item.time || "";
            var text = row.querySelector("p");
            if (text) text.textContent = item.text || item.content || "";
            messageBox.appendChild(row);
        }
        messageBox.scrollTop = messageBox.scrollHeight;
    }

    function loadMessages(button) {
        if (!button) return;
        var key = channelKey(button);
        fetch(serverApi("/channels/" + encodeURIComponent(channelTitle(button)) + "/messages")).then(function (response) {
            if (!response.ok) throw new Error("messages");
            return response.json();
        }).then(function (payload) {
            threads[key] = messageList(payload);
            if (currentChannel === button) paintMessages(button);
        }).catch(function () {
            threads[key] = [];
            if (currentChannel === button) paintMessages(button);
        });
    }

    var voiceClock = 0;
    var voiceStarted = 0;

    function voiceSlot(button) {
        var row = button.closest(".server-channel-row") || button;
        var next = row.nextElementSibling;
        if (next && next.classList.contains("server-voice-people")) return next;
        return null;
    }

    function tickVoiceClock() {
        var marks = channelList ? channelList.querySelectorAll(".server-voice-live") : [];
        for (var i = 0; i < marks.length; i++) marks[i].hidden = true;
        if (!joinedVoice) return;
        var live = joinedVoice.querySelector(".server-voice-live");
        if (!live) return;
        var seconds = Math.max(0, Math.floor((Date.now() - voiceStarted) / 1000));
        var minutes = Math.floor(seconds / 60);
        var rest = seconds % 60;
        live.hidden = false;
        live.textContent = minutes + ":" + (rest < 10 ? "0" : "") + rest;
    }

    function paintVoice() {
        if (!channelList) return;
        var me = meProfile();
        var buttons = channelList.querySelectorAll(".server-channel[data-kind='voice']");
        for (var i = 0; i < buttons.length; i++) {
            var slot = voiceSlot(buttons[i]);
            var here = buttons[i] === joinedVoice;
            buttons[i].classList.toggle("joined", here);
            if (!slot) continue;
            slot.hidden = !here;
            if (!here) continue;
            var photo = slot.querySelector("img");
            var who = slot.querySelector("strong");
            if (photo) photo.src = me.photo;
            if (who) who.textContent = me.name;
        }
        var face = document.getElementById("server-voice-face");
        var person = document.getElementById("server-voice-person");
        if (face) face.src = me.photo;
        if (person) person.textContent = me.name;
        var looking = currentChannel && currentChannel.getAttribute("data-kind") === "voice";
        var inside = looking && currentChannel === joinedVoice;
        var blocked = looking && !canJoinVoice(currentChannel);
        var lobby = document.getElementById("server-voice-lobby");
        var call = document.getElementById("server-voice-call");
        var dock = document.getElementById("server-voice-dock");
        var bar = document.getElementById("server-voice-bar");
        var where = document.getElementById("server-voice-bar-where");
        var side = document.querySelector(".server-channels");
        if (lobby) lobby.hidden = inside;
        if (call) call.hidden = !inside;
        if (dock) dock.hidden = !inside;
        if (bar) bar.hidden = !joinedVoice;
        if (side) side.classList.toggle("voice-on", !!joinedVoice);
        if (where && joinedVoice) {
            var serverTitle = document.getElementById("server-title");
            var server = serverTitle && serverTitle.textContent.trim() ? serverTitle.textContent.trim() : "Server";
            where.textContent = channelTitle(joinedVoice) + " / " + server;
        }
        if (voiceStatus) {
            if (blocked) voiceStatus.textContent = "You can't join this voice channel.";
            else voiceStatus.textContent = "Voice room";
        }
        if (voiceJoin) voiceJoin.hidden = !looking || inside || blocked;
        if (voiceLeave) voiceLeave.hidden = true;
        tickVoiceClock();
        paintVoiceMute();
        syncVoiceFeeds();
        paintServerMembers();
    }

    function creatorKey(value) {
        if (!value || value === true) return "";
        if (typeof value === "string" || typeof value === "number") return String(value).trim().toLowerCase();
        return String(value.id || value.userId || value.name || value.displayName || value.username || "").trim().toLowerCase();
    }

    function memberKey(member) {
        return String(member.name || member.displayName || member.username || member.id || member.userId || "").trim().toLowerCase();
    }

    function isServerCreator(member) {
        if (!member) return false;
        if (member.creator === true || member.createdServer === true || member.owner === true || member.isOwner === true) return true;
        var name = String(member.name || member.displayName || member.username || "").trim().toLowerCase();
        var id = String(member.id || member.userId || "").trim().toLowerCase();
        if (serverCreator && ((name && name === serverCreator) || (id && id === serverCreator))) return true;
        return false;
    }

    function memberPresence(member) {
        var status = String(member.status || member.presence || "offline").toLowerCase();
        if (status === "do not disturb" || status === "donotdisturb" || status === "busy") status = "dnd";
        if (status === "away") status = "idle";
        if (status === "online" || status === "idle" || status === "dnd") return status;
        return "offline";
    }

    function memberInVoice(member) {
        if (member.self && joinedVoice) return true;
        if (member.voice === true || member.inVoice === true) return true;
        if (member.voiceChannel || member.channel) return true;
        var name = member.name || member.displayName || member.username || "";
        for (var i = 0; i < voiceMembers.length; i++) {
            var who = voiceMembers[i];
            var label = typeof who === "string" ? who : (who.name || who.displayName || who.username || "");
            if (label && label === name) return true;
        }
        return false;
    }

    function localMe() {
        var me = meProfile();
        var saved = {};
        try {
            saved = JSON.parse(localStorage.getItem("discode-me")) || {};
        } catch (e) {
            saved = {};
        }
        var note = "";
        if (saved.bio || saved.emoji) note = (saved.emoji ? saved.emoji + " " : "") + (saved.bio || "");
        return {
            name: saved.displayName || me.name,
            photo: me.photo,
            status: saved.status || "online",
            statusText: note.trim(),
            self: true
        };
    }

    function sameMember(member, me) {
        var name = String(member.name || member.displayName || member.username || "").toLowerCase();
        return (name && name === String(me.name || "").toLowerCase()) || member.self === true || member.me === true || member.isSelf === true;
    }

    function paintServerMembers() {
        var list = document.getElementById("server-member-list");
        if (!list) return;
        var me = localMe();
        var source = Array.isArray(serverMembers) ? serverMembers.slice() : [];
        var people = [];
        var sawMe = false;
        for (var i = 0; i < source.length; i++) {
            var raw = source[i];
            if (typeof raw === "string") raw = { name: raw };
            if (!raw) continue;
            if (sameMember(raw, me)) {
                sawMe = true;
                raw = {
                    name: me.name,
                    photo: raw.photo || raw.avatar || me.photo,
                    status: me.status,
                    statusText: me.statusText || raw.statusText || raw.customStatus || raw.activity || "",
                    creator: raw.creator === true || raw.createdServer === true || raw.owner === true || raw.isOwner === true,
                    id: raw.id || raw.userId || "",
                    self: true,
                    voice: raw.voice,
                    inVoice: raw.inVoice,
                    voiceChannel: raw.voiceChannel,
                    channel: raw.channel
                };
            }
            people.push(raw);
        }
        if (!sawMe) people.unshift(me);
        var online = [];
        var offline = [];
        for (var p = 0; p < people.length; p++) {
            var presence = memberPresence(people[p]);
            var row = {
                name: people[p].name || people[p].displayName || people[p].username || "Member",
                photo: people[p].photo || people[p].avatar || people[p].avatarUrl || "/assets/img/img-icon-profile.jpeg",
                status: presence,
                owner: isServerCreator(people[p]),
                voice: memberInVoice(people[p]),
                statusText: people[p].statusText || people[p].customStatus || people[p].activity || "",
                self: people[p].self === true,
                handle: people[p].username || people[p].userName || people[p].handle || "",
                about: people[p].about || people[p].bio || ""
            };
            if (presence === "offline") offline.push(row);
            else online.push(row);
        }
        function byName(a, b) {
            return a.name.localeCompare(b.name);
        }
        online.sort(byName);
        offline.sort(byName);
        while (list.firstChild) list.removeChild(list.firstChild);
        function addGroup(title, rows) {
            if (!rows.length) return;
            var group = document.createElement("div");
            group.className = "server-member-group";
            var label = document.createElement("p");
            label.className = "server-member-label";
            label.textContent = title + " — " + rows.length;
            group.appendChild(label);
            for (var n = 0; n < rows.length; n++) {
                var item = rows[n];
                var button = document.createElement("button");
                button.type = "button";
                button.className = "server-member" + (item.status === "offline" ? " is-offline" : "");
                button.setAttribute("data-status", item.status);
                button.setAttribute("data-name", item.name);
                if (item.self) button.setAttribute("data-self", "1");
                if (item.handle) button.setAttribute("data-handle", item.handle);
                if (item.bio) button.setAttribute("data-bio", item.bio);
                if (item.statusText) button.setAttribute("data-note", item.statusText);
                var face = document.createElement("span");
                face.className = "server-member-face";
                var img = document.createElement("img");
                img.src = item.photo;
                img.alt = "";
                var dot = document.createElement("span");
                dot.className = "server-member-dot";
                face.appendChild(img);
                face.appendChild(dot);
                var copy = document.createElement("span");
                copy.className = "server-member-copy";
                var line = document.createElement("span");
                line.className = "server-member-line";
                var name = document.createElement("span");
                name.className = "server-member-name";
                name.textContent = item.name;
                line.appendChild(name);
                if (item.owner) {
                    var crown = document.createElement("i");
                    crown.className = "fa-solid fa-crown server-member-crown";
                    crown.setAttribute("aria-label", "Server owner");
                    line.appendChild(crown);
                }
                copy.appendChild(line);
                if (item.voice) {
                    var voice = document.createElement("small");
                    voice.className = "server-member-voice";
                    var speaker = document.createElement("i");
                    speaker.className = "fa-solid fa-volume-high";
                    voice.appendChild(speaker);
                    voice.appendChild(document.createTextNode(" In voice"));
                    copy.appendChild(voice);
                } else if (item.statusText) {
                    var note = document.createElement("small");
                    note.textContent = item.statusText;
                    copy.appendChild(note);
                }
                button.appendChild(face);
                button.appendChild(copy);
                group.appendChild(button);
            }
            list.appendChild(group);
        }
        addGroup("Online", online);
        addGroup("Offline", offline);
        syncMemberPop();
    }

    document.addEventListener("discode-presence", paintServerMembers);

    var memberPop = document.getElementById("member-pop");
    var memberPopKey = "";
    var ROLE_COLORS = {
        gray: "#4e5058",
        pink: "#eb459e",
        red: "#ed4245",
        orange: "#f26522",
        yellow: "#fee75c",
        purple: "#9b59d0",
        blue: "#5865f2",
        green: "#23a559"
    };

    function memberPopId(button) {
        if (!button) return "";
        if (button.getAttribute("data-self") === "1") return "self";
        return button.getAttribute("data-name") || "";
    }

    function currentMemberButton() {
        if (!memberPopKey) return null;
        var buttons = document.querySelectorAll("#server-member-list .server-member");
        for (var i = 0; i < buttons.length; i++) {
            if (memberPopId(buttons[i]) === memberPopKey) return buttons[i];
        }
        return null;
    }

    function readMeRecord() {
        try {
            return JSON.parse(localStorage.getItem("discode-me")) || {};
        } catch (e) {
            return {};
        }
    }

    function roleStorage() {
        try {
            return JSON.parse(localStorage.getItem("discode-member-roles")) || {};
        } catch (e) {
            return {};
        }
    }

    function roleBucket() {
        return (openId || "server") + ":" + memberPopKey;
    }

    function assignedRoles() {
        var all = roleStorage();
        var list = all[roleBucket()];
        return Array.isArray(list) ? list : [];
    }

    function serverRoleChoices() {
        var rows = document.querySelectorAll("#server-role-list .role-row");
        var list = [];
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].hidden || rows[i].id === "role-everyone") continue;
            var label = rows[i].querySelector(".role-label");
            var name = label ? label.textContent.trim() : "";
            if (!name || name === "@everyone") continue;
            list.push({ name: name, color: rows[i].getAttribute("data-color") || "gray" });
        }
        return list;
    }

    function closeMemberMenus() {
        var more = document.getElementById("member-pop-menu");
        var roles = document.getElementById("member-pop-role-menu");
        var moreBtn = document.getElementById("member-pop-more");
        if (more) more.hidden = true;
        if (roles) roles.hidden = true;
        if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");
    }

    function placeMemberPop(button) {
        if (!memberPop || !button) return;
        var panel = document.querySelector("#server-members .server-members");
        var rect = button.getBoundingClientRect();
        var panelRect = panel ? panel.getBoundingClientRect() : null;
        var bounds = panelRect && panelRect.width ? panelRect : rect;
        var width = memberPop.offsetWidth;
        var height = memberPop.offsetHeight;
        var left = bounds.left - width - 10;
        if (left < 8) left = 8;
        var top = rect.top + rect.height / 2 - height * 0.38;
        var maxTop = window.innerHeight - height - 8;
        if (top > maxTop) top = maxTop;
        if (top < 8) top = 8;
        memberPop.style.left = left + "px";
        memberPop.style.top = top + "px";
    }

    function paintMemberRoles() {
        var box = document.getElementById("member-pop-roles");
        if (!box) return;
        while (box.firstChild) box.removeChild(box.firstChild);
        var roles = assignedRoles();
        for (var i = 0; i < roles.length; i++) {
            var pill = document.createElement("span");
            pill.className = "member-pop-role";
            var dot = document.createElement("i");
            dot.style.background = ROLE_COLORS[roles[i].color] || ROLE_COLORS.gray;
            pill.appendChild(dot);
            pill.appendChild(document.createTextNode(roles[i].name));
            box.appendChild(pill);
        }
    }

    function paintRoleMenu() {
        var menu = document.getElementById("member-pop-role-menu");
        if (!menu) return;
        while (menu.firstChild) menu.removeChild(menu.firstChild);
        var choices = serverRoleChoices();
        var owned = assignedRoles();
        if (!choices.length) {
            var empty = document.createElement("p");
            empty.className = "member-pop-role-empty";
            empty.textContent = "No roles yet.";
            menu.appendChild(empty);
            return;
        }
        for (var i = 0; i < choices.length; i++) {
            var role = choices[i];
            var on = false;
            for (var j = 0; j < owned.length; j++) {
                if (owned[j].name === role.name) on = true;
            }
            var button = document.createElement("button");
            button.type = "button";
            button.className = on ? "on" : "";
            button.setAttribute("data-role-name", role.name);
            button.setAttribute("data-role-color", role.color);
            var dot = document.createElement("i");
            dot.style.background = ROLE_COLORS[role.color] || ROLE_COLORS.gray;
            var label = document.createElement("span");
            label.textContent = role.name;
            button.appendChild(dot);
            button.appendChild(label);
            if (on) {
                var check = document.createElement("b");
                check.textContent = "✓";
                button.appendChild(check);
            }
            menu.appendChild(button);
        }
    }

    function fillMemberPop(button) {
        if (!memberPop || !button) return;
        var self = button.getAttribute("data-self") === "1";
        var name = button.getAttribute("data-name") || "Member";
        var photo = button.querySelector("img");
        var saved = readMeRecord();
        var handleNode = document.getElementById("settings-username");
        var handle = self
            ? ((handleNode && handleNode.textContent.trim()) || "anonymou5")
            : (button.getAttribute("data-handle") || name.toLowerCase().replace(/\s+/g, ""));
        var bioInput = document.getElementById("me-bio");
        var profileAbout = self
            ? ((bioInput && bioInput.value.trim()) || saved.profileBio || "")
            : (button.getAttribute("data-bio") || "");
        var custom = self
            ? (((saved.emoji ? saved.emoji + " " : "") + (saved.bio || "")).trim())
            : (button.getAttribute("data-note") || "");
        var about = profileAbout;
        var statusLine = custom;
        memberPop.setAttribute("data-status", button.getAttribute("data-status") || "offline");
        memberPop.setAttribute("data-self", self ? "1" : "0");
        memberPop.setAttribute("data-name", name);
        memberPop.setAttribute("data-handle", handle);
        var face = document.getElementById("member-pop-photo");
        if (face) face.src = photo ? photo.getAttribute("src") : "/assets/img/img-icon-profile.jpeg";
        var title = document.getElementById("member-pop-name");
        if (title) title.textContent = name;
        var handleEl = document.getElementById("member-pop-handle");
        if (handleEl) handleEl.textContent = handle;
        var aboutEl = document.getElementById("member-pop-about");
        if (aboutEl) {
            aboutEl.hidden = !about;
            aboutEl.textContent = about;
        }
        var chip = document.getElementById("member-pop-chip");
        var chipText = document.getElementById("member-pop-chip-text");
        if (chip && chipText) {
            var showChip = self || !!statusLine;
            chip.hidden = !showChip;
            chip.classList.toggle("has-status", !!statusLine);
            chip.classList.toggle("is-static", !self);
            chipText.textContent = statusLine || "Today I learned...";
        }
        var add = document.getElementById("member-pop-add");
        if (add) add.hidden = !self;
        var edit = document.getElementById("member-pop-edit");
        if (edit) {
            var icon = edit.querySelector("i");
            var label = edit.querySelector("span");
            if (icon) icon.className = self ? "fa-solid fa-pen" : "fa-solid fa-comment";
            if (label) label.textContent = self ? "Edit Profile" : "Message";
        }
        paintMemberRoles();
        var roleMenu = document.getElementById("member-pop-role-menu");
        if (roleMenu && !roleMenu.hidden) paintRoleMenu();
    }

    function closeMemberPop() {
        memberPopKey = "";
        closeMemberMenus();
        var picked = document.querySelectorAll("#server-member-list .server-member.is-picked");
        for (var i = 0; i < picked.length; i++) picked[i].classList.remove("is-picked");
        if (!memberPop) return;
        memberPop.classList.remove("is-open");
        memberPop.hidden = true;
    }

    function openMemberPop(button) {
        if (!memberPop || !button) return;
        memberPopKey = memberPopId(button);
        var picked = document.querySelectorAll("#server-member-list .server-member.is-picked");
        for (var i = 0; i < picked.length; i++) picked[i].classList.remove("is-picked");
        button.classList.add("is-picked");
        closeMemberMenus();
        memberPop.hidden = false;
        fillMemberPop(button);
        placeMemberPop(button);
        window.requestAnimationFrame(function () {
            memberPop.classList.add("is-open");
        });
    }

    function syncMemberPop() {
        var picked = document.querySelectorAll("#server-member-list .server-member.is-picked");
        for (var i = 0; i < picked.length; i++) picked[i].classList.remove("is-picked");
        if (!memberPopKey || !memberPop || memberPop.hidden) return;
        var button = currentMemberButton();
        if (!button) {
            closeMemberPop();
            return;
        }
        button.classList.add("is-picked");
        fillMemberPop(button);
        placeMemberPop(button);
    }

    function toggleMemberRole(name, color) {
        var all = roleStorage();
        var key = roleBucket();
        var list = Array.isArray(all[key]) ? all[key].slice() : [];
        var next = [];
        var found = false;
        for (var i = 0; i < list.length; i++) {
            if (list[i].name === name) found = true;
            else next.push(list[i]);
        }
        if (!found) next.push({ name: name, color: color || "gray" });
        all[key] = next;
        localStorage.setItem("discode-member-roles", JSON.stringify(all));
        var button = currentMemberButton();
        if (button) {
            fillMemberPop(button);
            placeMemberPop(button);
        }
    }

    if (memberPop) {
        document.body.appendChild(memberPop);
        var memberList = document.getElementById("server-member-list");
        if (memberList) {
            memberList.addEventListener("click", function (event) {
                var button = event.target.closest(".server-member");
                if (!button) return;
                event.stopPropagation();
                if (memberPopKey === memberPopId(button) && !memberPop.hidden) {
                    closeMemberPop();
                    return;
                }
                openMemberPop(button);
            });
        }
        document.getElementById("member-pop-more").addEventListener("click", function (event) {
            event.stopPropagation();
            var menu = document.getElementById("member-pop-menu");
            var roles = document.getElementById("member-pop-role-menu");
            if (roles) roles.hidden = true;
            menu.hidden = !menu.hidden;
            event.currentTarget.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
        });
        document.getElementById("member-pop-menu").addEventListener("click", function (event) {
            var button = event.target.closest("button");
            if (!button) return;
            event.stopPropagation();
            if (button.getAttribute("data-pop-action") === "copy") {
                var handle = document.getElementById("member-pop-handle");
                var value = handle ? handle.textContent : "";
                if (value && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value);
            }
            closeMemberMenus();
        });
        document.getElementById("member-pop-chip").addEventListener("click", function (event) {
            event.stopPropagation();
            if (memberPop.getAttribute("data-self") !== "1") return;
            var opener = document.getElementById("me-chip");
            if (opener) opener.click();
        });
        document.getElementById("member-pop-add").addEventListener("click", function (event) {
            event.stopPropagation();
            var menu = document.getElementById("member-pop-role-menu");
            var more = document.getElementById("member-pop-menu");
            if (more) more.hidden = true;
            if (menu.hidden) paintRoleMenu();
            menu.hidden = !menu.hidden;
            placeMemberPop(currentMemberButton());
        });
        document.getElementById("member-pop-role-menu").addEventListener("click", function (event) {
            var button = event.target.closest("button");
            if (!button) return;
            event.stopPropagation();
            toggleMemberRole(button.getAttribute("data-role-name"), button.getAttribute("data-role-color"));
        });
        document.getElementById("member-pop-edit").addEventListener("click", function (event) {
            event.stopPropagation();
            var self = memberPop.getAttribute("data-self") === "1";
            var handle = memberPop.getAttribute("data-handle") || "";
            var photo = document.getElementById("member-pop-photo");
            var src = photo ? photo.getAttribute("src") : "";
            closeMemberPop();
            if (self) {
                if (window.openUserProfile) window.openUserProfile(handle, src);
                return;
            }
            if (window.discodeGo) window.discodeGo("/Dm/Index?name=" + encodeURIComponent(handle));
            else window.location.href = "/Dm/Index?name=" + encodeURIComponent(handle);
        });
        document.addEventListener("click", function (event) {
            if (!memberPop || memberPop.hidden) return;
            if (memberPop.contains(event.target)) return;
            if (event.target.closest("#server-member-list .server-member")) return;
            closeMemberPop();
        });
        document.addEventListener("keydown", function (event) {
            if (event.key !== "Escape" || !memberPop || memberPop.hidden) return;
            var profile = document.getElementById("me-profile");
            var setStatus = document.getElementById("set-status");
            if (profile && !profile.classList.contains("d-none")) return;
            if (setStatus && !setStatus.classList.contains("d-none")) return;
            closeMemberPop();
        });
        window.addEventListener("resize", function () {
            if (!memberPop || memberPop.hidden) return;
            placeMemberPop(currentMemberButton());
        });
        var memberScroll = document.querySelector("#server-members .server-members");
        if (memberScroll) {
            memberScroll.addEventListener("scroll", function () {
                if (!memberPop || memberPop.hidden) return;
                var button = currentMemberButton();
                if (!button) {
                    closeMemberPop();
                    return;
                }
                placeMemberPop(button);
            });
        }
        paintServerMembers();
    }

    function joinVoice(button) {
        if (!canJoinVoice(button)) {
            if (joinedVoice === button) joinedVoice = null;
            paintVoice();
            return;
        }
        if (joinedVoice !== button) {
            joinedVoice = button;
            voiceStarted = Date.now();
            clearInterval(voiceClock);
            voiceClock = setInterval(tickVoiceClock, 1000);
            var freshPeople = voiceSlot(button);
            var freshInvite = freshPeople && freshPeople.querySelector(".server-voice-invite");
            if (freshInvite) freshInvite.hidden = false;
            joinVoiceSound.currentTime = 0;
            joinVoiceSound.play().catch(function() {});
        }
        paintVoice();
        fetch(serverApi("/voice"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: channelTitle(button) })
        }).catch(function () {});
    }

    function leaveVoice() {
        joinedVoice = null;
        clearInterval(voiceClock);
        voiceClock = 0;
        paintVoice();
        if (typeof stopVoiceMedia === "function") stopVoiceMedia();
        if (typeof setVoiceFull === "function") setVoiceFull(false);
        fetch(serverApi("/voice"), { method: "DELETE" }).catch(function () {});
    }

    function selectChannel(button, keepVoice) {
        if (!button) return;
        currentChannel = button;
        var buttons = channelList.querySelectorAll(".server-channel");
        var name = channelTitle(button);
        var kind = button.getAttribute("data-kind") || "text";
        var isVoice = kind === "voice";
        var announce = kind === "announce";
        var canPost = canPostIn(button);
        for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle("on", buttons[i] === button);
        showRoom(isVoice ? "voice" : "text");
        if (isVoice) {
            if (voiceName) voiceName.textContent = name;
            if (keepVoice) paintVoice();
            else joinVoice(button);
        } else if (roomName) {
            roomName.textContent = name;
            chat.classList.add("has-room");
            var mark = document.getElementById("server-room-mark");
            if (mark) mark.textContent = announce ? "" : "#";
            var compose = document.getElementById("server-compose");
            var note = document.getElementById("server-announce-lock");
            if (compose) compose.classList.toggle("is-locked", !canPost);
            if (note) note.hidden = canPost;
            if (input && !keepVoice) {
                input.textContent = "";
                input.setAttribute("data-empty", "1");
            }
            if (input) {
                input.setAttribute("contenteditable", canPost ? "true" : "false");
                input.setAttribute("data-placeholder", "Message " + (announce ? "" : "#") + name);
            }
            var welcome = document.getElementById("server-welcome");
            var welcomeTitle = document.getElementById("server-welcome-title");
            var welcomeText = document.getElementById("server-welcome-text");
            var hash = announce ? "" : "#";
            if (welcome) welcome.hidden = false;
            if (welcomeTitle) welcomeTitle.textContent = "Welcome to " + hash + name + "!";
            if (welcomeText) welcomeText.textContent = "This is the start of the " + hash + name + " channel.";
            loadMessages(button);
            paintVoice();
        }
        openOnPhone();
    }

    function sendMessage() {
        if (!currentChannel || !canPostIn(currentChannel) || !input) return;
        var text = input.textContent.replace(/\u00a0/g, " ").trim();
        if (!text) return;
        var button = currentChannel;
        fetch(serverApi("/channels/" + encodeURIComponent(channelTitle(button)) + "/messages"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        }).then(function (response) {
            if (!response.ok) throw new Error("send");
            return response.json();
        }).then(function () {
            if (input && currentChannel === button) {
                input.textContent = "";
                input.setAttribute("data-empty", "1");
            }
            loadMessages(button);
        }).catch(function () {});
    }

    if (channelList) {
        channelList.addEventListener("click", function (event) {
            var edit = event.target.closest("[data-edit-channel]");
            if (edit) {
                var row = edit.closest(".server-channel-row");
                var target = row ? row.querySelector(".server-channel") : null;
                if (isOwner && target) openChannelEdit(target);
                return;
            }
            var removeChannelBtn = event.target.closest("[data-delete-channel]");
            if (removeChannelBtn) {
                var removeRow = removeChannelBtn.closest(".server-channel-row");
                var removeTarget = removeRow ? removeRow.querySelector(".server-channel") : null;
                if (isOwner && removeTarget) openRemove("channel", removeTarget);
                return;
            }
            var removeCategoryBtn = event.target.closest("[data-delete-category]");
            if (removeCategoryBtn) {
                var removeCategory = removeCategoryBtn.closest(".server-category");
                if (isOwner && removeCategory) openRemove("category", removeCategory);
                return;
            }
            var add = event.target.closest(".server-category-add");
            if (add) {
                if (isOwner) openChannelModal(add.closest(".server-category"));
                return;
            }
            var category = event.target.closest(".server-category-name");
            if (category) {
                category.closest(".server-category").classList.toggle("closed");
                return;
            }
            var channel = event.target.closest(".server-channel");
            if (channel) selectChannel(channel);
        });
    }

    function membersPanel() {
        return document.querySelector("#server-members .server-members") || document.getElementById("server-members");
    }

    function toggleMembers() {
        var members = membersPanel();
        if (!members) return;
        var narrow = window.matchMedia("(max-width: 1100px)").matches;
        if (narrow) {
            members.classList.toggle("force");
            var backdrop = document.getElementById("members-backdrop");
            if (backdrop) {
                backdrop.hidden = !members.classList.contains("force");
            }
        } else {
            members.classList.toggle("off");
        }
        var open = narrow ? members.classList.contains("force") : !members.classList.contains("off");
        var buttons = document.querySelectorAll(".server-members-toggle");
        for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle("on", open);
    }

    var memberButtons = document.querySelectorAll(".server-members-toggle");
    for (var i = 0; i < memberButtons.length; i++) memberButtons[i].addEventListener("click", toggleMembers);

    // Close members panel when clicking backdrop in mobile mode
    var backdrop = document.getElementById("members-backdrop");
    if (backdrop) {
        backdrop.addEventListener("click", function () {
            var members = membersPanel();
            if (members && members.classList.contains("force")) {
                members.classList.remove("force");
                backdrop.hidden = true;
                var buttons = document.querySelectorAll(".server-members-toggle");
                for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove("on");
            }
        });
    }

    function closeMenu() {
        if (!menu || !menuOpen) return;
        menu.hidden = true;
        menuOpen.setAttribute("aria-expanded", "false");
    }

    if (menuOpen && menu) {
        menuOpen.addEventListener("click", function (event) {
            event.stopPropagation();
            menu.hidden = !menu.hidden;
            menuOpen.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
        });
        menu.addEventListener("click", function (event) {
            event.stopPropagation();
        });
        document.addEventListener("click", closeMenu);
    }

    var channelMenu = document.getElementById("channel-menu");
    var channelSide = document.querySelector(".server-channels");
    var canManage = document.querySelector(".server-banner-wrap[data-can-manage]");

    function closeChannelMenu() {
        if (channelMenu) channelMenu.hidden = true;
    }

    function placeChannelMenu(x, y) {
        if (!channelMenu) return;
        closeMenu();
        channelMenu.hidden = false;
        channelMenu.style.left = "0px";
        channelMenu.style.top = "0px";
        var rect = channelMenu.getBoundingClientRect();
        var left = x;
        var top = y;
        if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
        if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
        if (left < 8) left = 8;
        if (top < 8) top = 8;
        channelMenu.style.left = left + "px";
        channelMenu.style.top = top + "px";
    }

    function canArrange() {
        return !!(isOwner || pageCanManage());
    }

    function channelMenuTarget(node) {
        if (!node || !node.closest) return false;
        if (node.closest(".server-banner-wrap, .user-panel, #channel-menu, .server-channel, .server-category")) return false;
        return !!node.closest(".server-channels");
    }

    if (canManage && channelSide && channelMenu) {
        channelSide.addEventListener("contextmenu", function (event) {
            var row = event.target.closest(".server-channel-row");
            var channel = row ? row.querySelector(".server-channel") : null;
            var category = channel ? null : event.target.closest(".server-category");
            if (channel || category) {
                if (!canArrange()) return;
                event.preventDefault();
                event.stopPropagation();
                openRowMenu(event.clientX, event.clientY, channel || category);
                return;
            }
            if (!channelMenuTarget(event.target)) return;
            event.preventDefault();
            closeRowMenu();
            placeChannelMenu(event.clientX, event.clientY);
        }, true);
        var pressTimer = 0;
        channelSide.addEventListener("touchstart", function (event) {
            if (!channelMenuTarget(event.target) || event.touches.length !== 1) return;
            var touch = event.touches[0];
            pressTimer = window.setTimeout(function () {
                placeChannelMenu(touch.clientX, touch.clientY);
            }, 500);
        }, { passive: true });
        channelSide.addEventListener("touchend", function () { window.clearTimeout(pressTimer); });
        channelSide.addEventListener("touchmove", function () { window.clearTimeout(pressTimer); });
        channelMenu.addEventListener("click", function (event) {
            event.stopPropagation();
            var button = event.target.closest("button");
            if (!button) return;
            closeChannelMenu();
            if (isOwner && button.getAttribute("data-create") === "channel") openChannelModal();
            if (isOwner && button.getAttribute("data-create") === "category") openCategoryModal();
            if (button.getAttribute("data-invite") === "server") openInviteModal();
        });
        document.addEventListener("click", function (event) {
            if (channelMenu.hidden || event.target.closest("#channel-menu")) return;
            closeChannelMenu();
        });
        document.addEventListener("scroll", closeChannelMenu, true);
    }

    var rowMenu = document.getElementById("channel-row-menu");
    var rowMenuTarget = null;

    function closeRowMenu() {
        if (rowMenu) rowMenu.hidden = true;
        rowMenuTarget = null;
    }

    function placeRowMenu(x, y) {
        if (!rowMenu) return;
        if (rowMenu.parentNode !== document.body) document.body.appendChild(rowMenu);
        closeMenu();
        closeChannelMenu();
        rowMenu.hidden = false;
        rowMenu.style.left = "0px";
        rowMenu.style.top = "0px";
        var rect = rowMenu.getBoundingClientRect();
        var left = x;
        var top = y;
        if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
        if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
        if (left < 8) left = 8;
        if (top < 8) top = 8;
        rowMenu.style.left = left + "px";
        rowMenu.style.top = top + "px";
    }

    function openRowMenu(x, y, target) {
        if (!rowMenu || !canArrange() || !target) return;
        rowMenuTarget = target;
        var editing = rowMenu.querySelector("[data-action='edit']");
        var deleting = rowMenu.querySelector("[data-action='delete']");
        var category = target.classList.contains("server-category");
        if (editing) {
            editing.hidden = false;
            editing.textContent = category ? "Edit Category" : "Edit Channel";
        }
        if (deleting) deleting.textContent = category ? "Delete Category" : "Delete Channel";
        placeRowMenu(x, y);
    }

    if (rowMenu) {
        rowMenu.addEventListener("click", function (event) {
            event.stopPropagation();
            var button = event.target.closest("button");
            var target = rowMenuTarget;
            closeRowMenu();
            if (!button || !target || !canArrange()) return;
            if (button.getAttribute("data-action") === "edit") {
                if (target.classList.contains("server-category")) openCategoryModal(target);
                else openChannelEdit(target);
            }
            if (button.getAttribute("data-action") === "delete") openRemove(target.classList.contains("server-category") ? "category" : "channel", target);
        });
        document.addEventListener("click", function (event) {
            if (rowMenu.hidden || event.target.closest("#channel-row-menu")) return;
            closeRowMenu();
        });
        document.addEventListener("scroll", closeRowMenu, true);
    }

    var channelModal = document.getElementById("channel-modal");
    var channelName = document.getElementById("channel-name");
    var channelNameIcon = document.getElementById("channel-name-icon");
    var channelNameOk = document.getElementById("channel-name-ok");
    var channelConfirm = document.getElementById("channel-modal-confirm");
    var channelPrivate = document.getElementById("channel-private");
    var channelWhere = document.getElementById("channel-where");
    var channelWhereName = document.getElementById("channel-where-name");
    var channelCategory = null;
    var channelKinds = { text: "fa-hashtag", voice: "fa-volume-high", forum: "fa-comments" };

    function channelLabel(kind, value) {
        var text = String(value || "").trim().replace(/\s+/g, " ");
        if (!text) return "";
        if (kind === "voice") return text;
        return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "") || "new-channel";
    }

    function syncChannelKind() {
        var picked = document.querySelector('#channel-types input:checked');
        var kind = picked ? picked.value : "text";
        if (channelNameIcon) channelNameIcon.className = "fa-solid " + (channelKinds[kind] || "fa-hashtag");
    }

    function syncChannelName() {
        var text = channelName ? channelName.value.trim() : "";
        if (channelNameOk) channelNameOk.hidden = !text;
        if (channelConfirm) channelConfirm.disabled = !text;
    }

    function liveCategories() {
        var found = [];
        if (!channelList) return found;
        var nodes = channelList.children;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].classList && nodes[i].classList.contains("server-category")) found.push(nodes[i]);
        }
        return found;
    }

    function fillChannelCategories(pick) {
        if (!pick) return;
        var current = pick.value;
        while (pick.firstChild) pick.removeChild(pick.firstChild);
        var none = document.createElement("option");
        none.value = "";
        none.textContent = "No Category";
        pick.appendChild(none);
        var cats = liveCategories();
        for (var i = 0; i < cats.length; i++) {
            var option = document.createElement("option");
            var span = cats[i].querySelector(".server-category-name span");
            option.value = String(i);
            option.textContent = span && span.textContent.trim() ? span.textContent.trim() : "Category";
            pick.appendChild(option);
        }
        pick.value = current && pick.querySelector("option[value='" + current + "']") ? current : "";
    }

    function chosenCategoryList() {
        var pick = document.getElementById("channel-category-pick");
        if (!pick || !pick.value) return null;
        var cats = liveCategories();
        var chosen = cats[Number(pick.value)];
        return chosen ? chosen.querySelector(".server-category-list") : null;
    }

    function openChannelModal(category) {
        if (!channelModal || !isOwner) return;
        channelCategory = category || null;
        var label = "";
        if (channelCategory) {
            var nameNode = channelCategory.querySelector(".server-category-name span");
            label = nameNode ? nameNode.textContent.trim() : "";
        }
        if (channelWhere) channelWhere.hidden = !label;
        if (channelWhereName) channelWhereName.textContent = label;
        var pickWrap = document.getElementById("channel-category-wrap");
        var pickLabel = document.getElementById("channel-category-label");
        var pick = document.getElementById("channel-category-pick");
        var picking = !channelCategory;
        if (pickWrap) pickWrap.hidden = !picking;
        if (pickLabel) pickLabel.hidden = !picking;
        if (picking) fillChannelCategories(pick);
        var radios = document.querySelectorAll('#channel-types input');
        for (var i = 0; i < radios.length; i++) radios[i].checked = radios[i].value === "text";
        if (channelPrivate) channelPrivate.checked = false;
        if (channelName) channelName.value = "new-channel";
        syncChannelKind();
        syncChannelName();
        closeMenu();
        closeChannelMenu();
        channelModal.hidden = false;
        if (channelName) {
            channelName.focus();
            channelName.select();
        }
    }

    function closeChannelModal() {
        if (channelModal) channelModal.hidden = true;
    }

    if (canManage && menu) {
        menu.addEventListener("click", function (event) {
            if (isOwner && event.target.closest("[data-create='channel']")) openChannelModal();
            if (isOwner && event.target.closest("[data-create='category']")) openCategoryModal();
            if (event.target.closest("[data-invite='server']")) openInviteModal();
        });
    }
    if (channelModal) {
        channelModal.addEventListener("click", function (event) {
            if (event.target === channelModal) closeChannelModal();
        });
        channelModal.addEventListener("change", function (event) {
            if (event.target.name === "channel-kind") syncChannelKind();
        });
    }
    if (channelName) channelName.addEventListener("input", syncChannelName);
    var channelClose = document.getElementById("channel-modal-close");
    var channelCancel = document.getElementById("channel-modal-cancel");
    if (channelClose) channelClose.addEventListener("click", closeChannelModal);
    if (channelCancel) channelCancel.addEventListener("click", closeChannelModal);
    var channelForm = document.getElementById("channel-form");
    if (channelForm) {
        channelForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!isOwner || !channelConfirm || channelConfirm.disabled) return;
            var picked = document.querySelector("#channel-types input:checked");
            var kind = picked ? picked.value : "text";
            var label = channelLabel(kind, channelName ? channelName.value : "");
            var list = channelCategory ? channelCategory.querySelector(".server-category-list") : null;
            if (!list) list = chosenCategoryList();
            if (!list) list = document.getElementById("server-channel-loose");
            var tpl = document.getElementById("server-channel-new");
            if (!label || !list || !tpl) return;
            var frag = tpl.content.cloneNode(true);
            var button = frag.querySelector(".server-channel");
            var node = frag.querySelector(".server-channel-row") || button;
            if (!button || !node) return;
            button.setAttribute("data-kind", kind);
            var icon = button.querySelector("i");
            if (icon) icon.className = "fa-solid " + (channelKinds[kind] || "fa-hashtag");
            var nameNode = button.querySelector(".server-channel-name");
            if (nameNode) nameNode.textContent = label;
            var lock = button.querySelector(".server-channel-lock");
            if (lock) lock.hidden = !(channelPrivate && channelPrivate.checked);
            if (kind === "voice") {
                button.setAttribute("data-join", "1");
                button.removeAttribute("data-send");
            } else {
                button.setAttribute("data-send", "1");
            }
            var editButton = node.querySelector("[data-edit-channel]");
            if (editButton) editButton.hidden = !isOwner;
            var deleteButton = node.querySelector("[data-delete-channel]");
            if (deleteButton) deleteButton.hidden = !isOwner;
            var category = list.closest(".server-category");
            if (category) category.classList.remove("closed");
            if (kind !== "voice") {
                var extra = frag.querySelector(".server-voice-people");
                if (extra) extra.remove();
            }
            list.appendChild(frag);
            closeChannelModal();
            if (kind !== "voice") selectChannel(button);
        });
    }

    var channelEdit = document.getElementById("channel-edit");
    var channelEditForm = document.getElementById("channel-edit-form");
    var channelEditName = document.getElementById("channel-edit-name");
    var channelEditIcon = document.getElementById("channel-edit-icon");
    var channelEditSub = document.getElementById("channel-edit-sub");
    var channelEditTarget = null;
    var channelPerms = {
        view: document.getElementById("channel-perm-view"),
        send: document.getElementById("channel-perm-send"),
        manage: document.getElementById("channel-perm-manage"),
        connect: document.getElementById("channel-perm-connect"),
        speak: document.getElementById("channel-perm-speak")
    };

    function permOn(channel, key) {
        var value = channel.getAttribute(key);
        return value !== "0";
    }

    function closeChannelEdit() {
        if (channelEdit) channelEdit.hidden = true;
        channelEditTarget = null;
    }

    function openChannelEdit(channel) {
        if (!channelEdit || !canArrange() || !channel) return;
        channelEditTarget = channel;
        var kind = channel.getAttribute("data-kind") || "text";
        var voiceRoom = kind === "voice";
        var name = channelTitle(channel);
        if (channelEditName) channelEditName.value = name;
        if (channelEditIcon) channelEditIcon.className = "fa-solid " + (channelKinds[kind] || "fa-hashtag");
        if (channelEditSub) channelEditSub.textContent = (voiceRoom ? "" : "#") + name;
        if (channelPerms.view) channelPerms.view.checked = permOn(channel, "data-view");
        if (channelPerms.send) channelPerms.send.checked = permOn(channel, "data-send");
        if (channelPerms.manage) channelPerms.manage.checked = permOn(channel, "data-manage");
        if (channelPerms.connect) channelPerms.connect.checked = permOn(channel, "data-join");
        if (channelPerms.speak) channelPerms.speak.checked = permOn(channel, "data-speak");
        var rows = channelEdit.querySelectorAll("[data-perm]");
        for (var i = 0; i < rows.length; i++) {
            var perm = rows[i].getAttribute("data-perm");
            var show = perm === "view" || (voiceRoom ? perm === "connect" || perm === "speak" : perm === "send" || perm === "manage");
            rows[i].hidden = !show;
        }
        closeMenu();
        closeChannelMenu();
        closeChannelModal();
        channelEdit.hidden = false;
        if (channelEditName) {
            channelEditName.focus();
            channelEditName.select();
        }
    }

    if (channelEdit) {
        channelEdit.addEventListener("click", function (event) {
            if (event.target === channelEdit) closeChannelEdit();
        });
    }
    var channelEditClose = document.getElementById("channel-edit-close");
    var channelEditCancel = document.getElementById("channel-edit-cancel");
    if (channelEditClose) channelEditClose.addEventListener("click", closeChannelEdit);
    if (channelEditCancel) channelEditCancel.addEventListener("click", closeChannelEdit);
    var channelEditDelete = document.getElementById("channel-edit-delete");
    if (channelEditDelete) {
        channelEditDelete.addEventListener("click", function () {
            if (isOwner && channelEditTarget) openRemove("channel", channelEditTarget);
        });
    }

    var removeModal = document.getElementById("remove-modal");
    var removeTitle = document.getElementById("remove-title");
    var removeName = document.getElementById("remove-name");
    var removeNote = document.getElementById("remove-note");
    var removeConfirm = document.getElementById("remove-confirm");
    var removeKind = "";
    var removeNode = null;

    function openRemove(kind, node) {
        if (!removeModal || !canArrange() || !node) return;
        removeKind = kind;
        removeNode = node;
        var voiceRoom = kind === "channel" && node.getAttribute("data-kind") === "voice";
        var label = kind === "category" ? ((node.querySelector(".server-category-name span") || {}).textContent || "") : channelTitle(node);
        label = String(label || "").trim();
        if (removeTitle) removeTitle.textContent = kind === "category" ? "Delete Category" : "Delete Channel";
        if (removeName) removeName.textContent = (kind === "channel" && !voiceRoom ? "#" : "") + (label || (kind === "category" ? "Category" : "Channel"));
        if (removeNote) removeNote.hidden = kind !== "category";
        if (removeConfirm) removeConfirm.textContent = kind === "category" ? "Delete Category" : "Delete Channel";
        closeMenu();
        closeChannelMenu();
        closeRowMenu();
        closeChannelModal();
        closeCategoryModal();
        removeModal.hidden = false;
    }

    function closeRemove() {
        if (removeModal) removeModal.hidden = true;
        removeKind = "";
        removeNode = null;
    }

    function clearRoom() {
        currentChannel = null;
        if (chat) {
            chat.hidden = false;
            chat.classList.remove("has-room");
        }
        if (voice) voice.hidden = true;
    }

    function detachChannel(channel) {
        if (!channel) return false;
        var row = channel.closest(".server-channel-row") || channel;
        var people = row.nextElementSibling;
        var active = currentChannel === channel;
        if (joinedVoice === channel) leaveVoice();
        if (people && people.classList.contains("server-voice-people")) people.remove();
        if (channelEditTarget === channel) closeChannelEdit();
        var name = channelTitle(channel);
        row.remove();
        fetch(serverApi("/channels/" + encodeURIComponent(name)), { method: "DELETE" }).catch(function () {});
        return active;
    }

    function settleAfterRemove(active) {
        if (!active && currentChannel && channelList && channelList.contains(currentChannel)) return;
        currentChannel = null;
        var next = channelList ? channelList.querySelector(".server-channel") : null;
        if (next) selectChannel(next);
        else clearRoom();
    }

    function deleteChannel(channel) {
        settleAfterRemove(detachChannel(channel));
    }

    function deleteCategory(category) {
        if (!category) return;
        var nameNode = category.querySelector(".server-category-name span");
        var name = nameNode ? nameNode.textContent.trim() : "";
        var channels = category.querySelectorAll(".server-channel");
        var list = [];
        var active = false;
        for (var i = 0; i < channels.length; i++) list.push(channels[i]);
        for (var j = 0; j < list.length; j++) {
            if (detachChannel(list[j])) active = true;
        }
        category.remove();
        if (name) fetch(serverApi("/categories/" + encodeURIComponent(name)), { method: "DELETE" }).catch(function () {});
        settleAfterRemove(active);
    }

    if (removeModal) {
        removeModal.addEventListener("click", function (event) {
            if (event.target === removeModal) closeRemove();
        });
    }
    var removeClose = document.getElementById("remove-close");
    var removeCancel = document.getElementById("remove-cancel");
    if (removeClose) removeClose.addEventListener("click", closeRemove);
    if (removeCancel) removeCancel.addEventListener("click", closeRemove);
    var removeForm = document.getElementById("remove-form");
    if (removeForm) {
        removeForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var kind = removeKind;
            var node = removeNode;
            closeRemove();
            if (kind === "category") deleteCategory(node);
            else deleteChannel(node);
        });
    }
    if (channelEditForm) {
        channelEditForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var channel = channelEditTarget;
            if (!canArrange() || !channel || !channelEditName) return;
            var kind = channel.getAttribute("data-kind") || "text";
            var label = channelLabel(kind, channelEditName.value);
            if (!label) return;
            var nameNode = channel.querySelector(".server-channel-name");
            if (nameNode) nameNode.textContent = label;
            channel.setAttribute("data-view", channelPerms.view && channelPerms.view.checked ? "1" : "0");
            if (kind === "voice") {
                channel.setAttribute("data-join", channelPerms.connect && channelPerms.connect.checked ? "1" : "0");
                channel.setAttribute("data-speak", channelPerms.speak && channelPerms.speak.checked ? "1" : "0");
            } else {
                channel.setAttribute("data-send", channelPerms.send && channelPerms.send.checked ? "1" : "0");
                channel.setAttribute("data-manage", channelPerms.manage && channelPerms.manage.checked ? "1" : "0");
            }
            var lock = channel.querySelector(".server-channel-lock");
            var viewOn = !!(channelPerms.view && channelPerms.view.checked);
            if (lock && !viewOn) lock.hidden = false;
            if (lock && viewOn && kind !== "announce") lock.hidden = true;
            closeChannelEdit();
            if (currentChannel === channel) selectChannel(channel, true);
        });
    }

    var categoryModal = document.getElementById("category-modal");
    var categoryName = document.getElementById("category-name");
    var categoryConfirm = document.getElementById("category-modal-confirm");
    var categoryPrivate = document.getElementById("category-private");
    var categoryTitle = document.getElementById("category-modal-title");
    var categoryEditTarget = null;

    function syncCategoryName() {
        var text = categoryName ? categoryName.value.trim() : "";
        if (categoryConfirm) categoryConfirm.disabled = !text;
    }

    function openCategoryModal(category) {
        if (!categoryModal || !canArrange()) return;
        categoryEditTarget = category && category.classList && category.classList.contains("server-category") ? category : null;
        var currentName = "New Category";
        if (categoryEditTarget) {
            var current = categoryEditTarget.querySelector(".server-category-name span");
            currentName = current && current.textContent.trim() ? current.textContent.trim() : currentName;
        }
        if (categoryTitle) categoryTitle.textContent = categoryEditTarget ? "Edit Category" : "Create Category";
        if (categoryConfirm) categoryConfirm.textContent = categoryEditTarget ? "Save Changes" : "Create Category";
        if (categoryName) categoryName.value = currentName;
        if (categoryPrivate) categoryPrivate.checked = false;
        syncCategoryName();
        closeMenu();
        closeChannelMenu();
        closeRowMenu();
        closeChannelModal();
        categoryModal.hidden = false;
        if (categoryName) {
            categoryName.focus();
            categoryName.select();
        }
    }

    function closeCategoryModal() {
        if (categoryModal) categoryModal.hidden = true;
        categoryEditTarget = null;
    }

    if (categoryModal) {
        categoryModal.addEventListener("click", function (event) {
            if (event.target === categoryModal) closeCategoryModal();
        });
    }
    if (categoryName) categoryName.addEventListener("input", syncCategoryName);
    var categoryClose = document.getElementById("category-modal-close");
    var categoryCancel = document.getElementById("category-modal-cancel");
    if (categoryClose) categoryClose.addEventListener("click", closeCategoryModal);
    if (categoryCancel) categoryCancel.addEventListener("click", closeCategoryModal);
    var categoryForm = document.getElementById("category-form");
    if (categoryForm) {
        categoryForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var text = categoryName ? categoryName.value.trim() : "";
            var editing = categoryEditTarget;
            if (!canArrange() || !text) return;
            if (editing) {
                var editedName = editing.querySelector(".server-category-name span");
                if (editedName) editedName.textContent = text;
                closeCategoryModal();
                return;
            }
            var tpl = document.getElementById("server-category-new");
            if (!tpl || !channelList) return;
            var frag = tpl.content.cloneNode(true);
            var created = frag.querySelector(".server-category");
            var createdName = created ? created.querySelector(".server-category-name span") : null;
            if (createdName) createdName.textContent = text;
            channelList.appendChild(frag);
            closeCategoryModal();
        });
    }

    var sortDrag = null;
    var sortMoved = false;
    var suppressSortClick = false;
    var dropLine = document.createElement("div");
    dropLine.className = "channel-drop-line";
    dropLine.hidden = true;
    document.body.appendChild(dropLine);

    function nextChannelRow(row) {
        var next = row ? row.nextElementSibling : null;
        if (next && next.classList.contains("server-voice-people")) next = next.nextElementSibling;
        while (next && next.classList.contains("is-dragging")) {
            next = next.nextElementSibling;
            if (next && next.classList.contains("server-voice-people")) next = next.nextElementSibling;
        }
        if (next && next.classList.contains("server-channel-row")) return next;
        return null;
    }

    function firstChannelRow(list) {
        if (!list) return null;
        var kids = list.children;
        for (var i = 0; i < kids.length; i++) {
            if (kids[i].classList.contains("server-channel-row") && !kids[i].classList.contains("is-dragging")) return kids[i];
        }
        return null;
    }

    function nextCategory(category) {
        var next = category ? category.nextElementSibling : null;
        while (next && !next.classList.contains("server-category")) next = next.nextElementSibling;
        return next;
    }

    function sortSlot(x, y, movingCategory) {
        var el = document.elementFromPoint(x, y);
        if (!el || !channelList || !channelList.contains(el)) return null;
        if (movingCategory) {
            var cat = el.closest(".server-category");
            if (!cat || cat.classList.contains("is-dragging")) return null;
            var box = cat.getBoundingClientRect();
            return { category: cat, before: y < box.top + box.height / 2 };
        }
        var row = el.closest(".server-channel-row");
        if (row && !row.classList.contains("is-dragging")) {
            var rowBox = row.getBoundingClientRect();
            return {
                list: row.parentElement,
                before: y < rowBox.top + rowBox.height / 2 ? row : nextChannelRow(row)
            };
        }
        var loose = el.closest(".server-channel-loose");
        if (loose) return { list: loose, before: firstChannelRow(loose) };
        var category = el.closest(".server-category");
        if (!category) return null;
        var list = category.querySelector(".server-category-list");
        if (!list) return null;
        return { list: list, before: firstChannelRow(list) };
    }

    function lineEdge(list) {
        var rows = [];
        var kids = list ? list.children : [];
        for (var i = 0; i < kids.length; i++) {
            if (kids[i].classList.contains("server-channel-row") && !kids[i].classList.contains("is-dragging")) rows.push(kids[i]);
        }
        if (rows.length) {
            var last = rows[rows.length - 1];
            var people = last.nextElementSibling;
            var edge = people && people.classList.contains("server-voice-people") && !people.hidden ? people : last;
            var box = edge.getBoundingClientRect();
            return { y: box.bottom, left: box.left, width: box.width };
        }
        var host = list.closest(".server-category") || list;
        var hostBox = host.getBoundingClientRect();
        return { y: hostBox.bottom, left: hostBox.left + 8, width: Math.max(40, hostBox.width - 16) };
    }

    function paintSortLine(slot) {
        if (!slot) {
            dropLine.hidden = true;
            return;
        }
        var y = 0;
        var left = 0;
        var width = 0;
        if (slot.category) {
            var box = slot.category.getBoundingClientRect();
            y = slot.before ? box.top : box.bottom;
            left = box.left;
            width = box.width;
        } else if (slot.before) {
            var beforeBox = slot.before.getBoundingClientRect();
            y = beforeBox.top;
            left = beforeBox.left;
            width = beforeBox.width;
        } else {
            var edge = lineEdge(slot.list);
            y = edge.y;
            left = edge.left;
            width = edge.width;
        }
        dropLine.hidden = false;
        dropLine.style.top = y + "px";
        dropLine.style.left = left + "px";
        dropLine.style.width = width + "px";
    }

    function clearSort() {
        if (!sortDrag) return;
        if (sortDrag.row) sortDrag.row.classList.remove("is-dragging");
        if (sortDrag.category) sortDrag.category.classList.remove("is-dragging");
        if (sortDrag.ghost) sortDrag.ghost.remove();
        dropLine.hidden = true;
        document.body.classList.remove("is-channel-dragging");
        sortDrag = null;
    }

    function moveChannel(row, list, before) {
        if (!row || !list) return;
        var people = row.nextElementSibling;
        var keep = people && people.classList.contains("server-voice-people") ? people : null;
        if (before === row || before === keep) return;
        list.insertBefore(row, before);
        if (keep) list.insertBefore(keep, before);
        var category = list.closest(".server-category");
        if (category) category.classList.remove("closed");
    }

    function finishSort() {
        if (!sortDrag || !sortMoved || !sortDrag.slot) return;
        var slot = sortDrag.slot;
        if (sortDrag.row) moveChannel(sortDrag.row, slot.list, slot.before);
        if (sortDrag.category && slot.category && slot.category !== sortDrag.category) {
            var ref = slot.before ? slot.category : nextCategory(slot.category);
            if (ref !== sortDrag.category) sortDrag.category.parentNode.insertBefore(sortDrag.category, ref);
        }
    }

    if (channelList) {
        channelList.addEventListener("click", function (event) {
            if (!suppressSortClick) return;
            suppressSortClick = false;
            event.preventDefault();
            event.stopPropagation();
        }, true);
        channelList.addEventListener("pointerdown", function (event) {
            if (!isOwner || event.button !== 0) return;
            if (event.target.closest(".server-channel-edit, .server-channel-delete, .server-category-add, .server-category-delete, .server-voice-invite, .server-voice-invite-open, .server-voice-invite-close")) return;
            var head = event.target.closest(".server-category-name");
            var row = head ? null : event.target.closest(".server-channel-row");
            var category = head ? head.closest(".server-category") : null;
            if (!row && !category) return;
            sortMoved = false;
            sortDrag = {
                pointer: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                row: row,
                category: category,
                ghost: null,
                slot: null
            };
        });
    }
    document.addEventListener("pointermove", function (event) {
        if (!sortDrag || event.pointerId !== sortDrag.pointer) return;
        var dx = event.clientX - sortDrag.x;
        var dy = event.clientY - sortDrag.y;
        if (!sortMoved && dx * dx + dy * dy < 36) return;
        if (!sortMoved) {
            sortMoved = true;
            document.body.classList.add("is-channel-dragging");
            var source = sortDrag.row || sortDrag.category;
            source.classList.add("is-dragging");
            var ghost = document.createElement("div");
            ghost.className = "channel-drag-ghost";
            var label = source.querySelector(".server-channel-name, .server-category-name span");
            ghost.textContent = label ? label.textContent.trim() : "";
            document.body.appendChild(ghost);
            sortDrag.ghost = ghost;
        }
        sortDrag.ghost.style.left = event.clientX + "px";
        sortDrag.ghost.style.top = event.clientY + "px";
        sortDrag.slot = sortSlot(event.clientX, event.clientY, !!sortDrag.category && !sortDrag.row);
        paintSortLine(sortDrag.slot);
    });
    document.addEventListener("pointerup", function (event) {
        if (!sortDrag || event.pointerId !== sortDrag.pointer) return;
        if (sortMoved) suppressSortClick = true;
        finishSort();
        clearSort();
    });
    document.addEventListener("pointercancel", function (event) {
        if (!sortDrag || event.pointerId !== sortDrag.pointer) return;
        clearSort();
    });

    var inviteModal = document.getElementById("invite-modal");
    var inviteName = document.getElementById("invite-server-name");
    var inviteRoom = document.getElementById("invite-room");
    var inviteLink = document.getElementById("invite-link");
    var inviteCopy = document.getElementById("invite-copy");

    function openInviteModal() {
        if (!inviteModal) return;
        if (inviteName && serverTitle) inviteName.textContent = serverTitle.textContent.trim() || "Server";
        if (inviteRoom) {
            var room = document.querySelector("#server-channel-list .server-channel:not([hidden]) .server-channel-name");
            inviteRoom.textContent = room ? "#" + room.textContent.trim() : "the server";
        }
        if (inviteCopy) inviteCopy.textContent = "Copy";
        if (inviteLink && currentServer && currentServer.inviteCode) inviteLink.value = window.location.origin + "/" + currentServer.inviteCode;
        var members = document.querySelectorAll("#server-member-list .server-member-name");
        var taken = [];
        for (var i = 0; i < members.length; i++) taken.push(members[i].textContent.trim());
        var rows = document.querySelectorAll("#invite-list .invite-row");
        for (var j = 0; j < rows.length; j++) rows[j].hidden = taken.indexOf(rows[j].getAttribute("data-friend")) !== -1;
        closeMenu();
        closeChannelMenu();
        inviteModal.hidden = false;
    }

    function closeInviteModal() {
        if (inviteModal) inviteModal.hidden = true;
    }

    if (inviteModal) {
        inviteModal.addEventListener("click", function (event) {
            if (event.target === inviteModal) closeInviteModal();
            var send = event.target.closest(".invite-send");
            if (!send || send.classList.contains("on")) return;
            send.classList.add("on");
            send.textContent = "Invited";
        });
    }
    if (inviteCopy && inviteLink) {
        inviteCopy.addEventListener("click", function () {
            var value = inviteLink.value;
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value);
            inviteLink.focus();
            inviteLink.select();
            inviteCopy.textContent = "Copied";
        });
    }
    var inviteClose = document.getElementById("invite-close");
    if (inviteClose) inviteClose.addEventListener("click", closeInviteModal);

    var settingsNav = settings ? settings.querySelector(".server-settings-nav") : null;
    if (settingsNav) {
        settingsNav.addEventListener("click", function (event) {
            var button = event.target.closest("[data-panel]");
            if (!button) return;
            var name = button.getAttribute("data-panel");
            var buttons = settingsNav.querySelectorAll("[data-panel]");
            var panels = settings.querySelectorAll("section[data-panel]");
            for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle("on", buttons[i] === button);
            for (var j = 0; j < panels.length; j++) panels[j].hidden = panels[j].getAttribute("data-panel") !== name;
        });
    }

    var colors = document.getElementById("server-banner-colors");
    var preview = document.getElementById("server-profile-preview");
    if (colors && preview) {
        colors.addEventListener("click", function (event) {
            var swatch = event.target.closest("[data-color]");
            if (!swatch) return;
            var swatches = colors.querySelectorAll("[data-color]");
            for (var i = 0; i < swatches.length; i++) swatches[i].classList.toggle("on", swatches[i] === swatch);
            preview.setAttribute("data-banner", swatch.getAttribute("data-color"));
        });
    }

    var profileName = document.getElementById("server-profile-name");
    var previewName = document.getElementById("server-preview-name");
    var settingsName = document.getElementById("server-settings-name");
    if (profileName && previewName) {
        profileName.addEventListener("input", function () {
            var text = profileName.value.trim() || "Server";
            previewName.textContent = text;
            if (settingsName) settingsName.textContent = text;
            var boostName = document.getElementById("boost-preview-name");
            if (boostName) boostName.textContent = text;
            var letters = document.querySelectorAll("#server-icon-face span, #server-preview-icon span, #boost-preview-icon span");
            for (var i = 0; i < letters.length; i++) {
                if (!letters[i].hidden) letters[i].textContent = text.charAt(0).toUpperCase();
            }
        });
    }

    var privateToggle = document.getElementById("server-private");
    var profileSide = document.querySelector(".server-profile-side");
    if (privateToggle && profileSide) {
        privateToggle.addEventListener("change", function () {
            profileSide.classList.toggle("is-private", privateToggle.checked);
        });
    }

    var iconFile = document.getElementById("server-icon-file");
    if (iconFile) {
        iconFile.addEventListener("change", function () {
            var image = iconFile.files && iconFile.files[0];
            if (!image) return;
            var url = URL.createObjectURL(image);
            var faces = document.querySelectorAll("#server-icon-face img, #server-preview-icon img, #boost-preview-icon img");
            var letters = document.querySelectorAll("#server-icon-face span, #server-preview-icon span, #boost-preview-icon span");
            for (var i = 0; i < faces.length; i++) {
                faces[i].src = url;
                faces[i].hidden = false;
            }
            for (var j = 0; j < letters.length; j++) letters[j].hidden = true;
        });
    }

    var showMembers = document.getElementById("members-in-list");
    var memberAside = document.getElementById("server-members");
    if (showMembers && memberAside) {
        showMembers.addEventListener("change", function () {
            var open = showMembers.checked;
            var panel = membersPanel();
            if (panel) panel.classList.toggle("off", !open);
            var buttons = document.querySelectorAll(".server-members-toggle");
            for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle("on", open);
        });
    }

    var selectAll = document.getElementById("members-select-all");
    var memberTable = document.getElementById("server-member-table");
    if (selectAll && memberTable) {
        selectAll.addEventListener("change", function () {
            var boxes = memberTable.querySelectorAll("input[type=checkbox]");
            for (var i = 0; i < boxes.length; i++) boxes[i].checked = selectAll.checked;
        });
    }

    var boostProgress = document.getElementById("boost-progress");
    var boostGoal = document.querySelector(".boost-goal");
    if (boostProgress && boostGoal) {
        boostProgress.addEventListener("change", function () {
            boostGoal.hidden = !boostProgress.checked;
        });
    }

    function previewFile(input, images) {
        if (!input) return;
        input.addEventListener("change", function () {
            var image = input.files && input.files[0];
            if (!image) return;
            var url = URL.createObjectURL(image);
            for (var i = 0; i < images.length; i++) {
                images[i].src = url;
                images[i].hidden = false;
            }
        });
    }

    previewFile(document.getElementById("boost-banner-file"), [
        document.getElementById("boost-banner-preview"),
        document.querySelector("#boost-preview-banner img")
    ].filter(Boolean));
    previewFile(document.getElementById("boost-invite-file"), [
        document.getElementById("boost-invite-preview")
    ].filter(Boolean));

    var settingsOpen = document.getElementById("server-settings-open");
    if (settingsOpen) {
        settingsOpen.addEventListener("click", function () {
            if (!isOwner) return;
            closeMenu();
            showRoom("settings");
            openOnPhone();
        });
    }
    var settingsClose = document.getElementById("server-settings-close");
    if (settingsClose) {
        settingsClose.addEventListener("click", function () {
            showRoom(roomKind);
        });
    }
    var roleEditor = document.querySelector(".role-editor");
    var roleDraft = document.getElementById("role-draft");
    var roleEveryone = document.getElementById("role-everyone");
    var roleTitle = document.getElementById("role-editor-name");
    var roleName = document.getElementById("role-name");
    var roleMore = document.getElementById("role-more");
    var roleMoreMenu = document.getElementById("role-more-menu");
    var roleDelete = document.getElementById("role-delete");
    var roleAdd = document.getElementById("role-add");
    var roleColors = document.getElementById("role-colors");

    function closeRoleMenu() {
        if (!roleMoreMenu || !roleMore) return;
        roleMoreMenu.hidden = true;
        roleMore.setAttribute("aria-expanded", "false");
    }

    function closeRoleAdd() {
        if (roleAdd) roleAdd.hidden = true;
    }

    function showRoleTab(name) {
        if (!roleEditor) return;
        var tabs = roleEditor.querySelectorAll("[data-role-tab]");
        var panels = roleEditor.querySelectorAll("[data-role-panel]");
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i].getAttribute("data-role-tab") === name);
        for (var j = 0; j < panels.length; j++) panels[j].hidden = panels[j].getAttribute("data-role-panel") !== name;
    }

    function selectRole(row) {
        if (!roleEditor || !row) return;
        var rows = roleEditor.querySelectorAll(".role-row");
        var label = row.querySelector(".role-label");
        var text = label ? label.textContent : "";
        for (var i = 0; i < rows.length; i++) rows[i].classList.toggle("on", rows[i] === row);
        if (roleTitle) roleTitle.textContent = text;
        if (roleName) {
            roleName.value = text;
            roleName.readOnly = row === roleEveryone;
        }
        if (roleDelete) roleDelete.disabled = row === roleEveryone;
        if (roleColors) {
            var color = row.getAttribute("data-color") || "gray";
            var swatches = roleColors.querySelectorAll("[data-role-color]");
            for (var j = 0; j < swatches.length; j++) swatches[j].classList.toggle("on", swatches[j].getAttribute("data-role-color") === color);
        }
    }

    var roleBack = document.getElementById("role-back");
    if (roleBack && settingsNav) {
        roleBack.addEventListener("click", function () {
            var profile = settingsNav.querySelector('[data-panel="profile"]');
            if (profile) profile.click();
        });
    }

    var roleCreate = document.getElementById("role-create");
    if (roleCreate && roleDraft) {
        roleCreate.addEventListener("click", function () {
            var label = roleDraft.querySelector(".role-label");
            if (label) label.textContent = "new role";
            roleDraft.hidden = false;
            roleDraft.setAttribute("data-color", "gray");
            selectRole(roleDraft);
            showRoleTab("display");
            if (roleName) roleName.focus();
        });
    }

    if (roleEditor) {
        roleEditor.addEventListener("click", function (event) {
            var clear = event.target.closest(".perm-clear");
            if (clear) {
                var group = clear.closest(".perm-group");
                var boxes = group ? group.querySelectorAll("input[type=checkbox]") : [];
                for (var k = 0; k < boxes.length; k++) boxes[k].checked = false;
                return;
            }
            var row = event.target.closest(".role-row");
            if (row && roleEditor.contains(row)) selectRole(row);
            var tab = event.target.closest("[data-role-tab]");
            if (tab) showRoleTab(tab.getAttribute("data-role-tab"));
        });
    }

    if (roleName && roleDraft) {
        roleName.addEventListener("input", function () {
            if (roleDraft.hidden || !roleDraft.classList.contains("on")) return;
            var text = roleName.value.trim() || "new role";
            var label = roleDraft.querySelector(".role-label");
            if (label) label.textContent = text;
            if (roleTitle) roleTitle.textContent = text;
        });
    }

    if (roleColors) {
        roleColors.addEventListener("click", function (event) {
            var swatch = event.target.closest("[data-role-color]");
            if (!swatch || !roleEditor) return;
            var row = roleEditor.querySelector(".role-row.on");
            if (!row) return;
            var swatches = roleColors.querySelectorAll("[data-role-color]");
            var color = swatch.getAttribute("data-role-color");
            for (var i = 0; i < swatches.length; i++) swatches[i].classList.toggle("on", swatches[i] === swatch);
            row.setAttribute("data-color", color);
        });
    }

    if (roleMore && roleMoreMenu) {
        roleMore.addEventListener("click", function (event) {
            event.stopPropagation();
            roleMoreMenu.hidden = !roleMoreMenu.hidden;
            roleMore.setAttribute("aria-expanded", roleMoreMenu.hidden ? "false" : "true");
        });
        roleMoreMenu.addEventListener("click", function (event) {
            event.stopPropagation();
        });
    }

    if (roleDelete && roleDraft && roleEveryone) {
        roleDelete.addEventListener("click", function () {
            if (roleDelete.disabled || roleDraft.hidden || !roleDraft.classList.contains("on")) return;
            roleDraft.hidden = true;
            selectRole(roleEveryone);
            closeRoleMenu();
        });
    }

    function openRoleAdd() {
        if (roleAdd) roleAdd.hidden = !roleAdd.hidden;
    }

    var roleAddOpen = document.getElementById("role-add-open");
    var roleAddLink = document.getElementById("role-add-link");
    if (roleAddOpen) roleAddOpen.addEventListener("click", openRoleAdd);
    if (roleAddLink) roleAddLink.addEventListener("click", function () {
        if (roleAdd) roleAdd.hidden = false;
    });

    document.addEventListener("click", function (event) {
        if (roleMoreMenu && !roleMoreMenu.hidden && !event.target.closest("#role-more") && !event.target.closest("#role-more-menu")) closeRoleMenu();
    });

    var deleteModal = document.getElementById("server-delete-modal");
    var deleteInput = document.getElementById("server-delete-input");
    var deleteConfirm = document.getElementById("server-delete-confirm");
    var deleteTitle = document.getElementById("server-delete-title");
    var deleteName = document.getElementById("server-delete-name");
    var serverTitle = document.getElementById("server-title");

    function serverLabel() {
        var text = serverTitle ? serverTitle.textContent.trim() : "";
        return text || "Server";
    }

    function syncDeleteName() {
        var text = serverLabel();
        if (deleteTitle) deleteTitle.textContent = text;
        if (deleteName) deleteName.textContent = text;
        if (deleteConfirm) deleteConfirm.disabled = !deleteInput || deleteInput.value !== text;
    }

    function openDeleteModal() {
        if (!deleteModal) return;
        if (deleteInput) deleteInput.value = "";
        syncDeleteName();
        deleteModal.hidden = false;
        if (deleteInput) deleteInput.focus();
    }

    function closeDeleteModal() {
        if (!deleteModal) return;
        deleteModal.hidden = true;
        if (deleteInput) deleteInput.value = "";
        if (deleteConfirm) deleteConfirm.disabled = true;
    }

    var deleteOpen = document.getElementById("server-delete-open");
    if (deleteOpen) deleteOpen.addEventListener("click", openDeleteModal);
    if (deleteInput) deleteInput.addEventListener("input", syncDeleteName);
    var deleteClose = document.getElementById("server-delete-close");
    var deleteCancel = document.getElementById("server-delete-cancel");
    if (deleteClose) deleteClose.addEventListener("click", closeDeleteModal);
    if (deleteCancel) deleteCancel.addEventListener("click", closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener("click", function (event) {
            if (event.target === deleteModal) closeDeleteModal();
        });
    }
    var deleteForm = document.getElementById("server-delete-form");
    if (deleteForm) {
        deleteForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!deleteConfirm || deleteConfirm.disabled) return;
            closeDeleteModal();
        });
    }

    var leaveModal = document.getElementById("leave-server-modal");
    var leaveOpen = document.getElementById("server-leave-open");
    var leaveClose = document.getElementById("leave-server-close");
    var leaveCancel = document.getElementById("leave-server-cancel");
    var leaveConfirm = document.getElementById("leave-server-confirm");
    var leaveTitle = document.getElementById("leave-server-title");
    var leaveName = document.getElementById("leave-server-name");

    function syncLeaveServerName() {
        var text = serverLabel();
        if (leaveTitle) leaveTitle.textContent = text;
        if (leaveName) leaveName.textContent = text;
    }

    function openLeaveModal() {
        closeMenu();
        if (!leaveModal) return;
        syncLeaveServerName();
        leaveModal.hidden = false;
    }

    function closeLeaveModal() {
        if (!leaveModal) return;
        leaveModal.hidden = true;
    }

    function confirmLeaveServer() {
        closeLeaveModal();
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        fetch("/Server/Leave", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": field ? field.value : "", "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify({ id: Number(openId) || 0 })
        }).then(function () {
            window.location.href = "/Home/Index";
        }).catch(function () {
            window.location.href = "/Home/Index";
        });
    }

    if (leaveOpen) leaveOpen.addEventListener("click", openLeaveModal);
    if (leaveClose) leaveClose.addEventListener("click", closeLeaveModal);
    if (leaveCancel) leaveCancel.addEventListener("click", closeLeaveModal);
    if (leaveConfirm) leaveConfirm.addEventListener("click", confirmLeaveServer);
    if (leaveModal) {
        leaveModal.addEventListener("click", function (event) {
            if (event.target === leaveModal) closeLeaveModal();
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        if (leaveModal && !leaveModal.hidden) {
            closeLeaveModal();
            return;
        }
        if (inviteModal && !inviteModal.hidden) {
            closeInviteModal();
            return;
        }
        if (categoryModal && !categoryModal.hidden) {
            closeCategoryModal();
            return;
        }
        if (channelModal && !channelModal.hidden) {
            closeChannelModal();
            return;
        }
        if (channelMenu && !channelMenu.hidden) {
            closeChannelMenu();
            return;
        }
        if (rowMenu && !rowMenu.hidden) {
            closeRowMenu();
            return;
        }
        if (removeModal && !removeModal.hidden) {
            closeRemove();
            return;
        }
        if (deleteModal && !deleteModal.hidden) {
            closeDeleteModal();
            return;
        }
        if (roleMoreMenu && !roleMoreMenu.hidden) {
            closeRoleMenu();
            return;
        }
        if (roleAdd && !roleAdd.hidden) {
            closeRoleAdd();
            return;
        }
        if (menu && !menu.hidden) {
            closeMenu();
            return;
        }
        if (settings && !settings.hidden) showRoom(roomKind);
    });

    if (input) {
        input.addEventListener("input", function () {
            input.setAttribute("data-empty", input.textContent.trim() ? "0" : "1");
        });
        input.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            sendMessage();
        });
    }
    var compose = document.getElementById("server-compose");
    if (compose) {
        compose.addEventListener("submit", function (event) {
            event.preventDefault();
            sendMessage();
        });
    }
    if (voiceJoin) voiceJoin.addEventListener("click", function () {
        if (currentChannel) joinVoice(currentChannel);
    });
    if (voiceLeave) voiceLeave.addEventListener("click", leaveVoice);
    var voiceHangup = document.getElementById("server-voice-hangup");
    var voiceBarLeave = document.getElementById("server-voice-bar-leave");
    if (voiceHangup) voiceHangup.addEventListener("click", leaveVoice);
    if (voiceBarLeave) voiceBarLeave.addEventListener("click", leaveVoice);
    var voiceMic = document.getElementById("server-voice-mic");
    function paintVoiceMute() {
        var muted   = typeof micO !== "undefined" && !!micO;
        var deafened = typeof headO !== "undefined" && !!headO;
        var anyMuted = muted || deafened;
        if (voiceMic) {
            voiceMic.classList.toggle("is-off", anyMuted);
            var icon = voiceMic.querySelector("i");
            if (icon) icon.className = anyMuted ? "fa-solid fa-microphone-slash" : "fa-solid fa-microphone";
        }
        var tile = document.querySelector(".server-voice-tile");
        if (tile) {
            tile.classList.toggle("is-muted", anyMuted);
            tile.classList.toggle("is-deafened", deafened);
        }
        var users = document.querySelectorAll(".server-voice-user");
        for (var u = 0; u < users.length; u++) {
            users[u].classList.toggle("is-muted", anyMuted);
            users[u].classList.toggle("is-deafened", deafened);
        }
    }
    var toggleMic = window.mic;
    window.mic = function () {
        if (typeof toggleMic === "function") toggleMic();
        paintVoiceMute();
    };
    var toggleHeadp = window.headp;
    window.headp = function () {
        if (typeof toggleHeadp === "function") toggleHeadp();
        paintVoiceMute();
    };
    if (voiceMic) {
        voiceMic.addEventListener("click", function () {
            if (typeof window.mic === "function") window.mic();
        });
    }
    paintVoiceMute();

    var voiceCam = document.getElementById("server-voice-cam");
    var voiceScreen = document.getElementById("server-voice-screen");
    var camVideo = document.getElementById("server-voice-cam-video");
    var screenVideo = document.getElementById("server-voice-screen-video");
    var voiceTile = document.getElementById("server-voice-tile");

    function feedUrl(value, key) {
        if (!value || value === true) return "";
        if (typeof value === "string") return value;
        if (value.on === false) return "";
        return value.url || value.src || value[key] || "";
    }

    function setFeedVideo(video, url) {
        if (!video) return;
        var current = video.getAttribute("src") || "";
        if (current === url) return;
        if (!url) {
            video.removeAttribute("src");
            video.load();
            return;
        }
        video.src = url;
        var play = video.play();
        if (play && typeof play.catch === "function") play.catch(function () {});
    }

    function syncVoiceFeeds() {
        if (!voiceTile) return;
        var camOn = !!voiceFeeds.camera;
        var screenOn = !!voiceFeeds.screen;
        voiceTile.classList.toggle("has-cam", camOn);
        voiceTile.classList.toggle("has-screen", screenOn);
        if (voiceCam) {
            voiceCam.classList.toggle("is-off", !camOn);
            voiceCam.setAttribute("aria-pressed", camOn ? "true" : "false");
            voiceCam.setAttribute("aria-label", camOn ? "Turn off camera" : "Turn on camera");
            var camIcon = voiceCam.querySelector("i");
            if (camIcon) camIcon.className = camOn ? "fa-solid fa-video" : "fa-solid fa-video-slash";
        }
        if (voiceScreen) {
            voiceScreen.classList.toggle("is-on", screenOn);
            voiceScreen.setAttribute("aria-pressed", screenOn ? "true" : "false");
        }
        setFeedVideo(camVideo, voiceFeeds.camera);
        setFeedVideo(screenVideo, voiceFeeds.screen);
    }

    function setVoiceFeed(kind, on) {
        var key = kind === "screen" ? "screen" : "camera";
        if (!on) {
            voiceFeeds[key] = "";
            syncVoiceFeeds();
            fetch(serverApi("/voice/" + key), { method: "DELETE" }).catch(function () {});
            return;
        }
        fetch(serverApi("/voice/" + key), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channel: joinedVoice ? channelTitle(joinedVoice) : "" })
        }).then(function (response) {
            if (!response.ok) throw new Error(key);
            return response.json();
        }).then(function (payload) {
            var url = feedUrl(payload, key);
            if (!url) throw new Error(key);
            voiceFeeds[key] = url;
            syncVoiceFeeds();
        }).catch(function () {
            voiceFeeds[key] = "";
            syncVoiceFeeds();
        });
    }

    function stopVoiceMedia() {
        voiceFeeds.camera = "";
        voiceFeeds.screen = "";
        syncVoiceFeeds();
        fetch(serverApi("/voice/camera"), { method: "DELETE" }).catch(function () {});
        fetch(serverApi("/voice/screen"), { method: "DELETE" }).catch(function () {});
    }

    if (voiceCam) {
        voiceCam.addEventListener("click", function () {
            setVoiceFeed("camera", !voiceFeeds.camera);
        });
    }
    if (voiceScreen) {
        voiceScreen.addEventListener("click", function () {
            setVoiceFeed("screen", !voiceFeeds.screen);
        });
    }
    if (camVideo) {
        camVideo.addEventListener("ended", function () {
            if (voiceFeeds.camera) setVoiceFeed("camera", false);
        });
    }
    if (screenVideo) {
        screenVideo.addEventListener("ended", function () {
            if (voiceFeeds.screen) setVoiceFeed("screen", false);
        });
    }
    syncVoiceFeeds();

    var voiceFull = document.getElementById("server-voice-full");
    var voiceRoom = document.querySelector(".server-voice");

    function setVoiceFull(on) {
        if (!voiceRoom || !voiceFull) return;
        var tile = document.getElementById("server-voice-tile");
        if (tile && on && !voiceRoom.classList.contains("is-full")) {
            var box = tile.getBoundingClientRect();
            tile.style.flex = "0 0 auto";
            tile.style.width = Math.round(box.width) + "px";
            tile.style.height = Math.round(box.height) + "px";
            tile.style.maxWidth = "none";
        } else if (tile && !on) {
            tile.style.flex = "";
            tile.style.width = "";
            tile.style.height = "";
            tile.style.maxWidth = "";
        }
        voiceRoom.classList.toggle("is-full", on);
        voiceFull.setAttribute("aria-pressed", on ? "true" : "false");
        voiceFull.setAttribute("aria-label", on ? "Exit full screen" : "Full Screen");
        var icon = voiceFull.querySelector("i");
        if (icon) icon.className = on ? "fa-solid fa-compress" : "fa-solid fa-expand";
    }

    if (voiceFull) {
        voiceFull.addEventListener("click", function () {
            setVoiceFull(!voiceRoom.classList.contains("is-full"));
        });
    }
    function openVoiceInvite() {
        if (typeof openInviteModal === "function") openInviteModal();
    }
    function dismissVoiceInvite(event) {
        var closeInvite = event.target.closest(".server-voice-invite-close");
        if (!closeInvite) return false;
        var inviteRow = closeInvite.closest(".server-voice-invite");
        if (inviteRow) inviteRow.hidden = true;
        return true;
    }
    if (channelList) {
        channelList.addEventListener("click", function (event) {
            if (dismissVoiceInvite(event)) return;
            if (event.target.closest(".server-voice-invite-open")) openVoiceInvite();
        });
    }
    var voiceInviteMain = document.getElementById("server-voice-invite-main");
    if (voiceInviteMain) voiceInviteMain.addEventListener("click", openVoiceInvite);

    var welcomeEdit = document.getElementById("server-welcome-edit");
    if (welcomeEdit) {
        welcomeEdit.addEventListener("click", function () {
            if (isOwner && currentChannel) openChannelEdit(currentChannel);
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

    var firstRoom = document.querySelector("#server-channel-list .server-channel.on");
    if (firstRoom) selectChannel(firstRoom);
})();
