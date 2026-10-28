"use strict";

(function () {
var POLL_EMOJIS = ["😀", "😂", "😍", "😎", "🤔", "😢", "😡", "👍", "👎", "👏", "🙏", "🔥", "❤️", "💯", "🎉", "✅", "❌", "⭐", "🍕", "🍔", "🍟", "🍺", "☕", "🎮", "🎵", "🎬", "⚽", "🏀", "🚗", "✈️", "🏠", "🌍", "🌙", "☀️", "🐶", "🐱", "🦁", "🌹", "💎", "🎁"];
var regionNames = null;

var FLAG_LABELS = {
    "🏁": "Chequered flag",
    "🚩": "Triangular flag",
    "🎌": "Crossed flags",
    "🏴": "Black flag",
    "🏳️": "White flag",
    "🏳️‍🌈": "Rainbow flag",
    "🏳️‍⚧️": "Transgender flag",
    "🏴‍☠️": "Pirate flag",
    "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "England",
    "🏴󠁧󠁢󠁳󠁣󠁴󠁿": "Scotland",
    "🏴󠁧󠁢󠁷󠁬󠁳󠁿": "Wales"
};

var FLAG_RE = /\uD83C\uDFF4(?:\uDB40[\uDC00-\uDCFF])+\uDB40\uDC7F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83C\uDFF3\uFE0F\u200D\u26A7\uFE0F|\uD83C\uDFF4\u200D\u2620\uFE0F|\uD83C[\uDDE6-\uDDFF]\uD83C[\uDDE6-\uDDFF]|\uD83C\uDFC1|\uD83D\uDEA9|\uD83C\uDF8C|\uD83C\uDFF4|\uD83C\uDFF3\uFE0F?/g;

function flagCode(emoji) {
    var chars = Array.from(emoji);
    if (chars.length !== 2) return "";
    var first = chars[0].codePointAt(0);
    var second = chars[1].codePointAt(0);
    if (first < 0x1F1E6 || first > 0x1F1FF || second < 0x1F1E6 || second > 0x1F1FF) return "";
    return String.fromCharCode(first - 0x1F1E6 + 65, second - 0x1F1E6 + 65);
}

function countryLabel(emoji) {
    if (FLAG_LABELS[emoji]) return FLAG_LABELS[emoji];
    var code = flagCode(emoji);
    if (!code) return "";
    if (!regionNames) regionNames = new Intl.DisplayNames(["tr"], { type: "region" });
    return regionNames.of(code) || code;
}

function flagSrc(emoji) {
    var code = flagCode(emoji);
    if (!code) return "";
    return "https://flagcdn.com/w80/" + code.toLowerCase() + ".png";
}

function twemojiSrc(emoji) {
    var text = emoji.indexOf("\u200D") < 0 ? emoji.replace(/\uFE0F/g, "") : emoji;
    var parts = [];
    Array.from(text).forEach(function (ch) {
        parts.push(ch.codePointAt(0).toString(16));
    });
    return "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/" + parts.join("-") + ".png";
}

function flagPicture(emoji) {
    if (flagCode(emoji)) return flagSrc(emoji);
    return twemojiSrc(emoji);
}

function fieldValue(el) {
    var parts = [];
    function walk(node) {
        node.childNodes.forEach(function (child) {
            if (child.nodeType === 3) parts.push(child.textContent);
            else if (child.nodeName === "IMG") parts.push(child.getAttribute("data-emoji") || "");
            else if (child.nodeName === "BR") parts.push("\n");
            else if (child.nodeType === 1) {
                if (/^(DIV|P)$/.test(child.nodeName) && parts.length && parts[parts.length - 1] !== "\n") parts.push("\n");
                walk(child);
            }
        });
    }
    walk(el);
    return parts.join("");
}

function nodesForText(text) {
    var nodes = [];
    var last = 0;
    FLAG_RE.lastIndex = 0;
    text.replace(FLAG_RE, function (flag, index) {
        if (index > last) nodes.push(document.createTextNode(text.slice(last, index)));
        var img = document.createElement("img");
        img.className = "flag-img";
        img.alt = countryLabel(flag) || "";
        img.title = countryLabel(flag) || "";
        img.setAttribute("data-emoji", flag);
        img.src = flagPicture(flag);
        if (flagCode(flag)) {
            img.onerror = function () {
                img.onerror = null;
                img.src = twemojiSrc(flag);
            };
        }
        img.setAttribute("contenteditable", "false");
        nodes.push(img);
        last = index + flag.length;
        return flag;
    });
    if (last < text.length) nodes.push(document.createTextNode(text.slice(last)));
    FLAG_RE.lastIndex = 0;
    return nodes;
}


function dmFileKind(type, name) {
    var kind = String(type || "").toLowerCase();
    var ext = (String(name || "").split(".").pop() || "").toLowerCase();
    if (kind.indexOf("image/") === 0 && ext !== "svg") return "image";
    if (kind.indexOf("video/") === 0) return "video";
    if (kind.indexOf("audio/") === 0) return "audio";
    return "file";
}

function dmFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (Math.round(bytes / 102.4) / 10) + " KB";
    return (Math.round(bytes / 104857.6) / 10) + " MB";
}

function dmBuildAttachments(list) {
    var holder = document.createElement("div");
    holder.className = "dm-attachments";
    list.forEach(function (item) {
        var kind = dmFileKind(item.contentType, item.fileName);
        var node;
        if (kind === "image") {
            node = document.createElement("a");
            node.className = "dm-att-media";
            node.href = item.url;
            node.target = "_blank";
            node.rel = "noopener";
            node.setAttribute("data-att", "image");
            var picture = document.createElement("img");
            picture.src = item.url;
            picture.alt = item.fileName;
            picture.loading = "lazy";
            node.appendChild(picture);
        } else if (kind === "video") {
            node = document.createElement("video");
            node.className = "dm-att-video";
            node.src = item.url;
            node.controls = true;
            node.preload = "metadata";
        } else if (kind === "audio") {
            node = document.createElement("div");
            node.className = "dm-att-audio";
            var label = document.createElement("span");
            label.textContent = item.fileName;
            var player = document.createElement("audio");
            player.src = item.url;
            player.controls = true;
            player.preload = "metadata";
            node.appendChild(label);
            node.appendChild(player);
        } else {
            node = document.createElement("a");
            node.className = "dm-att-file";
            node.href = item.url;
            node.setAttribute("download", item.fileName);
            node.target = "_blank";
            node.rel = "noopener";
            node.innerHTML = '<i class="fa-solid fa-file-lines"></i><span class="dm-att-info"><strong></strong><small></small></span><i class="fa-solid fa-download"></i>';
            node.querySelector("strong").textContent = item.fileName;
            node.querySelector("small").textContent = dmFileSize(item.size);
        }
        holder.appendChild(node);
    });
    return holder;
}

function dmPollStamp(poll) {
    var text = String(poll.expiresAt || "");
    return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(text) ? text : text + "Z");
}

