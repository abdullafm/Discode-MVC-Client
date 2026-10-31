(function () {
    "use strict";

    var REASONS = [
        { key: "Spam", label: "It's spam" },
        { key: "Harassment", label: "Harassment or bullying" },
        { key: "HateSpeech", label: "Hate speech" },
        { key: "SexualContent", label: "Sexual or explicit content" },
        { key: "Violence", label: "Violence or threats" },
        { key: "SelfHarm", label: "Self-harm" },
        { key: "Scam", label: "Scam or fraud" },
        { key: "Impersonation", label: "Impersonation" },
        { key: "Other", label: "Something else" }
    ];

    var modal = null;
    var current = null;
    var sending = false;

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function csrfToken() {
        var input = document.querySelector("input[name='__RequestVerificationToken']");
        return input ? input.value : "";
    }

    function build() {
        modal = element("div", "dm-modal report-modal");
        modal.hidden = true;
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");

        var backdrop = element("div", "dm-modal-backdrop");
        var card = element("div", "dm-modal-card report-card");
        var close = element("button", "dm-modal-x");
        close.type = "button";
        close.setAttribute("aria-label", "Close");
        close.appendChild(element("i", "fa-solid fa-xmark"));

        card.appendChild(close);
        card.appendChild(element("h2", "report-title"));
        card.appendChild(element("p", "dm-modal-text report-text"));

        var list = element("div", "report-reasons");
        REASONS.forEach(function (reason, index) {
            var row = element("label", "report-reason");
            var radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "report-reason";
            radio.value = reason.key;
            if (index === 0) radio.checked = true;
            row.appendChild(radio);
            row.appendChild(element("span", "", reason.label));
            list.appendChild(row);
        });
        card.appendChild(list);

        var details = document.createElement("textarea");
        details.className = "report-details";
        details.maxLength = 500;
        details.rows = 3;
        details.placeholder = "Add more details (optional)";
        card.appendChild(details);

        card.appendChild(element("p", "report-error"));

        var actions = element("div", "dm-modal-actions");
        var cancel = element("button", "dm-modal-cancel", "Cancel");
        cancel.type = "button";
        var submit = element("button", "report-submit", "Submit Report");
        submit.type = "button";
        actions.appendChild(cancel);
        actions.appendChild(submit);
        card.appendChild(actions);

        modal.appendChild(backdrop);
        modal.appendChild(card);
        document.body.appendChild(modal);

        backdrop.addEventListener("click", hide);
        close.addEventListener("click", hide);
        cancel.addEventListener("click", hide);
        submit.addEventListener("click", send);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !modal.hidden) hide();
        });
    }

    function hide() {
        if (modal) modal.hidden = true;
        current = null;
        document.dispatchEvent(new CustomEvent("discode-report-closed"));
    }

    function setError(text) {
        var box = modal.querySelector(".report-error");
        box.textContent = text || "";
        box.hidden = !text;
    }

    function setDone(done) {
        var card = modal.querySelector(".report-card");
        card.classList.toggle("is-done", done);
        modal.querySelector(".report-reasons").hidden = done;
        modal.querySelector(".report-details").hidden = done;
        modal.querySelector(".report-submit").hidden = done;
        modal.querySelector(".dm-modal-cancel").textContent = done ? "Close" : "Cancel";
    }

    function send() {
        if (!current || sending) return;
        var checked = modal.querySelector("input[name='report-reason']:checked");
        sending = true;
        setError("");
        var submit = modal.querySelector(".report-submit");
        submit.disabled = true;
        fetch("/Report/Create", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": csrfToken(),
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({
                targetType: current.type,
                targetId: String(current.id),
                reason: checked ? checked.value : "Other",
                details: modal.querySelector(".report-details").value.trim()
            })
        }).then(function (response) {
            if (response.ok) {
                modal.querySelector(".report-title").textContent = "Thanks for the report";
                modal.querySelector(".report-text").textContent = "Our team will take a look. You can keep using Discode as usual.";
                setDone(true);
                return;
            }
            return response.json().catch(function () { return {}; }).then(function (data) {
                setError((data && data.errors && data.errors[0]) || "Could not send the report. Try again.");
            });
        }).catch(function () {
            setError("Could not reach the server. Try again.");
        }).then(function () {
            sending = false;
            submit.disabled = false;
        });
    }

    window.discodeReport = function (options) {
        if (!options || !options.type || options.id == null || options.id === "") return;
        if (!modal) build();
        current = { type: options.type, id: options.id };
        modal.querySelector(".report-title").textContent = "Report " + (options.label || "this");
        modal.querySelector(".report-text").textContent = "Why are you reporting this? Your report is anonymous.";
        modal.querySelector("input[name='report-reason']").checked = true;
        modal.querySelector(".report-details").value = "";
        setError("");
        setDone(false);
        modal.hidden = false;
    };

    function copyNotice(text) {
        var note = element("div", "server-menu-notice", text);
        document.body.appendChild(note);
        window.setTimeout(function () {
            if (window.discodeDismiss) window.discodeDismiss(note);
            else if (note.parentNode) note.parentNode.removeChild(note);
        }, 2200);
    }

    window.discodeNotice = copyNotice;

    function copyFallback(value) {
        var area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        var done = false;
        try {
            done = document.execCommand("copy");
        } catch (error) {}
        area.remove();
        return done;
    }

    window.discodeCopy = function (value, label) {
        var text = String(value == null ? "" : value);
        var name = label || "Text";
        if (!text) {
            copyNotice("There is no " + name + " to copy.");
            return;
        }
        function done() {
            copyNotice(name + " copied to the clipboard.");
        }
        function failed() {
            if (copyFallback(text)) done();
            else copyNotice("Could not copy the " + name + ".");
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, failed);
        } else {
            failed();
        }
    };

    var zoomLayer = null;

    function closeZoom() {
        if (!zoomLayer || zoomLayer.hidden) return;
        zoomLayer.classList.remove("is-open");
        window.setTimeout(function () {
            if (zoomLayer && !zoomLayer.classList.contains("is-open")) zoomLayer.hidden = true;
        }, 220);
    }

    window.discodeZoomImage = function (source) {
        if (!source) return;
        if (!zoomLayer) {
            zoomLayer = element("div", "zoom-layer");
            zoomLayer.hidden = true;
            zoomLayer.appendChild(element("img", "zoom-image"));
            document.body.appendChild(zoomLayer);
            ["click", "mousedown"].forEach(function (type) {
                zoomLayer.addEventListener(type, function (event) {
                    event.stopPropagation();
                    if (type === "click") closeZoom();
                });
            });
            window.addEventListener("keydown", function (event) {
                if (event.key !== "Escape" || !zoomLayer || zoomLayer.hidden || !zoomLayer.classList.contains("is-open")) return;
                event.stopPropagation();
                closeZoom();
            }, true);
        }
        zoomLayer.querySelector("img").src = source;
        zoomLayer.hidden = false;
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () { zoomLayer.classList.add("is-open"); });
        });
    };

    document.addEventListener("click", function (event) {
        var avatar = event.target.closest && event.target.closest("#me-pop .me-avatar img, #me-profile.visitor-view .me-profile-avatar img");
        if (!avatar) return;
        window.discodeZoomImage(avatar.currentSrc || avatar.src);
    });
})();
