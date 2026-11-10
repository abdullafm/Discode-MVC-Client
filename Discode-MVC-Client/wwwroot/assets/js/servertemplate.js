(function () {
    "use strict";

    var panel = document.querySelector("section[data-panel='template']");
    if (!panel) return;
    var serverId = Number(new URLSearchParams(window.location.search).get("id")) || 0;
    var form = document.getElementById("template-form");
    var view = document.getElementById("template-view");
    var title = document.getElementById("template-title");
    var desc = document.getElementById("template-desc");
    var link = document.getElementById("template-link");
    var stats = document.getElementById("template-stats");
    var old = document.getElementById("template-old");
    var problem = document.getElementById("template-error");
    var save = document.getElementById("template-save");
    var sync = document.getElementById("template-sync");
    var remove = document.getElementById("template-delete");
    var copy = document.getElementById("template-copy");

    function token() {
        var field = document.querySelector("input[name='__RequestVerificationToken']");
        return field ? field.value : "";
    }

    function request(url, method, body) {
        return fetch(url, {
            method: method || "GET",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
            body: body ? JSON.stringify(body) : undefined
        }).then(function (response) {
            if (response.status === 204) return null;
            return response.json().catch(function () { return {}; }).then(function (data) {
                if (!response.ok) throw new Error((data && data.errors && data.errors[0]) || "Something went wrong.");
                return data;
            });
        });
    }

    function fail(error) {
        problem.textContent = error.message || "Something went wrong.";
        problem.hidden = false;
    }

    function paint(template) {
        problem.hidden = true;
        if (!template) {
            form.hidden = false;
            view.hidden = true;
            return;
        }
        form.hidden = true;
        view.hidden = false;
        title.value = template.title;
        desc.value = template.description;
        link.value = window.location.origin + "/template/" + template.code;
        stats.textContent = "Used " + template.usageCount + (template.usageCount === 1 ? " time" : " times") + " · " + template.categoryCount + " categories · " + template.channelCount + " channels · " + template.roleCount + " roles";
        old.hidden = !template.outOfDate;
    }

    function load() {
        request("/Server/Template?id=" + serverId).then(paint).catch(fail);
    }

    document.addEventListener("click", function (event) {
        var button = event.target.closest && event.target.closest(".server-settings-nav [data-panel='template']");
        if (button) load();
    });

    document.getElementById("template-create").addEventListener("click", function () {
        request("/Server/SaveTemplate", "POST", { serverId: serverId, title: title.value, description: desc.value }).then(paint).catch(fail);
    });
    save.addEventListener("click", function () {
        request("/Server/SaveTemplate", "POST", { serverId: serverId, title: title.value, description: desc.value }).then(paint).catch(fail);
    });
    sync.addEventListener("click", function () {
        request("/Server/SyncTemplate", "POST", { serverId: serverId }).then(paint).catch(fail);
    });
    remove.addEventListener("click", function () {
        request("/Server/DeleteTemplate", "POST", { serverId: serverId }).then(function () { paint(null); }).catch(fail);
    });
    copy.addEventListener("click", function () {
        link.select();
        if (window.discodeCopy) window.discodeCopy(link.value, "Template link");
        else if (navigator.clipboard) navigator.clipboard.writeText(link.value);
    });
})();
