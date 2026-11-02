(function () {
    "use strict";

    // Pəncərələrdə (server yarat, ad dəyiş, kanal yarat...) mətn yazıb Enter basanda əsas düymə işləsin.
    // Hər pəncərənin öz Enter qaydası varsa ona toxunmuruq (defaultPrevented).
    var MODALS = [
        "#server-modal", "#name-modal", "#pass-modal", "#channel-modal", "#channel-edit", "#category-modal",
        "#server-delete-modal", "#group-edit-modal", "#dm-forward-modal", "#group-forward-modal",
        "#live-create-modal", "#new-msg", ".channel-modal", ".name-modal", ".server-delete-modal"
    ].join(",");

    var PRIMARY = /(done|create|confirm|save|submit|post|invite|join|apply|continue|ok)/i;
    var NOT_PRIMARY = /(cancel|close|back|copy|emoji|eye|-open|reset|search)/i;
    // Enter bu sahələrdə ya yeni sətir yazır, ya da axtarış edir
    var SKIP_TYPES = /^(search|file|checkbox|radio|range|color|hidden|button|submit)$/i;

    function visible(node) {
        return !!(node && node.getClientRects().length > 0 && !node.disabled && !node.closest("[hidden]"));
    }

    function labelOf(button) {
        return (button.id + " " + button.className + " " + (button.getAttribute("data-action") || "")).toLowerCase();
    }

    function primaryButton(root, input) {
        var buttons = [].filter.call(root.querySelectorAll("button"), function (button) {
            if (!visible(button) || button.type === "reset") return false;
            var label = labelOf(button);
            return PRIMARY.test(label) && !NOT_PRIMARY.test(label);
        });
        if (!buttons.length) return null;

        // iki panel varsa (server yarat / server qoşul) girişə ən yaxın paneldəki düyməni seç
        var panel = input.parentElement;
        while (panel && panel !== root) {
            var near = buttons.filter(function (button) { return panel.contains(button); });
            if (near.length) return near[near.length - 1];
            panel = panel.parentElement;
        }

        return buttons[buttons.length - 1];
    }


    // ---------- açılıb-bağlanan panellər: CSS ilə yumşalmayanlar üçün (!important gizlədənlər) ----------
    // el.hidden = true olanda element 150 ms solaraq çəkilir, el.hidden = false olanda yumşaq gəlir
    var ANIMATED = [
        ".role-more-menu", ".color-picker", ".member-pop", ".member-pop-menu", ".member-pop-role-menu", ".server-save-bar",
        ".server-voice-dock", ".photo-preview", ".story-reply", ".live-hero", ".live-chips", ".inline-search-results-card",
        ".lang-menu", ".reply-chip", ".delete-pop"
    ].join(",");
    var hiddenAccessor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidden");
    var canAnimate = typeof Element.prototype.animate === "function" && hiddenAccessor && hiddenAccessor.set;

    function isShown(node) {
        return !hiddenAccessor.get.call(node) && node.isConnected;
    }

    function stopExit(node) {
        if (node.__uxExit) {
            node.__uxExit.cancel();
            node.__uxExit = null;
        }
    }

    if (canAnimate && !HTMLElement.prototype.__uxHidden) {
        HTMLElement.prototype.__uxHidden = true;
        Object.defineProperty(HTMLElement.prototype, "hidden", {
            configurable: true,
            enumerable: hiddenAccessor.enumerable,
            get: function () {
                return this.__uxExit ? true : hiddenAccessor.get.call(this);
            },
            set: function (value) {
                var node = this;
                var wants = !!value;
                if (!node.matches || !node.matches(ANIMATED)) {
                    hiddenAccessor.set.call(node, value);
                    return;
                }

                if (wants) {
                    if (node.__uxExit || !isShown(node)) {
                        if (!node.__uxExit) hiddenAccessor.set.call(node, true);
                        return;
                    }

                    var leave = node.animate(
                        [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "0 6px" }],
                        { duration: 150, easing: "ease", fill: "forwards" }
                    );
                    node.__uxExit = leave;
                    leave.onfinish = function () {
                        if (node.__uxExit !== leave) return;
                        node.__uxExit = null;
                        hiddenAccessor.set.call(node, true);
                        leave.cancel();
                    };
                    return;
                }

                var wasShown = isShown(node) && !node.__uxExit;
                stopExit(node);
                hiddenAccessor.set.call(node, false);
                if (!wasShown) {
                    node.animate(
                        [{ opacity: 0, translate: "0 8px" }, { opacity: 1, translate: "0 0" }],
                        { duration: 180, easing: "cubic-bezier(0.22, 0.8, 0.3, 1)" }
                    );
                }
            }
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" || event.defaultPrevented || event.isComposing) return;
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

        var input = event.target;
        if (!input || input.tagName !== "INPUT" || SKIP_TYPES.test(input.type)) return;
        if (input.closest("form")) return; // formda brauzer özü göndərir

        var root = input.closest(MODALS);
        if (!root) return;

        var button = primaryButton(root, input);
        if (!button) return;

        event.preventDefault();
        button.click();
    });

    // Boş yerə vurub bağlanan pəncərələr üçün Escape: yalnız öz düyməsi olanlara
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape" || event.defaultPrevented) return;

        var open = [].filter.call(document.querySelectorAll(MODALS), visible).pop();
        if (!open) return;

        var close = [].find.call(open.querySelectorAll("button"), function (button) {
            return visible(button) && /(close|cancel)/i.test(labelOf(button));
        });
        if (close) {
            event.preventDefault();
            close.click();
        }
    });

    // Telefonda ayarlar tabları sürüşür: seçilən tab görünən yerə gəlsin
    document.addEventListener("click", function (event) {
        var tab = event.target.closest && event.target.closest(".settings-nav button, .server-settings-nav button");
        if (!tab || !window.matchMedia("(max-width: 720px)").matches) return;
        var strip = tab.closest(".settings-tabs, .server-settings-nav");
        if (strip) {
            var offset = tab.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
            strip.scrollTo({ left: Math.max(0, offset - (strip.clientWidth - tab.offsetWidth) / 2), behavior: "smooth" });
        }
    });
    // ---------- dar ekranda ayarlar tabları açılan siyahıya (dropdown) çevrilir ----------
    function buildTabSelect(strip, selector, inside) {
        if (!strip || strip.getAttribute("data-ux-select")) return;
        var buttons = [].slice.call(strip.querySelectorAll(selector));
        if (buttons.length < 2) return;
        strip.setAttribute("data-ux-select", "1");

        var wrap = document.createElement("div");
        wrap.className = "ux-select";
        var trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "ux-select-btn";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        var triggerIcon = document.createElement("span");
        triggerIcon.className = "ux-select-ico";
        var triggerLabel = document.createElement("span");
        triggerLabel.className = "ux-select-label";
        var chevron = document.createElement("i");
        chevron.className = "fa-solid fa-chevron-down ux-select-chev";
        trigger.appendChild(triggerIcon);
        trigger.appendChild(triggerLabel);
        trigger.appendChild(chevron);

        var menu = document.createElement("div");
        menu.className = "ux-select-menu";
        menu.setAttribute("role", "listbox");
        menu.hidden = true;

        function labelOfTab(button) {
            var text = button.querySelector("span:not(.lang-icon)");
            return ((text || button).textContent || "").replace(/\s+/g, " ").trim();
        }

        function iconOfTab(button) {
            var icon = button.querySelector("i, .lang-icon");
            return icon ? icon.cloneNode(true) : null;
        }

        function close() {
            menu.hidden = true;
            wrap.classList.remove("open");
            trigger.setAttribute("aria-expanded", "false");
        }

        var items = buttons.map(function (button) {
            var item = document.createElement("button");
            item.type = "button";
            item.className = "ux-select-item" + (button.classList.contains("server-settings-delete") ? " is-danger" : "");
            item.setAttribute("role", "option");
            var itemIcon = iconOfTab(button);
            if (itemIcon) item.appendChild(itemIcon);
            var text = document.createElement("span");
            text.textContent = labelOfTab(button);
            item.appendChild(text);
            item.addEventListener("click", function () {
                close();
                button.click();
                refresh();
            });
            menu.appendChild(item);
            return item;
        });

        function refresh() {
            var current = buttons.filter(function (button) { return button.classList.contains("on"); })[0] || buttons[0];
            triggerIcon.innerHTML = "";
            var currentIcon = iconOfTab(current);
            if (currentIcon) triggerIcon.appendChild(currentIcon);
            triggerIcon.hidden = !currentIcon;
            triggerLabel.textContent = labelOfTab(current);
            items.forEach(function (item, index) {
                item.classList.toggle("on", buttons[index] === current);
                item.setAttribute("aria-selected", buttons[index] === current ? "true" : "false");
            });
        }

        trigger.addEventListener("click", function (event) {
            event.stopPropagation();
            var open = menu.hidden;
            menu.hidden = !open;
            wrap.classList.toggle("open", open);
            trigger.setAttribute("aria-expanded", open ? "true" : "false");
        });
        document.addEventListener("click", function (event) {
            if (!wrap.contains(event.target)) close();
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !menu.hidden) {
                event.stopPropagation();
                close();
            }
        }, true);

        wrap.appendChild(trigger);
        wrap.appendChild(menu);
        if (inside) {
            strip.insertBefore(wrap, strip.firstChild);
            strip.classList.add("ux-has-select");
        } else {
            strip.parentNode.insertBefore(wrap, strip);
            strip.parentNode.classList.add("ux-has-select");
        }
        refresh();

        // tab başqa yerdən dəyişəndə (məsələn kod ilə) yazı da dəyişsin
        new MutationObserver(refresh).observe(strip, { attributes: true, attributeFilter: ["class"], subtree: true });
    }

    function buildAllTabSelects() {
        buildTabSelect(document.querySelector(".settings-nav .settings-tabs"), "button[data-settings-tab]");
        buildTabSelect(document.querySelector(".server-settings-nav"), "button", true);
    }
    buildAllTabSelects();
    document.addEventListener("DOMContentLoaded", buildAllTabSelects);
})();

