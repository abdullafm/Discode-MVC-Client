"use strict";
var micO = false;
var headO = false;

function fromLogin() {
    try {
        if (sessionStorage.getItem("discode-splash") === "1") {
            sessionStorage.removeItem("discode-splash");
            return true;
        }
    } catch (e) {}
    if (history.state && history.state.discode) return false;
    return /\/(login|register)\.html/i.test(document.referrer || "");
}

var keepLoader = !!document.getElementById("loader") && fromLogin();
if (keepLoader) document.documentElement.classList.add("show-loader");
else {
    document.documentElement.classList.remove("show-loader");
    var earlyLoader = document.getElementById("loader");
    if (earlyLoader) earlyLoader.remove();
}

window.addEventListener("pageshow", function () {
    var searches = document.querySelectorAll(".friends-search input, .sidebar-search input");
    for (var i = 0; i < searches.length; i++) searches[i].value = "";
});

window.onload = function () {
    if (!keepLoader) return;
    setTimeout(function () {
        var loader = document.getElementById("loader");
        if (loader) loader.remove();
        document.documentElement.classList.remove("show-loader");
    }, 2000);
};

var x = new Audio("./assets/css/audio/discordmute_IZNcLx2.mp3");
var y = new Audio("./assets/css/audio/discord-unmute-sound.mp3");

function mic() {
    if (!micO) {
        x.play();
        document.getElementById("mic").className = "fa-solid fa-microphone-slash mute";
        micO = true;
    } else {
        y.play();
        document.getElementById("mic").className = "fa-solid fa-microphone";
        micO = false;
        // Mikrofon açılınca kulaklık da kapalıysa onu da aç
        if (headO) {
            document.getElementById("head").className = "fa-solid fa-headphones";
            var btn = document.getElementById("headp-btn");
            if (btn) btn.removeAttribute("data-deafened");
            headO = false;
        }
    }
}

function headp() {
    var btn = document.getElementById("headp-btn");
    if (!headO) {
        x.play();
        document.getElementById("head").className = "fa-solid fa-headphones mute";
        if (btn) btn.setAttribute("data-deafened", "true");
        headO = true;
        // Kulaklık kapatılınca mikrofon da otomatik mute olur
        if (!micO) {
            document.getElementById("mic").className = "fa-solid fa-microphone-slash mute";
            micO = true;
        }
    } else {
        document.getElementById("head").className = "fa-solid fa-headphones";
        if (btn) btn.removeAttribute("data-deafened");
        y.play();
        headO = false;
        // Kulaklık açılınca mikrofon da otomatik açılır
        if (micO) {
            document.getElementById("mic").className = "fa-solid fa-microphone";
            micO = false;
        }
    }
}

function openToggle() {
    if (!window.matchMedia("(max-width: 720px)").matches) return;
    document.querySelector("main").classList.toggle("show-main");
}

