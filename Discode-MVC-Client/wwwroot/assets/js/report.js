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
        var avatar = event.target.closest && event.target.closest("#me-pop .me-avatar img, #me-profile.visitor-view .me-profile-avatar img, .adm-zoom");
        if (!avatar) return;
        window.discodeZoomImage(avatar.currentSrc || avatar.src);
    });
})();

window.discodeIsVideo = function (url) {
    return /\.(mp4|webm)(\?|$)/i.test(url || "");
};

window.discodeReel = function (url) {
    var reel = document.createElement("div");
    reel.className = "reel";
    var video = document.createElement("video");
    video.src = url;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("playsinline", "");
    var mute = document.createElement("button");
    mute.type = "button";
    mute.className = "reel-mute";
    mute.setAttribute("aria-label", "Sound");
    mute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    var pause = document.createElement("span");
    pause.className = "reel-pause";
    pause.innerHTML = '<i class="fa-solid fa-play"></i>';
    reel.appendChild(video);
    reel.appendChild(pause);
    reel.appendChild(mute);

    var userPaused = false;
    video.addEventListener("click", function () {
        userPaused = !video.paused;
        if (video.paused) video.play().catch(function () {});
        else video.pause();
        reel.classList.toggle("is-paused", video.paused);
    });
    mute.addEventListener("click", function () {
        video.muted = !video.muted;
        mute.firstChild.className = "fa-solid " + (video.muted ? "fa-volume-xmark" : "fa-volume-high");
    });

    if ("IntersectionObserver" in window) {
        var watcher = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!document.body.contains(video)) {
                    watcher.disconnect();
                    return;
                }
                if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                    if (!userPaused) video.play().catch(function () {});
                } else {
                    video.pause();
                }
                reel.classList.toggle("is-paused", video.paused);
            });
        }, { threshold: [0, 0.6, 1] });
        watcher.observe(video);
    }
    return reel;
};

(function () {

    var logoutLayer = null;

    function logoutNow() {
        var form = document.getElementById("logout-form");
        if (form) form.submit();
        else window.location.href = "/Account/Login";
    }

    function closeLogout() {
        if (logoutLayer) logoutLayer.hidden = true;
    }

    function openLogout() {
        if (!logoutLayer || !document.body.contains(logoutLayer)) {
            logoutLayer = document.createElement("div");
            logoutLayer.className = "logout-layer";
            logoutLayer.innerHTML = '<div class="logout-card" role="alertdialog" aria-label="Log out">' +
                '<h3>Log out?</h3><p>Are you sure you want to log out?</p>' +
                '<div class="logout-actions"><button type="button" class="logout-cancel">Cancel</button>' +
                '<button type="button" class="logout-confirm">Log out</button></div></div>';
            document.body.appendChild(logoutLayer);
            logoutLayer.addEventListener("click", function (event) {
                if (event.target === logoutLayer || event.target.closest(".logout-cancel")) closeLogout();
                else if (event.target.closest(".logout-confirm")) logoutNow();
            });
        }
        logoutLayer.hidden = false;
        var confirmButton = logoutLayer.querySelector(".logout-confirm");
        if (confirmButton) confirmButton.focus();
    }

    document.addEventListener("click", function (event) {
        if (!event.target.closest("#me-logout")) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        openLogout();
    }, true);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && logoutLayer && !logoutLayer.hidden) {
            event.stopImmediatePropagation();
            closeLogout();
        }
    }, true);
})();

(function () {
    var queue = [];
    var layer = null;

    function acknowledge(id) {
        if (window.discodePresence && id) window.discodePresence.invoke("AcknowledgeWarning", id).catch(function () {});
    }

    function show() {
        if (!queue.length) {
            if (layer) layer.hidden = true;
            return;
        }

        var warning = queue[0];
        if (!layer || !document.body.contains(layer)) {
            layer = document.createElement("div");
            layer.className = "warn-layer";
            layer.innerHTML = '<div class="warn-card" role="alertdialog" aria-modal="true">' +
                '<div class="warn-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>' +
                '<h3>Warning from the administrators</h3>' +
                '<p class="warn-reason"></p>' +
                '<small class="warn-note">Please follow the rules. Further violations can lead to a timeout or a ban.</small>' +
                '<button type="button" class="warn-ok">I understand</button></div>';
            document.body.appendChild(layer);
            layer.querySelector(".warn-ok").addEventListener("click", function () {
                var done = queue.shift();
                if (done) acknowledge(done.id);
                show();
            });
        }

        layer.querySelector(".warn-reason").textContent = warning.reason;
        layer.hidden = false;
        layer.querySelector(".warn-ok").focus();
    }

    document.addEventListener("discode-account-warning", function (event) {
        var list = Array.isArray(event.detail) ? event.detail : [];
        list.forEach(function (item) {
            if (!queue.some(function (known) { return known.id === item.id; })) queue.push(item);
        });
        show();
    });

    document.addEventListener("discode-force-logout", function () {
        var form = document.getElementById("logout-form");
        if (form) form.submit();
        else window.location.href = "/Account/Login";
    });
})();

