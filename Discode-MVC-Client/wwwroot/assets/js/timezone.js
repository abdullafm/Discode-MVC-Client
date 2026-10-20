(function () {
    try {
        document.cookie = "tz=" + (-new Date().getTimezoneOffset()) + "; path=/; max-age=31536000; samesite=lax";
    } catch (e) {}
})();