(function () {
    var pick = document.getElementById("friend-filter-pick");
    var menu = document.getElementById("friend-filter-menu");
    var filters = document.querySelector(".friend-filters");
    var label = document.getElementById("friend-filter-label");
    var glide = menu ? menu.querySelector(".friend-filter-glide") : null;
    if (!menu || !filters || !pick || !label) return;
    function isCompactFilter() {
        return window.matchMedia("(max-width: 640px)").matches;
    }
    function closeCompactFilter() {
        filters.classList.remove("open");
        pick.setAttribute("aria-expanded", "false");
    }
    function syncGlide(button) {
        if (!glide || !button || button.getAttribute("data-filter") === "add" || isCompactFilter()) {
            if (glide) glide.style.opacity = "0";
            return;
        }
        glide.style.opacity = "1";
        glide.style.width = button.offsetWidth + "px";
        glide.style.height = "25px";
        glide.style.transform = "translate(" + button.offsetLeft + "px, -50%)";
    }
    function paintFriends(filter) {
        var onlineTitle = document.getElementById("friends-online-title");
        var allTitle = document.getElementById("friends-all-title");
        var list = document.querySelector("#friends-online .friends-online-list");
        if (!list) return;
        var rows = list.querySelectorAll(".online-row");
        var visible = 0;
        for (var i = 0; i < rows.length; i++) {
            var presence = rows[i].getAttribute("data-presence") || "online";
            var hide = filter === "online" && presence === "offline";
            rows[i].hidden = hide;
            if (!hide) visible++;
        }
        if (onlineTitle) onlineTitle.hidden = filter !== "online" || visible === 0;
        if (allTitle) allTitle.hidden = filter !== "all" || visible === 0;
    }
    function paintCount(title, rows) {
        if (!title) return;
        var count = title.querySelector("span");
        if (count) count.textContent = String(rows.length);
        title.hidden = rows.length === 0;
    }
    function paintPendingTitle() {
        var title = document.getElementById("friends-pending-title");
        var list = document.getElementById("friends-pending-list");
        var sentTitle = document.getElementById("friends-sent-title");
        var sentList = document.getElementById("friends-sent-list");
        paintCount(title, list ? list.querySelectorAll(".request-row") : []);
        paintCount(sentTitle, sentList ? sentList.querySelectorAll(".sent-row") : []);
    }
    function addSentRequest(username) {
        var list = document.getElementById("friends-sent-list");
        var template = document.getElementById("friend-sent-row");
        if (!list || !template) return;
        var existing = list.querySelectorAll(".sent-row");
        for (var i = 0; i < existing.length; i++) {
            if (existing[i].getAttribute("data-user") === username) {
                paintPendingTitle();
                return;
            }
        }
        var row = template.content.firstElementChild.cloneNode(true);
        row.setAttribute("data-user", username);
        var strong = row.querySelector("strong");
        var user = row.querySelector(".request-user");
        var letter = row.querySelector(".sent-letter");
        if (strong) strong.textContent = username;
        if (user) user.textContent = username;
        if (letter) letter.textContent = username.charAt(0).toUpperCase();
        list.appendChild(row);
        paintPendingTitle();
    }
    function paintBlockedTitle() {
        var title = document.getElementById("friends-blocked-title");
        var list = document.getElementById("friends-blocked-list");
        if (!title || !list) return;
        title.hidden = !list.querySelector(".blocked-row");
    }
    paintFriends("online");
    syncGlide(menu.querySelector("button.active"));
    pick.addEventListener("click", function (event) {
        if (!isCompactFilter()) return;
        event.stopPropagation();
        var open = !filters.classList.contains("open");
        filters.classList.toggle("open", open);
        pick.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button) return;
        var filter = button.getAttribute("data-filter");
        if (!filter) return;
        var menuButtons = menu.querySelectorAll("button[data-filter]");
        if (filter !== "add") {
            for (var i = 0; i < menuButtons.length; i++) {
                if (menuButtons[i].getAttribute("data-filter") !== "add") {
                    menuButtons[i].classList.toggle("active", menuButtons[i] === button);
                }
            }
            label.textContent = (button.querySelector(".friend-filter-text") || button).textContent.trim();
            syncGlide(button);
        }

        var online = document.getElementById("friends-online");
        var pending = document.getElementById("friends-pending");
        var blocked = document.getElementById("friends-blocked");
        var add = document.getElementById("friends-add");
        var empty = document.getElementById("friends-empty");
        var now = document.getElementById("active-now");
        var showList = filter === "online" || filter === "all";
        var showPending = filter === "pending";
        var showBlocked = filter === "blocked";
        var showAdd = filter === "add";
        if (online) online.hidden = !showList;
        if (pending) pending.hidden = !showPending;
        if (blocked) blocked.hidden = !showBlocked;
        if (add) add.hidden = !showAdd;
        if (empty) empty.hidden = showList || showPending || showBlocked || showAdd;
        if (now) now.hidden = showList || showPending || showBlocked || showAdd;
        if (showList) paintFriends(filter);
        if (showPending) paintPendingTitle();
        if (showBlocked) paintBlockedTitle();
        if (isCompactFilter()) closeCompactFilter();
    });
    document.addEventListener("click", function (event) {
        if (!isCompactFilter()) return;
        if (!filters.contains(event.target)) closeCompactFilter();
    });
    window.addEventListener("resize", function () {
        if (!isCompactFilter()) closeCompactFilter();
        syncGlide(menu.querySelector("button.active"));
    });
    var form = document.getElementById("add-friend-form");
    var nameInput = document.getElementById("add-friend-name");
    var messageInput = document.getElementById("add-friend-message");
    var send = document.getElementById("add-friend-send");
    var count = document.getElementById("add-friend-count");
    var ok = document.getElementById("add-friend-ok");
    var okName = document.getElementById("add-friend-ok-name");
    var error = document.getElementById("add-friend-error");
    if (!form || !nameInput || !send) return;
    nameInput.addEventListener("input", function () {
        send.disabled = nameInput.value.trim() === "";
        if (ok) ok.hidden = true;
        if (error) error.hidden = true;
    });
    if (messageInput && count) {
        messageInput.addEventListener("input", function () {
            count.textContent = String(120 - messageInput.value.length);
        });
    }
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var username = nameInput.value.trim();
        if (!username) return;
        var message = messageInput ? messageInput.value.trim() : "";
        send.disabled = true;
        if (ok) ok.hidden = true;
        if (error) error.hidden = true;
        addSentRequest(username);
        if (okName) okName.textContent = username;
        if (ok) ok.hidden = false;
        nameInput.value = "";
        if (messageInput) messageInput.value = "";
        if (count) count.textContent = "120";
        fetch("/api/friends/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username, message: message })
        }).catch(function () {});
    });
    var sentList = document.getElementById("friends-sent-list");
    if (sentList) {
        sentList.addEventListener("click", function (event) {
            var button = event.target.closest(".sent-cancel");
            if (!button) return;
            var row = button.closest(".sent-row");
            if (!row) return;
            var username = row.getAttribute("data-user") || "";
            row.remove();
            paintPendingTitle();
            if (!username) return;
            fetch("/api/friends/requests/" + encodeURIComponent(username), { method: "DELETE" }).catch(function () {});
        });
    }
})();

