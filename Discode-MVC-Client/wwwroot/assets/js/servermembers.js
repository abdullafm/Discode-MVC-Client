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
        else if (sortKey === "roles") result = (a.isOwner ? 1 : 0) - (b.isOwner ? 1 : 0);
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

    function openMenu(member, anchor) {
        if (!menu) {
            menu = element("div", "row-menu members-ctx");
            menu.hidden = true;
            menu.appendChild(document.createElement("ul"));
            document.body.appendChild(menu);
        }
        var list = menu.firstChild;
        list.textContent = "";
        function add(label, action) {
            var li = document.createElement("li");
            var button = document.createElement("button");
            button.type = "button";
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
        add("Copy User ID", function () {
            if (navigator.clipboard) navigator.clipboard.writeText(member.id).catch(function () {});
        });
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

    var refresh = window.setInterval(function () {
        if (!document.body.contains(body)) {
            window.clearInterval(refresh);
            return;
        }
        if (members.length) render();
    }, 60000);

    load();
})();