(function () {
    function close(layer) {
        clearInterval(layer._timer);
        layer.remove();
        document.documentElement.classList.remove("is-timed-out");
    }

    function hide() {
        var layer = document.querySelector(".timeout-layer");
        if (!layer || layer._finishing) return;
        layer._finishing = true;
        clearInterval(layer._timer);

        var icon = layer.querySelector(".timeout-icon");
        icon.classList.add("is-done");
        setTimeout(function () { icon.innerHTML = '<i class="fa-solid fa-check"></i>'; }, 180);
        layer.querySelector("h3").textContent = "Timeout is over";
        layer.querySelector(".timeout-reason").hidden = true;
        layer.querySelector(".timeout-until").hidden = true;
        layer.querySelector(".timeout-note").textContent = "You can use Discode again.";

        setTimeout(function () {
            layer.classList.add("is-leaving");
            setTimeout(function () { close(layer); }, 260);
        }, 1400);
    }

    function show(data) {
        if (!data || !data.seconds || data.seconds <= 0) {
            hide();
            return;
        }

        var layer = document.querySelector(".timeout-layer");
        if (layer && layer._finishing) close(layer), layer = null;
        if (!layer) {
            layer = document.createElement("div");
            layer.className = "timeout-layer";
            layer.setAttribute("tabindex", "-1");
            layer.innerHTML = '<div class="timeout-card" role="alertdialog" aria-modal="true">' +
                '<div class="timeout-icon"><i class="fa-solid fa-hourglass-half"></i></div>' +
                '<h3>You are in timeout</h3>' +
                '<p class="timeout-reason"></p>' +
                '<small class="timeout-until"></small>' +
                '<small class="timeout-note">You cannot use Discode until the timeout is over. This window closes by itself.</small></div>';
            document.body.appendChild(layer);
            document.documentElement.classList.add("is-timed-out");
            layer.addEventListener("keydown", function (event) { event.preventDefault(); event.stopPropagation(); }, true);
            layer.focus();
        }

        clearInterval(layer._timer);
        var endsAt = Date.now() + data.seconds * 1000;
        layer.querySelector(".timeout-reason").textContent = data.reason || "";
        layer.querySelector(".timeout-reason").hidden = !data.reason;
        layer.querySelector(".timeout-until").textContent = "Ends at " + new Date(endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        function tick() {
            var left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
            if (left <= 0) hide();
        }

        tick();
        layer._timer = setInterval(tick, 1000);
    }

    document.addEventListener("discode-account-timeout", function (event) { show(event.detail); });

    clearInterval(window.discodeTimeoutSync);
    window.discodeTimeoutSync = setInterval(function () {
        if (document.hidden || !window.discodePresence) return;
        window.discodePresence.invoke("CheckTimeout").catch(function () {});
    }, 8000);
})();

(function () {
    document.addEventListener("discode-live-closed", function (event) {
        var data = event.detail || {};
        var old = document.querySelector(".warn-layer.is-live-closed");
        if (old) old.remove();

        var layer = document.createElement("div");
        layer.className = "warn-layer is-live-closed";
        layer.innerHTML = '<div class="warn-card" role="alertdialog" aria-modal="true">' +
            '<div class="warn-icon"><i class="fa-solid fa-tower-broadcast"></i></div>' +
            '<h3>Your live stream was closed</h3>' +
            '<p class="warn-reason"></p>' +
            '<small class="warn-note">The stream was ended by the Discode team. Please follow the rules before you go live again.</small>' +
            '<button type="button" class="warn-ok">I understand</button></div>';
        layer.querySelector(".warn-reason").textContent = data.reason || "";
        layer.querySelector(".warn-reason").hidden = !data.reason;
        document.body.appendChild(layer);
        layer.querySelector(".warn-ok").addEventListener("click", function () { layer.remove(); });
        layer.querySelector(".warn-ok").focus();
    });
})();
