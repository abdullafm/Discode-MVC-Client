"use strict";

(function () {
    var dock = null;
    var video = null;
    var state = null;

    function invoke() {
        var presence = window.discodePresence;
        if (!presence || !presence.invoke) return Promise.reject(new Error("not ready"));
        return presence.invoke.apply(presence, arguments);
    }

    function play() {
        if (!video) return;
        video.play().catch(function () {
            video.muted = true;
            video.play().catch(function () {});
        });
    }

    function attach() {
        if (!dock) return;
        document.body.appendChild(dock);
        play();
    }

    function build() {
        dock = document.createElement("div");
        dock.className = "live-dock";
        video = document.createElement("video");
        video.autoplay = true;
        video.playsInline = true;
        var top = document.createElement("div");
        top.className = "live-dock-top";
        var badge = document.createElement("em");
        badge.textContent = "LIVE";
        var title = document.createElement("span");
        title.className = "live-dock-title";
        title.textContent = state.host + " · " + state.title;
        var open = document.createElement("button");
        open.type = "button";
        open.setAttribute("aria-label", "Open the stream");
        open.innerHTML = '<i class="fa-solid fa-up-right-and-down-left-from-center"></i>';
        var close = document.createElement("button");
        close.type = "button";
        close.setAttribute("aria-label", "Stop watching");
        close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        top.appendChild(badge);
        top.appendChild(title);
        top.appendChild(open);
        top.appendChild(close);
        dock.appendChild(video);
        dock.appendChild(top);
        open.addEventListener("click", function () {
            var id = state.streamId;
            release();
            window.discodeGo("/Social/Index?live=" + id + "&t=" + Date.now());
        });
        close.addEventListener("click", release);
    }

    function release() {
        if (!state) return;
        var current = state;
        state = null;
        try {
            current.pc.close();
        } catch (error) {}
        invoke("LeaveLive", current.streamId).catch(function () {});
        if (video) video.srcObject = null;
        if (dock && dock.parentNode) dock.parentNode.removeChild(dock);
        dock = null;
        video = null;
    }

    function take(info) {
        release();
        state = info;
        build();
        video.muted = !!info.muted;
        video.srcObject = info.stream;
        attach();
    }

    window.discodeLiveDock = {
        take: take,
        close: release,
        active: function () { return state ? state.streamId : 0; }
    };

    document.addEventListener("discode-page-ready", attach);

    document.addEventListener("discode-live-ended", function (event) {
        if (state && event.detail && event.detail.streamId === state.streamId) release();
    });
})();
