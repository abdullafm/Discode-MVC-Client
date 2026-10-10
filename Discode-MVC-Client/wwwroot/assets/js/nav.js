"use strict";
(function () {
    var bag = [];
    var origAdd = EventTarget.prototype.addEventListener;
    var origRemove = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function (type, fn, opts) {
        bag.push({ target: this, type: type, fn: fn, opts: opts });
        return origAdd.call(this, type, fn, opts);
    };

    function listen(target, type, fn, opts) {
        return origAdd.call(target, type, fn, opts);
    }

    function dropPageListeners() {
        var old = bag;
        bag = [];
        for (var i = 0; i < old.length; i++) {
            origRemove.call(old[i].target, old[i].type, old[i].fn, old[i].opts);
        }
    }

    function isAppPage(url) {
        if (url.origin !== location.origin) return false;
        return /\.html$/i.test(url.pathname);
    }

    function sheetHref(link) {
        return new URL(link.getAttribute("href"), location.href).href;
    }

    function syncStyles(doc) {
        var next = [].slice.call(doc.querySelectorAll("link[rel='stylesheet']"));
        var nextHrefs = next.map(sheetHref);
        var current = [].slice.call(document.querySelectorAll("link[rel='stylesheet']"));
        current.forEach(function (link) {
            var href = sheetHref(link);
            if (nextHrefs.indexOf(href) === -1) link.parentNode.removeChild(link);
        });
        var have = [].slice.call(document.querySelectorAll("link[rel='stylesheet']")).map(sheetHref);
        next.forEach(function (link) {
            var href = sheetHref(link);
            if (have.indexOf(href) !== -1) return;
            var copy = document.createElement("link");
            copy.rel = "stylesheet";
            copy.href = href;
            document.head.appendChild(copy);
        });
    }

    function runScripts(list) {
        var i = 0;
        function next() {
            if (i >= list.length) {
                if (typeof window.onload === "function") window.onload();
                return;
            }
            var old = list[i++];
            var src = old.getAttribute("src") || "";
            if (/theme\.js|nav\.js/.test(src)) {
                next();
                return;
            }
            var script = document.createElement("script");
            if (src) {
                script.src = new URL(src, location.href).href;
                script.onload = next;
                script.onerror = next;
                document.body.appendChild(script);
                return;
            }
            script.text = old.textContent;
            document.body.appendChild(script);
            next();
        }
        next();
    }

    var busy = false;
    var shown = location.pathname + location.search;

    function go(url, replace) {
        var nextUrl;
        try {
            nextUrl = new URL(url, location.href);
        } catch (error) {
            location.href = url;
            return;
        }
        if (!isAppPage(nextUrl)) {
            location.href = nextUrl.href;
            return;
        }
        var path = nextUrl.pathname + nextUrl.search;
        if (path === shown) return;
        if (busy) return;
        busy = true;
        var mode = replace === "pop" ? "pop" : (replace ? "replace" : "push");
        fetch(nextUrl.href, { credentials: "same-origin" }).then(function (response) {
            if (!response.ok) throw new Error("nav");
            return response.text();
        }).then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            if (mode === "replace") history.replaceState({ discode: 1 }, "", path);
            else if (mode === "push") history.pushState({ discode: 1 }, "", path);
            var splash = /\/(login|register)\.html$/i.test(shown) && /\/index\.html$/i.test(path);
            try {
                if (splash) sessionStorage.setItem("discode-splash", "1");
            } catch (e) {}
            if (splash) document.documentElement.classList.add("show-loader");
            else document.documentElement.classList.remove("show-loader");
            shown = path;
            document.title = doc.title;
            syncStyles(doc);
            dropPageListeners();
            window.onload = null;
            var scripts = [].slice.call(doc.body.querySelectorAll("script"));
            scripts.forEach(function (script) {
                if (script.parentNode) script.parentNode.removeChild(script);
            });
            document.body.replaceWith(document.importNode(doc.body, true));
            window.scrollTo(0, 0);
            busy = false;
            runScripts(scripts);
        }).catch(function () {
            busy = false;
            location.href = nextUrl.href;
        });
    }

    window.discodeGo = go;

    function currentRole() {
        try {
            var user = JSON.parse(localStorage.getItem("discode-me") || "{}");
            return user.role === "admin" || user.role === "superadmin" ? user.role : "member";
        } catch (error) {
            return "member";
        }
    }

    function syncAdminEntry() {
        var entry = document.getElementById("admin-entry");
        if (entry) entry.hidden = currentRole() === "member";
    }

    if (document.readyState === "loading") {
        listen(document, "DOMContentLoaded", syncAdminEntry);
    } else {
        syncAdminEntry();
    }
    listen(window, "storage", syncAdminEntry);
    listen(document, "discode-role-change", syncAdminEntry);

    listen(document, "click", function (event) {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var link = event.target.closest && event.target.closest("a[href]");
        if (!link || link.target && link.target !== "_self") return;
        var url;
        try {
            url = new URL(link.href, location.href);
        } catch (error) {
            return;
        }
        if (!isAppPage(url) || url.pathname + url.search === shown) return;
        event.preventDefault();
        go(url.pathname + url.search);
    }, true);

    listen(document, "submit", function (event) {
        var form = event.target;
        if (!form || !form.action || (form.method && form.method.toLowerCase() === "post")) return;
        var url;
        try {
            url = new URL(form.action, location.href);
        } catch (error) {
            return;
        }
        if (!isAppPage(url)) return;
        event.preventDefault();
        go(url.pathname + url.search);
    }, true);

    listen(window, "popstate", function () {
        go(location.pathname + location.search, "pop");
    });
})();
