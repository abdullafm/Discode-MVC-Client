"use strict";
(function () {
    var bag = [];
    var origAdd = EventTarget.prototype.addEventListener;
    var origRemove = EventTarget.prototype.removeEventListener;

    var keepers = /\/(calls|groupcalls|presence|livedock|i18n|theme|timezone|nav)\.js|signalr/i;
    var swapping = false;
    var lateReady = [];

    function fromKeeper() {
        var lines = (new Error().stack || "").split("\n");
        return keepers.test(lines[3] || "");
    }

    EventTarget.prototype.addEventListener = function (type, fn, opts) {
        if (swapping && type === "DOMContentLoaded" && this === document) {
            lateReady.push(fn);
            return;
        }
        if (!fromKeeper()) bag.push({ target: this, type: type, fn: fn, opts: opts });
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
        return /\.html$/i.test(url.pathname) || /^\/(Home|Dm|Social|Nitro|Group|Server)\/Index\/?$/i.test(url.pathname);
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
                swapping = false;
                var late = lateReady;
                lateReady = [];
                late.forEach(function (fn) {
                    try {
                        fn.call(document, new Event("DOMContentLoaded"));
                    } catch (e) {
                        setTimeout(function () { throw e; });
                    }
                });
                if (typeof window.onload === "function") {
                    try {
                        window.onload();
                    } catch (e) {
                        setTimeout(function () { throw e; });
                    }
                }
                document.dispatchEvent(new CustomEvent("discode-page-ready"));
                return;
            }
            var old = list[i++];
            var src = old.getAttribute("src") || "";
            if (/theme\.js|nav\.js|calls\.js|presence\.js|livedock\.js|signalr/i.test(src)) {
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

    function hasLayout(html) {
        return html.indexOf('id="incoming-call"') !== -1;
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
            if (response.redirected && !isAppPage(new URL(response.url))) throw new Error("nav");
            return response.text();
        }).then(function (html) {
            if (!hasLayout(html)) throw new Error("nav");
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
            window.discodeOpenDm = "";
            window.discodeOpenGroup = 0;
            swapping = true;
            var scripts = [].slice.call(doc.body.querySelectorAll("script"));
            scripts.forEach(function (script) {
                if (script.parentNode) script.parentNode.removeChild(script);
            });
            document.body.replaceWith(document.importNode(doc.body, true));
            window.scrollTo(0, 0);
            busy = false;
            if (window.DiscodeLang && window.DiscodeLang.rebind) window.DiscodeLang.rebind();
            try {
                if (window.discodeGroupCache && typeof window.paintGroupRows === "function") window.paintGroupRows(window.discodeGroupCache);
            } catch (e) {}
            runScripts(scripts);
        }).catch(function () {
            busy = false;
            location.href = nextUrl.href;
        });
    }

    window.discodeGo = go;

    function currentRole() {
        return "member";
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
        if (event.target.closest && event.target.closest("[data-dm] > i.fa-xmark")) return;
        var link = event.target.closest && event.target.closest("a[href]");
        if (!link || link.target && link.target !== "_self") return;
        var url;
        try {
            url = new URL(link.href, location.href);
        } catch (error) {
            return;
        }
        if (!isAppPage(url)) return;
        event.preventDefault();
        if (url.pathname + url.search === shown) return;
        go(url.pathname + url.search);
    }, true);

    listen(window, "pagehide", function () {
        swapping = false;
    });

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
