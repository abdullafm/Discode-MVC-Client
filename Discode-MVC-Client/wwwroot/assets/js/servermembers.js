(function () {
    "use strict";

    var body = document.getElementById("server-member-table");
    if (!body) return;

    var serverId = new URLSearchParams(window.location.search).get("id");
    if (!serverId) return;

    var searchInput = document.getElementById("members-search-input");
    var sortButton = document.getElementById("members-sort");
    var title = document.getElementById("members-title");
    var count = document.getElementById("members-count");
    var empty = document.querySelector(".members-empty");
    var selectAll = document.getElementById("members-select-all");
    var heads = document.querySelectorAll(".members-table th[data-sort]");
    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
    var ROLE_COLORS = { gray: "#80848e", pink: "#eb459e", red: "#ed4245", orange: "#f26522", yellow: "#fee75c", purple: "#9b59d0", blue: "#5865f2", cyan: "#1abc9c", green: "#23a559" };

    var members = [];
    var query = "";
    var sortKey = "since";
    var sortDesc = true;
    var menu = null;

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function ago(value) {
        var seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
        if (seconds < 60) return "just now";
        var minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
        var days = Math.floor(hours / 24);
        if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
        var months = Math.floor(days / 30);
        if (months < 12) return months + (months === 1 ? " month ago" : " months ago");
        var years = Math.floor(days / 365);
        return years + (years === 1 ? " year ago" : " years ago");
    }

    function compare(a, b) {
        var result = 0;
        if (sortKey === "name") result = a.displayName.localeCompare(b.displayName);
        else if (sortKey === "since") result = new Date(a.joinedAt) - new Date(b.joinedAt);
        else if (sortKey === "discord") result = new Date(a.accountCreatedAt) - new Date(b.accountCreatedAt);
        else if (sortKey === "method") result = (a.joinMethod || "").localeCompare(b.joinMethod || "");
        else if (sortKey === "roles") result = ((a.isOwner ? 1000 : 0) + (a.roles || []).length) - ((b.isOwner ? 1000 : 0) + (b.roles || []).length);
        return sortDesc ? -result : result;
    }

    function visible() {
        var text = query.trim().toLowerCase();
        var list = members.filter(function (member) {
            if (!text) return true;
            return member.displayName.toLowerCase().indexOf(text) !== -1
                || member.userName.toLowerCase().indexOf(text) !== -1
                || String(member.id).toLowerCase().indexOf(text) !== -1;
        });
        return list.sort(compare);
    }

    function closeMenu() {
        if (menu) menu.hidden = true;
    }

    function tokenValue() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function confirmAction(options) {
        var shade = element("div", "server-delete-modal");
        var form = element("form", "server-delete-card");
        var head = element("div", "server-delete-head");
        head.appendChild(element("h2", "", options.title));
        var close = element("button");
        close.type = "button";
        close.setAttribute("aria-label", "Close");
        close.appendChild(element("i", "fa-solid fa-xmark"));
        head.appendChild(close);
        form.appendChild(head);
        form.appendChild(element("p", "", options.text));
        var reason = null;
        if (options.reason) {
            form.appendChild(element("label", "", "Reason (optional)"));
            reason = document.createElement("input");
            reason.type = "text";
            reason.maxLength = 300;
            reason.autocomplete = "off";
            form.appendChild(reason);
        }
        var duration = null;
        if (options.duration) {
            form.appendChild(element("label", "", "Duration"));
            duration = document.createElement("select");
            [[1, "60 secs"], [5, "5 mins"], [10, "10 mins"], [60, "1 hour"], [1440, "1 day"], [10080, "1 week"]].forEach(function (choice) {
                var opt = document.createElement("option");
                opt.value = choice[0];
                opt.textContent = choice[1];
                duration.appendChild(opt);
            });
            duration.value = "10";
            form.appendChild(duration);
        }
        var problem = element("p", "confirm-error");
        problem.hidden = true;
        form.appendChild(problem);
        var actions = element("div", "server-delete-actions");
        var cancel = element("button", "", "Cancel");
        cancel.type = "button";
        var go = element("button", "confirm-danger", options.confirm);
        go.type = "submit";
        actions.appendChild(cancel);
        actions.appendChild(go);
        form.appendChild(actions);
        shade.appendChild(form);
        document.body.appendChild(shade);
        if (reason) reason.focus();

        function dismiss() {
            if (shade.parentNode) shade.parentNode.removeChild(shade);
        }

        close.addEventListener("click", dismiss);
        cancel.addEventListener("click", dismiss);
        shade.addEventListener("mousedown", function (event) {
            if (event.target === shade) dismiss();
        });
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            go.disabled = true;
            fetch(options.url, {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json", "RequestVerificationToken": tokenValue(), "X-Requested-With": "XMLHttpRequest" },
                body: JSON.stringify({ serverId: Number(serverId), userId: options.member.id, reason: reason ? reason.value.trim() : "", minutes: duration ? Number(duration.value) : 0 })
            }).then(function (response) {
                return response.json().catch(function () { return {}; }).then(function (data) {
                    if (!response.ok) throw new Error((data && data.errors && data.errors[0]) || "Something went wrong.");
                    dismiss();
                    load();
                });
            }).catch(function (error) {
                go.disabled = false;
                problem.textContent = error.message;
                problem.hidden = false;
            });
        });
    }

    function postJson(url, body) {
        return fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": tokenValue(), "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify(body)
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (data) {
                if (!response.ok) throw new Error((data && data.errors && data.errors[0]) || "Something went wrong.");
                return data;
            });
        });
    }

    window.discodeMemberMenu = {
        open: function (member, x, y) {
            openMenu(member, { getBoundingClientRect: function () { return { left: x, right: x, top: y, bottom: y }; } });
        }
    };

    function openMenu(member, anchor) {
        if (!menu) {
            menu = element("div", "row-menu members-ctx");
            menu.hidden = true;
            menu.appendChild(document.createElement("ul"));
            document.body.appendChild(menu);
        }
        var list = menu.firstChild;
        list.textContent = "";
        function add(label, action, danger) {
            var li = document.createElement("li");
            var button = document.createElement("button");
            button.type = "button";
            if (danger) button.className = "row-menu-danger";
            button.appendChild(element("span", "row-menu-label", label));
            button.addEventListener("click", function () {
                closeMenu();
                action();
            });
            li.appendChild(button);
            list.appendChild(li);
        }
        add("Profile", function () {
            if (window.openUserProfile) window.openUserProfile(member.userName, member.avatarUrl || "");
        });
        if (!member.isSelf) {
            add("Message", function () {
                var url = "/Dm/Index?name=" + encodeURIComponent(member.userName);
                if (window.discodeGo) window.discodeGo(url);
                else window.location.href = url;
            });
        }
        add("Mention", function () {
            document.dispatchEvent(new CustomEvent("discode-mention-member", { detail: { name: member.userName } }));
        });
        add("Copy User ID", function () {
            if (navigator.clipboard) navigator.clipboard.writeText(member.publicId || member.id).catch(function () {});
        });
        var perms = window.discodeServerRoles ? Number(window.discodeServerRoles.perms) || 0 : 0;
        var manageable = ((window.discodeServerRoles && window.discodeServerRoles.roles) || []).filter(function (role) { return !role.isEveryone && role.canManage !== false; });
        if ((perms & 4) === 4 && manageable.length && !member.isOwner) {
            var rolesItem = document.createElement("li");
            var rolesButton = document.createElement("button");
            rolesButton.type = "button";
            rolesButton.appendChild(element("span", "row-menu-label", "Roles"));
            rolesButton.appendChild(element("i", "fa-solid fa-chevron-down"));
            rolesItem.appendChild(rolesButton);
            var sub = element("ul", "ctx-sub");
            sub.hidden = true;
            manageable.forEach(function (role) {
                var has = (member.roles || []).some(function (held) { return held.id === role.id; });
                var line = document.createElement("li");
                var pick = document.createElement("button");
                pick.type = "button";
                pick.className = "ctx-role-row" + (has ? " on" : "");
                pick.appendChild(element("i", "fa-solid fa-check"));
                pick.appendChild(element("span", "row-menu-label", role.name));
                pick.addEventListener("click", function () {
                    closeMenu();
                    if (window.discodeServerRoles && window.discodeServerRoles.toggle) {
                        window.discodeServerRoles.toggle(role.id, member.id, has).catch(function (error) {
                            if (window.discodeServerFlash) window.discodeServerFlash(error.message);
                        });
                    }
                });
                line.appendChild(pick);
                sub.appendChild(line);
            });
            rolesButton.addEventListener("click", function (event) {
                event.stopPropagation();
                sub.hidden = !sub.hidden;
            });
            list.appendChild(rolesItem);
            list.appendChild(sub);
        }
        if (!member.isSelf && !member.isOwner && member.canModerate) {
            if ((perms & 65536) === 65536) {
                if (member.timeoutUntil) {
                    add("Remove Timeout from " + member.displayName, function () {
                        postJson("/Server/Timeout", { serverId: Number(serverId), userId: member.id, minutes: 0 }).then(load).catch(function (error) {
                            if (window.discodeServerFlash) window.discodeServerFlash(error.message);
                        });
                    });
                } else {
                    add("Timeout " + member.displayName, function () {
                        confirmAction({
                            title: "Timeout " + member.displayName,
                            text: "They won't be able to send messages or react until the timeout ends.",
                            confirm: "Timeout",
                            url: "/Server/Timeout",
                            duration: true,
                            member: member
                        });
                    }, true);
                }
            }
            if ((perms & 16384) === 16384) {
                add("Kick " + member.displayName, function () {
                    confirmAction({
                        title: "Kick " + member.displayName,
                        text: "They will be removed from the server but can rejoin with an invite.",
                        confirm: "Kick",
                        url: "/Server/Kick",
                        member: member
                    });
                }, true);
            }
            if ((perms & 32768) === 32768) {
                add("Ban " + member.displayName, function () {
                    confirmAction({
                        title: "Ban " + member.displayName,
                        text: "They will be removed and can't rejoin until you unban them.",
                        confirm: "Ban",
                        url: "/Server/Ban",
                        reason: true,
                        member: member
                    });
                }, true);
            }
        }
        menu.hidden = false;
        var rect = anchor.getBoundingClientRect();
        var width = menu.offsetWidth;
        var height = menu.offsetHeight;
        menu.style.left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)) + "px";
        menu.style.top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - height - 8)) + "px";
    }

    function row(member) {
        var tr = document.createElement("tr");
        var box = document.createElement("td");
        var check = document.createElement("input");
        check.type = "checkbox";
        check.setAttribute("aria-label", "Select " + member.displayName);
        box.appendChild(check);
        tr.appendChild(box);

        var who = document.createElement("td");
        var line = element("div", "members-who");
        var photo = document.createElement("img");
        photo.alt = "";
        photo.src = member.avatarUrl || DEFAULT_AVATAR;
        line.appendChild(photo);
        var names = element("div", "members-names");
        names.appendChild(element("strong", "", member.displayName));
        names.appendChild(element("small", "", member.userName));
        line.appendChild(names);
        who.appendChild(line);
        tr.appendChild(who);

        var since = element("td", "", ago(member.joinedAt));
        since.title = new Date(member.joinedAt).toLocaleString();
        tr.appendChild(since);

        var discord = element("td", "", ago(member.accountCreatedAt));
        discord.title = new Date(member.accountCreatedAt).toLocaleString();
        tr.appendChild(discord);

        var method = document.createElement("td");
        if (member.joinMethod) {
            var chip = element("span", "members-method");
            chip.appendChild(element("i", "fa-solid fa-link"));
            chip.appendChild(document.createTextNode(" " + member.joinMethod));
            method.appendChild(chip);
        } else {
            method.appendChild(element("span", "members-unknown", "Unknown"));
        }
        tr.appendChild(method);

        var roles = document.createElement("td");
        if (member.isOwner) roles.appendChild(element("span", "members-role", "Owner"));
        (member.roles || []).forEach(function (role) {
            var pill = element("span", "members-role-pill");
            var dot = element("i", "members-role-dot");
            dot.style.background = String(role.color).charAt(0) === "#" ? role.color : (ROLE_COLORS[role.color] || ROLE_COLORS.gray);
            pill.appendChild(dot);
            pill.appendChild(document.createTextNode(role.name));
            roles.appendChild(pill);
        });
        tr.appendChild(roles);

        tr.appendChild(document.createElement("td"));

        var actions = element("td", "members-actions");
        var profile = element("button", "members-icon");
        profile.type = "button";
        profile.setAttribute("aria-label", "Profile");
        profile.appendChild(element("i", "fa-solid fa-user"));
        profile.addEventListener("click", function () {
            if (window.openUserProfile) window.openUserProfile(member.userName, member.avatarUrl || "");
        });
        actions.appendChild(profile);
        var more = element("button", "members-icon");
        more.type = "button";
        more.setAttribute("aria-label", "More");
        more.appendChild(element("i", "fa-solid fa-ellipsis-vertical"));
        more.addEventListener("click", function (event) {
            event.stopPropagation();
            openMenu(member, more);
        });
        actions.appendChild(more);
        tr.appendChild(actions);
        return tr;
    }

    function render() {
        var list = visible();
        while (body.firstChild) body.removeChild(body.firstChild);
        list.forEach(function (member) { body.appendChild(row(member)); });
        if (selectAll) selectAll.checked = false;
        if (title) title.textContent = query.trim() ? "Search Results" : "Recent Members";
        if (count) count.textContent = list.length ? "Showing " + list.length + (list.length === 1 ? " member" : " members") : "";
        if (empty) {
            var text = empty.querySelector("span");
            if (text) text.textContent = query.trim() ? "No members found." : "No members yet.";
        }
        for (var i = 0; i < heads.length; i++) {
            var on = heads[i].getAttribute("data-sort") === sortKey;
            heads[i].classList.toggle("is-sorted", on);
            var icon = heads[i].querySelector("i");
            if (icon) icon.className = "fa-solid " + (on && !sortDesc ? "fa-arrow-up-short-wide" : "fa-arrow-down-wide-short");
        }
    }

    function load() {
        fetch("/Server/Members?id=" + encodeURIComponent(serverId), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) throw new Error("members");
            return response.json();
        }).then(function (list) {
            members = Array.isArray(list) ? list : [];
            render();
        }).catch(function () {});
    }

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            query = searchInput.value;
            render();
        });
    }

    if (sortButton) {
        sortButton.addEventListener("click", function () {
            sortDesc = !sortDesc;
            render();
        });
    }

    [].forEach.call(heads, function (head) {
        head.addEventListener("click", function () {
            var key = head.getAttribute("data-sort");
            if (key === sortKey) sortDesc = !sortDesc;
            else {
                sortKey = key;
                sortDesc = key === "since" || key === "discord";
            }
            render();
        });
    });

    document.addEventListener("click", function (event) {
        if (menu && !menu.hidden && !menu.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeMenu();
    });

    var nav = document.querySelector(".server-settings-nav [data-panel='members']");
    if (nav) nav.addEventListener("click", load);

    document.addEventListener("discode-server-updated", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        load();
    });
    document.addEventListener("discode-hub-connected", load);
    document.addEventListener("discode-server-roles-changed", function (event) {
        var detail = event && event.detail;
        if (detail && detail.serverId && String(detail.serverId) !== String(serverId)) return;
        load();
    });

    var refresh = window.setInterval(function () {
        if (!document.body.contains(body)) {
            window.clearInterval(refresh);
            return;
        }
        if (members.length) render();
    }, 60000);

    load();
})();
