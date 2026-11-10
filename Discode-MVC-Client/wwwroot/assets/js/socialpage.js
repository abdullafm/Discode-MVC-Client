"use strict";

document.getElementById("post-composer").addEventListener("submit", function (event) {
    event.preventDefault();
    var textBox = document.getElementById("post-text");
    var text = fieldValue(textBox).trim();
    if (!text && !pendingImage && !pendingVideo) return;

    var submit = event.target.querySelector("button[type=submit]");
    if (submit) submit.disabled = true;
    showPostError("");

    uploadPostImage().then(function (imageUrl) {
        return requestJson("/Home/CreatePost", "POST", { text: text, imageUrl: imageUrl });
    }).then(function () {
        while (textBox.firstChild) textBox.removeChild(textBox.firstChild);
        textBox.setAttribute("data-empty", "1");
        clearPhoto();
        showView("friends");
    }).catch(function (error) {
        showPostError(error.message);
    }).then(function () {
        if (submit) submit.disabled = false;
    });
});

document.querySelector(".social-view").addEventListener("submit", function (event) {
    if (!event.target.classList.contains("comment-form")) return;
    event.preventDefault();
    var postId = Number(event.target.getAttribute("data-post"));
    var box = event.target.querySelector(".rich-text");
    var text = fieldValue(box).trim();
    if (!text) return;

    var submit = event.target.querySelector("button[type=submit]");
    if (submit) submit.disabled = true;
    var parentId = event.target.getAttribute("data-parent");
    requestJson("/Home/CreateComment", "POST", { postId: postId, text: text, parentCommentId: parentId ? Number(parentId) : null }).then(function () {
        clearField(box);
        replyTarget = null;
        box.setAttribute("data-placeholder", "Add a comment...");
        return loadFeed(currentView);
    }).catch(function () {}).then(function () {
        if (submit) submit.disabled = false;
    });
});

function groupedStories() {
    var groups = {};
    loadStories().forEach(function (story) {
        if (!groups[story.author]) groups[story.author] = [];
        groups[story.author].push(story);
    });
    Object.keys(groups).forEach(function (name) {
        groups[name].sort(function (a, b) { return a.createdAt - b.createdAt; });
    });
    return groups;
}

function myName() {
    var me = document.querySelector("#user-panel .me-display");
    return me ? me.textContent.trim() : ME;
}

function myPhoto() {
    var img = document.querySelector("#user-panel .avatar img");
    return img ? img.getAttribute("src") || "" : "";
}

function avatarFor(name) {
    if (name === ME || name === myName()) {
        var mine = myPhoto();
        if (mine) return mine;
    }
    var rows = document.querySelectorAll(".friend-list .friend-item:not([data-group])");
    for (var i = 0; i < rows.length; i++) {
        var label = rows[i].querySelector("p");
        var img = rows[i].querySelector("img");
        if (label && img && label.textContent.trim() === name) return img.getAttribute("src") || "";
    }
    return "";
}

function renderStories() {
    var row = document.getElementById("story-row");
    var mineTpl = document.getElementById("story-mine");
    var friendTpl = document.getElementById("story-friend");
    if (!row || !mineTpl) return;
    while (row.firstChild) row.removeChild(row.firstChild);
    var groups = groupedStories();
    var mine = groups[ME] || [];
    var mineSeen = mine.length && mine.every(function (story) { return story.seen; });
    var mineButton = mineTpl.content.firstElementChild.cloneNode(true);
    mineButton.classList.toggle("fresh", mine.length > 0 && !mineSeen);
    mineButton.classList.toggle("seen", mine.length > 0 && mineSeen);
    mineButton.setAttribute("data-story", mine.length ? ME : "");
    var mineImg = mineButton.querySelector("img");
    if (mineImg) mineImg.src = avatarFor(ME);
    row.appendChild(mineButton);
    Object.keys(groups).filter(function (name) { return name !== ME; }).sort(function (a, b) {
        return groups[b][groups[b].length - 1].createdAt - groups[a][groups[a].length - 1].createdAt;
    }).forEach(function (name) {
        var items = groups[name];
        if (!friendTpl) return;
        var seen = items.every(function (story) { return story.seen; });
        var button = friendTpl.content.firstElementChild.cloneNode(true);
        button.classList.add(seen ? "seen" : "fresh");
        button.setAttribute("data-story", name);
        var img = button.querySelector("img");
        var label = button.querySelector(".story-label");
        if (img) img.src = items[0].avatar || DEFAULT_AVATAR;
        if (label) label.textContent = items[0].name;
        row.appendChild(button);
    });
}

var viewedStories = {};
var viewsOpenFor = 0;

function renderViewers(viewers) {
    var list = document.getElementById("story-views-list");
    while (list.firstChild) list.removeChild(list.firstChild);
    document.getElementById("story-views-empty").hidden = viewers.length > 0;
    document.getElementById("story-views-title").textContent = "Story views (" + viewers.length + ")";
    viewers.forEach(function (viewer) {
        var row = document.createElement("div");
        row.className = "views-row";

        var heart = document.createElement("span");
        heart.className = "views-heart" + (viewer.liked ? " liked" : "");
        heart.innerHTML = viewer.liked ? '<i class="fa-solid fa-heart"></i>' : "";

        var face = document.createElement("img");
        face.src = viewer.avatarUrl || DEFAULT_AVATAR;
        face.alt = "";

        var who = document.createElement("div");
        var name = document.createElement("strong");
        name.textContent = viewer.displayName || viewer.userName;
        var when = document.createElement("p");
        when.textContent = timeAgo(utcMillis(viewer.viewedAt)) + " ago";
        who.appendChild(name);
        who.appendChild(when);

        row.appendChild(heart);
        row.appendChild(face);
        row.appendChild(who);
        list.appendChild(row);
    });
}

function loadViewers() {
    if (!viewsOpenFor) return;
    var id = viewsOpenFor;
    requestJson("/Home/StoryViewers?id=" + id).then(function (viewers) {
        if (viewsOpenFor === id) renderViewers(Array.isArray(viewers) ? viewers : []);
    }).catch(function () {});
}

function openViewers(story) {
    clearTimeout(storyTimer);
    document.getElementById("story-progress").classList.add("paused");
    document.getElementById("story-delete").hidden = true;
    viewsOpenFor = story.id;
    renderViewers([]);
    document.getElementById("story-views-empty").hidden = true;
    document.getElementById("story-views-modal").hidden = false;
    loadViewers();
}

