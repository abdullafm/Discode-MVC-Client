"use strict";
(function () {
    var list = document.getElementById("adm-servers");
    if (!list) return;

    fetch("/Server/List", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
        if (!response.ok) throw new Error("servers");
        return response.json();
    }).then(function (servers) {
        (servers || []).forEach(function (server) {
            var chip = document.createElement("a");
            chip.className = "adm-chip";
            chip.href = "/Server/Index?id=" + encodeURIComponent(server.id);
            var name = server.name || "Server";
            chip.setAttribute("aria-label", name);
            chip.title = name;
            if (server.iconUrl) {
                var face = document.createElement("img");
                face.alt = "";
                face.src = server.iconUrl;
                chip.appendChild(face);
            } else {
                chip.textContent = name.trim().charAt(0).toUpperCase();
            }
            list.appendChild(chip);
        });
    }).catch(function () {});
})();
