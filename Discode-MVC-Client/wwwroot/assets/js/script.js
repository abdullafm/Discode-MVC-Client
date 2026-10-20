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

var x = new Audio("/assets/css/audio/discordmute_IZNcLx2.mp3");
var y = new Audio("/assets/css/audio/discord-unmute-sound.mp3");

function mic() {
    if (!micO) {
        x.play();
        document.getElementById("mic").className = "fa-solid fa-microphone-slash mute";
        micO = true;
    } else {
        y.play();
        document.getElementById("mic").className = "fa-solid fa-microphone";
        micO = false;
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
        if (!micO) {
            document.getElementById("mic").className = "fa-solid fa-microphone-slash mute";
            micO = true;
        }
    } else {
        document.getElementById("head").className = "fa-solid fa-headphones";
        if (btn) btn.removeAttribute("data-deafened");
        y.play();
        headO = false;
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
    var activeFilterButton = menu.querySelector("button.active");
    var activeFilter = activeFilterButton ? activeFilterButton.getAttribute("data-filter") : "online";
    var currentFilter = activeFilter === "all" ? "all" : "online";
    function paintFriends(filter) {
        currentFilter = filter || currentFilter;
        var onlineTitle = document.getElementById("friends-online-title");
        var allTitle = document.getElementById("friends-all-title");
        var list = document.getElementById("friends-all-list") || document.querySelector("#friends-online .friends-online-list");
        if (!list) return;
        var rows = list.querySelectorAll(".online-row");
        var visible = 0;
        for (var i = 0; i < rows.length; i++) {
            var presence = rows[i].getAttribute("data-presence") || "online";
            var hide = currentFilter === "online" && presence === "offline";
            rows[i].hidden = hide;
            if (!hide) visible++;
        }
        if (onlineTitle) {
            var count = onlineTitle.querySelector("span");
            if (count) count.textContent = String(visible);
            onlineTitle.hidden = currentFilter !== "online" || visible === 0;
        }
        if (allTitle) {
            var count = allTitle.querySelector("span");
            if (count) count.textContent = String(rows.length);
            allTitle.hidden = currentFilter !== "all" || rows.length === 0;
        }
    }
    var PRESENCE_LABELS = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", offline: "Offline" };
    function paintRowPresence(row, status) {
        if (!PRESENCE_LABELS[status]) status = "offline";
        row.setAttribute("data-presence", status);
        var dot = row.querySelector(".online-dot");
        if (dot) dot.className = "online-dot" + (status === "online" ? "" : " " + status);
        var label = row.querySelector(".online-copy > span");
        if (label) {
            label.setAttribute("data-i18n", PRESENCE_LABELS[status]);
            label.textContent = PRESENCE_LABELS[status];
        }
    }
    var livePresence = {};
    var currentTab = activeFilter;

    function friendToken() {
        var input = document.querySelector("input[name='__RequestVerificationToken']");
        return input ? input.value : "";
    }

    function friendPost(action, fields) {
        var body = new URLSearchParams();
        Object.keys(fields).forEach(function (key) { body.append(key, fields[key]); });
        body.append("__RequestVerificationToken", friendToken());
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

    function reapplyLivePresence() {
        var rows = document.querySelectorAll("#friends-all-list .online-row");
        for (var i = 0; i < rows.length; i++) {
            var live = livePresence[rows[i].getAttribute("data-user-id")];
            if (live) paintRowPresence(rows[i], live.status);
        }
    }

    var refreshCount = 0;
    function refreshFriends() {
        var body = document.getElementById("friends-body");
        if (!body) return Promise.resolve();
        var mine = ++refreshCount;
        var url = "/Home/Index?tab=" + encodeURIComponent(currentTab);
        var search = document.getElementById("inline-search-input");
        if (currentTab === "add" && search && search.value.trim()) url += "&search=" + encodeURIComponent(search.value.trim());
        return fetch(url, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then(function (response) { return response.ok ? response.text() : ""; })
            .then(function (html) {
                if (!html || mine !== refreshCount) return;
                var doc = new DOMParser().parseFromString(html, "text/html");
                var fresh = doc.getElementById("friends-body");
                if (!fresh) return;
                body.innerHTML = fresh.innerHTML;
                ["pending-badge", "pending-badge-pick"].forEach(function (id) {
                    var current = document.getElementById(id);
                    var next = doc.getElementById(id);
                    if (!current || !next) return;
                    current.textContent = next.textContent;
                    current.hidden = next.hidden;
                });
                reapplyLivePresence();
                paintFriends(currentFilter);
            })
            .catch(function () {});
    }

    document.addEventListener("submit", function (event) {
        var form = event.target.closest && event.target.closest("form[data-friend-form]");
        if (!form || event.defaultPrevented) return;
        event.preventDefault();
        var action = form.getAttribute("action") || "";
        fetch(action, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: new URLSearchParams(new FormData(form)).toString()
        }).then(function (response) {
            if (!response.ok) throw new Error("friend action");
            if (/\/Send$/i.test(action)) {
                var pendingBtn = document.querySelector("#friend-filter-menu button[data-filter='pending']");
                if (pendingBtn) pendingBtn.click();
            }
            return refreshFriends();
        }).catch(function () {
            form.removeAttribute("data-friend-form");
            form.submit();
        });
    });

    window.discodeFriends = {
        reload: refreshFriends,
        reloadFriends: refreshFriends,
        setPresence: function (userId, status) {
            livePresence[userId] = { status: status, at: Date.now() };
            var rows = document.querySelectorAll("#friends-all-list .online-row");
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].getAttribute("data-user-id") === userId) paintRowPresence(rows[i], status);
            }
            paintFriends(currentFilter);
        },
        respond: function (requestId, accept) {
            return friendPost(accept ? "Accept" : "Decline", { id: requestId })
                .then(function (response) {
                    if (response.ok) refreshFriends();
                    return response.ok;
                })
                .catch(function () { return false; });
        },
        removeRow: function (row) {
            var requestId = Number(row.getAttribute("data-id") || 0);
            if (requestId <= 0) return;
            friendPost("Remove", { id: requestId })
                .then(function () { return refreshFriends(); })
                .catch(function () {});
        },
        blockRow: function (row) {
            var username = row.getAttribute("data-user") || "";
            if (!username) return;
            friendPost("Block", { userName: username })
                .then(function () { return refreshFriends(); })
                .catch(function () {});
        },
        hasSent: function (username) {
            var rows = document.querySelectorAll("#friends-sent-list .sent-row");
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].getAttribute("data-user") === username) return true;
            }
            return false;
        },
        send: function (user, button) {
            var username = user && (user.username || user.userName || "");
            var userId = user && (user.id || user.userId || "");
            if ((!username && !userId) || !button) return;
            button.disabled = true;
            friendPost("Send", { userName: username, userId: userId || "" })
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
                    refreshFriends();
                })
                .catch(function () {
                    button.disabled = false;
                });
        }
    };
    paintFriends(currentFilter);
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden && currentTab !== "add") refreshFriends();
    });
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
        currentTab = filter;
        if (showList) {
            currentFilter = filter;
            paintFriends(currentFilter);
        }
        if (showAdd) {
            var searchField = document.getElementById("inline-search-input");
            if (searchField) searchField.focus();
        }
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
        if (action === "remove" && window.discodeFriends) window.discodeFriends.removeRow(row);
        closeMenu();
    });
})();