function closeViewers() {
    viewsOpenFor = 0;
    document.getElementById("story-views-modal").hidden = true;
    if (!document.getElementById("story-viewer").hidden) {
        document.getElementById("story-progress").classList.remove("paused");
        clearTimeout(storyTimer);
        storyTimer = setTimeout(nextStory, STORY_MS);
    }
}

document.getElementById("story-views-btn").addEventListener("click", function () {
    var group = storyGroups[storyCursor];
    var story = group && group.items[storyIndex];
    if (!story || group.author !== ME) return;
    openViewers(story);
});
document.getElementById("story-views-close").addEventListener("click", closeViewers);
document.getElementById("story-views-backdrop").addEventListener("click", closeViewers);
document.addEventListener("discode-story-views-changed", function (event) {
    if (viewsOpenFor === event.detail.storyId) loadViewers();
});
document.addEventListener("discode-stories-changed", function () {
    if (viewsOpenFor) loadViewers();
});

function closeStoryMenu() {
    document.getElementById("story-delete").hidden = true;
    document.getElementById("story-progress").classList.remove("paused");
}

function closeStories() {
    clearTimeout(storyTimer);
    closeStoryMenu();
    document.getElementById("story-viewer").hidden = true;
}

function paintStory() {
    var group = storyGroups[storyCursor];
    if (!group) {
        closeStories();
        return;
    }
    var story = group.items[storyIndex];
    if (group.author !== ME && !viewedStories[story.id]) {
        viewedStories[story.id] = true;
        requestJson("/Home/RecordStoryView", "POST", { id: story.id }).catch(function () {});
    }
    if (!story.seen) {
        seenNow[story.id] = true;
        story.seen = true;
    }

    var progress = document.getElementById("story-progress");
    var barTpl = document.getElementById("story-bar");
    while (progress.firstChild) progress.removeChild(progress.firstChild);
    for (var i = 0; i < group.items.length; i++) {
        if (!barTpl) break;
        var bar = barTpl.content.firstElementChild.cloneNode(true);
        if (i < storyIndex) bar.className = "done";
        else if (i === storyIndex) bar.className = "current";
        progress.appendChild(bar);
    }
    document.getElementById("story-avatar").src = group.author === ME ? avatarFor(ME) : story.avatar || DEFAULT_AVATAR;
    document.getElementById("story-name").textContent = story.name;
    document.getElementById("story-time").textContent = timeAgo(story.createdAt);
    document.getElementById("story-photo").src = story.image;
    document.getElementById("story-caption").textContent = story.text || "";
    var ownStory = group.author === ME;
    document.getElementById("story-menu").hidden = story.id == null && !ownStory;
    document.getElementById("story-views-btn").hidden = !ownStory;
    document.getElementById("story-delete-btn").hidden = !ownStory;
    document.getElementById("story-report-btn").hidden = ownStory;
    document.getElementById("story-views-label").textContent = story.views ? "Views (" + story.views + ")" : "Views";
    document.getElementById("story-reply").hidden = group.author === ME;
    document.getElementById("story-reply-input").value = "";
    paintStoryLike(story);
    closeStoryMenu();
    document.getElementById("story-viewer").hidden = false;

    clearTimeout(storyTimer);
    storyTimer = setTimeout(nextStory, STORY_MS);
}

function paintStoryLike(story) {
    var button = document.getElementById("story-like");
    button.classList.toggle("liked", story.liked);
    button.querySelector("i").className = story.liked ? "fa-solid fa-heart" : "fa-regular fa-heart";
}

document.getElementById("story-like").addEventListener("click", function () {
    var group = storyGroups[storyCursor];
    var story = group && group.items[storyIndex];
    if (!story) return;
    requestJson("/Home/ToggleStoryLike", "POST", { id: story.id }).then(function (result) {
        story.liked = result.liked;
        story.likes = result.count;
        paintStoryLike(story);
    }).catch(function () {});
});

function sendStoryReply() {
    var group = storyGroups[storyCursor];
    if (!group || group.author === ME) return;
    var story = group.items[storyIndex];
    var input = document.getElementById("story-reply-input");
    var text = input.value.trim();
    if (!story || !text) return;
    input.disabled = true;
    var author = group.author;
    requestJson("/Home/ReplyStory", "POST", { id: story.id, text: text }).then(function () {
        input.value = "";
        input.disabled = false;
        closeStories();
        var target = "/Dm/Index?name=" + encodeURIComponent(author);
        if (window.discodeGo) window.discodeGo(target);
        else window.location.href = target;
    }).catch(function (error) {
        input.disabled = false;
        input.focus();
        input.placeholder = (error && error.message) || "Could not send";
        setTimeout(function () { input.placeholder = "Send message"; }, 2500);
    });
}

document.getElementById("story-send").addEventListener("click", sendStoryReply);
document.getElementById("story-reply-input").addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.isComposing) return;
    event.preventDefault();
    sendStoryReply();
});

(function () {
    var input = document.getElementById("story-reply-input");
    input.addEventListener("focus", function () {
        clearTimeout(storyTimer);
        document.getElementById("story-progress").classList.add("paused");
    });
    input.addEventListener("blur", function () {
        if (document.getElementById("story-viewer").hidden) return;
        document.getElementById("story-progress").classList.remove("paused");
        clearTimeout(storyTimer);
        storyTimer = setTimeout(nextStory, STORY_MS);
    });
})();

function openStories(author) {
    var groups = groupedStories();
    var order = Object.keys(groups).filter(function (name) { return name !== ME; }).sort(function (a, b) {
        return groups[b][groups[b].length - 1].createdAt - groups[a][groups[a].length - 1].createdAt;
    });
    if (groups[ME]) order.unshift(ME);
    var start = order.indexOf(author);
    if (start < 0) return;
    storyGroups = order.map(function (name) {
        return { author: name, items: groups[name] };
    });
    storyCursor = start;
    var items = storyGroups[start].items;
    storyIndex = 0;
    for (var i = 0; i < items.length; i++) {
        if (!items[i].seen) {
            storyIndex = i;
            break;
        }
    }
    paintStory();
}

function nextStory() {
    var group = storyGroups[storyCursor];
    if (!group) return closeStories();
    if (storyIndex < group.items.length - 1) {
        storyIndex++;
        paintStory();
        return;
    }
    if (storyCursor < storyGroups.length - 1) {
        storyCursor++;
        storyIndex = 0;
        paintStory();
        return;
    }
    closeStories();
    renderStories();
}

function prevStory() {
    if (storyIndex > 0) {
        storyIndex--;
        paintStory();
        return;
    }
    if (storyCursor > 0) {
        storyCursor--;
        storyIndex = storyGroups[storyCursor].items.length - 1;
        paintStory();
    }
}

