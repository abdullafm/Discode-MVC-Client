"use strict";

(function () {
    var request = null;

    function loadEmojis() {
        if (request) return request;
        request = fetch("/Home/Emojis", {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) throw new Error("emoji request failed");
            return response.json();
        }).catch(function (err) {
            request = null;
            throw err;
        });
        return request;
    }

    function make(tag, className, text) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    function shortcodeText(emoji) {
        return emoji.shortcodes.split(" ").filter(Boolean).map(function (code) { return ":" + code + ":"; }).join(" ");
    }

    // Builds the emoji picker from the backend. `decorate(choice, character)` is optional; when it is
    // given every choice contains an <img> that the page fills in (for example with Twemoji pictures).
    // `options.skip` is an optional list of category names to leave out.
    window.fillEmojiPanel = function (panel, prefix, decorate, options) {
        var skip = (options && options.skip) || [];
        panel.textContent = "";
        var tabs = make("div", "emoji-tabs");
        var scroll = make("div", "emoji-scroll");
        var foot = make("div", "emoji-foot");
        var footFace = make("span", "emoji-foot-face");
        var footText = make("span", "emoji-foot-text");
        foot.appendChild(footFace);
        foot.appendChild(footText);
        scroll.appendChild(make("p", "emoji-loading", "Loading emojis..."));
        panel.appendChild(tabs);
        panel.appendChild(scroll);
        panel.appendChild(foot);

        scroll.addEventListener("mouseover", function (event) {
            var choice = event.target.closest(".emoji-choice");
            if (!choice) return;
            footFace.textContent = choice.getAttribute("data-emoji");
            footText.textContent = choice.getAttribute("data-codes") || choice.getAttribute("title") || "";
        });

        loadEmojis().then(function (categories) {
            tabs.textContent = "";
            scroll.textContent = "";
            categories.filter(function (category) {
                return skip.indexOf(category.name) === -1;
            }).forEach(function (category, index) {
                var tab = make("button");
                tab.type = "button";
                tab.title = category.name;
                tab.setAttribute("data-emoji-tab", String(category.id));
                tab.classList.toggle("on", index === 0);
                tab.appendChild(make("i", "fa-solid " + category.icon));
                tabs.appendChild(tab);

                var block = make("div", "emoji-group");
                block.id = prefix + "-" + category.id;
                block.appendChild(make("h3", "", category.name));
                var grid = make("div", "emoji-grid");
                category.emojis.forEach(function (emoji) {
                    var choice = make("button", "emoji-choice");
                    choice.type = "button";
                    choice.title = emoji.name;
                    choice.setAttribute("data-emoji", emoji.character);
                    choice.setAttribute("data-codes", shortcodeText(emoji));
                    if (decorate) {
                        var img = make("img");
                        img.loading = "lazy";
                        img.alt = emoji.name;
                        img.addEventListener("error", function () {
                            if (img.src.indexOf("twemoji") === -1) return;
                            choice.textContent = emoji.character;
                        });
                        choice.appendChild(img);
                        decorate(choice, emoji.character);
                    } else {
                        choice.textContent = emoji.character;
                    }
                    grid.appendChild(choice);
                });
                block.appendChild(grid);
                scroll.appendChild(block);
            });
        }).catch(function () {
            scroll.textContent = "";
            scroll.appendChild(make("p", "emoji-loading", "Could not load emojis."));
        });
    };
})();
