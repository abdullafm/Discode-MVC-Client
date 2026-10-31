"use strict";
(function () {

    var DICT = {};
    var cache = {};
    var current = "en";
    var LANGS = ["en", "tr", "az"];

    var FLAG_MAP = {
        "en": { flag: "us", native: "English", sub: "English" },
        "tr": { flag: "tr", native: "Türkçe", sub: "Turkish" },
        "az": { flag: "az", native: "Azərbaycan", sub: "Azerbaijan" }
    };

    function getSavedLang() {
        return current;
    }

    function translateText(str, targetLang) {
        if (!str || targetLang === "en") return str;
        if (targetLang !== current) return str;
        return DICT[str] || str;
    }

    function csrfToken() {
        var input = document.querySelector("input[name='__RequestVerificationToken']");
        return input ? input.value : "";
    }

    function loadEntries(lang) {
        if (lang === "en") return Promise.resolve({ language: "en", entries: {} });
        if (cache[lang]) return Promise.resolve({ language: lang, entries: cache[lang] });
        return fetch("/Language/Entries?lang=" + encodeURIComponent(lang), {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) throw new Error("lang");
            return response.json();
        }).then(function (data) {
            cache[data.language] = data.entries || {};
            return data;
        });
    }

    function persistLanguage(lang) {
        return fetch("/Language/Set", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "RequestVerificationToken": csrfToken(),
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({ language: lang })
        }).catch(function () {});
    }

    function translateElement(el, targetLang) {
        if (!el || el.nodeType !== 1) return;
        var tag = el.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "svg" || tag === "code" || tag === "pre") return;

        // 1. Check data-i18n attribute
        var i18nAttr = el.getAttribute("data-i18n");
        if (i18nAttr) {
            var trans = (targetLang === "en") ? i18nAttr : translateText(i18nAttr, targetLang);
            if (trans && el.children.length === 0 && el.textContent !== trans) {
                el.textContent = trans;
            }
        }

        // 2. Check input/textarea placeholders
        if (tag === "input" || tag === "textarea") {
            var ph = el.getAttribute("placeholder");
            if (ph) {
                if (!el.hasAttribute("data-i18n-ph-key")) {
                    el.setAttribute("data-i18n-ph-key", ph);
                }
                var phKey = el.getAttribute("data-i18n-ph-key");
                var phTrans = (targetLang === "en") ? phKey : translateText(phKey, targetLang);
                if (phTrans && el.getAttribute("placeholder") !== phTrans) {
                    el.setAttribute("placeholder", phTrans);
                }
            }
        }

        // 3. Check data-i18n-placeholder
        var phCustom = el.getAttribute("data-i18n-placeholder");
        if (phCustom) {
            var phTrans2 = (targetLang === "en") ? phCustom : translateText(phCustom, targetLang);
            if (phTrans2) el.setAttribute("placeholder", phTrans2);
        }

        // 4. Translate direct text nodes (safely without breaking nested icons/elements)
        var childNodes = el.childNodes;
        for (var i = 0; i < childNodes.length; i++) {
            var node = childNodes[i];
            if (node.nodeType === 3) { // TEXT_NODE
                var text = node.nodeValue;
                var trimmed = text.trim();
                if (!trimmed || trimmed.length < 2) continue;

                var origKey = node._originalKey;
                if (!origKey) {
                    if (DICT[trimmed]) {
                        origKey = trimmed;
                        node._originalKey = trimmed;
                    }
                }

                if (origKey) {
                    var newText = (targetLang === "en") ? origKey : translateText(origKey, targetLang);
                    if (newText && newText !== trimmed) {
                        var leading = text.match(/^\s*/)[0];
                        var trailing = text.match(/\s*$/)[0];
                        node.nodeValue = leading + newText + trailing;
                    }
                }
            }
        }
    }

    function translateTree(root, targetLang) {
        if (!root) return;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
        var current = walker.currentNode;
        while (current) {
            translateElement(current, targetLang);
            current = walker.nextNode();
        }
    }

    function syncLanguageUI(lang) {
        var info = FLAG_MAP[lang] || FLAG_MAP["en"];

        // 1. Update flag in settings input field
        var fieldFlag = document.getElementById("lang-field-flag");
        if (fieldFlag) {
            fieldFlag.src = "https://flagcdn.com/w40/" + info.flag + ".png";
        }

        // 2. Update search input in settings
        var langSearch = document.getElementById("lang-search");
        if (langSearch) {
            langSearch.value = info.native;
        }

        // 3. Update active item in settings lang list
        var langList = document.getElementById("lang-select-list");
        if (langList) {
            var buttons = langList.querySelectorAll("button");
            for (var b = 0; b < buttons.length; b++) {
                var btnFlag = buttons[b].getAttribute("data-flag");
                var isMatch = btnFlag === info.flag;
                buttons[b].classList.toggle("on", isMatch);
            }
        }
    }

    function render(lang, entries) {
        current = lang;
        DICT = entries || {};
        document.documentElement.lang = lang;
        translateTree(document.body, lang);
        syncLanguageUI(lang);
        window.dispatchEvent(new CustomEvent("discode:langchange", { detail: { lang: lang } }));
    }

    function applyLanguage(lang, persist) {
        if (!lang) lang = current;
        if (LANGS.indexOf(lang) === -1) lang = "en";
        if (persist && lang !== current) persistLanguage(lang);
        return loadEntries(lang).then(function (data) {
            render(data.language, data.entries);
        }).catch(function () {
            render(current, DICT);
        });
    }

    function startUp() {
        return fetch("/Language/Entries", {
            credentials: "same-origin",
            headers: { "X-Requested-With": "XMLHttpRequest" }
        }).then(function (response) {
            if (!response.ok) throw new Error("lang");
            return response.json();
        }).then(function (data) {
            cache[data.language] = data.entries || {};
            render(data.language, data.entries);
        }).catch(function () {});
    }

    function bindLangControls() {
        var langSearch = document.getElementById("lang-search");
        var langList = document.getElementById("lang-select-list");
        var langBox = langSearch ? langSearch.closest(".lang-box") : null;
        var langChevron = document.getElementById("lang-chevron");

        if (langList) {
            function setListOpen(open) {
                langList.hidden = !open;
                if (langBox) langBox.classList.toggle("open", open);
                if (langChevron) langChevron.className = "fa-solid " + (open ? "fa-chevron-up" : "fa-chevron-down");
            }

            var langField = langSearch ? langSearch.closest(".lang-field") : null;
            if (langField) {
                langField.addEventListener("click", function (e) {
                    if (langList.contains(e.target)) return;
                    setListOpen(langList.hidden);
                });
            }

            langList.addEventListener("click", function (e) {
                var btn = e.target.closest("button");
                if (!btn) return;
                var flag = btn.getAttribute("data-flag");
                var code = flag === "tr" ? "tr" : (flag === "az" ? "az" : "en");
                setListOpen(false);
                applyLanguage(code, true);
            });

            document.addEventListener("click", function (e) {
                if (langBox && !langBox.contains(e.target) && !langList.hidden) {
                    setListOpen(false);
                }
            });
        }
    }

    function setupObserver() {
        if (typeof MutationObserver === "undefined" || !document.body) return;
        var observer = new MutationObserver(function (mutations) {
            var cur = getSavedLang();
            if (cur === "en") return;
            for (var i = 0; i < mutations.length; i++) {
                var mut = mutations[i];
                if (mut.addedNodes && mut.addedNodes.length > 0) {
                    for (var n = 0; n < mut.addedNodes.length; n++) {
                        var node = mut.addedNodes[n];
                        if (node.nodeType === 1) {
                            translateTree(node, cur);
                        }
                    }
                }
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    window.DiscodeLang = {
        get: getSavedLang,
        set: function (code) {
            return applyLanguage(code, true);
        },
        t: function (key) {
            return translateText(key, getSavedLang());
        },
        apply: function () {
            render(current, DICT);
        },
        rebind: function () {
            bindLangControls();
            render(current, DICT);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            bindLangControls();
            setupObserver();
            startUp();
        });
    } else {
        bindLangControls();
        setupObserver();
        startUp();
    }
})();