document.getElementById("story-row").addEventListener("click", function (event) {
    if (event.target.closest("#story-add")) {
        event.stopPropagation();
        document.getElementById("story-file").click();
        return;
    }
    var bubble = event.target.closest("[data-story]");
    if (!bubble) return;
    var author = bubble.getAttribute("data-story");
    if (!author) {
        document.getElementById("story-file").click();
        return;
    }
    openStories(author);
});

function filterCss(id) {
    for (var i = 0; i < STORY_FILTERS.length; i++) {
        if (STORY_FILTERS[i].id === id) return STORY_FILTERS[i].css;
    }
    return "none";
}

function canvasPoint(event) {
    var canvas = document.getElementById("story-canvas");
    var rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function wrapText(ctx, text, max) {
    var words = String(text).split(" ");
    var lines = [];
    var line = "";
    words.forEach(function (word) {
        var test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > max && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
}

var TEXT_FONTS = {
    classic: "700 {size}px Nunito Sans, sans-serif",
    modern: "800 {size}px Nunito Sans, sans-serif",
    neon: "600 {size}px Nunito Sans, sans-serif",
    typewriter: "700 {size}px 'Courier New', Courier, monospace",
    strong: "900 {size}px 'Arial Black', Impact, Nunito Sans, sans-serif"
};

function textStyleOf(item) {
    return TEXT_FONTS[item.style] ? item.style : "classic";
}

function itemFont(item) {
    if (item.type === "sticker") return item.size + "px sans-serif";
    return TEXT_FONTS[textStyleOf(item)].replace("{size}", item.size);
}

function itemText(item) {
    return textStyleOf(item) === "strong" ? String(item.text).toUpperCase() : item.text;
}

function contrastColor(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#111111" : "#ffffff";
}

function roundedFill(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
}

function itemBox(ctx, item) {
    ctx.font = itemFont(item);
    var lines = item.type === "sticker" ? [item.text] : wrapText(ctx, itemText(item), STORY_W - 80);
    var lineH = item.size * 1.15;
    var width = 0;
    lines.forEach(function (line) {
        width = Math.max(width, ctx.measureText(line).width);
    });
    return { lines: lines, width: width, height: lines.length * lineH, lineH: lineH };
}

function drawStroke(ctx, stroke) {
    if (!stroke.points.length) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (stroke.points.length === 1) {
        ctx.fillStyle = stroke.color;
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (var i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

var HANDLES = [
    { id: "nw", fx: 0, fy: 0, cursor: "nwse-resize" },
    { id: "n", fx: 0.5, fy: 0, cursor: "ns-resize" },
    { id: "ne", fx: 1, fy: 0, cursor: "nesw-resize" },
    { id: "e", fx: 1, fy: 0.5, cursor: "ew-resize" },
    { id: "se", fx: 1, fy: 1, cursor: "nwse-resize" },
    { id: "s", fx: 0.5, fy: 1, cursor: "ns-resize" },
    { id: "sw", fx: 0, fy: 1, cursor: "nesw-resize" },
    { id: "w", fx: 0, fy: 0.5, cursor: "ew-resize" }
];

function itemScaleX(item) {
    return item.sx || 1;
}

function itemScaleY(item) {
    return item.sy || 1;
}

function itemRect(ctx, item) {
    var box = itemBox(ctx, item);
    var halfW = box.width * itemScaleX(item) / 2 + 12;
    var halfH = box.height * itemScaleY(item) / 2 + 8;
    return { l: item.x - halfW, t: item.y - halfH, r: item.x + halfW, b: item.y + halfH };
}

function handlePoint(rect, handle) {
    return { x: rect.l + (rect.r - rect.l) * handle.fx, y: rect.t + (rect.b - rect.t) * handle.fy };
}

function handleAt(point) {
    if (!storyDraft || storyDraft.selected < 0) return null;
    var ctx = document.getElementById("story-canvas").getContext("2d");
    var rect = itemRect(ctx, storyDraft.items[storyDraft.selected]);
    for (var i = 0; i < HANDLES.length; i++) {
        var spot = handlePoint(rect, HANDLES[i]);
        if (Math.hypot(point.x - spot.x, point.y - spot.y) <= 22) return HANDLES[i];
    }
    return null;
}

function drawHandles(ctx, rect) {
    HANDLES.forEach(function (handle) {
        var spot = handlePoint(rect, handle);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (handle.id.length === 2) {
            ctx.arc(spot.x, spot.y, 10, 0, Math.PI * 2);
        } else if (handle.id === "n" || handle.id === "s") {
            ctx.rect(spot.x - 14, spot.y - 5, 28, 10);
        } else {
            ctx.rect(spot.x - 5, spot.y - 14, 10, 28);
        }
        ctx.fill();
        ctx.stroke();
    });
}

function drawItem(ctx, item, selected) {
    var box = itemBox(ctx, item);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = itemFont(item);
    if (selected) {
        var rect = itemRect(ctx, item);
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(rect.l, rect.t, rect.r - rect.l, rect.b - rect.t);
        ctx.setLineDash([]);
        drawHandles(ctx, rect);
    }
    ctx.translate(item.x, item.y);
    ctx.scale(itemScaleX(item), itemScaleY(item));
    ctx.translate(-item.x, -item.y);
    box.lines.forEach(function (line, index) {
        var y = item.y - box.height / 2 + box.lineH / 2 + index * box.lineH;
        var look = textStyleOf(item);
        if (item.type === "text" && look === "modern") {
            var lineWidth = ctx.measureText(line).width;
            ctx.fillStyle = item.color;
            roundedFill(ctx, item.x - lineWidth / 2 - item.size * 0.4, y - box.lineH / 2 + 2, lineWidth + item.size * 0.8, box.lineH - 4, item.size * 0.3);
            ctx.fillStyle = contrastColor(item.color);
            ctx.fillText(line, item.x, y);
        } else if (item.type === "text" && look === "neon") {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = item.color === "#111111" ? "#ffffff" : item.color;
            [34, 18, 8].forEach(function (blur) {
                ctx.shadowBlur = blur;
                ctx.fillText(line, item.x, y);
            });
        } else if (item.type === "text") {
            if (item.color !== "#111111") {
                ctx.lineWidth = 6;
                ctx.lineJoin = "round";
                ctx.strokeStyle = "rgba(0,0,0,0.55)";
                ctx.strokeText(line, item.x, y);
            }
            ctx.fillStyle = item.color;
            ctx.fillText(line, item.x, y);
        } else {
            ctx.fillText(line, item.x, y);
        }
    });
    ctx.restore();
    return box;
}

function paintDraft() {
    if (!storyDraft) return;
    var canvas = document.getElementById("story-canvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, STORY_W, STORY_H);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, STORY_W, STORY_H);
    var img = storyDraft.img;
    var scale = Math.max(STORY_W / img.width, STORY_H / img.height);
    var width = img.width * scale;
    var height = img.height * scale;
    ctx.save();
    ctx.filter = filterCss(storyDraft.filter);
    ctx.drawImage(img, (STORY_W - width) / 2, (STORY_H - height) / 2, width, height);
    ctx.restore();
    storyDraft.strokes.forEach(function (stroke) { drawStroke(ctx, stroke); });
    if (storyDraft.drawing) drawStroke(ctx, storyDraft.drawing);
    storyDraft.items.forEach(function (item, index) {
        var box = drawItem(ctx, item, index === storyDraft.selected);
        item.box = box;
    });
}

function paintBrush() {
    var dot = document.getElementById("story-brush-dot");
    var size = storyDraft ? storyDraft.brush : 10;
    dot.style.transform = "scale(" + (size / 44) + ")";
    dot.style.background = storyDraft ? storyDraft.ink : "#ffffff";
    document.getElementById("story-brush-size").value = String(size);
}

function applyTextLook() {
    var input = document.getElementById("story-text");
    var style = storyDraft ? storyDraft.textStyle : "classic";
    var color = storyDraft ? storyDraft.textColor : "#ffffff";
    var names = Object.keys(TEXT_FONTS);
    for (var i = 0; i < names.length; i++) input.classList.toggle("look-" + names[i], names[i] === style);
    input.style.setProperty("color", style === "modern" ? contrastColor(color) : style === "neon" ? "#ffffff" : color, "important");
    input.style.setProperty("background", style === "modern" ? color : "", style === "modern" ? "important" : "");
    input.style.setProperty("text-shadow", style === "neon" ? "0 0 8px " + (color === "#111111" ? "#fff" : color) + ", 0 0 22px " + (color === "#111111" ? "#fff" : color) + ", 0 0 40px " + (color === "#111111" ? "#fff" : color) : "", style === "neon" ? "important" : "");
    var chips = document.querySelectorAll("#story-text-styles [data-text-style]");
    for (var j = 0; j < chips.length; j++) chips[j].classList.toggle("on", chips[j].getAttribute("data-text-style") === style);
}

function markColors(box, current) {
    if (!box) return;
    var dots = box.querySelectorAll("[data-color]");
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("on", dots[i].getAttribute("data-color") === current);
}

var STORY_TOOLS = {
    text: { label: "Text", icon: "fa-font" },
    draw: { label: "Draw", icon: "fa-pen" },
    sticker: { label: "Sticker", icon: "fa-face-grin-stars" }
};

function closeToolMenu() {
    document.getElementById("story-tool-menu").hidden = true;
    document.getElementById("story-tool-trigger").setAttribute("aria-expanded", "false");
}

function renderToolPanel() {
    var panel = document.getElementById("story-edit-panel");
    var tool = storyDraft && storyDraft.tool;
    var buttons = document.querySelectorAll(".story-edit-tools [data-tool]");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle("on", buttons[i].getAttribute("data-tool") === tool);
    }
    document.getElementById("story-draw-done").hidden = tool !== "draw";
    var trigger = document.getElementById("story-tool-trigger");
    var current = STORY_TOOLS[tool] || { label: "Tools", icon: "fa-wand-magic-sparkles" };
    trigger.classList.toggle("on", !!tool);
    document.getElementById("story-tool-icon").className = "fa-solid " + current.icon;
    document.getElementById("story-tool-label").textContent = current.label;
    document.getElementById("story-editor").classList.toggle("drawing", tool === "draw");
    document.getElementById("story-editor").classList.toggle("text-mode", tool === "text");
    var textTool = document.getElementById("story-tool-text");
    var drawTool = document.getElementById("story-tool-draw");
    var stickerTool = document.getElementById("story-tool-sticker");
    if (tool === "sticker" && typeof fillEmojiPanel === "function") {
        var emojiPicker = document.getElementById("story-emoji-picker");
        if (!emojiPicker.childElementCount) fillEmojiPanel(emojiPicker, "story-emoji", null, { skip: ["Flags"] });
    }
    if (textTool) textTool.hidden = tool !== "text";
    if (drawTool) drawTool.hidden = tool !== "draw";
    if (stickerTool) stickerTool.hidden = tool !== "sticker";
    panel.hidden = !tool;
    if (tool === "text") {
        markColors(textTool, storyDraft.textColor);
        applyTextLook();
        document.getElementById("story-text").focus();
    } else if (tool === "draw") {
        markColors(drawTool, storyDraft.ink);
        paintBrush();
    }
}

function renderFilters() {
    var buttons = document.querySelectorAll("#story-filters [data-filter]");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle("on", buttons[i].getAttribute("data-filter") === storyDraft.filter);
    }
}

function closeEditor() {
    storyDraft = null;
    var editor = document.getElementById("story-editor");
    editor.hidden = true;
    editor.classList.remove("drawing");
    document.getElementById("story-edit-panel").hidden = true;
}

function openStoryEditor(url) {
    var img = new Image();
    img.onload = function () {
        closeStories();
        storyDraft = {
            img: img,
            filter: "none",
            strokes: [],
            items: [],
            tool: null,
            drawing: null,
            drag: null,
            selected: -1,
            undo: [],
            ink: "#ffffff",
            brush: 10,
            textColor: "#ffffff",
            textStyle: "classic"
        };
        document.getElementById("story-share-avatar").src = avatarFor(ME);
        document.getElementById("story-editor").hidden = false;
        renderFilters();
        renderToolPanel();
        paintDraft();
    };
    img.src = url;
}

function hitItem(point) {
    var ctx = document.getElementById("story-canvas").getContext("2d");
    for (var i = storyDraft.items.length - 1; i >= 0; i--) {
        var item = storyDraft.items[i];
        var box = item.box || itemBox(ctx, item);
        if (Math.abs(point.x - item.x) <= box.width * itemScaleX(item) / 2 + 16 && Math.abs(point.y - item.y) <= box.height * itemScaleY(item) / 2 + 16) {
            return i;
        }
    }
    return -1;
}

function addStorySticker(emoji) {
    storyDraft.items.push({
        type: "sticker",
        text: emoji,
        x: STORY_W / 2,
        y: STORY_H / 2,
        size: 78,
        color: "#ffffff"
    });
    storyDraft.undo.push("item");
    storyDraft.selected = storyDraft.items.length - 1;
    paintDraft();
}

function addStoryText() {
    var input = document.getElementById("story-text");
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    storyDraft.items.push({
        type: "text",
        text: text,
        x: STORY_W / 2,
        y: STORY_H / 2 + (storyDraft.items.length % 3) * 64 - 64,
        size: 42,
        color: storyDraft.textColor,
        style: storyDraft.textStyle
    });
    storyDraft.undo.push("item");
    storyDraft.selected = storyDraft.items.length - 1;
    input.value = "";
    storyDraft.tool = null;
    renderToolPanel();
    paintDraft();
}

function publishStory() {
    if (!storyDraft) return;
    storyDraft.selected = -1;
    storyDraft.drawing = null;
    paintDraft();
    var share = document.getElementById("story-share");
    share.disabled = true;
    document.getElementById("story-canvas").toBlob(function (blob) {
        var data = new FormData();
        data.append("file", blob, "story.jpg");
        fetch("/Home/UploadStoryImage", {
            method: "POST",
            credentials: "same-origin",
            headers: { "RequestVerificationToken": csrfToken(), "X-Requested-With": "XMLHttpRequest" },
            body: data
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (result) {
                if (!response.ok) throw readError(response, result);
                return requestJson("/Home/CreateStory", "POST", { imageUrl: result.imageUrl });
            });
        }).then(function () {
            closeEditor();
            showView("friends");
            return refreshStories();
        }).catch(function (err) {
            alert(err.message);
        }).then(function () {
            share.disabled = false;
        });
    }, "image/jpeg", 0.82);
}

document.getElementById("story-file").addEventListener("change", function () {
    var file = this.files && this.files[0];
    this.value = "";
    if (!file) return;
    readImage(file, openStoryEditor);
});

document.getElementById("story-discard").addEventListener("click", closeEditor);
document.getElementById("story-share").addEventListener("click", publishStory);

document.querySelector(".story-edit-tools").addEventListener("click", function (event) {
    if (!storyDraft) return;
    if (event.target.closest("#story-undo")) {
        var kind = storyDraft.undo.pop();
        if (kind === "stroke") storyDraft.strokes.pop();
        if (kind === "item") storyDraft.items.pop();
        storyDraft.selected = -1;
        paintDraft();
        return;
    }
    if (event.target.closest("#story-tool-trigger")) {
        var menu = document.getElementById("story-tool-menu");
        menu.hidden = !menu.hidden;
        document.getElementById("story-tool-trigger").setAttribute("aria-expanded", menu.hidden ? "false" : "true");
        return;
    }
    var button = event.target.closest("[data-tool]");
    if (!button) return;
    var tool = button.getAttribute("data-tool");
    storyDraft.tool = storyDraft.tool === tool ? null : tool;
    closeToolMenu();
    renderToolPanel();
});

document.addEventListener("click", function (event) {
    if (!event.target.closest(".story-tool-dropdown")) closeToolMenu();
    if (!storyDraft || (storyDraft.tool !== "sticker" && storyDraft.tool !== "draw")) return;
    if (document.getElementById("story-editor").hidden) return;
    if (event.target.closest("#story-edit-panel, .story-edit-top")) return;
    if (storyDraft.tool === "draw" && event.target.closest("#story-canvas")) return;
    storyDraft.tool = null;
    renderToolPanel();
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeToolMenu();
});

document.getElementById("story-edit-panel").addEventListener("click", function (event) {
    if (!storyDraft) return;
    if (storyDraft.tool === "text" && (event.target.id === "story-edit-panel" || event.target.id === "story-tool-text")) {
        var box = document.getElementById("story-text");
        if (box.value.trim()) {
            box.focus();
        } else {
            storyDraft.tool = null;
            renderToolPanel();
        }
        return;
    }
    var chip = event.target.closest("[data-text-style]");
    if (chip) {
        storyDraft.textStyle = chip.getAttribute("data-text-style");
        applyTextLook();
        document.getElementById("story-text").focus();
        return;
    }
    var color = event.target.closest("[data-color]");
    if (color) {
        var value = color.getAttribute("data-color");
        if (storyDraft.tool === "draw") {
            storyDraft.ink = value;
            paintBrush();
        } else {
            storyDraft.textColor = value;
            applyTextLook();
        }
        var dots = color.parentNode.children;
        for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("on", dots[i] === color);
        return;
    }
    var emojiTab = event.target.closest("#story-emoji-picker [data-emoji-tab]");
    if (emojiTab) {
        var picker = document.getElementById("story-emoji-picker");
        var section = document.getElementById("story-emoji-" + emojiTab.getAttribute("data-emoji-tab"));
        if (section) picker.querySelector(".emoji-scroll").scrollTop = section.offsetTop;
        var emojiTabs = picker.querySelectorAll("[data-emoji-tab]");
        for (var t = 0; t < emojiTabs.length; t++) emojiTabs[t].classList.toggle("on", emojiTabs[t] === emojiTab);
        return;
    }
    var emojiChoice = event.target.closest("#story-emoji-picker .emoji-choice");
    if (emojiChoice) {
        addStorySticker(emojiChoice.getAttribute("data-emoji"));
        return;
    }
    if (event.target.closest("#story-text-add")) addStoryText();
    if (event.target.closest("#story-text-close")) {
        document.getElementById("story-text").value = "";
        storyDraft.tool = null;
        renderToolPanel();
    }
});

function enableDragScroll(row) {
    var pressed = false;
    var moved = false;
    var startX = 0;
    var startLeft = 0;

    row.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "touch") return;
        pressed = true;
        moved = false;
        startX = event.clientX;
        startLeft = row.scrollLeft;
    });

    window.addEventListener("pointermove", function (event) {
        if (!pressed) return;
        var shift = event.clientX - startX;
        if (Math.abs(shift) > 4) {
            moved = true;
            row.classList.add("dragging");
        }
        if (moved) row.scrollLeft = startLeft - shift;
    });

    window.addEventListener("pointerup", function () {
        pressed = false;
        row.classList.remove("dragging");
    });

    row.addEventListener("click", function (event) {
        if (!moved) return;
        moved = false;
        event.stopPropagation();
        event.preventDefault();
    }, true);

    row.addEventListener("wheel", function (event) {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        row.scrollLeft += event.deltaY;
        event.preventDefault();
    }, { passive: false });
}

document.getElementById("story-draw-done").addEventListener("click", function () {
    if (!storyDraft) return;
    storyDraft.tool = null;
    renderToolPanel();
});

enableDragScroll(document.getElementById("story-text-styles"));
enableDragScroll(document.getElementById("story-filters"));

document.getElementById("story-brush-size").addEventListener("input", function () {
    if (!storyDraft) return;
    storyDraft.brush = Number(this.value);
    paintBrush();
});

document.getElementById("story-edit-panel").addEventListener("mousedown", function (event) {
    if (event.target.closest("#story-tool-text [data-color], #story-text-styles [data-text-style]")) event.preventDefault();
});

document.getElementById("story-edit-panel").addEventListener("keydown", function (event) {
    if (event.key === "Enter" && event.target.id === "story-text") {
        event.preventDefault();
        addStoryText();
    }
});

document.getElementById("story-filters").addEventListener("click", function (event) {
    var button = event.target.closest("[data-filter]");
    if (!button || !storyDraft) return;
    storyDraft.filter = button.getAttribute("data-filter");
    var buttons = button.parentNode.children;
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle("on", buttons[i] === button);
    paintDraft();
});

document.getElementById("story-canvas").addEventListener("pointerdown", function (event) {
    if (!storyDraft) return;
    this.setPointerCapture(event.pointerId);
    var point = canvasPoint(event);
    if (storyDraft.tool === "draw") {
        storyDraft.drawing = { color: storyDraft.ink, size: storyDraft.brush, points: [point] };
        storyDraft.selected = -1;
        paintDraft();
        return;
    }
    var handle = handleAt(point);
    if (handle) {
        var target = storyDraft.items[storyDraft.selected];
        storyDraft.resize = { index: storyDraft.selected, handle: handle.id, start: point, sx: itemScaleX(target), sy: itemScaleY(target) };
        return;
    }
    var hit = hitItem(point);
    storyDraft.selected = hit;
    storyDraft.drag = hit < 0 ? null : {
        index: hit,
        dx: point.x - storyDraft.items[hit].x,
        dy: point.y - storyDraft.items[hit].y
    };
    paintDraft();
});

document.getElementById("story-canvas").addEventListener("pointermove", function (event) {
    if (!storyDraft) return;
    var point = canvasPoint(event);
    if (storyDraft.drawing) {
        storyDraft.drawing.points.push(point);
        paintDraft();
        return;
    }
    if (storyDraft.resize) {
        resizeItem(point);
        return;
    }
    if (!storyDraft.drag) {
        var over = storyDraft.tool === "draw" ? null : handleAt(point);
        this.style.cursor = over ? over.cursor : "";
        return;
    }
    var item = storyDraft.items[storyDraft.drag.index];
    item.x = point.x - storyDraft.drag.dx;
    item.y = point.y - storyDraft.drag.dy;
    paintDraft();
});

function clampScale(value) {
    return Math.min(8, Math.max(0.2, value));
}

function resizeItem(point) {
    var job = storyDraft.resize;
    var item = storyDraft.items[job.index];
    if (job.handle.length === 2) {
        var from = Math.hypot(job.start.x - item.x, job.start.y - item.y) || 1;
        var ratio = Math.hypot(point.x - item.x, point.y - item.y) / from;
        item.sx = clampScale(job.sx * ratio);
        item.sy = clampScale(job.sy * ratio);
    } else if (job.handle === "e" || job.handle === "w") {
        item.sx = clampScale(job.sx * Math.abs(point.x - item.x) / (Math.abs(job.start.x - item.x) || 1));
    } else {
        item.sy = clampScale(job.sy * Math.abs(point.y - item.y) / (Math.abs(job.start.y - item.y) || 1));
    }
    paintDraft();
}

document.getElementById("story-canvas").addEventListener("pointerup", function () {
    if (!storyDraft) return;
    if (storyDraft.drawing && storyDraft.drawing.points.length) {
        storyDraft.strokes.push(storyDraft.drawing);
        storyDraft.undo.push("stroke");
    }
    storyDraft.drawing = null;
    storyDraft.drag = null;
    storyDraft.resize = null;
});

document.getElementById("story-close").addEventListener("click", function () {
    closeStories();
    renderStories();
});

document.getElementById("story-menu").addEventListener("click", function () {
    var menu = document.getElementById("story-delete");
    var opening = menu.hidden;
    menu.hidden = !opening;
    if (opening) {
        clearTimeout(storyTimer);
        document.getElementById("story-progress").classList.add("paused");
    } else {
        document.getElementById("story-progress").classList.remove("paused");
        storyTimer = setTimeout(nextStory, STORY_MS);
    }
});

document.getElementById("story-report-btn").addEventListener("click", function () {
    var group = storyGroups[storyCursor];
    if (!group || group.author === ME) return;
    var story = group.items[storyIndex];
    if (!story || story.id == null || !window.discodeReport) return;
    document.getElementById("story-delete").hidden = true;
    clearTimeout(storyTimer);
    document.addEventListener("discode-report-closed", function resume() {
        document.removeEventListener("discode-report-closed", resume);
        if (document.getElementById("story-viewer").hidden) return;
        document.getElementById("story-progress").classList.remove("paused");
        storyTimer = setTimeout(nextStory, STORY_MS);
    });
    window.discodeReport({ type: "Story", id: story.id, label: "story" });
});

document.getElementById("story-delete-btn").addEventListener("click", function () {
    var group = storyGroups[storyCursor];
    if (!group || group.author !== ME) return;
    var story = group.items[storyIndex];
    if (!story) return;
    closeStoryMenu();
    requestJson("/Home/DeleteStory", "POST", { id: story.id, imageUrl: story.image }).then(function () {
        serverStories = serverStories.filter(function (item) { return item.id !== story.id; });
        group.items.splice(storyIndex, 1);
        if (!group.items.length) {
            storyGroups.splice(storyCursor, 1);
            if (!storyGroups.length) {
                closeStories();
                renderStories();
                return;
            }
            if (storyCursor >= storyGroups.length) storyCursor = storyGroups.length - 1;
            storyIndex = 0;
        } else if (storyIndex >= group.items.length) {
            storyIndex = 0;
        }
        renderStories();
        paintStory();
    }).catch(function (err) {
        alert(err.message);
    });
});

document.addEventListener("discode-stories-changed", function () {
    refreshStories();
});

document.addEventListener("discode-friends-changed", function () {
    refreshStories();
});

document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refreshStories();
});