(function () {
    var menu = document.getElementById("friend-more");
    if (!menu) return;
    var row = null;

    function closeMenu() {
        menu.hidden = true;
        row = null;
    }

    function openMenu(button) {
        row = button.closest(".online-row");
        menu.hidden = false;
        var rect = button.getBoundingClientRect();
        var width = menu.offsetWidth;
        var height = menu.offsetHeight;
        var left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
        var top = rect.bottom + 8;
        if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 8);
        menu.style.left = left + "px";
        menu.style.top = top + "px";
    }

    document.addEventListener("click", function (event) {
        var more = event.target.closest && event.target.closest("button.online-act[aria-label='More']");
        if (more) {
            event.preventDefault();
            event.stopPropagation();
            if (row && more.closest(".online-row") === row && !menu.hidden) closeMenu();
            else openMenu(more);
            return;
        }
        if (!event.target.closest || !event.target.closest("#friend-more")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeMenu();
    });

    menu.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button || !row) return;
        var action = button.getAttribute("data-action");
        var link = row.querySelector(".online-main");
        var href = link ? link.getAttribute("href") : "";
        if ((action === "voice" || action === "video") && href) href += (href.indexOf("?") === -1 ? "?" : "&") + "call=" + action;
        if ((action === "video" || action === "voice") && href) {
            if (window.discodeGo) window.discodeGo(href);
            else window.location.href = href;
        }
        if (action === "remove") row.remove();
        closeMenu();
    });
})();