function dmPollSpan(poll) {
    var left = dmPollStamp(poll) - Date.now();
    if (poll.ended || left <= 0) return "Poll closed";
    var minutes = Math.ceil(left / 60000);
    if (minutes >= 2880) return Math.floor(minutes / 1440) + "d left";
    if (minutes >= 60) return Math.floor(minutes / 60) + "h left";
    return Math.max(1, minutes) + "m left";
}

function dmPollEnded(poll) {
    return !!poll.ended || dmPollStamp(poll) <= Date.now();
}

function dmPollVotes(count) {
    return count + (count === 1 ? " vote" : " votes");
}

function dmRenderPoll(card) {
    var poll = card._poll;
    var ended = dmPollEnded(poll);
    var results = poll.voted || ended || card._results;
    var multiple = poll.allowMultiple;
    card.textContent = "";
    var title = document.createElement("strong");
    title.className = "dm-poll-question";
    title.textContent = poll.question;
    var hint = document.createElement("span");
    hint.className = "dm-poll-hint";
    hint.textContent = multiple ? "Select one or more answers" : "Select one answer";
    card.appendChild(title);
    card.appendChild(hint);
    var list = document.createElement("div");
    list.className = "dm-poll-options";
    var top = 0;
    poll.options.forEach(function (option) { if (option.votes > top) top = option.votes; });
    poll.options.forEach(function (option) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "dm-poll-option" + (results ? " is-result" : "") + (results && option.voted ? " is-mine" : "") + (!results && card._selected.indexOf(option.id) !== -1 ? " is-selected" : "");
        row.disabled = results;
        if (results) {
            var percent = poll.totalVoters ? Math.round(option.votes * 100 / poll.totalVoters) : 0;
            var fill = document.createElement("span");
            fill.className = "dm-poll-fill";
            fill.style.width = percent + "%";
            row.appendChild(fill);
        }
        var label = document.createElement("span");
        label.className = "dm-poll-label-text";
        if (option.emoji) {
            var face = document.createElement("span");
            face.className = "dm-poll-emoji";
            face.textContent = option.emoji;
            label.appendChild(face);
        }
        var text = document.createElement("span");
        text.textContent = option.text;
        label.appendChild(text);
        row.appendChild(label);
        if (results) {
            var stats = document.createElement("span");
            stats.className = "dm-poll-stats";
            stats.innerHTML = "<small></small><b></b>";
            stats.querySelector("small").textContent = dmPollVotes(option.votes);
            stats.querySelector("b").textContent = (poll.totalVoters ? Math.round(option.votes * 100 / poll.totalVoters) : 0) + "%";
            row.appendChild(stats);
            if (option.voted) {
                var tick = document.createElement("span");
                tick.className = "dm-poll-tick";
                tick.innerHTML = '<i class="fa-solid fa-check"></i>';
                row.appendChild(tick);
            }
        } else {
            var box = document.createElement("span");
            box.className = "dm-poll-box" + (multiple ? "" : " is-round");
            box.innerHTML = '<i class="fa-solid fa-check"></i>';
            row.appendChild(box);
            row.addEventListener("click", function () {
                var at = card._selected.indexOf(option.id);
                if (multiple) {
                    if (at === -1) card._selected.push(option.id);
                    else card._selected.splice(at, 1);
                } else {
                    card._selected = at === -1 ? [option.id] : [];
                }
                dmRenderPoll(card);
            });
        }
        list.appendChild(row);
    });
    card.appendChild(list);
    var foot = document.createElement("div");
    foot.className = "dm-poll-foot-row";
    var meta = document.createElement("span");
    meta.className = "dm-poll-meta";
    meta.innerHTML = "<b></b><i></i><span></span>";
    meta.querySelector("b").textContent = dmPollVotes(poll.totalVoters);
    meta.querySelector("i").textContent = "•";
    meta.querySelector("span").textContent = dmPollSpan(poll);
    foot.appendChild(meta);
    var actions = document.createElement("span");
    actions.className = "dm-poll-actions";
    var button = function (label, cls, handler, disabled) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = cls;
        item.textContent = label;
        item.disabled = !!disabled;
        item.addEventListener("click", handler);
        actions.appendChild(item);
    };
    if (!ended) {
        if (poll.voted) {
            button("Remove Vote", "dm-poll-secondary", function () { pollSend(card, []); });
        } else if (card._results) {
            button("Back", "dm-poll-link", function () { card._results = false; dmRenderPoll(card); });
        } else {
            button("Show results", "dm-poll-link", function () { card._results = true; dmRenderPoll(card); });
            button("Vote", "dm-poll-vote", function () { pollSend(card, card._selected.slice()); }, card._selected.length === 0);
        }
    }
    foot.appendChild(actions);
    card.appendChild(foot);
}

