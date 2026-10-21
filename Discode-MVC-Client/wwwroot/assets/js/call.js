(function () {
    var micBtn = document.getElementById("call-mic");
    var deafenBtn = document.getElementById("call-deafen");
    var camBtn = document.getElementById("call-cam");
    var screenBtn = document.getElementById("call-screen");
    var hangupBtn = document.getElementById("call-hangup");
    var phoneSoundBtn = document.querySelector(".call-phone-sound");
    var stage = document.getElementById("call-stage");
    var muteBadge = document.getElementById("call-mute");
    var camVideo = document.getElementById("call-cam-video");
    var screenVideo = document.getElementById("call-screen-video");
    if (!micBtn || !camBtn || !screenBtn || !stage || !camVideo || !screenVideo) return;

    var unmuteSound = new Audio("/assets/css/audio/discord-unmute-sound.mp3");
    var muteSound = new Audio("/assets/css/audio/discordmute_IZNcLx2.mp3");

    var quiet = false;

    function paintMic(muted, playSound) {
        if (playSound === undefined) playSound = true;
        micBtn.classList.toggle("is-off", muted);
        micBtn.setAttribute("aria-pressed", muted ? "true" : "false");
        micBtn.querySelector("i").className = muted ? "fa-solid fa-microphone-slash" : "fa-solid fa-microphone";
        muteBadge.classList.toggle("is-gone", !muted);
        if (!quiet) document.dispatchEvent(new CustomEvent("discode-call-mic", { detail: { muted: muted } }));
        if (playSound) {
            if (muted) {
                muteSound.currentTime = 0;
                muteSound.play().catch(function() {});
            } else {
                unmuteSound.currentTime = 0;
                unmuteSound.play().catch(function() {});
            }
        }
    }

    function paintDeafen(deafened, playSound) {
        if (playSound === undefined) playSound = true;
        if (deafenBtn) {
            deafenBtn.classList.toggle("is-off", deafened);
            deafenBtn.setAttribute("aria-pressed", deafened ? "true" : "false");
            deafenBtn.querySelector("i").className = "fa-solid fa-headphones";
        }
        muteBadge.classList.toggle("is-deaf", deafened);
        if (!quiet) document.dispatchEvent(new CustomEvent("discode-call-deafen", { detail: { deafened: deafened } }));
        if (phoneSoundBtn) {
            phoneSoundBtn.classList.toggle("is-off", deafened);
            phoneSoundBtn.setAttribute("aria-pressed", deafened ? "true" : "false");
            phoneSoundBtn.setAttribute("aria-label", deafened ? "Enable sound" : "Speaker");
            phoneSoundBtn.querySelector("i").className = deafened ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
        }
        if (playSound) {
            if (deafened) {
                muteSound.currentTime = 0;
                muteSound.play().catch(function() {});
            } else {
                unmuteSound.currentTime = 0;
                unmuteSound.play().catch(function() {});
            }
        }
    }

    function toggleDeafen() {
        var enabled = deafenBtn ? deafenBtn.classList.contains("is-off") : !!(phoneSoundBtn && phoneSoundBtn.classList.contains("is-off"));
        paintDeafen(!enabled);
        paintMic(!enabled, false);
    }

    quiet = true;
    paintDeafen(false, false);
    paintMic(true, false);
    quiet = false;

    window.discodeCallControls = {
        set: function (muted, deafened) {
            paintDeafen(deafened, false);
            paintMic(muted, false);
        },
        isMuted: function () { return micBtn.classList.contains("is-off"); },
        setCameraButton: function (on) { paintCam(on, true); },
        setScreenButton: function (on) { paintScreen(on, true); }
    };

    var camStream = null;

    function stopCam() {
        if (!camStream) return;
        camStream.getTracks().forEach(function (track) { track.stop(); });
        camStream = null;
        camVideo.srcObject = null;
    }

    function paintCam(on, silent) {
        camBtn.classList.toggle("is-off", !on);
        camBtn.setAttribute("aria-pressed", on ? "false" : "true");
        camBtn.querySelector("i").className = on ? "fa-solid fa-video" : "fa-solid fa-video-slash";
        if (document.getElementById("call-faces")) {
            if (!silent) document.dispatchEvent(new CustomEvent("discode-call-camera", { detail: { on: on } }));
            return;
        }
        camVideo.hidden = false;
        stage.classList.toggle("has-cam", on);
        stage.classList.toggle("has-media", on || stage.classList.contains("has-screen"));
        if (!on) {
            stopCam();
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(function (stream) {
            if (!stage.classList.contains("has-cam")) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            stopCam();
            camStream = stream;
            camVideo.srcObject = stream;
        }).catch(function () {
            camBtn.classList.add("is-off");
            camBtn.setAttribute("aria-pressed", "true");
            camBtn.querySelector("i").className = "fa-solid fa-video-slash";
            stage.classList.remove("has-cam");
            stage.classList.toggle("has-media", stage.classList.contains("has-screen"));
        });
    }

    function paintScreen(on, silent) {
        if (document.getElementById("call-faces")) {
            screenBtn.classList.toggle("is-on", on);
            screenBtn.setAttribute("aria-pressed", on ? "true" : "false");
            if (!silent) document.dispatchEvent(new CustomEvent("discode-call-screen", { detail: { on: on } }));
            return;
        }
        screenBtn.classList.toggle("is-on", on);
        screenBtn.setAttribute("aria-pressed", on ? "true" : "false");
        screenVideo.hidden = false;
        stage.classList.toggle("has-screen", on);
        stage.classList.toggle("has-media", on || stage.classList.contains("has-cam"));
    }

    micBtn.addEventListener("click", function () {
        var newMicState = !micBtn.classList.contains("is-off");
        paintMic(newMicState);
        if (!newMicState) {
            paintDeafen(false, false);
        }
    });

    if (deafenBtn) {
        deafenBtn.addEventListener("click", toggleDeafen);
    }

    if (phoneSoundBtn) {
        phoneSoundBtn.addEventListener("click", toggleDeafen);
    }

    camBtn.addEventListener("click", function () {
        paintCam(camBtn.classList.contains("is-off"));
    });

    screenBtn.addEventListener("click", function () {
        paintScreen(!screenBtn.classList.contains("is-on"));
    });

    if (hangupBtn) hangupBtn.addEventListener("click", function () {
        paintDeafen(false, false);
        paintMic(true, false);
        paintCam(false);
        paintScreen(false);
    });

    window.openCallCamera = function () {
        paintCam(true);
    };

    var handle = document.getElementById("call-resize");
    if (!handle) return;

    var minH = 220;
    var dragging = false;
    var startY = 0;
    var startH = 0;

    function maxHeight() {
        var parent = stage.parentElement;
        var bar = parent.querySelector(".group-bar, .dm-bar");
        var compose = parent.querySelector(".group-compose, .dm-compose");
        var taken = (bar ? bar.offsetHeight : 0) + (compose ? compose.offsetHeight : 0) + 96;
        return Math.max(minH, parent.clientHeight - taken);
    }

    function setHeight(next) {
        stage.style.height = Math.round(Math.min(maxHeight(), Math.max(minH, next))) + "px";
    }

    handle.addEventListener("pointerdown", function (event) {
        if (stage.hidden) return;
        dragging = true;
        startY = event.clientY;
        startH = stage.getBoundingClientRect().height;
        handle.setPointerCapture(event.pointerId);
        document.body.classList.add("call-resizing");
    });

    handle.addEventListener("pointermove", function (event) {
        if (!dragging) return;
        setHeight(startH + (event.clientY - startY));
    });

    function stopDrag() {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove("call-resizing");
    }

    handle.addEventListener("pointerup", stopDrag);
    handle.addEventListener("pointercancel", stopDrag);

    handle.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        var current = stage.getBoundingClientRect().height;
        setHeight(current + (event.key === "ArrowDown" ? 24 : -24));
    });
})();
