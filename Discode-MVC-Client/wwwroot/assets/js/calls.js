(function () {
    "use strict";

    var RING_MS = window.discodeCallRingMs || 30000;
    var state = null;
    var ringTimer = 0;
    var readyCallbacks = [];
    var isReady = false;

    var ringtone = new Audio("/assets/css/audio/call.mp3");
    ringtone.loop = true;
    var joinSound = new Audio("/assets/css/audio/join-voice.mp3");
    var leaveSound = new Audio("/assets/css/audio/leave-voice.mp3");

    var invite = document.getElementById("incoming-call");
    var bar = document.getElementById("active-call-bar");
    if (!invite || !bar) return;

    function play(sound) {
        try {
            sound.currentTime = 0;
            var promise = sound.play();
            if (promise && promise.catch) promise.catch(function () {});
        } catch (e) {}
    }

    function stopRing() {
        ringtone.pause();
        ringtone.currentTime = 0;
        clearTimeout(ringTimer);
        ringTimer = 0;
    }

    function startRing(volume) {
        ringtone.volume = volume;
        play(ringtone);
    }

    function invoke() {
        if (!window.discodePresence) return Promise.reject(new Error("Live connection is not ready yet."));
        return window.discodePresence.invoke.apply(null, arguments);
    }

    function clean(error) {
        var message = (error && error.message) || "";
        var at = message.indexOf("HubException: ");
        return at >= 0 ? message.slice(at + 14) : (message || "Could not start the call.");
    }

    function name(call) {
        return call.other.displayName || call.other.userName;
    }

    function onDmPageOf(call) {
        return !!call && window.discodeOpenDm === call.other.userName;
    }

    function render() {
        var incoming = !!state && state.status === "ringing" && state.role === "callee";
        invite.hidden = !incoming;
        if (incoming) {
            document.getElementById("incoming-call-avatar").src = state.other.avatarUrl || "/assets/img/img-icon-profile.jpeg";
            document.getElementById("incoming-call-name").textContent = name(state);
            document.getElementById("incoming-call-kind").textContent = state.video ? "Incoming Video Call" : "Incoming Voice Call";
        }

        var showBar = !!state && !incoming && !onDmPageOf(state);
        bar.hidden = !showBar;
        if (showBar) {
            document.getElementById("active-call-text").textContent = (state.status === "ringing" ? "Calling " : "In call with ") + name(state);
            document.getElementById("active-call-return").setAttribute("href", "/Dm/Index?name=" + encodeURIComponent(state.other.userName));
        }
    }

    function emit(reason, previous) {
        document.dispatchEvent(new CustomEvent("discode-call-state", { detail: { call: state, reason: reason || "", previous: previous || null } }));
    }

    function setState(next, reason) {
        var previous = state;
        state = next;
        if (!next) stopRing();
        render();
        emit(reason, previous);
    }

    function finishSync(call) {
        if (call) {
            state = call;
            if (call.status === "ringing" && call.role === "callee") startRing(1);
            render();
            emit("");
        } else if (state) {
            setState(null, "ended");
        }
        isReady = true;
        var pending = readyCallbacks;
        readyCallbacks = [];
        pending.forEach(function (callback) { callback(); });
    }

    document.addEventListener("discode-hub-connected", function () {
        invoke("GetMyCall").then(finishSync).catch(function () { finishSync(state); });
    });

    document.addEventListener("discode-call-incoming", function (event) {
        state = event.detail;
        startRing(1);
        render();
        emit("");
    });

    document.addEventListener("discode-call-accepted", function (event) {
        stopRing();
        state = event.detail;
        play(joinSound);
        render();
        emit("");
    });

    document.addEventListener("discode-call-ended", function (event) {
        var data = event.detail;
        if (!state || !data || state.callId !== data.callId) return;
        play(leaveSound);
        setState(null, data.reason);
    });

    function start(userName, video) {
        return invoke("StartCall", userName, !!video).then(function (call) {
            state = call;
            startRing(0.5);
            ringTimer = setTimeout(function () {
                if (state && state.callId === call.callId && state.status === "ringing") invoke("EndCall", call.callId, true).catch(function () {});
            }, RING_MS);
            render();
            emit("");
            return call;
        }).catch(function (error) {
            throw new Error(clean(error));
        });
    }

    function accept() {
        if (!state || state.role !== "callee") return;
        var call = state;
        stopRing();
        invoke("AcceptCall", call.callId).then(function () {
            if (!onDmPageOf(call)) window.location.href = "/Dm/Index?name=" + encodeURIComponent(call.other.userName);
        }).catch(function () {
            setState(null, "unavailable");
        });
    }

    function decline() {
        if (!state) return;
        var call = state;
        invoke("DeclineCall", call.callId).catch(function () {});
        setState(null, "");
        void call;
    }

    function end() {
        if (!state) return;
        var call = state;
        invoke("EndCall", call.callId, false).catch(function () {});
        play(leaveSound);
        setState(null, "");
    }

    document.getElementById("incoming-call-accept").addEventListener("click", accept);
    document.getElementById("incoming-call-decline").addEventListener("click", decline);
    document.getElementById("active-call-hangup").addEventListener("click", end);

    window.discodeCalls = {
        current: function () { return state; },
        start: start,
        end: end,
        ready: function (callback) {
            if (isReady) callback();
            else readyCallbacks.push(callback);
        }
    };
})();
