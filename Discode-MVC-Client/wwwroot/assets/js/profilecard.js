(function () {
    "use strict";

    var card = null;
    var token = 0;
    var openAnchor = null;

    function meName() {
        var field = document.getElementById("Update_UserName");
        return field ? field.value.trim() : "";
    }

    function close(instant) {
        token++;
        if (card && card.parentNode) {
            if (instant === true || !window.discodeDismiss) card.parentNode.removeChild(card);
            else window.discodeDismiss(card);
        }
        card = null;
        openAnchor = null;
    }

    function place(anchor, side) {
        if (!card) return;
        var rect = anchor.getBoundingClientRect();
        var width = card.offsetWidth;
        var height = card.offsetHeight;
        var left;
        var top;
        if (side === "left") {
            left = rect.left - width - 8;
            if (left < 8) left = rect.right + 8;
            top = rect.top;
        } else {
            left = rect.left;
            top = rect.bottom + 6;
            if (top + height > window.innerHeight - 8) top = rect.top - height - 6;
        }
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
        top = Math.max(8, Math.min(top, window.innerHeight - height - 8));
        card.style.left = left + "px";
        card.style.top = top + "px";
    }

    function open(userName, anchor, side) {
        close(true);
        if (!userName) return;
        var mine = ++token;
        openAnchor = anchor;
        card = document.createElement("div");
        card.className = "mini-profile";
        card.innerHTML = '<div class="mini-banner"></div><div class="mini-body"><p class="mini-loading">Loading...</p></div>';
        document.body.appendChild(card);
        place(anchor, side);
        fetch("/Dm/ProfileInfo?name=" + encodeURIComponent(userName), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) throw new Error("profile");
            return response.text();
        }).then(function (html) {
            if (mine !== token || !card) return;
            var body = card.querySelector(".mini-body");
            body.innerHTML = html;
            var since = body.querySelector("#dm-since");
            if (since) {
                if (since.previousElementSibling) since.previousElementSibling.remove();
                since.remove();
            }
            [].forEach.call(body.querySelectorAll("[id]"), function (element) { element.removeAttribute("id"); });
            var face = body.querySelector(".dm-profile-avatar");
            if (face) {
                face.setAttribute("title", "View Full Profile");
                face.addEventListener("click", function () {
                    var photo = face.getAttribute("src") || "";
                    close();
                    if (window.openUserProfile) window.openUserProfile(userName, photo);
                });
            }
            var actions = document.createElement("div");
            actions.className = "mini-actions";
            var button = document.createElement("button");
            button.type = "button";
            var self = userName.toLowerCase() === meName().toLowerCase();
            button.innerHTML = self ? '<i class="fa-solid fa-pen"></i> Edit Profile' : '<i class="fa-solid fa-message"></i> Message';
            button.addEventListener("click", function () {
                close();
                if (self) {
                    var settings = document.getElementById("settings-open");
                    if (settings) settings.click();
                } else if (window.discodeGo) {
                    window.discodeGo("/Dm/Index?name=" + encodeURIComponent(userName));
                } else {
                    window.location.href = "/Dm/Index?name=" + encodeURIComponent(userName);
                }
            });
            actions.appendChild(button);
            card.appendChild(actions);
            place(anchor, side);
        }).catch(function () {
            if (mine !== token || !card) return;
            card.querySelector(".mini-body").innerHTML = '<p class="mini-loading">This profile is not available.</p>';
            place(anchor, side);
        });
    }

    function trigger(target) {
        var tag = target.closest(".mention");
        if (tag && !target.closest("#dm-messages, #group-messages")) return { user: tag.textContent.replace(/^@/, ""), anchor: tag, side: "below" };
        var inChat = target.closest("#dm-messages, #group-messages");
        if (inChat) {
            var row = target.closest(".dm-msg");
            var avatar = target.closest(".dm-msg-avatar");
            var nick = target.closest(".dm-msg-head strong, .dm-call-text strong");
            var mention = target.closest(".mention");
            if (mention) return { user: mention.textContent.replace(/^@/, ""), anchor: mention, side: "below" };
            var hit = avatar || nick;
            if (hit && row && row.getAttribute("data-sender")) return { user: row.getAttribute("data-sender"), anchor: hit, side: "below" };
            return null;
        }
        var member = target.closest("#group-member-list .group-member");
        if (member && !target.closest(".group-kick")) return { user: member.getAttribute("data-user"), anchor: member, side: "left" };
        return null;
    }

    document.addEventListener("click", function (event) {
        var found = trigger(event.target);
        if (found) {
            event.preventDefault();
            event.stopPropagation();
            if (card && openAnchor === found.anchor) close();
            else open(found.user, found.anchor, found.side);
            return;
        }
        if (card && !event.target.closest(".mini-profile")) close();
    }, true);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") close();
    });
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
})();
