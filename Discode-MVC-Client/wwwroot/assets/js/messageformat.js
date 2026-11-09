(function () {
    "use strict";
    if (window.discodeFormat) return;

    // ---------- Discord-style message formatting (bold, italic, underline, strikethrough, spoiler, code, quote, heading, list, links)
    // Everything is built with DOM nodes (never innerHTML), so a message can not inject markup.

    var ESCAPABLE = "\\*_~`|>[]()#-<";
    var URL_START = /^https?:\/\/[^\s<>"'`]+/i;
    var HAS_MARKUP = /[*_~`|>\[<]|https?:\/\/|^#{1,3} |^[-*] /m;

    function isWord(ch) {
        return !!ch && /[A-Za-z0-9À-￿]/.test(ch);
    }

    function trimUrl(url) {
        // a sentence's closing punctuation is not part of the address; a closing ")" only when it has no "(" of its own
        for (;;) {
            var last = url.charAt(url.length - 1);
            if (/[.,!?;:'"\]]/.test(last)) { url = url.slice(0, -1); continue; }
            if (last === ")" && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length) { url = url.slice(0, -1); continue; }
            return url;
        }
    }

    function linkNode(url, label, noEmbed) {
        var a = document.createElement("a");
        a.className = "fmt-link";
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer nofollow ugc";
        a.setAttribute("data-url", url);
        if (noEmbed) a.setAttribute("data-noembed", "1");
        a.textContent = label;
        return a;
    }

    var PAIRS = [
        ["***", "em-strong"],
        ["**", "strong"],
        ["__", "u"],
        ["~~", "s"],
        ["||", "spoiler"],
        ["*", "em"],
        ["_", "em"]
    ];

    function inline(text, plain, depth) {
        var out = [];
        var buf = "";
        var i = 0;
        var n = text.length;

        function flush() {
            if (!buf) return;
            plain(buf).forEach(function (node) { out.push(node); });
            buf = "";
        }

        function element(tag, cls, inner) {
            flush();
            var el = document.createElement(tag);
            if (cls) el.className = cls;
            (depth < 6 ? inline(inner, plain, depth + 1) : plain(inner)).forEach(function (node) { el.appendChild(node); });
            out.push(el);
        }

        while (i < n) {
            var c = text.charAt(i);

            if (c === "\\" && i + 1 < n && ESCAPABLE.indexOf(text.charAt(i + 1)) >= 0) {
                buf += text.charAt(i + 1);
                i += 2;
                continue;
            }

            if (c === "`") {
                var run = /^`+/.exec(text.slice(i))[0];
                var close = -1;
                for (var j = i + run.length; j < n; j++) {
                    if (text.substr(j, run.length) === run && text.charAt(j + run.length) !== "`" && text.charAt(j - 1) !== "`") { close = j; break; }
                }
                if (close > i + run.length) {
                    flush();
                    var code = document.createElement("code");
                    code.className = "fmt-code";
                    code.textContent = text.slice(i + run.length, close);
                    out.push(code);
                    i = close + run.length;
                    continue;
                }
                buf += run;
                i += run.length;
                continue;
            }

            if (c === "[" && depth < 2) {
                var masked = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/i.exec(text.slice(i));
                if (masked) {
                    flush();
                    out.push(linkNode(masked[2], masked[1], false));
                    i += masked[0].length;
                    continue;
                }
            }

            if (c === "<") {
                var angled = /^<(https?:\/\/[^\s>]+)>/i.exec(text.slice(i));
                if (angled) {
                    flush();
                    out.push(linkNode(angled[1], angled[1], true));
                    i += angled[0].length;
                    continue;
                }
            }

            if ((c === "h" || c === "H") && !isWord(text.charAt(i - 1))) {
                var found = URL_START.exec(text.slice(i));
                if (found) {
                    var address = trimUrl(found[0]);
                    if (address.length > 8) {
                        flush();
                        out.push(linkNode(address, address, false));
                        i += address.length;
                        continue;
                    }
                }
            }

            var matched = false;
            if (c === "*" || c === "_" || c === "~" || c === "|") {
                for (var p = 0; p < PAIRS.length && !matched; p++) {
                    var d = PAIRS[p][0];
                    if (text.substr(i, d.length) !== d) continue;
                    // _italic_ must stand on word edges (snake_case stays as it is); * must not open before a space
                    if (d === "_" && (isWord(text.charAt(i - 1)))) continue;
                    var after = text.charAt(i + d.length);
                    if (!after || /\s/.test(after)) continue;
                    var end = -1;
                    for (var k = i + d.length + 1; k <= n - d.length; k++) {
                        if (text.substr(k, d.length) !== d) continue;
                        if (d.length === 1 && (text.charAt(k - 1) === d || text.charAt(k + 1) === d)) continue;
                        if (/\s/.test(text.charAt(k - 1))) continue;
                        if (d === "_" && isWord(text.charAt(k + 1))) continue;
                        end = k;
                        break;
                    }
                    if (end < 0) continue;
                    var inner = text.slice(i + d.length, end);
                    var kind = PAIRS[p][1];
                    if (kind === "em-strong") {
                        flush();
                        var strong = document.createElement("strong");
                        var em = document.createElement("em");
                        inline(inner, plain, depth + 1).forEach(function (node) { em.appendChild(node); });
                        strong.appendChild(em);
                        out.push(strong);
                    } else if (kind === "spoiler") {
                        element("span", "fmt-spoiler", inner);
                    } else {
                        element(kind, "", inner);
                    }
                    i = end + d.length;
                    matched = true;
                }
                if (matched) continue;
            }

            buf += c;
            i += 1;
        }

        flush();
        return out;
    }

    function codeBlock(raw) {
        var pre = document.createElement("pre");
        pre.className = "fmt-pre";
        var code = document.createElement("code");
        var body = raw;
        var firstBreak = body.indexOf("\n");
        if (firstBreak > 0 && /^[\w+#.-]{1,20}$/.test(body.slice(0, firstBreak).trim())) {
            code.setAttribute("data-lang", body.slice(0, firstBreak).trim());
            body = body.slice(firstBreak + 1);
        }
        code.textContent = body.replace(/^\n/, "").replace(/\n$/, "");
        pre.appendChild(code);
        return pre;
    }

    function blocks(text, plain) {
        var lines = text.split("\n");
        var out = [];
        var para = [];

        function flushPara() {
            if (!para.length) return;
            inline(para.join("\n"), plain, 0).forEach(function (node) { out.push(node); });
            para = [];
        }

        var i = 0;
        while (i < lines.length) {
            var line = lines[i];
            var quote = /^>{1,3} ?(.*)$/.exec(line);
            var heading = /^(#{1,3}) (\S.*)$/.exec(line);
            var item = /^[-*] (\S.*)$/.exec(line);
            if (quote) {
                flushPara();
                var rows = [];
                while (i < lines.length && /^>{1,3} ?(.*)$/.test(lines[i])) {
                    rows.push(/^>{1,3} ?(.*)$/.exec(lines[i])[1]);
                    i += 1;
                }
                var bq = document.createElement("blockquote");
                bq.className = "fmt-quote";
                inline(rows.join("\n"), plain, 0).forEach(function (node) { bq.appendChild(node); });
                out.push(bq);
                continue;
            }
            if (heading) {
                flushPara();
                var h = document.createElement("div");
                h.className = "fmt-h fmt-h" + heading[1].length;
                inline(heading[2], plain, 0).forEach(function (node) { h.appendChild(node); });
                out.push(h);
                i += 1;
                continue;
            }
            if (item) {
                flushPara();
                var ul = document.createElement("ul");
                ul.className = "fmt-list";
                while (i < lines.length && /^[-*] (\S.*)$/.test(lines[i])) {
                    var li = document.createElement("li");
                    inline(/^[-*] (\S.*)$/.exec(lines[i])[1], plain, 0).forEach(function (node) { li.appendChild(node); });
                    ul.appendChild(li);
                    i += 1;
                }
                out.push(ul);
                continue;
            }
            para.push(line);
            i += 1;
        }

        flushPara();
        return out;
    }

    // the nodes of a message body: a plain message stays exactly as it was, a message with markup is wrapped and keeps its original text
    function nodes(text, plain) {
        var plainFn = plain || function (t) { return [document.createTextNode(t)]; };
        text = String(text == null ? "" : text);
        if (!HAS_MARKUP.test(text)) return plainFn(text);

        var wrap = document.createElement("span");
        wrap.className = "fmt";
        wrap.setAttribute("data-raw", text);

        var parts = text.split("```");
        // every odd part that has a closing fence after it is a code block; a last fence that never closes is plain text
        for (var i = 0; i < parts.length; i++) {
            if (i % 2 === 1 && i < parts.length - 1) {
                wrap.appendChild(codeBlock(parts[i]));
                continue;
            }
            var chunk = i % 2 === 1 ? "```" + parts[i] : parts[i];
            if (i > 0 && i % 2 === 0) chunk = chunk.replace(/^\n/, "");
            if ((i + 1) % 2 === 1 && i + 1 < parts.length - 1) chunk = chunk.replace(/\n$/, "");
            if (chunk) blocks(chunk, plainFn).forEach(function (node) { wrap.appendChild(node); });
        }

        return [wrap];
    }

    // spoilers open on a click
    document.addEventListener("click", function (event) {
        var spoiler = event.target.closest && event.target.closest(".fmt-spoiler");
        if (!spoiler) return;
        if (!spoiler.classList.contains("is-revealed")) {
            event.preventDefault();
            event.stopPropagation();
            spoiler.classList.add("is-revealed");
        }
    }, true);

    // ---------- link previews under the message
    var cache = {};
    var YOUTUBE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

    // a link to a post of this site becomes a post card
    function ownPostId(url) {
        try {
            var parsed = new URL(url, window.location.origin);
            if (parsed.origin !== window.location.origin || !/^\/social(\/index)?\/?$/i.test(parsed.pathname)) return 0;
            var id = Number(parsed.searchParams.get("post"));
            return id > 0 ? id : 0;
        } catch (error) {
            return 0;
        }
    }

    // a gift link of this site (/gift/<code>)
    function ownGiftCode(url) {
        try {
            var parsed = new URL(url, window.location.origin);
            var match = parsed.origin === window.location.origin ? /^\/gift\/([A-Za-z0-9_-]{8,64})\/?$/.exec(parsed.pathname) : null;
            return match ? match[1] : "";
        } catch (error) {
            return "";
        }
    }

    function fetchPreview(url) {
        if (cache[url]) return cache[url];
        var giftCode = ownGiftCode(url);
        if (giftCode) {
            cache[url] = Promise.resolve({ type: "gift", code: giftCode });
            return cache[url];
        }
        var postId = ownPostId(url);
        if (postId) {
            cache[url] = fetch("/Home/PostCard?id=" + postId, {
                credentials: "same-origin",
                headers: { "X-Requested-With": "XMLHttpRequest" }
            }).then(function (response) {
                return response.ok ? response.json() : { type: "post-missing", postId: postId };
            }).then(function (post) {
                return post.type === "post-missing" ? post : { type: "post", postId: postId, post: post };
            }).catch(function () { return null; });
            return cache[url];
        }
        cache[url] = fetch("/Link/Preview?url=" + encodeURIComponent(url), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            return response.ok ? response.json() : null;
        }).catch(function () { return null; });
        return cache[url];
    }

    function postEmbed(url, data) {
        var box = document.createElement("div");
        box.className = "dm-embed dm-post-embed";
        box.setAttribute("data-embed-for", url);
        if (data.type === "post-missing") {
            var gone = document.createElement("div");
            gone.className = "dm-post-embed-gone";
            gone.textContent = "This post is not available.";
            box.appendChild(gone);
            return box;
        }
        var post = data.post || {};
        var head = document.createElement("div");
        head.className = "dm-post-embed-head";
        var face = document.createElement("img");
        face.alt = "";
        face.src = post.authorAvatarUrl || "/assets/img/img-icon-profile.jpeg";
        var names = document.createElement("span");
        var strong = document.createElement("strong");
        strong.textContent = post.authorDisplayName || post.authorUserName || "";
        var small = document.createElement("small");
        small.textContent = "@" + (post.authorUserName || "");
        names.appendChild(strong);
        names.appendChild(small);
        head.appendChild(face);
        head.appendChild(names);
        box.appendChild(head);
        if (post.text) {
            var text = document.createElement("p");
            text.className = "dm-post-embed-text";
            text.textContent = post.text.length > 280 ? post.text.slice(0, 277) + "..." : post.text;
            box.appendChild(text);
        }
        if (post.imageUrl) {
            var picture = document.createElement("img");
            picture.className = "dm-post-embed-photo";
            picture.alt = "";
            picture.loading = "lazy";
            picture.src = post.imageUrl;
            picture.addEventListener("error", function () { picture.remove(); });
            box.appendChild(picture);
        }
        var open = document.createElement("a");
        open.className = "dm-post-embed-open";
        open.href = url;
        open.textContent = "View post";
        open.addEventListener("click", function (event) {
            if (window.discodeGo && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
                event.preventDefault();
                window.discodeGo(url);
            }
        });
        box.appendChild(open);
        return box;
    }

    function giftEmbed(url, data) {
        var box = document.createElement("div");
        box.className = "dm-embed dm-gift-embed";
        box.setAttribute("data-embed-for", url);
        var copy = document.createElement("div");
        copy.className = "dm-gift-copy";
        var title = document.createElement("h3");
        title.textContent = "You received a Nitro gift!";
        var about = document.createElement("p");
        about.textContent = "This link is a Nitro gift. Press the button to claim it.";
        var claim = document.createElement("button");
        claim.type = "button";
        claim.className = "dm-gift-claim";
        claim.textContent = "Claim";
        claim.addEventListener("click", function () {
            if (window.discodeGift) window.discodeGift.open(data.code);
        });
        copy.appendChild(title);
        copy.appendChild(about);
        copy.appendChild(claim);
        var art = document.createElement("img");
        art.className = "dm-gift-art";
        art.alt = "";
        art.src = "/assets/img/nitro-gift.png";
        box.appendChild(copy);
        box.appendChild(art);
        return box;
    }

    function embedNode(url, data) {
        if (data && data.type === "gift") return giftEmbed(url, data);
        if (data && (data.type === "post" || data.type === "post-missing")) return postEmbed(url, data);
        if (!data || data.type === "none") return null;
        var box = document.createElement("div");
        box.className = "dm-embed";
        box.setAttribute("data-embed-for", url);

        if (data.type === "image") {
            var link = document.createElement("a");
            link.className = "dm-embed-photo";
            link.setAttribute("aria-label", "Open image");
            link.href = data.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            var photo = document.createElement("img");
            photo.alt = "";
            photo.loading = "lazy";
            photo.src = data.url;
            link.appendChild(photo);
            box.appendChild(link);
            box.classList.add("is-photo");
            return box;
        }

        if (!data.title && !data.description && !data.image) return null;
        if (data.color && /^#[0-9a-f]{3,8}$/i.test(data.color)) box.style.borderLeftColor = data.color;
        if (data.siteName) {
            var site = document.createElement("div");
            site.className = "dm-embed-site";
            site.textContent = data.siteName;
            box.appendChild(site);
        }
        if (data.title) {
            var title = document.createElement("a");
            title.className = "dm-embed-title";
            title.href = data.url || url;
            title.target = "_blank";
            title.rel = "noopener noreferrer nofollow";
            title.textContent = data.title;
            box.appendChild(title);
        }
        if (data.description) {
            var about = document.createElement("div");
            about.className = "dm-embed-text";
            about.textContent = data.description;
            box.appendChild(about);
        }
        if (data.image) {
            var picture = document.createElement("div");
            picture.className = "dm-embed-media";
            var img = document.createElement("img");
            img.alt = "";
            img.loading = "lazy";
            img.referrerPolicy = "no-referrer";
            img.src = data.image;
            img.addEventListener("error", function () { picture.remove(); });
            picture.appendChild(img);
            var yt = YOUTUBE.exec(url);
            if (yt) {
                picture.classList.add("is-video");
                var play = document.createElement("button");
                play.type = "button";
                play.className = "dm-embed-play";
                play.setAttribute("aria-label", "Play video");
                play.innerHTML = '<i class="fa-solid fa-play"></i>';
                play.addEventListener("click", function () {
                    var frame = document.createElement("iframe");
                    frame.src = "https://www.youtube-nocookie.com/embed/" + yt[1] + "?autoplay=1";
                    frame.allow = "autoplay; encrypted-media; picture-in-picture";
                    frame.allowFullscreen = true;
                    frame.referrerPolicy = "strict-origin-when-cross-origin";
                    picture.textContent = "";
                    picture.appendChild(frame);
                });
                picture.appendChild(play);
            }
            box.appendChild(picture);
        }
        return box;
    }

    function processRow(row) {
        var holder = row.querySelector(".dm-msg-text");
        if (!holder) return;
        var link = holder.querySelector("a.fmt-link:not([data-noembed])");
        var url = link ? link.getAttribute("data-url") : "";
        var current = row.getAttribute("data-embed-url") || "";
        if (url === current) return;
        var old = row.querySelector(":scope > .dm-embed, .dm-msg-body > .dm-embed");
        if (old) old.remove();
        row.setAttribute("data-embed-url", url);
        if (!url) return;
        fetchPreview(url).then(function (data) {
            if (row.getAttribute("data-embed-url") !== url || !row.isConnected) return;
            var node = embedNode(url, data);
            if (!node) return;
            var again = row.querySelector(".dm-msg-text");
            if (again && again.parentNode) again.parentNode.insertBefore(node, again.nextSibling);
            // a message that is only a shared post shows just the card
            if (again && (node.classList.contains("dm-post-embed") || node.classList.contains("dm-gift-embed")) && again.textContent.trim() === url) again.classList.add("is-card-only");
        });
    }

    var queued = [];
    var scheduled = false;

    function drain() {
        scheduled = false;
        var rows = queued;
        queued = [];
        rows.forEach(function (row) { if (row.isConnected) processRow(row); });
    }

    function schedule(row) {
        if (queued.indexOf(row) === -1) queued.push(row);
        if (!scheduled) {
            scheduled = true;
            window.setTimeout(drain, 60);
        }
    }

    function rowsIn(node) {
        if (node.nodeType !== 1) return;
        var row = node.closest ? node.closest(".dm-msg") : null;
        if (row) schedule(row);
        if (node.querySelectorAll) [].forEach.call(node.querySelectorAll(".dm-msg"), schedule);
    }

    function watch() {
        new MutationObserver(function (changes) {
            changes.forEach(function (change) {
                [].forEach.call(change.addedNodes, rowsIn);
            });
        }).observe(document.body, { childList: true, subtree: true });
        [].forEach.call(document.querySelectorAll(".dm-msg"), schedule);
    }

    if (document.body) watch();
    else document.addEventListener("DOMContentLoaded", watch);

    window.discodeFormat = { nodes: nodes, hasMarkup: function (text) { return HAS_MARKUP.test(String(text || "")); } };
})();