// Inline Search - Instagram Style Real-time Search (in Add Friend section)
(function () {
    var addFriendBtn = document.querySelector('button[data-filter="add"]');
    
    // When Add Friend button is clicked, switch to Add Friend section
    if (addFriendBtn) {
        addFriendBtn.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();
            
            // Switch to Add Friend section
            var online = document.getElementById("friends-online");
            var pending = document.getElementById("friends-pending");
            var blocked = document.getElementById("friends-blocked");
            var add = document.getElementById("friends-add");
            var empty = document.getElementById("friends-empty");
            var now = document.getElementById("active-now");
            
            if (online) online.hidden = true;
            if (pending) pending.hidden = true;
            if (blocked) blocked.hidden = true;
            if (add) add.hidden = false;
            if (empty) empty.hidden = true;
            if (now) now.hidden = true;
            
            // Focus on search input
            var searchInput = document.getElementById("inline-search-input");
            if (searchInput) searchInput.focus();
        });
    }
    
    var searchInput = document.getElementById("inline-search-input");
    var searchClear = document.getElementById("inline-search-clear");
    var resultsCard = document.getElementById("inline-search-results-card");
    var searchTable = document.getElementById("inline-search-table");
    var searchTbody = document.getElementById("inline-search-tbody");
    var loadingSpinner = document.getElementById("inline-search-loading");
    var noResults = document.getElementById("inline-search-no-results");
    var queryText = document.getElementById("inline-search-query");
    
    var debounceTimer = null;
    var DEBOUNCE_DELAY = 300;
    
    // Mock user data - replace with real API call
    var mockUsers = [
        { username: "yarasa", displayName: "Yarasa", avatar: null, status: "online" },
        { username: "yarasaxd", displayName: "Yarasa XD", avatar: null, status: "online" },
        { username: "yarasa404", displayName: "Yarasa 404", avatar: null, status: "offline" },
        { username: "Mr_Sigma", displayName: "Mr Sigma", avatar: "./assets/img/img-icon 4.jpeg", status: "online" },
        { username: "Gpro-fighter", displayName: "Gpro Fighter", avatar: "./assets/img/img-icon 3.png", status: "idle" },
        { username: "Moiz Hussain", displayName: "Moiz Hussain", avatar: "./assets/img/img-icon 2.png", status: "dnd" },
        { username: "nxn", displayName: "nxn", avatar: "./assets/img/img-icon 1.png", status: "online" },
        { username: "Unknown_Inj3ctor", displayName: "Unknown Inj3ctor", avatar: "./assets/img/img-icon.png", status: "offline" }
    ];
    
    // Clear button
    if (searchClear && searchInput) {
        searchClear.addEventListener("click", function () {
            searchInput.value = "";
            searchInput.focus();
            clearResults();
            searchClear.hidden = true;
            
            // Cancel any pending debounce timer
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }
        });
    }
    
    // Debounced search function
    function debounceSearch(query) {
        // Cancel any pending timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        
        // If query is empty, immediately hide results
        if (!query || query.trim() === "") {
            clearResults();
            return;
        }
        
        showLoading();
        
        debounceTimer = setTimeout(function () {
            performSearch(query.trim());
        }, DEBOUNCE_DELAY);
    }
    
    // Actual search function - REPLACE THIS WITH REAL API CALL
    async function searchUsers(query) {
        // TODO: Replace with real API call:
        // const response = await fetch('/api/search?q=' + encodeURIComponent(query));
        // const data = await response.json();
        // return data.users;
        
        // Mock implementation for demo
        return new Promise(function (resolve) {
            setTimeout(function () {
                var filtered = mockUsers.filter(function (user) {
                    var q = query.toLowerCase();
                    return user.username.toLowerCase().includes(q) || 
                           user.displayName.toLowerCase().includes(q);
                });
                resolve(filtered);
            }, 500); // Simulate network delay
        });
    }
    
    // Perform search
    async function performSearch(query) {
        try {
            var users = await searchUsers(query);
            displayResults(users, query);
        } catch (error) {
            console.error("Search error:", error);
            showNoResults(query);
        }
    }
    
    // Display search results as table
    function displayResults(users, query) {
        hideLoading();
        searchTbody.innerHTML = "";
        
        if (users.length === 0) {
            showNoResults(query);
            return;
        }
        
        noResults.hidden = true;
        searchTable.hidden = false;
        resultsCard.hidden = false;
        
        users.forEach(function (user) {
            var row = document.createElement("tr");
            
            var avatarHtml = user.avatar 
                ? '<img src="' + user.avatar + '" alt="' + user.username + '">'
                : user.username.charAt(0).toUpperCase();
            
            var statusHtml = getStatusHtml(user.status);
            
            row.innerHTML = 
                '<td>' +
                    '<div class="inline-search-user-cell">' +
                        '<div class="inline-search-user-avatar">' + avatarHtml + '</div>' +
                        '<div class="inline-search-user-info">' +
                            '<span class="inline-search-user-username">' + user.username + '</span>' +
                            '<span class="inline-search-user-display">' + user.displayName + '</span>' +
                        '</div>' +
                    '</div>' +
                '</td>' +
                '<td class="inline-search-status-cell">' + statusHtml + '</td>' +
                '<td class="inline-search-action-cell">' +
                    '<button type="button" data-username="' + user.username + '" data-user-id="' + user.username + '">' +
                        '<i class="fa-solid fa-user-plus"></i>' +
                        '<span>Add Friend</span>' +
                    '</button>' +
                '</td>';
            
            searchTbody.appendChild(row);
        });
        
        // Add friend button click handlers
        var addButtons = searchTbody.querySelectorAll('button[data-username]');
        addButtons.forEach(function (btn) {
            btn.addEventListener("click", function (event) {
                event.stopPropagation();
                var username = btn.getAttribute("data-username");
                var userId = btn.getAttribute("data-user-id");
                addFriendRequest(username, btn);
                sendFriendRequest(userId);
            });
        });
    }
    
    // Get status HTML
    function getStatusHtml(status) {
        var statusMap = {
            "online": { text: "Online", class: "online" },
            "idle": { text: "Idle", class: "offline" },
            "dnd": { text: "Do Not Disturb", class: "pending" },
            "offline": { text: "Offline", class: "offline" }
        };
        
        var statusInfo = statusMap[status] || statusMap["offline"];
        
        return '<div class="status-indicator">' +
            '<span class="status-dot ' + statusInfo.class + '"></span>' +
            '<span class="status-text">' + statusInfo.text + '</span>' +
        '</div>';
    }
    
    // Show no results
    function showNoResults(query) {
        hideLoading();
        searchTbody.innerHTML = "";
        if (queryText) queryText.textContent = query;
        noResults.hidden = false;
        searchTable.hidden = true;
        loadingSpinner.hidden = true;
        resultsCard.hidden = false;
    }
    
    // Show loading state
    function showLoading() {
        loadingSpinner.hidden = false;
        noResults.hidden = true;
        searchTable.hidden = true;
        searchTbody.innerHTML = "";
        resultsCard.hidden = false;
    }
    
    // Hide loading state
    function hideLoading() {
        loadingSpinner.hidden = true;
    }
    
    // Clear all results
    function clearResults() {
        searchTbody.innerHTML = "";
        noResults.hidden = true;
        loadingSpinner.hidden = true;
        searchTable.hidden = true;
        resultsCard.hidden = true;
        
        // Reset debounce timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
    }
    
    // Add friend request
    function addFriendRequest(username, button) {
        // TODO: Replace with real API call
        // fetch('/api/friends/requests', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ username: username })
        // });
        
        console.log("Friend request sent to:", username);
        
        // Update button state to "Request Sent"
        if (button) {
            button.classList.add("button-sent");
            button.innerHTML = '<i class="fa-solid fa-check"></i><span>Request Sent</span>';
            button.disabled = true;
        }
        
        // Optional: Clear search after delay
        setTimeout(function () {
            clearResults();
            if (searchInput) searchInput.value = "";
            if (searchClear) searchClear.hidden = true;
        }, 1500);
    }
    
    // Send friend request function (placeholder for future use)
    function sendFriendRequest(userId) {
        console.log("sendFriendRequest called with userId:", userId);
        // This function can be called from other parts of the app
        // For now, it's a placeholder
    }
    
    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            var query = searchInput.value;
            searchClear.hidden = query === "";
            debounceSearch(query);
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

    // Notification System
    (function () {
        var notifyOpen = document.getElementById("notify-open");
        var notifyBox = document.querySelector(".notify-box");
        var notifyPanel = document.getElementById("notify-panel");
        var notifyList = document.getElementById("notify-list");
        var notifyEmpty = document.getElementById("notify-empty");
        var notifyCount = document.getElementById("notify-count");
        var notifyMarkAll = document.getElementById("notify-mark-all");
        var notifyUnreadBadge = document.getElementById("notify-unread-badge");

        // Mock notification data
        var notifications = [
            {
                id: 1,
                type: "friend_request",
                username: "yarasa",
                displayName: "Yarasa",
                avatar: null,
                message: "sent you a friend request",
                timestamp: Date.now() - 5 * 60 * 1000,
                unread: true
            },
            {
                id: 2,
                type: "like",
                username: "Mr_Sigma",
                displayName: "Mr Sigma",
                avatar: "./assets/img/img-icon 4.jpeg",
                message: "liked your post",
                timestamp: Date.now() - 30 * 60 * 1000,
                unread: true
            },
            {
                id: 3,
                type: "comment",
                username: "Gpro-fighter",
                displayName: "Gpro Fighter",
                avatar: "./assets/img/img-icon 3.png",
                message: "commented on your post",
                snippet: "Great content!",
                timestamp: Date.now() - 60 * 60 * 1000,
                unread: false
            }
        ];

        function formatNotificationTime(timestamp) {
            var seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
            if (seconds < 60) return seconds + "s";
            var minutes = Math.floor(seconds / 60);
            if (minutes < 60) return minutes + "m";
            var hours = Math.floor(minutes / 60);
            if (hours < 24) return hours + "h";
            var days = Math.floor(hours / 24);
            return days + "d";
        }

        function getNotificationBadge(type) {
            switch (type) {
                case "friend_request":
                    return { icon: "fa-user-plus", className: "badge-friend" };
                case "like":
                    return { icon: "fa-heart", className: "badge-like" };
                case "comment":
                    return { icon: "fa-comment", className: "badge-comment" };
                default:
                    return { icon: "fa-bell", className: "badge-system" };
            }
        }

        function resolveAvatar(username, customAvatar) {
            if (customAvatar) return customAvatar;
            if (typeof mockUsers !== "undefined" && Array.isArray(mockUsers)) {
                var found = mockUsers.find(function (u) {
                    return u.username.toLowerCase() === (username || "").toLowerCase();
                });
                if (found && found.avatar) return found.avatar;
            }
            return null;
        }

        function renderNotifications() {
            if (!notifyList) return;
            while (notifyList.firstChild) {
                notifyList.removeChild(notifyList.firstChild);
            }

            var unreadCount = 0;
            notifications.forEach(function (notif) {
                if (notif.unread) unreadCount++;
            });

            if (notifyCount) {
                notifyCount.textContent = unreadCount > 99 ? "99+" : unreadCount;
                notifyCount.hidden = unreadCount === 0;
            }

            if (notifyUnreadBadge) {
                if (unreadCount > 0) {
                    notifyUnreadBadge.textContent = unreadCount + " Unread";
                    notifyUnreadBadge.hidden = false;
                } else {
                    notifyUnreadBadge.hidden = true;
                }
            }

            if (notifyMarkAll) {
                notifyMarkAll.style.opacity = unreadCount > 0 ? "1" : "0.5";
                notifyMarkAll.style.pointerEvents = unreadCount > 0 ? "auto" : "none";
            }

            if (notifications.length === 0) {
                if (notifyEmpty) notifyEmpty.hidden = false;
                return;
            }

            if (notifyEmpty) notifyEmpty.hidden = true;

            notifications.forEach(function (notif) {
                var item = document.createElement("div");
                item.className = "notify-item" + (notif.unread ? " unread" : "");
                item.setAttribute("data-id", notif.id);

                // Avatar container
                var avatarWrap = document.createElement("div");
                avatarWrap.className = "notify-avatar-wrap";

                var userAvatar = resolveAvatar(notif.username, notif.avatar);
                if (userAvatar) {
                    var img = document.createElement("img");
                    img.className = "notify-avatar-img";
                    img.src = userAvatar;
                    img.alt = notif.username;
                    avatarWrap.appendChild(img);
                } else {
                    var letter = document.createElement("div");
                    letter.className = "notify-avatar-letter";
                    letter.textContent = (notif.username || "U").charAt(0).toUpperCase();
                    avatarWrap.appendChild(letter);
                }

                var badgeConfig = getNotificationBadge(notif.type);
                var badge = document.createElement("span");
                badge.className = "notify-badge-icon " + badgeConfig.className;
                badge.innerHTML = '<i class="fa-solid ' + badgeConfig.icon + '"></i>';
                avatarWrap.appendChild(badge);

                // Content
                var content = document.createElement("div");
                content.className = "notify-content";

                var headline = document.createElement("div");
                headline.className = "notify-headline";

                var author = document.createElement("span");
                author.className = "notify-author";
                author.textContent = notif.username;

                var actionText = document.createElement("span");
                actionText.className = "notify-action";
                actionText.textContent = notif.message;

                headline.appendChild(author);
                headline.appendChild(actionText);
                content.appendChild(headline);

                // Snippet if comment/detail exists
                if (notif.snippet) {
                    var snippet = document.createElement("div");
                    snippet.className = "notify-snippet";
                    snippet.textContent = "“" + notif.snippet + "”";
                    content.appendChild(snippet);
                }

                // Meta row (time + unread dot)
                var meta = document.createElement("div");
                meta.className = "notify-meta";

                var time = document.createElement("span");
                time.className = "notify-time";
                time.textContent = formatNotificationTime(notif.timestamp);
                meta.appendChild(time);

                if (notif.unread) {
                    var unreadDot = document.createElement("span");
                    unreadDot.className = "notify-unread-dot";
                    unreadDot.title = "Unread";
                    meta.appendChild(unreadDot);
                }

                content.appendChild(meta);

                // Actions
                var actions = document.createElement("div");
                actions.className = "notify-actions";

                if (notif.type === "friend_request") {
                    var acceptBtn = document.createElement("button");
                    acceptBtn.type = "button";
                    acceptBtn.className = "notify-btn notify-btn-accept";
                    acceptBtn.setAttribute("aria-label", "Accept friend request");
                    acceptBtn.title = "Accept";
                    acceptBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    acceptBtn.addEventListener("click", function (e) {
                        e.stopPropagation();
                        acceptFriendRequest(notif.id, notif.username);
                    });

                    var declineBtn = document.createElement("button");
                    declineBtn.type = "button";
                    declineBtn.className = "notify-btn notify-btn-decline";
                    declineBtn.setAttribute("aria-label", "Decline friend request");
                    declineBtn.title = "Decline";
                    declineBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    declineBtn.addEventListener("click", function (e) {
                        e.stopPropagation();
                        declineFriendRequest(notif.id, notif.username);
                    });

                    actions.appendChild(acceptBtn);
                    actions.appendChild(declineBtn);
                } else {
                    var dismissBtn = document.createElement("button");
                    dismissBtn.type = "button";
                    dismissBtn.className = "notify-btn notify-btn-dismiss";
                    dismissBtn.setAttribute("aria-label", "Dismiss notification");
                    dismissBtn.title = "Dismiss";
                    dismissBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    dismissBtn.addEventListener("click", function (e) {
                        e.stopPropagation();
                        dismissNotification(notif.id);
                    });
                    actions.appendChild(dismissBtn);
                }

                item.appendChild(avatarWrap);
                item.appendChild(content);
                item.appendChild(actions);

                item.addEventListener("click", function () {
                    markAsRead(notif.id);
                });

                notifyList.appendChild(item);
            });
        }

        function markAsRead(id) {
            var notif = notifications.find(function (n) { return n.id === id; });
            if (notif && notif.unread) {
                notif.unread = false;
                renderNotifications();
            }
        }

        function markAllAsRead() {
            var changed = false;
            notifications.forEach(function (n) {
                if (n.unread) {
                    n.unread = false;
                    changed = true;
                }
            });
            if (changed) renderNotifications();
        }

        function dismissNotification(id) {
            notifications = notifications.filter(function (n) { return n.id !== id; });
            renderNotifications();
        }

        function acceptFriendRequest(id, username) {
            console.log("Accept friend request from:", username);
            notifications = notifications.filter(function (n) { return n.id !== id; });
            renderNotifications();
        }

        function declineFriendRequest(id, username) {
            console.log("Decline friend request from:", username);
            notifications = notifications.filter(function (n) { return n.id !== id; });
            renderNotifications();
        }

        function addNotification(type, username, message, snippet, avatar) {
            var newNotif = {
                id: Date.now(),
                type: type,
                username: username,
                avatar: avatar || null,
                message: message,
                snippet: snippet || null,
                timestamp: Date.now(),
                unread: true
            };
            notifications.unshift(newNotif);
            renderNotifications();
        }

        // Setup Header "Mark all as read"
        if (notifyMarkAll) {
            notifyMarkAll.addEventListener("click", function (e) {
                e.stopPropagation();
                markAllAsRead();
            });
        }

        // Open/close notification panel with smooth animation
        var closeTimer = null;
        function openPanel() {
            if (closeTimer) {
                clearTimeout(closeTimer);
                closeTimer = null;
            }
            notifyPanel.hidden = false;
            void notifyPanel.offsetWidth;
            notifyBox.classList.add("open");
            notifyOpen.setAttribute("aria-expanded", "true");
            renderNotifications();
        }

        function closePanel() {
            notifyBox.classList.remove("open");
            notifyOpen.setAttribute("aria-expanded", "false");
            closeTimer = setTimeout(function () {
                if (!notifyBox.classList.contains("open")) {
                    notifyPanel.hidden = true;
                }
            }, 180);
        }

        if (notifyOpen && notifyBox && notifyPanel) {
            notifyOpen.addEventListener("click", function (e) {
                e.stopPropagation();
                var isOpen = notifyBox.classList.contains("open");
                if (isOpen) {
                    closePanel();
                } else {
                    openPanel();
                }
            });

            // Close when clicking outside
            document.addEventListener("click", function (e) {
                if (!notifyBox.contains(e.target)) {
                    if (notifyBox.classList.contains("open")) {
                        closePanel();
                    }
                }
            });

            // Close with Escape key
            document.addEventListener("keydown", function (e) {
                if (e.key === "Escape" && notifyBox.classList.contains("open")) {
                    closePanel();
                }
            });
        }

        // Initial render
        renderNotifications();

        // Expose addNotification and notifications for global access
        window.addNotification = addNotification;
        window.getNotifications = function () { return notifications; };
    })();
})();
