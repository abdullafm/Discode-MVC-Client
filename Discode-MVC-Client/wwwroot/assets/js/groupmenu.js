(function () {
    "use strict";

    var menu = null;
    var confirmModal = null;
    var confirmAction = null;
    var current = null;

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function meName() {
        var field = document.getElementById("Update_UserName");
        return field ? field.value.trim() : "";
    }

    function groupInfo(id) {
        var cache = window.discodeGroupCache || [];
        for (var i = 0; i < cache.length; i++) {
            if (String(cache[i].id) === String(id)) return cache[i];
        }
        return null;
    }

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function addItem(label, icon, onClick) {
        var li = document.createElement("li");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "row-menu-danger";
        button.appendChild(element("i", "fa-solid " + icon));
        button.appendChild(element("span", "row-menu-label", label));
        button.addEventListener("click", function () {
            close();
            onClick();
        });
        li.appendChild(button);
        menu.firstChild.appendChild(li);
    }

    function close() {
        if (menu) menu.hidden = true;
    }

    function buildConfirm() {
        confirmModal = element("div", "dm-modal");
        confirmModal.hidden = true;
        confirmModal.setAttribute("role", "dialog");
        confirmModal.setAttribute("aria-modal", "true");
        var backdrop = element("div", "dm-modal-backdrop");
        var card = element("div", "dm-modal-card");
        var x = element("button", "dm-modal-x");
        x.type = "button";
        x.setAttribute("aria-label", "Close");
        x.appendChild(element("i", "fa-solid fa-xmark"));
        card.appendChild(x);
        card.appendChild(element("h2", "group-leave-title", "Leave Group"));
        card.appendChild(element("p", "dm-modal-text group-leave-text"));
        card.appendChild(element("p", "report-error group-leave-error"));
        var actions = element("div", "dm-modal-actions");
        var cancel = element("button", "dm-modal-cancel", "Cancel");
        cancel.type = "button";
        var ok = element("button", "report-submit group-leave-ok", "Leave Group");
        ok.type = "button";
        actions.appendChild(cancel);
        actions.appendChild(ok);
        card.appendChild(actions);
        confirmModal.appendChild(backdrop);
        confirmModal.appendChild(card);
        document.body.appendChild(confirmModal);
        function dismiss() {
            confirmModal.hidden = true;
            confirmAction = null;
        }
        backdrop.addEventListener("click", dismiss);
        x.addEventListener("click", dismiss);
        cancel.addEventListener("click", dismiss);
        ok.addEventListener("click", function () {
            if (confirmAction) confirmAction(ok);
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !confirmModal.hidden) dismiss();
        });
    }

    function leaveGroup(id, name) {
        if (!confirmModal) buildConfirm();
        confirmModal.querySelector(".group-leave-text").textContent = "Are you sure you want to leave " + name + "? You will not be able to rejoin unless a member invites you again.";
        var error = confirmModal.querySelector(".group-leave-error");
        error.textContent = "";
        confirmModal.hidden = false;
        confirmAction = function (button) {
            button.disabled = true;
            fetch("/Group/Leave", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": token(),
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({ id: Number(id) })
            }).then(function (response) {
                if (!response.ok) {
                    return response.json().catch(function () { return {}; }).then(function (data) {
                        throw new Error((data && data.errors && data.errors[0]) || "Could not leave the group.");
                    });
                }
                confirmModal.hidden = true;
                confirmAction = null;
                var open = document.getElementById("group-chat");
                if (open && String(open.getAttribute("data-group-id")) === String(id)) {
                    if (window.discodeGo) window.discodeGo("/Home/Index");
                    else window.location.href = "/Home/Index";
                } else if (window.renderGroupList) {
                    window.renderGroupList();
                }
            }).catch(function (failure) {
                error.textContent = failure.message;
            }).then(function () {
                button.disabled = false;
            });
        };
    }

    function open(row, x, y) {
        if (!menu) {
            menu = element("div", "row-menu member-menu");
            menu.hidden = true;
            menu.appendChild(document.createElement("ul"));
            document.body.appendChild(menu);
        }
        var id = row.getAttribute("data-group");
        var info = groupInfo(id);
        var labelNode = row.querySelector("p");
        var name = (info && info.name) || (labelNode ? labelNode.textContent.trim() : "this group");
        var isOwner = !!info && String(info.ownerUserName || "").toLowerCase() === meName().toLowerCase();
        current = id;
        menu.firstChild.textContent = "";
        if (!isOwner) {
            addItem("Report Group", "fa-flag", function () {
                if (window.discodeReport) window.discodeReport({ type: "Group", id: id, label: "group" });
            });
        }
        addItem("Leave Group", "fa-right-from-bracket", function () { leaveGroup(id, name); });
        menu.hidden = false;
        var width = menu.offsetWidth;
        var height = menu.offsetHeight;
        menu.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + "px";
        menu.style.top = Math.max(8, Math.min(y, window.innerHeight - height - 8)) + "px";
    }

    document.addEventListener("contextmenu", function (event) {
        var row = event.target.closest(".friend-list [data-group]");
        if (!row) {
            if (menu && !menu.hidden && !menu.contains(event.target)) close();
            return;
        }
        event.preventDefault();
        open(row, event.clientX, event.clientY);
    });

    document.addEventListener("click", function (event) {
        if (menu && !menu.hidden && !menu.contains(event.target)) close();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") close();
    });

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
})();