var ctx = null;
var files = [];
var fileCounter = 0;
var MAX_FILES = 10;
var MAX_BYTES = 25 * 1024 * 1024;
var emojiField = null;
var savedRange = null;
var picker = { row: null };

function token() {
    var field = document.querySelector("input[name='__RequestVerificationToken']");
    return field ? field.value : "";
}

function setEmpty(el) {
    var empty = !fieldValue(el).replace(/\n/g, "").trim();
    var hint = document.getElementById("group-placeholder");
    if (hint) hint.hidden = !empty;
    var focused = document.activeElement === el;
    el.setAttribute("data-empty", empty && !focused ? "1" : "0");
    if (empty && !focused) while (el.firstChild) el.removeChild(el.firstChild);
}

function rememberCaret() {
    var sel = window.getSelection();
    if (!sel.rangeCount || !ctx.input.contains(sel.anchorNode)) return;
    savedRange = sel.getRangeAt(0).cloneRange();
}

function insertNodes(field, nodes) {
    field.focus();
    var sel = window.getSelection();
    var range = savedRange && field.contains(savedRange.startContainer) ? savedRange : null;
    if (!range) {
        range = document.createRange();
        range.selectNodeContents(field);
        range.collapse(false);
    }
    range.deleteContents();
    nodes.forEach(function (node) {
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
    });
    sel.removeAllRanges();
    sel.addRange(range);
    savedRange = range.cloneRange();
    setEmpty(field);
}

function renderTray() {
    var tray = document.getElementById("group-attach-tray");
    if (!tray) return;
    tray.textContent = "";
    tray.hidden = files.length === 0;
    files.forEach(function (item) {
        var card = document.createElement("div");
        card.className = "dm-attach-item is-" + item.state;
        var thumb = document.createElement("div");
        thumb.className = "dm-attach-thumb";
        if (item.previewUrl) {
            var preview = document.createElement("img");
            preview.src = item.previewUrl;
            preview.alt = "";
            thumb.appendChild(preview);
        } else {
            var kind = dmFileKind(item.type, item.name);
            thumb.innerHTML = '<i class="fa-solid ' + (kind === "video" ? "fa-film" : kind === "audio" ? "fa-music" : "fa-file-lines") + '"></i>';
        }
        var name = document.createElement("span");
        name.className = "dm-attach-name";
        name.textContent = item.name;
        name.title = item.name;
        var info = document.createElement("small");
        info.textContent = item.state === "error" ? item.error : (item.state === "uploading" ? "Uploading..." : dmFileSize(item.size));
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "dm-attach-remove";
        remove.setAttribute("aria-label", "Remove");
        remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        remove.addEventListener("click", function () {
            files = files.filter(function (other) { return other.id !== item.id; });
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            renderTray();
        });
        card.appendChild(thumb);
        card.appendChild(name);
        card.appendChild(info);
        card.appendChild(remove);
        tray.appendChild(card);
    });
}

function uploadFile(item) {
    var form = new FormData();
    form.append("file", item.file, item.name);
    return fetch("/Dm/UploadAttachment", {
        method: "POST",
        credentials: "same-origin",
        headers: { "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
        body: form
    }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok) throw new Error((data && data.errors && data.errors[0]) || "Could not upload the file.");
            return data;
        });
    }).then(function (data) {
        item.data = { url: data.url, fileName: data.fileName, contentType: data.contentType, size: data.size };
        item.state = "ready";
        item.file = null;
    }).catch(function (error) {
        item.state = "error";
        item.error = error.message;
    }).then(renderTray);
}

function addFiles(list) {
    list = [].slice.call(list || []);
    for (var i = 0; i < list.length; i++) {
        var file = list[i];
        if (files.length >= MAX_FILES) {
            ctx.showError("You can send at most " + MAX_FILES + " files at once.");
            break;
        }
        if (file.size > MAX_BYTES) {
            ctx.showError(file.name + " is larger than 25 MB.");
            continue;
        }
        var item = {
            id: ++fileCounter,
            name: file.name || "file",
            size: file.size,
            type: file.type,
            file: file,
            previewUrl: dmFileKind(file.type, file.name) === "image" ? URL.createObjectURL(file) : "",
            state: "uploading",
            data: null,
            error: ""
        };
        files.push(item);
        uploadFile(item);
    }
    renderTray();
}

function takeFiles() {
    if (files.some(function (item) { return item.state === "uploading"; })) return null;
    var ready = files.filter(function (item) { return item.state === "ready"; });
    files = files.filter(function (item) { return item.state !== "ready"; });
    renderTray();
    return ready;
}

function giveBack(ready) {
    files = ready.concat(files);
    renderTray();
}