(function () {
    var menu = document.getElementById("friend-context");
    var listIds = ["friends-all-list", "friends-pending-list", "friends-sent-list"];
    var lists = listIds
        .map(function (id) { return document.getElementById(id); })
        .filter(function (list) { return list; });
    var removeButton = menu ? menu.querySelector("[data-action='remove']") : null;
    if (!menu || lists.length === 0) return;
    var row = null;

    function closeMenu() {
        menu.hidden = true;
        row = null;
    }

    function openMenu(target, x, y) {
        row = target;
        if (removeButton) removeButton.hidden = !target.closest("#friends-all-list");
        menu.hidden = false;
        var width = menu.offsetWidth;
        var height = menu.offsetHeight;
        var left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
        var top = Math.max(8, Math.min(y, window.innerHeight - height - 8));
        menu.style.left = left + "px";
        menu.style.top = top + "px";
    }

    lists.forEach(function (list) {
        list.addEventListener("contextmenu", function (event) {
            var target = event.target.closest && event.target.closest(".online-row");
            if (!target) return;
            event.preventDefault();
            openMenu(target, event.clientX, event.clientY);
        });
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest || !event.target.closest("#friend-context")) closeMenu();
    });

    document.addEventListener("contextmenu", function (event) {
        var inside = event.target.closest && event.target.closest(".online-row");
        if (!inside || !lists.some(function (list) { return list.contains(inside); })) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    menu.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button || !row) return;
        var action = button.getAttribute("data-action");
        var link = row.querySelector(".online-main");
        var href = link ? link.getAttribute("href") : "";
        if ((action === "message" || action === "voice") && href) {
            if (action === "voice") href += (href.indexOf("?") === -1 ? "?" : "&") + "call=voice";
            if (window.discodeGo) window.discodeGo(href);
            else window.location.href = href;
        }
        if (action === "profile" && window.openUserProfile) {
            var face = row.querySelector("img");
            window.openUserProfile(row.getAttribute("data-user") || "", face ? face.getAttribute("src") : "");
        }
        if (action === "block" && window.discodeFriends) window.discodeFriends.blockRow(row);
        if (action === "remove" && window.discodeFriends) window.discodeFriends.removeRow(row);
        closeMenu();
    });
})();