setInterval(function () {
    if (!window.discodeLive && !document.hidden) refreshStories();
}, 10000);

refreshStories();
document.getElementById("story-next").addEventListener("click", nextStory);
document.getElementById("story-prev").addEventListener("click", prevStory);

document.querySelector(".social-rail").addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;
    showView(button.getAttribute("data-view"));
});

document.getElementById("post-image").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (file.type.indexOf("video/") === 0) {
        if (file.size > 40000000) {
            showPostError("The video can be at most 40 MB.");
            this.value = "";
            return;
        }
        showPostError("");
        clearPhoto();
        pendingVideo = file;
        var clip = document.getElementById("photo-preview-video");
        var still = document.getElementById("photo-preview-img");
        if (still) still.hidden = true;
        clip.src = URL.createObjectURL(file);
        clip.hidden = false;
        document.getElementById("photo-preview").hidden = false;
        return;
    }
    readImage(file, function (url) {
        pendingVideo = null;
        var clip = document.getElementById("photo-preview-video");
        if (clip) clip.hidden = true;
        var still = document.getElementById("photo-preview-img");
        if (still) still.hidden = false;
        pendingImage = url;
        var preview = document.getElementById("photo-preview");
        preview.hidden = false;
        var image = document.getElementById("photo-preview-img");
        if (image) image.src = url;
    });
});