function pollSend(card, optionIds) {
    if (card._busy) return;
    card._busy = true;
    var row = card.closest(".dm-msg");
    var messageId = Number(row.getAttribute("data-id"));
    var voting = ctx.votePoll ? ctx.votePoll(messageId, optionIds) : ctx.request("/Group/VotePoll", "POST", { id: ctx.groupId, messageId: messageId, optionIds: optionIds });
    voting.then(function (message) {
        card._poll = message.poll;
        card._results = false;
        card._selected = [];
    }).catch(function (error) {
        ctx.showError(error.message);
    }).then(function () {
        card._busy = false;
        dmRenderPoll(card);
    });
}

function mountPoll(card, poll) {
    card._poll = poll;
    card._results = false;
    card._selected = poll.options.filter(function (option) { return option.voted; }).map(function (option) { return option.id; });
    dmRenderPoll(card);
}

function renderReactions(row, reactions) {
    var body = row.querySelector(".dm-msg-body");
    var box = body.querySelector(".dm-reactions");
    if (!reactions || reactions.length === 0) {
        if (box) box.remove();
        return;
    }
    if (!box) {
        box = document.createElement("div");
        box.className = "dm-reactions";
        body.appendChild(box);
    }
    while (box.firstChild) box.removeChild(box.firstChild);
    reactions.forEach(function (reaction) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "dm-reaction" + (reaction.reacted ? " mine" : "");
        chip.setAttribute("data-emoji", reaction.emoji);
        chip.setAttribute("aria-pressed", reaction.reacted ? "true" : "false");
        var face = document.createElement("span");
        face.className = "dm-reaction-emoji";
        nodesForText(reaction.emoji).forEach(function (node) { face.appendChild(node); });
        var count = document.createElement("span");
        count.className = "dm-reaction-count";
        count.textContent = String(reaction.count);
        chip.appendChild(face);
        chip.appendChild(count);
        box.appendChild(chip);
    });
    var add = document.createElement("button");
    add.type = "button";
    add.className = "dm-reaction-add emoji-open";
    add.setAttribute("data-act", "reaction-add");
    add.setAttribute("aria-label", "Add reaction");
    add.innerHTML = '<i class="fa-regular fa-face-smile"></i>';
    box.appendChild(add);
}

function react(row, emoji) {
    ctx.showError("");
    var messageId = Number(row.getAttribute("data-id"));
    var sending = ctx.call ? ctx.call("react", { messageId: messageId, emoji: emoji }) : ctx.request("/Group/React", "POST", { id: ctx.groupId, messageId: messageId, emoji: emoji });
    sending.then(function (message) {
        renderReactions(row, message.reactions || []);
    }).catch(function (error) {
        ctx.showError(error.message);
    });
}

function messageTools(mine) {
    var tools = document.createElement("div");
    tools.className = "dm-msg-tools";
    tools.setAttribute("role", "toolbar");
    tools.setAttribute("aria-label", "Message actions");
    tools.innerHTML =
        '<button type="button" class="dm-react" data-act="react" aria-label="React with heart">❤️</button>' +
        '<button type="button" class="dm-react" data-act="react" aria-label="React with 100">💯</button>' +
        '<button type="button" class="dm-react" data-act="react" aria-label="React with laughing">😆</button>' +
        '<span class="dm-tools-sep"></span>' +
        '<button type="button" class="emoji-open" data-act="picker" aria-label="Add reaction"><i class="fa-regular fa-face-smile"></i></button>' +
        (mine ? '' : '<button type="button" data-act="reply" aria-label="Reply"><i class="fa-solid fa-reply"></i></button>') +
        (ctx.noForward ? '' : '<button type="button" data-act="forward" aria-label="Forward"><i class="fa-solid fa-share"></i></button>') +
        (mine || ctx.canDeleteAny ? '<button type="button" class="dm-tool-delete" data-act="delete" aria-label="Delete"><i class="fa-solid fa-trash-can"></i></button>' : '') +
        '<button type="button" data-act="more" aria-label="More"><i class="fa-solid fa-ellipsis"></i></button>';
    return tools;
}

function emojiPanel() {
    return document.getElementById("emoji-panel");
}

function closePanel() {
    emojiField = null;
    picker.row = null;
    emojiPanel().hidden = true;
}

function fillPanel() {
    var panel = emojiPanel();
    if (panel.childElementCount || typeof fillEmojiPanel !== "function") return;
    fillEmojiPanel(panel, "emoji", function (choice, emoji) {
        var img = choice.querySelector("img");
        if (!img) return;
        img.alt = countryLabel(emoji) || "";
        img.src = flagCode(emoji) ? flagSrc(emoji) : twemojiSrc(emoji);
        if (flagCode(emoji)) {
            img.onerror = function () {
                img.onerror = null;
                img.src = twemojiSrc(emoji);
            };
        }
    });
}

function openInputPanel(button) {
    var panel = emojiPanel();
    if (emojiField && !panel.hidden) {
        closePanel();
        return;
    }
    picker.row = null;
    emojiField = ctx.input;
    fillPanel();
    var box = ctx.compose;
    panel.style.position = "";
    panel.style.right = "";
    panel.style.bottom = "";
    panel.hidden = false;
    var buttonBox = button.getBoundingClientRect();
    var boxRect = box.getBoundingClientRect();
    var left = buttonBox.right - boxRect.left - panel.offsetWidth;
    if (left < 8) left = 8;
    panel.style.left = left + "px";
    panel.style.top = (buttonBox.top - boxRect.top - panel.offsetHeight - 8) + "px";
}