(function () {
    var timer = null;
    var token = 0;

    function card() { return document.getElementById("inline-search-results-card"); }

    function search(query) {
        var mine = ++token;
        fetch("/Home/Index?tab=add&search=" + encodeURIComponent(query), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        })
            .then(function (response) { return response.ok ? response.text() : ""; })
            .then(function (html) {
                var target = card();
                if (mine !== token || !html || !target) return;
                var fresh = new DOMParser().parseFromString(html, "text/html").getElementById("inline-search-results-card");
                if (!fresh) return;
                target.innerHTML = fresh.innerHTML;
                target.hidden = false;
            })
            .catch(function () {});
    }

    function reset() {
        token++;
        clearTimeout(timer);
        var target = card();
        if (target) {
            target.innerHTML = "";
            target.hidden = true;
        }
    }

    document.addEventListener("input", function (event) {
        if (event.target.id !== "inline-search-input") return;
        var query = event.target.value.trim();
        var clear = document.getElementById("inline-search-clear");
        if (clear) clear.hidden = query === "";
        clearTimeout(timer);
        if (!query) {
            reset();
            return;
        }
        timer = setTimeout(function () { search(query); }, 300);
    });

    document.addEventListener("submit", function (event) {
        if (event.target.id !== "inline-search-form") return;
        event.preventDefault();
        var query = (document.getElementById("inline-search-input").value || "").trim();
        if (query) search(query);
    });

    document.addEventListener("click", function (event) {
        var clear = event.target.closest && event.target.closest("#inline-search-clear");
        if (clear) {
            var input = document.getElementById("inline-search-input");
            input.value = "";
            input.focus();
            clear.hidden = true;
            reset();
            return;
        }
        var cell = event.target.closest && event.target.closest(".inline-search-user-cell");
        if (cell && window.openUserProfile) window.openUserProfile(cell.getAttribute("data-username"), cell.getAttribute("data-avatar"));
    });
})();