document.getElementById("photo-preview").addEventListener("click", function (event) {
    if (event.target.closest("#photo-remove")) clearPhoto();
});

function flagCode(emoji) {
    var chars = Array.from(emoji);
    if (chars.length !== 2) return "";
    var first = chars[0].codePointAt(0);
    var second = chars[1].codePointAt(0);
    if (first < 0x1F1E6 || first > 0x1F1FF || second < 0x1F1E6 || second > 0x1F1FF) return "";
    return String.fromCharCode(first - 0x1F1E6 + 65, second - 0x1F1E6 + 65);
}

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

var regionNames = null;

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

var FLAG_RE = /\uD83C\uDFF4(?:\uDB40[\uDC00-\uDCFF])+\uDB40\uDC7F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83C\uDFF3\uFE0F\u200D\u26A7\uFE0F|\uD83C\uDFF4\u200D\u2620\uFE0F|\uD83C[\uDDE6-\uDDFF]\uD83C[\uDDE6-\uDDFF]|\uD83C\uDFC1|\uD83D\uDEA9|\uD83C\uDF8C|\uD83C\uDFF4|\uD83C\uDFF3\uFE0F?/g;

function flagPicture(emoji) {
    if (flagCode(emoji)) return flagSrc(emoji);
    return twemojiSrc(emoji);
}