function openReactionPanel(anchor, row) {
    var panel = emojiPanel();
    if (!panel.hidden && picker.row === row) {
        closePanel();
        return;
    }
    emojiField = null;
    picker.row = row;
    fillPanel();
    panel.hidden = false;
    panel.style.position = "fixed";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    var rect = anchor.getBoundingClientRect();
    var width = panel.offsetWidth || 340;
    var height = panel.offsetHeight || 300;
    var left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    var top = rect.top - height - 8;
    if (top < 8) top = Math.min(rect.bottom + 8, window.innerHeight - height - 8);
    panel.style.left = left + "px";
    panel.style.top = Math.max(8, top) + "px";
}

function bindEmoji() {
    var panel = emojiPanel();
    var button = document.getElementById("group-emoji");
    button.addEventListener("mousedown", function (event) {
        event.preventDefault();
        rememberCaret();
    });
    button.addEventListener("click", function (event) {
        event.stopPropagation();
        openInputPanel(button);
    });
    panel.addEventListener("mousedown", function (event) {
        if (event.target.closest(".emoji-choice")) event.preventDefault();
    });
    panel.addEventListener("click", function (event) {
        event.stopPropagation();
        var tab = event.target.closest("[data-emoji-tab]");
        if (tab) {
            var scroller = panel.querySelector(".emoji-scroll");
            var section = document.getElementById("emoji-" + tab.getAttribute("data-emoji-tab"));
            if (section) scroller.scrollTop = section.offsetTop;
            var tabs = panel.querySelectorAll("[data-emoji-tab]");
            for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i] === tab);
            return;
        }
        var choice = event.target.closest(".emoji-choice");
        if (!choice) return;
        var emoji = choice.getAttribute("data-emoji") || choice.textContent;
        if (picker.row) react(picker.row, emoji);
        else if (emojiField) insertNodes(emojiField, nodesForText(emoji));
        closePanel();
    });
    document.addEventListener("click", function (event) {
        if (!panel.hidden && !event.target.closest("#emoji-panel, .emoji-open, .dm-reaction-add")) closePanel();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !panel.hidden) closePanel();
    });
    document.addEventListener("selectionchange", function () {
        if (document.activeElement === ctx.input) rememberCaret();
    });
}

function bindAttach() {
    var button = document.getElementById("group-attach");
    var input = document.getElementById("group-file");
    var menu = document.getElementById("group-attach-menu");
    var tray = document.createElement("div");
    tray.id = "group-attach-tray";
    tray.className = "dm-attach-tray";
    tray.hidden = true;
    ctx.compose.parentNode.insertBefore(tray, ctx.compose);
    var closeMenu = function () {
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
    };
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = menu.hidden;
        menu.hidden = !open;
        button.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (event) {
        var item = event.target.closest("button[data-act]");
        if (!item) return;
        closeMenu();
        if (item.getAttribute("data-act") === "upload") input.click();
        else document.dispatchEvent(new CustomEvent("discode-group-poll"));
    });
    document.addEventListener("click", function (event) {
        if (!menu.hidden && !event.target.closest("#group-attach-menu")) closeMenu();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !menu.hidden) closeMenu();
    });
    input.addEventListener("change", function () {
        addFiles(input.files);
        input.value = "";
    });
    var chat = ctx.dropZone || document.querySelector(".group-chat");
    chat.addEventListener("dragover", function (event) {
        if (event.dataTransfer && [].indexOf.call(event.dataTransfer.types || [], "Files") !== -1) {
            event.preventDefault();
            chat.classList.add("is-dropping");
        }
    });
    chat.addEventListener("dragleave", function (event) {
        if (!chat.contains(event.relatedTarget)) chat.classList.remove("is-dropping");
    });
    chat.addEventListener("drop", function (event) {
        chat.classList.remove("is-dropping");
        if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return;
        event.preventDefault();
        addFiles(event.dataTransfer.files);
    });
    ctx.input.addEventListener("paste", function (event) {
        var pasted = event.clipboardData && event.clipboardData.files;
        if (pasted && pasted.length) {
            event.preventDefault();
            addFiles(pasted);
        }
    });
    document.addEventListener("click", function (event) {
        var link = event.target.closest && event.target.closest("a.dm-att-media");
        if (!link || !ctx.box.contains(link) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault();
        var overlay = document.createElement("div");
        overlay.className = "dm-lightbox";
        var big = document.createElement("img");
        big.src = link.href;
        big.alt = "";
        overlay.appendChild(big);
        var close = function () {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            document.removeEventListener("keydown", onKey);
        };
        var onKey = function (e) {
            if (e.key === "Escape") close();
        };
        overlay.addEventListener("click", close);
        document.addEventListener("keydown", onKey);
        document.body.appendChild(overlay);
    });
}

