(function () {
    "use strict";

    var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
    var NAME_CHARS = /^[A-Za-z0-9_.\-]*$/;

    function meInfo() {
        var field = document.getElementById("Update_UserName");
        var display = document.querySelector("#user-panel .me-display");
        var photo = document.querySelector("#user-panel .avatar img");
        var userName = field ? field.value.trim() : "";
        return {
            userName: userName,
            displayName: display ? display.textContent.trim() : userName,
            avatarUrl: photo ? photo.getAttribute("src") : DEFAULT_AVATAR
        };
    }

    function dmPeople() {
        var me = meInfo();
        var partner = String(window.discodeOpenDm || "");
        var people = [];
        if (partner) {
            var title = document.getElementById("dm-title") || document.getElementById("dm-name");
            var photo = document.getElementById("dm-avatar");
            people.push({
                userName: partner,
                displayName: title ? title.textContent.trim() : partner,
                avatarUrl: photo ? photo.getAttribute("src") : DEFAULT_AVATAR
            });
        }
        if (me.userName) people.push(me);
        return people;
    }

    function groupPeople() {
        var info = window.discodeGroupInfo;
        return info && Array.isArray(info.members) ? info.members : [];
    }

    function nameSet(people) {
        var map = {};
        people.forEach(function (person) { map[String(person.userName).toLowerCase()] = person.userName; });
        return map;
    }

    function decorateElement(element, names, me, loose) {
        var found = false;
        var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (node) {
            if (node.parentNode.closest && node.parentNode.closest(".mention")) return;
            var text = node.nodeValue;
            if (text.indexOf("@") === -1) return;
            var pattern = /@([A-Za-z0-9_.\-]+)/g;
            var last = 0;
            var pieces = [];
            var match;
            while ((match = pattern.exec(text))) {
                var raw = match[1];
                var cut = raw;
                if (loose) {
                    while (cut.length && /[.\-]$/.test(cut)) cut = cut.slice(0, -1);
                    if (cut.length < 2 || (match.index > 0 && /[\w@]/.test(text.charAt(match.index - 1)))) continue;
                } else {
                    while (cut.length && !names[cut.toLowerCase()]) cut = cut.slice(0, -1);
                    if (!cut.length) continue;
                }
                var start = match.index;
                var end = start + 1 + cut.length;
                if (start > last) pieces.push(document.createTextNode(text.slice(last, start)));
                var chip = document.createElement("span");
                chip.className = "mention";
                chip.textContent = text.slice(start, end);
                pieces.push(chip);
                if (cut.toLowerCase() === String(me || "").toLowerCase()) found = true;
                last = end;
                pattern.lastIndex = end;
            }
            if (!pieces.length) return;
            if (last < text.length) pieces.push(document.createTextNode(text.slice(last)));
            pieces.forEach(function (piece) { node.parentNode.insertBefore(piece, node); });
            node.parentNode.removeChild(node);
        });
        return found;
    }

    function linkLive(element) {
        var pattern = /\/Social\/Index\?live=\d+/;
        var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (node) {
            var match = pattern.exec(node.nodeValue);
            if (!match || node.parentNode.closest("a")) return;
            var after = node.splitText(match.index);
            after.nodeValue = after.nodeValue.slice(match[0].length);
            var link = document.createElement("a");
            link.className = "dm-live-link";
            link.href = match[0];
            link.textContent = "Watch the live stream";
            node.parentNode.insertBefore(link, after);
        });
    }

    function scan(container, peopleFn) {
        var people = peopleFn();
        var names = nameSet(people);
        var me = meInfo().userName;
        [].forEach.call(container.querySelectorAll(".dm-msg-text"), function (element) {
            var current = element.textContent;
            if (element._mentionText === current) return;
            if (current.indexOf("/Social/Index?live=") !== -1) linkLive(element);
            var mentioned = Object.keys(names).length ? decorateElement(element, names, me) : false;
            element._mentionText = element.textContent;
            var row = element.closest(".dm-msg");
            if (row && mentioned) row.classList.add("is-mentioned");
            else if (row && !element.querySelector(".mention")) row.classList.remove("is-mentioned");
        });
    }

    function scanFeed(container) {
        [].forEach.call(container.querySelectorAll(".post-text, .comment-body p"), function (element) {
            var current = element.textContent;
            if (element._mentionText === current) return;
            if (current.indexOf("@") !== -1) decorateElement(element, {}, "", true);
            element._mentionText = element.textContent;
        });
    }

    function observeFeed(container) {
        var queued = false;
        var schedule = function () {
            if (queued) return;
            queued = true;
            window.requestAnimationFrame(function () {
                queued = false;
                scanFeed(container);
            });
        };
        new MutationObserver(schedule).observe(container, { childList: true, subtree: true, characterData: true });
        schedule();
    }

    var friendCache = [];
    var friendsLoaded = false;

    function friendPeople() {
        if (!friendsLoaded) {
            friendsLoaded = true;
            fetch("/Home/Friends", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
                return response.ok ? response.json() : [];
            }).then(function (list) {
                friendCache = (Array.isArray(list) ? list : []).map(function (friend) {
                    return { userName: friend.userName || "", displayName: friend.name || friend.displayName || friend.userName || "", avatarUrl: friend.avatarUrl || "" };
                }).filter(function (person) { return person.userName; });
            }).catch(function () { friendsLoaded = false; });
        }
        return friendCache;
    }

    function observe(container, peopleFn) {
        var queued = false;
        var run = function () {
            queued = false;
            scan(container, peopleFn);
        };
        var schedule = function () {
            if (queued) return;
            queued = true;
            window.requestAnimationFrame(run);
        };
        new MutationObserver(schedule).observe(container, { childList: true, subtree: true, characterData: true });
        document.addEventListener("discode-group-updated", schedule);
        schedule();
    }

    function attach(input, peopleFn) {
        var popup = null;
        var items = [];
        var active = 0;
        var context = null;

        function close() {
            if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
            popup = null;
            items = [];
            context = null;
        }

        function read() {
            var selection = window.getSelection();
            if (!selection.rangeCount || !selection.isCollapsed) return null;
            var range = selection.getRangeAt(0);
            var node = range.startContainer;
            if (node.nodeType !== 3 || !input.contains(node)) return null;
            if (node.parentNode.closest && node.parentNode.closest(".mention-chip")) return null;
            var before = node.nodeValue.slice(0, range.startOffset);
            var match = /(^|[\s ])@([A-Za-z0-9_.\-]*)$/.exec(before);
            if (!match) return null;
            return { node: node, offset: range.startOffset, query: match[2], start: range.startOffset - match[2].length - 1 };
        }

        function place() {
            var box = (input.closest("form") || input).getBoundingClientRect();
            popup.style.left = box.left + "px";
            popup.style.width = box.width + "px";
            popup.style.bottom = (window.innerHeight - box.top + 8) + "px";
        }

        function paint() {
            popup.textContent = "";
            var head = document.createElement("div");
            head.className = "mention-head";
            head.textContent = "Members";
            popup.appendChild(head);
            items.forEach(function (person, index) {
                var row = document.createElement("button");
                row.type = "button";
                row.className = "mention-item" + (index === active ? " is-active" : "");
                row.setAttribute("role", "option");
                var photo = document.createElement("img");
                photo.alt = "";
                photo.src = person.avatarUrl || DEFAULT_AVATAR;
                var name = document.createElement("strong");
                name.textContent = person.displayName || person.userName;
                var handle = document.createElement("span");
                handle.textContent = person.userName;
                row.appendChild(photo);
                row.appendChild(name);
                row.appendChild(handle);
                row.addEventListener("mousedown", function (event) {
                    event.preventDefault();
                    choose(index);
                });
                popup.appendChild(row);
            });
        }

        function refresh() {
            var found = read();
            if (!found) {
                close();
                return;
            }
            var query = found.query.toLowerCase();
            var people = peopleFn().filter(function (person) {
                return String(person.userName).toLowerCase().indexOf(query) !== -1 || String(person.displayName || "").toLowerCase().indexOf(query) !== -1;
            }).sort(function (a, b) {
                var aStarts = String(a.userName).toLowerCase().indexOf(query) === 0 ? 0 : 1;
                var bStarts = String(b.userName).toLowerCase().indexOf(query) === 0 ? 0 : 1;
                return aStarts - bStarts;
            }).slice(0, 8);
            if (!people.length) {
                close();
                return;
            }
            context = found;
            items = people;
            if (active >= items.length) active = 0;
            if (!popup) {
                popup = document.createElement("div");
                popup.className = "mention-popup";
                popup.setAttribute("role", "listbox");
                document.body.appendChild(popup);
            }
            paint();
            place();
        }

        function choose(index) {
            var person = items[index];
            var found = context;
            if (!person || !found) return;
            var range = document.createRange();
            range.setStart(found.node, found.start);
            range.setEnd(found.node, found.offset);
            range.deleteContents();
            var chip = document.createElement("span");
            chip.className = "mention-chip";
            chip.setAttribute("contenteditable", "false");
            chip.textContent = "@" + person.userName;
            var space = document.createTextNode(" ");
            range.insertNode(space);
            range.insertNode(chip);
            var selection = window.getSelection();
            var caret = document.createRange();
            caret.setStart(space, 1);
            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);
            close();
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }

        input.addEventListener("input", function () {
            active = 0;
            refresh();
        });
        input.addEventListener("click", refresh);
        input.addEventListener("blur", function () { window.setTimeout(close, 120); });
        input.addEventListener("keydown", function (event) {
            if (!popup) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                event.stopImmediatePropagation();
                active = (active + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
                paint();
            } else if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                event.stopImmediatePropagation();
                choose(active);
            } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopImmediatePropagation();
                close();
            }
        }, true);
        window.addEventListener("resize", function () { if (popup) place(); });
    }

    function init() {
        var dmInput = document.getElementById("dm-input");
        var dmBox = document.getElementById("dm-messages");
        if (dmInput && dmBox) {
            attach(dmInput, dmPeople);
            observe(dmBox, dmPeople);
        }
        var socialView = document.querySelector(".social-view");
        var postInput = document.getElementById("post-text");
        if (socialView) {
            if (postInput) attach(postInput, friendPeople);
            observeFeed(socialView);
            document.addEventListener("focusin", function (event) {
                var box = event.target.closest && event.target.closest(".comment-form .rich-text");
                if (box && !box._mentionBound) {
                    box._mentionBound = true;
                    attach(box, friendPeople);
                }
            });
            friendPeople();
        }
        var groupInput = document.getElementById("group-input");
        var groupBox = document.getElementById("group-messages");
        if (groupInput && groupBox) {
            attach(groupInput, groupPeople);
            observe(groupBox, groupPeople);
        }
    }

    window.discodeMentions = { init: init, attach: attach, friends: friendPeople };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