function fieldValue(el) {
    if (!el) return "";
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

function markEmpty(el) {
    var empty = !fieldValue(el).replace(/\n/g, "").trim();
    el.setAttribute("data-empty", empty ? "1" : "0");
    if (empty && document.activeElement !== el) while (el.firstChild) el.removeChild(el.firstChild);
}

var savedRange = null;

function rememberCaret() {
    var sel = window.getSelection();
    var active = document.activeElement;
    if (!active || !active.classList || !active.classList.contains("rich-text") || !sel.rangeCount) return;
    if (active.contains(sel.anchorNode)) savedRange = { field: active, range: sel.getRangeAt(0).cloneRange() };
}

function closeEmojiPanel() {
    emojiField = null;
    var panel = document.getElementById("emoji-panel");
    if (panel) panel.hidden = true;
}

function openEmojiPanel(button, field) {
    var panel = document.getElementById("emoji-panel");
    if (emojiField === field && !panel.hidden) {
        closeEmojiPanel();
        return;
    }
    emojiField = field;
    if (!panel.childElementCount && typeof fillEmojiPanel === "function") {
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
    placeEmojiPanel(button);
}

function placeEmojiPanel(button) {
    var panel = document.getElementById("emoji-panel");
    var gap = 8;
    var parent = button.closest(".composer-fields") || button.closest(".comment-form") || button.parentNode;
    if (panel.parentNode !== parent) parent.appendChild(panel);
    panel.hidden = false;
    panel.style.width = "";
    var maxWidth = Math.min(340, Math.max(220, parent.clientWidth - 8));
    panel.style.width = maxWidth + "px";
    var parentRect = parent.getBoundingClientRect();
    var buttonRect = button.getBoundingClientRect();
    var width = panel.offsetWidth;
    var left = buttonRect.left - parentRect.left;
    if (left + width > parent.clientWidth - 4) left = Math.max(0, parent.clientWidth - width - 4);
    if (left < 0) left = 0;
    var top = buttonRect.bottom - parentRect.top + gap;
    if (buttonRect.bottom + panel.offsetHeight + gap > window.innerHeight) {
        top = buttonRect.top - parentRect.top - panel.offsetHeight - gap;
    }
    panel.style.left = left + "px";
    panel.style.top = top + "px";
}

function insertNodes(field, nodes) {
    field.focus();
    var sel = window.getSelection();
    var range = savedRange && savedRange.field === field && field.contains(savedRange.range.startContainer) ? savedRange.range : null;
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
    savedRange = { field: field, range: range.cloneRange() };
    markEmpty(field);
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

function insertEmoji(emoji) {
    if (!emojiField) return;
    var max = Number(emojiField.getAttribute("data-maxlength")) || 0;
    if (max && fieldValue(emojiField).length + emoji.length > max) return;
    insertNodes(emojiField, nodesForText(emoji));
}

document.getElementById("post-emoji").addEventListener("mousedown", rememberCaret);
document.getElementById("post-emoji").addEventListener("click", function () {
    openEmojiPanel(this, document.getElementById("post-text"));
});

document.getElementById("emoji-panel").addEventListener("mousedown", function (event) {
    if (event.target.closest(".emoji-choice")) event.preventDefault();
});

document.getElementById("emoji-panel").addEventListener("click", function (event) {
    var tab = event.target.closest("[data-emoji-tab]");
    if (tab) {
        var scroller = this.querySelector(".emoji-scroll");
        var section = document.getElementById("emoji-" + tab.getAttribute("data-emoji-tab"));
        if (section) scroller.scrollTop = section.offsetTop;
        var tabs = this.querySelectorAll("[data-emoji-tab]");
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("on", tabs[i] === tab);
        return;
    }
    var choice = event.target.closest(".emoji-choice");
    if (!choice) return;
    insertEmoji(choice.getAttribute("data-emoji") || choice.textContent);
});

document.addEventListener("click", function (event) {
    if (event.target.closest("#emoji-panel, #post-emoji, .emoji-open")) return;
    closeEmojiPanel();
});

function closeDeleteMenus() {
    var pops = document.querySelectorAll(".social-view .delete-pop");
    for (var i = 0; i < pops.length; i++) pops[i].hidden = true;
}

document.querySelector(".social-view").addEventListener("mousedown", function (event) {
    if (event.target.closest(".emoji-open")) rememberCaret();
});

document.querySelector(".social-view").addEventListener("keydown", function (event) {
    var box = event.target.closest && event.target.closest(".comment-form .rich-text");
    if (!box || event.key !== "Enter") return;
    event.preventDefault();
    if (box.closest("form").requestSubmit) box.closest("form").requestSubmit();
    else box.closest("form").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
});

document.querySelector(".social-view").addEventListener("paste", function (event) {
    var box = event.target.closest && event.target.closest(".rich-text");
    if (!box) return;
    event.preventDefault();
    var text = (event.clipboardData || window.clipboardData).getData("text") || "";
    var max = Number(box.getAttribute("data-maxlength")) || 0;
    if (max) text = text.slice(0, Math.max(0, max - fieldValue(box).length));
    if (!text) return;
    insertNodes(box, nodesForText(text));
});

document.querySelector(".social-view").addEventListener("input", function (event) {
    if (event.target.classList && event.target.classList.contains("rich-text")) markEmpty(event.target);
});

document.querySelector(".social-view").addEventListener("click", function (event) {
    var emojiButton = event.target.closest(".emoji-open");
    if (emojiButton) {
        var form = emojiButton.closest(".comment-form");
        openEmojiPanel(emojiButton, form.querySelector(".rich-text"));
        return;
    }

    var line = event.target.closest(".line-btn");
    if (line) {
        var pop = line.parentNode.querySelector(".delete-pop");
        var opening = pop.hidden;
        closeDeleteMenus();
        pop.hidden = !opening;
        return;
    }

    var reportPostButton = event.target.closest("[data-report-post]");
    if (reportPostButton) {
        closeDeleteMenus();
        if (window.discodeReport) window.discodeReport({ type: "Post", id: reportPostButton.getAttribute("data-report-post"), label: "post" });
        return;
    }

    var reportCommentButton = event.target.closest("[data-report-comment]");
    if (reportCommentButton) {
        closeDeleteMenus();
        var reportIsReply = !!reportCommentButton.closest(".comment.is-reply");
        if (window.discodeReport) window.discodeReport({ type: "Comment", id: reportCommentButton.getAttribute("data-report-comment"), label: reportIsReply ? "reply" : "comment" });
        return;
    }

    var editPostButton = event.target.closest("[data-edit-post]");
    if (editPostButton) {
        closeDeleteMenus();
        var editCard = editPostButton.closest(".post");
        var editBody = editCard.querySelector(".post-text");
        var editId = Number(editPostButton.getAttribute("data-edit-post"));
        startTextEdit(editBody, editBody.getAttribute("data-raw") || "", 500, function (text) {
            return requestJson("/Home/UpdatePost", "POST", { id: editId, text: text });
        });
        return;
    }

    var editCommentButton = event.target.closest("[data-edit-comment]");
    if (editCommentButton) {
        closeDeleteMenus();
        var commentText = editCommentButton.closest(".comment").querySelector(".comment-body p");
        var commentId = Number(editCommentButton.getAttribute("data-edit-comment"));
        startTextEdit(commentText, commentText.getAttribute("data-raw") || "", 280, function (text) {
            return requestJson("/Home/UpdateComment", "POST", { id: commentId, text: text });
        });
        return;
    }

    var deletePost = event.target.closest("[data-delete-post]");
    if (deletePost) {
        var postId = deletePost.getAttribute("data-delete-post");
        requestJson("/Home/DeletePost", "POST", { id: Number(postId) }).then(function () {
            loadFeed(currentView);
        }).catch(function () {});
        return;
    }

    var deleteComment = event.target.closest("[data-delete-comment]");
    if (deleteComment) {
        requestJson("/Home/DeleteComment", "POST", { id: Number(deleteComment.getAttribute("data-delete-comment")) }).then(function () {
            return loadFeed(currentView);
        }).catch(function () {});
        return;
    }

    if (!event.target.closest(".item-menu")) closeDeleteMenus();

    var replyCancel = event.target.closest("[data-reply-cancel]");
    if (replyCancel) {
        var cancelCard = replyCancel.closest(".post");
        replyTarget = null;
        var cancelForm = cancelCard.querySelector(".comment-form");
        cancelForm.removeAttribute("data-parent");
        cancelForm.querySelector(".rich-text").setAttribute("data-placeholder", "Add a comment...");
        cancelCard.querySelector(".reply-chip").hidden = true;
        return;
    }
    var replyOpen = event.target.closest("[data-reply-comment]");
    if (replyOpen) {
        var replyCard = replyOpen.closest(".post");
        var replyForm = replyCard.querySelector(".comment-form");
        var replyPost = replyCard.getAttribute("data-post");
        replyTarget = { post: replyPost, id: replyOpen.getAttribute("data-reply-comment"), author: replyOpen.getAttribute("data-reply-author") };
        openCommentPost = replyPost;
        replyCard.classList.add("comments-open");
        replyForm.hidden = false;
        showReplyChip(replyCard, replyPost);
        replyForm.querySelector(".rich-text").focus();
        return;
    }
    var commentOpen = event.target.closest("[data-comment-post]");
    if (commentOpen) {
        var commentPostId = commentOpen.getAttribute("data-comment-post");
        var commentCard = commentOpen.closest(".post");
        var commentForm = commentCard.querySelector(".comment-form");
        var opening = !commentCard.classList.contains("comments-open");
        document.querySelectorAll(".social-view .post.comments-open").forEach(function (other) {
            if (other !== commentCard) setCommentsOpen(other, false);
        });
        openCommentPost = opening ? commentPostId : null;
        setCommentsOpen(commentCard, opening);
        if (opening && commentForm) commentForm.querySelector(".rich-text").focus({ preventScroll: true });
        return;
    }

    var postRepost = event.target.closest("[data-repost-post]");
    if (postRepost) {
        requestJson("/Home/TogglePostRepost", "POST", { id: Number(postRepost.getAttribute("data-repost-post")) }).then(function (result) {
            setRepost(postRepost, result.reposted, result.count);
        }).catch(function () {});
        return;
    }

    var postLike = event.target.closest("[data-like-post]");
    if (postLike) {
        requestJson("/Home/TogglePostLike", "POST", { id: Number(postLike.getAttribute("data-like-post")) }).then(function (result) {
            setLike(postLike, result.liked, result.count);
        }).catch(function () {});
        return;
    }

    var button = event.target.closest(".like-btn");
    if (!button) return;
    requestJson("/Home/ToggleCommentLike", "POST", { id: Number(button.getAttribute("data-like")) }).then(function (result) {
        setLike(button, result.liked, result.count);
    }).catch(function () {});
});

document.addEventListener("discode-posts-changed", function () {
    if (currentView === "explore" || currentView === "friends" || currentView === "compose") loadFeed(currentView);
});