function bindPoll() {
    var modal = document.getElementById("group-poll-modal");
    var list = document.getElementById("group-poll-answers");
    var question = document.getElementById("group-poll-question");
    var emojis = document.getElementById("group-poll-emojis");
    var errorBox = document.getElementById("group-poll-error");
    var activeRow = null;

    var fail = function (text) {
        errorBox.textContent = text || "";
        errorBox.hidden = !text;
    };
    var refresh = function () {
        document.getElementById("group-poll-add").hidden = list.children.length >= 10;
        [].forEach.call(list.querySelectorAll(".dm-poll-trash"), function (trash) {
            trash.disabled = list.children.length <= 2;
        });
    };
    var addAnswer = function () {
        if (list.children.length >= 10) return;
        var row = document.createElement("div");
        row.className = "dm-poll-answer";
        row.innerHTML = '<button type="button" class="dm-poll-face" aria-label="Choose an emoji"><i class="fa-regular fa-face-smile"></i></button>' +
            '<input type="text" maxlength="55" placeholder="Type your answer" autocomplete="off">' +
            '<button type="button" class="dm-poll-trash" aria-label="Remove answer"><i class="fa-solid fa-trash-can"></i></button>';
        list.appendChild(row);
        refresh();
    };
    var closeEmojis = function () {
        emojis.hidden = true;
        activeRow = null;
    };
    var open = function () {
        question.value = "";
        document.getElementById("group-poll-count").textContent = "0";
        document.getElementById("group-poll-duration").value = "24";
        document.getElementById("group-poll-multiple").checked = false;
        list.textContent = "";
        addAnswer();
        addAnswer();
        fail("");
        closeEmojis();
        modal.hidden = false;
        question.focus();
    };
    var close = function () {
        modal.hidden = true;
        closeEmojis();
    };

    emojis.innerHTML = '<button type="button" class="dm-poll-emoji-clear">No emoji</button>';
    POLL_EMOJIS.forEach(function (emoji) {
        var item = document.createElement("button");
        item.type = "button";
        item.textContent = emoji;
        emojis.appendChild(item);
    });
    emojis.addEventListener("click", function (event) {
        var item = event.target.closest("button");
        if (!item || !activeRow) return;
        var face = activeRow.querySelector(".dm-poll-face");
        var clear = item.classList.contains("dm-poll-emoji-clear");
        face.setAttribute("data-emoji", clear ? "" : item.textContent);
        face.innerHTML = clear ? '<i class="fa-regular fa-face-smile"></i>' : "";
        if (!clear) face.textContent = item.textContent;
        closeEmojis();
    });
    list.addEventListener("click", function (event) {
        var trash = event.target.closest(".dm-poll-trash");
        if (trash && list.children.length > 2) {
            trash.closest(".dm-poll-answer").remove();
            refresh();
            return;
        }
        var face = event.target.closest(".dm-poll-face");
        if (face) {
            event.stopPropagation();
            activeRow = face.closest(".dm-poll-answer");
            var card = modal.querySelector(".dm-poll-card").getBoundingClientRect();
            var at = face.getBoundingClientRect();
            emojis.style.left = Math.max(8, at.left - card.left) + "px";
            emojis.style.top = (at.bottom - card.top + 6) + "px";
            emojis.hidden = false;
        }
    });
    document.getElementById("group-poll-add").addEventListener("click", addAnswer);
    question.addEventListener("input", function () {
        document.getElementById("group-poll-count").textContent = String(question.value.length);
        fail("");
    });
    modal.addEventListener("click", function (event) {
        if (event.target.closest("[data-close]")) close();
        else if (!event.target.closest(".dm-poll-emojis")) closeEmojis();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) close();
    });
    document.addEventListener("discode-group-poll", open);

    document.getElementById("group-poll-post").addEventListener("click", function () {
        var options = [].map.call(list.querySelectorAll(".dm-poll-answer"), function (row) {
            return { text: row.querySelector("input").value.trim(), emoji: row.querySelector(".dm-poll-face").getAttribute("data-emoji") || "" };
        }).filter(function (option) { return option.text.length > 0; });
        if (!question.value.trim()) {
            fail("Ask a question.");
            return;
        }
        if (options.length < 2) {
            fail("Add at least two answers.");
            return;
        }
        fail("");
        var post = document.getElementById("group-poll-post");
        post.disabled = true;
        var poll = {
            question: question.value.trim(),
            allowMultiple: document.getElementById("group-poll-multiple").checked,
            durationHours: Number(document.getElementById("group-poll-duration").value),
            options: options
        };
        var creating = ctx.createPoll ? ctx.createPoll(poll) : ctx.request("/Group/CreatePoll", "POST", Object.assign({ id: ctx.groupId }, poll));
        creating.then(function (sent) {
            ctx.append(sent, true);
            close();
        }).catch(function (error) {
            fail(error.message);
        }).then(function () {
            post.disabled = false;
        });
    });
}

function bindMessages() {
    ctx.box.addEventListener("click", function (event) {
        var chip = event.target.closest(".dm-reaction");
        if (chip) {
            react(chip.closest(".dm-msg"), chip.getAttribute("data-emoji"));
            return;
        }
        var button = event.target.closest(".dm-msg-tools button, .dm-reaction-add");
        if (!button) return;
        var row = button.closest(".dm-msg");
        var act = button.getAttribute("data-act");
        if (act === "react") react(row, button.textContent.trim());
        else if (act === "picker" || act === "reaction-add") openReactionPanel(button, row);
        else if (act === "reply") startReply(row);
        else if (act === "forward") openForward(row);
        else if (act === "delete") deleteMessage(row);
        else if (act === "more") openMenu(button, row);
    });
    ctx.box.addEventListener("click", function (event) {
        var quote = event.target.closest(".dm-msg-reply");
        if (quote) jumpTo(quote.getAttribute("data-reply-id"));
    });
    ctx.box.addEventListener("contextmenu", function (event) {
        var row = event.target.closest(".dm-msg");
        if (!row || row.classList.contains("dm-call-msg") || event.target.closest("a, .dm-msg-tools")) return;
        event.preventDefault();
        openMenuAt(row, event.clientX, event.clientY);
    });
    document.addEventListener("contextmenu", function (event) {
        if (!event.target.closest("#group-msg-menu, #group-messages")) closeMenu();
    });
    var syncShift = function (event) {
        document.body.classList.toggle("dm-shift", !!event.shiftKey);
    };
    document.addEventListener("keydown", syncShift);
    document.addEventListener("keyup", syncShift);
    document.addEventListener("mousemove", syncShift);
    window.addEventListener("blur", function () {
        document.body.classList.remove("dm-shift");
    });
    document.getElementById("group-reply-cancel").addEventListener("click", cancelReply);
    bindMenu();
    bindForward();
}

