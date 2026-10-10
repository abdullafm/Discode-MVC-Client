"use strict";
(function () {
    function readAccount() {
        try { return JSON.parse(localStorage.getItem("discode-me") || "{}"); } catch (error) { return {}; }
    }

    function getRole() {
        var role = readAccount().role;
        return role === "admin" || role === "superadmin" ? role : "member";
    }

    var role = getRole();
    var main = document.getElementById("admin-main");
    var denied = document.getElementById("admin-access-denied");
    if (role === "member") {
        var topbar = main.querySelector(".admin-topbar");
        var overview = document.getElementById("admin-overview");
        if (topbar) topbar.hidden = true;
        if (overview) overview.hidden = true;
        denied.hidden = false;
        return;
    }

    var roleBadge = document.getElementById("admin-role-badge");
    if (roleBadge) roleBadge.textContent = role.toUpperCase();
    document.querySelectorAll(".superadmin-only").forEach(function (item) {
        item.hidden = role !== "superadmin";
    });

    var date = document.getElementById("admin-today");
    if (date) date.textContent = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

    var micMuted = false;
    var deafened = false;
    window.mic = function () {
        micMuted = !micMuted;
        var icon = document.getElementById("mic");
        if (icon) icon.className = micMuted ? "fa-solid fa-microphone-slash mute" : "fa-solid fa-microphone";
    };
    window.headp = function () {
        deafened = !deafened;
        var icon = document.getElementById("head");
        if (icon) icon.className = deafened ? "fa-solid fa-headphones mute" : "fa-solid fa-headphones";
    };

    var settingsButton = document.getElementById("settings-open");
    var settingsDialog = document.getElementById("admin-settings-dialog");
    if (settingsButton && settingsDialog) {
        settingsButton.addEventListener("click", function () {
            if (typeof settingsDialog.showModal === "function") settingsDialog.showModal();
        });
        settingsDialog.addEventListener("click", function (event) {
            if (event.target === settingsDialog) settingsDialog.close();
        });
    }
})();