function replyHeader(reply) {
    var header = document.createElement("div");
    header.className = "dm-msg-reply";
    header.setAttribute("data-reply-id", String(reply.messageId));
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    var face = document.createElement("img");
    face.className = "dm-reply-avatar";
    face.alt = "";
    face.src = reply.senderAvatarUrl || "/assets/img/img-icon-profile.jpeg";
    var who = document.createElement("strong");
    who.textContent = reply.senderDisplayName || reply.senderUserName;
    var text = document.createElement("span");
    text.className = "dm-reply-text";
    text.textContent = reply.text || "Click to see attachment";
    header.appendChild(face);
    header.appendChild(who);
    header.appendChild(text);
    return header;
}

function jumpTo(messageId) {
    var target = ctx.box.querySelector('.dm-msg[data-id="' + messageId + '"]');
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.add("is-flash");
    setTimeout(function () { target.classList.remove("is-flash"); }, 1600);
}

function messageText(row) {
    var holder = row.querySelector(".dm-msg-text");
    return holder ? fieldValue(holder) : "";
}

var reply = null;

function cancelReply() {
    if (!reply) return;
    var marked = ctx.box.querySelector(".dm-msg.is-replying");
    if (marked) marked.classList.remove("is-replying");
    reply = null;
    document.getElementById("group-reply-bar").hidden = true;
}

function startReply(row) {
    cancelReply();
    var head = row.querySelector(".dm-msg-head strong");
    reply = { id: Number(row.getAttribute("data-id")) };
    row.classList.add("is-replying");
    document.getElementById("group-reply-name").textContent = head ? head.textContent : "";
    document.getElementById("group-reply-bar").hidden = false;
    ctx.input.focus();
}

function regroup(row) {
    if (!row || !row.classList.contains("dm-msg") || row.classList.contains("dm-call-msg")) return;
    var before = row.previousElementSibling;
    var grouped = !!before && before.classList.contains("dm-msg") && !before.classList.contains("dm-call-msg") && !row.classList.contains("has-reply") &&
        before.getAttribute("data-sender") === row.getAttribute("data-sender") &&
        Number(row.getAttribute("data-time")) - Number(before.getAttribute("data-time")) < 5 * 60 * 1000;
    row.classList.toggle("compact", grouped);
}

function removeMessage(id) {
    var row = ctx.box.querySelector('.dm-msg[data-id="' + id + '"]');
    if (row) {
        var before = row.previousElementSibling;
        var after = row.nextElementSibling;
        row.remove();
        if (before && before.classList.contains("dm-divider") && !(after && after.classList.contains("dm-msg"))) before.remove();
        if (after && after.classList.contains("dm-msg")) regroup(after);
    }
    [].forEach.call(ctx.box.querySelectorAll('.dm-msg-reply[data-reply-id="' + id + '"]'), function (quote) {
        quote.parentNode.classList.remove("has-reply");
        quote.remove();
    });
    if (reply && reply.id === Number(id)) cancelReply();
}

function deleteMessage(row) {
    ctx.showError("");
    var messageId = Number(row.getAttribute("data-id"));
    var removing = ctx.call ? ctx.call("delete", { messageId: messageId }) : ctx.request("/Group/DeleteMessage", "POST", { id: ctx.groupId, messageId: messageId });
    removing.then(function () {
        removeMessage(row.getAttribute("data-id"));
    }).catch(function (error) {
        ctx.showError(error.message);
    });
}

function menuEl() {
    return document.getElementById("group-msg-menu");
}

function closeMenu() {
    var menu = menuEl();
    if (!menu) return;
    menu.hidden = true;
    menu.removeAttribute("data-row");
}

function showMenu(row) {
    var menu = menuEl();
    var mine = row.getAttribute("data-mine") === "1" || !!ctx.canDeleteAny;
    var gated = menu.querySelectorAll("[data-own-only]");
    for (var i = 0; i < gated.length; i++) gated[i].hidden = !mine;
    menu.setAttribute("data-row", row.getAttribute("data-id"));
    menu.hidden = false;
    return menu;
}

function openMenu(anchor, row) {
    var menu = menuEl();
    if (!menu.hidden && menu.getAttribute("data-row") === row.getAttribute("data-id")) {
        closeMenu();
        return;
    }
    showMenu(row);
    var rect = anchor.getBoundingClientRect();
    var width = menu.offsetWidth;
    var height = menu.offsetHeight;
    var left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    var top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
    menu.style.left = left + "px";
    menu.style.top = top + "px";
}

function openMenuAt(row, x, y) {
    if (picker.row) closePanel();
    var menu = showMenu(row);
    var width = menu.offsetWidth;
    var height = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - height - 8)) + "px";
}

function bindMenu() {
    var menu = menuEl();
    menu.addEventListener("click", function (event) {
        var item = event.target.closest("[data-menu], [data-act]");
        if (!item) return;
        var row = ctx.box.querySelector('.dm-msg[data-id="' + menu.getAttribute("data-row") + '"]');
        var action = item.getAttribute("data-menu");
        closeMenu();
        if (!row) return;
        if (item.getAttribute("data-act") === "react") react(row, item.textContent.trim());
        else if (action === "reply") startReply(row);
        else if (action === "forward") openForward(row);
        else if (action === "delete") deleteMessage(row);
        else if (action === "copy-text") {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(messageText(row)).catch(function () {});
        } else if (action === "reaction") openReactionPanel(row.querySelector('[data-act="picker"]') || row, row);
    });
    document.addEventListener("click", function (event) {
        if (!menu.hidden && !event.target.closest("#group-msg-menu, .dm-msg-tools")) closeMenu();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !menu.hidden) closeMenu();
    });
}

var forwardRow = null;

function forwardError(text) {
    var box = document.getElementById("group-forward-error");
    box.textContent = text || "";
    box.hidden = !text;
}

function closeForward() {
    document.getElementById("group-forward-modal").hidden = true;
    document.getElementById("group-forward-list").textContent = "";
    document.getElementById("group-forward-preview").textContent = "";
    document.getElementById("group-forward-search").value = "";
    document.getElementById("group-forward-note").value = "";
    forwardError("");
    forwardRow = null;
}

function openForward(row) {
    forwardRow = row;
    forwardError("");
    var preview = document.getElementById("group-forward-preview");
    preview.textContent = "";
    nodesForText(messageText(row)).forEach(function (node) { preview.appendChild(node); });
    var list = document.getElementById("group-forward-list");
    list.textContent = "";
    document.getElementById("group-forward-submit").disabled = true;
    document.getElementById("group-forward-modal").hidden = false;
    document.getElementById("group-forward-search").focus();
    fetch("/Dm/ForwardTargets", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
        if (!response.ok) throw new Error("targets");
        return response.text();
    }).then(function (html) {
        if (forwardRow !== row) return;
        list.innerHTML = html;
    }).catch(function () {
        forwardError("Could not load your friends. Try again.");
    });
}

function bindForward() {
    var modal = document.getElementById("group-forward-modal");
    var list = document.getElementById("group-forward-list");
    var submit = document.getElementById("group-forward-submit");
    modal.addEventListener("click", function (event) {
        if (event.target.closest("[data-close]")) closeForward();
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !modal.hidden) closeForward();
    });
    list.addEventListener("change", function () {
        submit.disabled = list.querySelectorAll(".dm-forward-check:checked").length === 0;
    });
    document.getElementById("group-forward-search").addEventListener("input", function () {
        var term = this.value.trim().toLowerCase();
        [].forEach.call(list.querySelectorAll(".dm-forward-item"), function (item) {
            item.hidden = term.length > 0 && item.getAttribute("data-name").indexOf(term) === -1 && item.getAttribute("data-key").toLowerCase().indexOf(term) === -1;
        });
    });
    submit.addEventListener("click", function () {
        var row = forwardRow;
        if (!row) return;
        var names = [];
        [].forEach.call(list.querySelectorAll(".dm-forward-check:checked"), function (box) { names.push(box.value); });
        if (names.length === 0) return;
        submit.disabled = true;
        forwardError("");
        ctx.request("/Group/ForwardMessage", "POST", {
            id: ctx.groupId,
            messageId: Number(row.getAttribute("data-id")),
            userNames: names,
            note: document.getElementById("group-forward-note").value.trim()
        }).then(closeForward).catch(function (error) {
            forwardError(error.message);
            submit.disabled = false;
        });
    });
}

window.GroupParts = {
    init: function (options) {
        ctx = options;
        bindEmoji();
        bindAttach();
        bindPoll();
        bindMessages();
        var placeholder = document.getElementById("group-placeholder");
        ctx.input.addEventListener("focus", function () { placeholder.hidden = true; });
        ctx.input.addEventListener("input", function () { setEmpty(this); });
        ctx.input.addEventListener("blur", function () { setEmpty(this); });
        ctx.input.addEventListener("paste", function (event) {
            if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length) return;
            event.preventDefault();
            var pasted = (event.clipboardData || window.clipboardData).getData("text") || "";
            document.execCommand("insertText", false, pasted);
        });
    },
    text: function () {
        return fieldValue(ctx.input).replace(/​/g, "").trim();
    },
    clear: function () {
        ctx.input.textContent = "";
        setEmpty(ctx.input);
    },
    restore: function (text) {
        ctx.input.textContent = "";
        nodesForText(text).forEach(function (node) { ctx.input.appendChild(node); });
        setEmpty(ctx.input);
    },
    replyId: function () { return reply ? reply.id : null; },
    cancelReply: cancelReply,
    remove: removeMessage,
    takeFiles: takeFiles,
    giveBack: giveBack,
    textNodes: nodesForText,
    decorate: function (row, body, message) {
        if (message.attachments && message.attachments.length) body.appendChild(dmBuildAttachments(message.attachments));
        if (message.isPoll && message.poll) {
            var card = document.createElement("div");
            card.className = "dm-poll";
            body.appendChild(card);
            mountPoll(card, message.poll);
            row.classList.add("is-poll");
        }
        if (message.replyTo) {
            row.insertBefore(replyHeader(message.replyTo), row.firstChild);
            row.classList.add("has-reply");
        }
        row.appendChild(messageTools(row.getAttribute("data-mine") === "1"));
        if (message.reactions && message.reactions.length) renderReactions(row, message.reactions);
    },
    update: function (message) {
        var row = ctx.box.querySelector('.dm-msg[data-id="' + message.id + '"]');
        if (!row) return;
        renderReactions(row, message.reactions || []);
        var card = row.querySelector(".dm-poll");
        if (card && message.poll) {
            card._poll = message.poll;
            dmRenderPoll(card);
        }
    }
};

setInterval(function () {
    [].forEach.call(document.querySelectorAll("#group-messages .dm-poll"), function (card) {
        if (card._poll) dmRenderPoll(card);
    });
}, 30000);
})();
