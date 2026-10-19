"use strict";
var micO = false;
var headO = false;
var STORE_KEY = "discode-social";
var ME = (document.querySelector(".social-view") || document.body).getAttribute("data-username") || "Anonymou5";
var currentView = "explore";
var pendingImage = "";
var openCommentPost = null;

window.onload = function () {
    setTimeout(function () {
        var loader = document.getElementById("loader");
        if (loader) {
            loader.remove();
        }
    }, 2000);
    showView("explore");
};

var x = new Audio("/assets/css/audio/discordmute_IZNcLx2.mp3");
var y = new Audio("/assets/css/audio/discord-unmute-sound.mp3");

function mic() {
    if (!micO) {
        x.play();
        document.getElementById("mic").className = "fa-solid fa-microphone-slash mute";
        micO = true;
    } else {
        y.play();
        document.getElementById("mic").className = "fa-solid fa-microphone";
        micO = false;
        if (headO) {
            document.getElementById("head").className = "fa-solid fa-headphones";
            headO = false;
        }
    }
}

function headp() {
    if (!headO) {
        x.play();
        document.getElementById("head").className = "fa-solid fa-headphones mute";
        headO = true;
        if (!micO) {
            document.getElementById("mic").className = "fa-solid fa-microphone-slash mute";
            micO = true;
        }
    } else {
        document.getElementById("head").className = "fa-solid fa-headphones";
        y.play();
        headO = false;
        if (micO) {
            document.getElementById("mic").className = "fa-solid fa-microphone";
            micO = false;
        }
    }
}

function openToggle() {
    if (!window.matchMedia("(max-width: 720px)").matches) return;
    document.querySelector("main").classList.toggle("show-main");
}

document.addEventListener("DOMContentLoaded", function () {
    updateMicHeadphoneIcon();
});

var STORY_MS = 5000;
var STORY_W = 540;
var STORY_H = 960;
var STORY_FILTERS = [
    { id: "none", label: "Normal", css: "none" },
    { id: "vivid", label: "Vivid", css: "contrast(1.15) saturate(1.4)" },
    { id: "warm", label: "Warm", css: "sepia(0.28) saturate(1.25)" },
    { id: "cool", label: "Cool", css: "saturate(0.9) hue-rotate(14deg)" },
    { id: "fade", label: "Fade", css: "contrast(0.9) brightness(1.08) saturate(0.75)" },
    { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.08)" }
];
var emojiField = null;
var storyGroups = [];
var storyCursor = 0;
var storyIndex = 0;
var storyTimer = null;
var storyDraft = null;

function loadState() {
    try {
        var saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
        return {
            posts: Array.isArray(saved.posts) ? saved.posts : [],
            stories: Array.isArray(saved.stories) ? saved.stories : []
        };
    } catch (err) {
        return { posts: [], stories: [] };
    }
}

function saveState(state) {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function loadPosts() {
    return loadState().posts;
}

function savePosts(posts) {
    var state = loadState();
    state.posts = posts;
    saveState(state);
}

var SEEN_KEY = "discode-seen-stories";
var serverStories = [];

function seenIds() {
    try {
        var saved = JSON.parse(localStorage.getItem(SEEN_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (err) {
        return [];
    }
}

function loadStories() {
    var seen = seenIds();
    return serverStories.map(function (item) {
        return {
            id: item.id,
            author: item.authorUserName,
            name: item.authorDisplayName || item.authorUserName,
            avatar: item.authorAvatarUrl || "",
            image: item.imageUrl,
            createdAt: utcMillis(item.createdAt),
            likes: item.likeCount || 0,
            liked: !!item.likedByMe,
            views: item.viewCount || 0,
            seen: seen.indexOf(item.id) !== -1
        };
    });
}

function checkStoryImage(item) {
    var probe = new Image();
    probe.onerror = function () {
        if (item.authorUserName === ME) {
            requestJson("/Home/DeleteStory", "POST", { id: item.id, imageUrl: item.imageUrl }).then(refreshStories).catch(function () {});
            return;
        }
        serverStories = serverStories.filter(function (other) { return other.id !== item.id; });
        renderStories();
    };
    probe.src = item.imageUrl;
}

function refreshStories() {
    return requestJson("/Home/Stories").then(function (data) {
        serverStories = Array.isArray(data) ? data : [];
        serverStories.forEach(checkStoryImage);
        var ids = serverStories.map(function (item) { return item.id; });
        var kept = seenIds().filter(function (id) { return ids.indexOf(id) !== -1; });
        localStorage.setItem(SEEN_KEY, JSON.stringify(kept));
        renderStories();
    }).catch(function () {});
}

function nextId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function friendNames() {
    var names = [];
    var rows = document.querySelectorAll(".friend-item:not([data-group]) p, .new-msg-friend > span");
    for (var i = 0; i < rows.length; i++) {
        var name = rows[i].textContent.trim();
        if (name && names.indexOf(name) === -1) names.push(name);
    }
    return names;
}

function timeAgo(stamp) {
    var seconds = Math.max(1, Math.floor((Date.now() - stamp) / 1000));
    if (seconds < 60) return seconds + "s";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h";
    var days = Math.floor(hours / 24);
    return days + "d";
}

function initial(name) {
    var letter = (name || "?").trim().charAt(0).toUpperCase();
    return letter || "?";
}

var DEFAULT_AVATAR = "/assets/img/img-icon-profile.jpeg";
var feeds = { explore: [], friends: [] };

function csrfToken() {
    var input = document.querySelector("input[name='__RequestVerificationToken']");
    return input ? input.value : "";
}

function readError(response, data) {
    return new Error((data && data.errors && data.errors[0]) || "Something went wrong (" + response.status + ").");
}

function requestJson(url, method, body) {
    return fetch(url, {
        method: method || "GET",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "RequestVerificationToken": csrfToken(),
            "X-Requested-With": "XMLHttpRequest"
        },
        body: body ? JSON.stringify(body) : undefined
    }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok) throw readError(response, data);
            return data;
        });
    });
}

function utcMillis(value) {
    var text = String(value || "");
    return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(text) ? text : text + "Z");
}

function purgeLegacyPosts() {
    var state = loadState();
    if (!state.posts.length) return;
    state.posts = [];
    saveState(state);
}

function mapComment(dto) {
    return {
        id: String(dto.id),
        author: dto.authorUserName,
        avatar: dto.authorAvatarUrl || "",
        text: dto.text || "",
        createdAt: utcMillis(dto.createdAt),
        likes: dto.likeCount || 0,
        liked: !!dto.likedByMe
    };
}

function mapPosts(list) {
    return list.map(function (dto) {
        return {
            id: String(dto.id),
            author: dto.authorUserName,
            avatar: dto.authorAvatarUrl || "",
            text: dto.text || "",
            image: dto.imageUrl || "",
            createdAt: utcMillis(dto.createdAt),
            likes: dto.likeCount || 0,
            liked: !!dto.likedByMe,
            comments: (dto.comments || []).map(mapComment)
        };
    });
}

function captureDraft(list) {
    if (!openCommentPost) return null;
    var form = list.querySelector('.comment-form[data-post="' + openCommentPost + '"]');
    var box = form && form.querySelector(".rich-text");
    if (!box) return null;
    return { post: openCommentPost, html: box.innerHTML, empty: box.getAttribute("data-empty"), focused: document.activeElement === box };
}

function restoreDraft(list, draft) {
    if (!draft || draft.empty === "1") return;
    var form = list.querySelector('.comment-form[data-post="' + draft.post + '"]');
    var box = form && form.querySelector(".rich-text");
    if (!box) return;
    box.innerHTML = draft.html;
    box.setAttribute("data-empty", draft.empty || "0");
    if (!draft.focused) return;
    box.focus();
    var range = document.createRange();
    range.selectNodeContents(box);
    range.collapse(false);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

function clearField(box) {
    while (box.firstChild) box.removeChild(box.firstChild);
    box.setAttribute("data-empty", "1");
}

var feedRequest = { explore: 0, friends: 0 };

function loadFeed(view) {
    var request = ++feedRequest[view];
    return requestJson(view === "friends" ? "/Home/FriendsPosts" : "/Home/ExplorePosts").then(function (list) {
        if (request !== feedRequest[view]) return;
        feeds[view] = mapPosts(Array.isArray(list) ? list : []);
        if (currentView === view) renderFeed();
    }).catch(function () {});
}

purgeLegacyPosts();

function showView(view) {
    currentView = view;
    document.getElementById("view-explore").hidden = view !== "explore";
    document.getElementById("view-friends").hidden = view !== "friends";
    document.getElementById("view-live").hidden = view !== "live";
    document.getElementById("view-compose").hidden = view !== "compose";
    document.getElementById("social-title").textContent = view === "compose" ? "Post" : view === "friends" ? "Friends" : view === "live" ? "Live" : "Explore";
    var buttons = document.querySelectorAll(".social-rail button");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle("active", buttons[i].getAttribute("data-view") === view);
    }
    if (view === "friends") {
        renderStories();
        refreshStories();
    }
    if ((view === "live" || view === "explore") && window.discodeLiveRefresh) window.discodeLiveRefresh();
    if (view === "explore" || view === "friends") {
        renderFeed();
        loadFeed(view);
    }
}

function readImage(file, done) {
    var reader = new FileReader();
    reader.onload = function () {
        var img = new Image();
        img.onload = function () {
            var max = 900;
            var scale = Math.min(1, max / Math.max(img.width, img.height));
            var canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            done(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

function clearPhoto() {
    pendingImage = "";
    document.getElementById("post-image").value = "";
    var preview = document.getElementById("photo-preview");
    var image = document.getElementById("photo-preview-img");
    preview.hidden = true;
    if (image) image.removeAttribute("src");
}

function setPersonFace(img, letter, name, avatarUrl) {
    var src = avatarUrl || avatarFor(name);
    if (src && img) {
        img.hidden = false;
        img.src = src;
        if (letter) letter.hidden = true;
        return;
    }
    if (img) img.hidden = true;
    if (letter) {
        letter.hidden = false;
        letter.textContent = initial(name);
    }
}

function setLike(button, liked, count) {
    button.classList.toggle("liked", !!liked);
    var icon = button.querySelector("i");
    if (icon) icon.className = (liked ? "fa-solid" : "fa-regular") + " fa-heart";
    var total = button.querySelector("span");
    if (total) total.textContent = String(count || 0);
}

function fillText(el, value) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var text = String(value || "");
    var last = 0;
    FLAG_RE.lastIndex = 0;
    text.replace(FLAG_RE, function (flag, index) {
        if (index > last) el.appendChild(document.createTextNode(text.slice(last, index)));
        var picture = cloneTpl("flag-img");
        if (picture) {
            picture.alt = countryLabel(flag) || "";
            picture.title = picture.alt;
            picture.src = flagPicture(flag);
            if (flagCode(flag)) {
                picture.onerror = function () {
                    picture.onerror = null;
                    picture.src = twemojiSrc(flag);
                };
            }
            el.appendChild(picture);
        }
        last = index + flag.length;
        return flag;
    });
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
    FLAG_RE.lastIndex = 0;
}

function renderFeed() {
    closeEmojiPanel();
    var view = currentView === "friends" ? "friends" : "explore";
    var list = document.getElementById(view === "friends" ? "friends-list" : "explore-list");
    var empty = document.getElementById(view === "friends" ? "friends-empty" : "explore-empty");
    var posts = feeds[view];
    var draft = captureDraft(list);
    while (list.firstChild) list.removeChild(list.firstChild);
    if (empty) empty.hidden = posts.length > 0;
    if (!posts.length) return;
    var postTpl = document.getElementById("post-card");
    var commentTpl = document.getElementById("comment-card");
    posts.forEach(function (post) {
        if (!postTpl) return;
        var card = postTpl.content.firstElementChild.cloneNode(true);
        var mine = post.author === ME;
        card.setAttribute("data-post", post.id);
        setPersonFace(card.querySelector(".post-author > img"), card.querySelector(".post-author > .avatar-letter"), post.author, post.avatar || DEFAULT_AVATAR);
        var formFaces = card.querySelectorAll(".comment-form > img, .comment-form > .avatar-letter");
        setPersonFace(formFaces[0], formFaces[1], ME, myPhoto() || DEFAULT_AVATAR);
        var name = card.querySelector(".post-name strong");
        var when = card.querySelector(".post-name time");
        if (name) name.textContent = post.author;
        if (when) when.textContent = timeAgo(post.createdAt);
        var menu = card.querySelector(".post-author .item-menu");
        if (menu) {
            menu.hidden = !mine;
            var remove = menu.querySelector("[data-delete-post]");
            if (remove) remove.setAttribute("data-delete-post", post.id);
        }
        var body = card.querySelector(".post-text");
        if (body) {
            body.hidden = !post.text;
            if (post.text) fillText(body, post.text);
        }
        var photo = card.querySelector(".post-photo");
        if (photo) {
            var showPhoto = post.image && post.image.indexOf("/uploads/posts/") === 0;
            photo.hidden = !showPhoto;
            if (showPhoto) photo.src = post.image;
        }
        var like = card.querySelector("[data-like-post]");
        if (like) {
            like.setAttribute("data-like-post", post.id);
            setLike(like, post.liked, post.likes || 0);
        }
        var commentOpen = card.querySelector("[data-comment-post]");
        if (commentOpen) commentOpen.setAttribute("data-comment-post", post.id);
        var comments = card.querySelector(".comment-list");
        (post.comments || []).forEach(function (comment) {
            if (!commentTpl || !comments) return;
            var item = commentTpl.content.firstElementChild.cloneNode(true);
            setPersonFace(item.querySelector("img"), item.querySelector(".avatar-letter"), comment.author, comment.avatar || DEFAULT_AVATAR);
            var who = item.querySelector("strong");
            var said = item.querySelector("p");
            var at = item.querySelector("time");
            if (who) who.textContent = comment.author;
            if (said) fillText(said, comment.text);
            if (at) at.textContent = timeAgo(comment.createdAt);
            var heart = item.querySelector("[data-like]");
            if (heart) {
                heart.setAttribute("data-like", comment.id);
                heart.setAttribute("data-post", post.id);
                setLike(heart, comment.liked, comment.likes);
            }
            var commentMenu = item.querySelector(".item-menu");
            var canDelete = mine || comment.author === ME;
            if (commentMenu) {
                commentMenu.hidden = !canDelete;
                var drop = commentMenu.querySelector("[data-delete-comment]");
                if (drop) {
                    drop.setAttribute("data-delete-comment", comment.id);
                    drop.setAttribute("data-post", post.id);
                }
            }
            comments.appendChild(item);
        });
        var form = card.querySelector(".comment-form");
        if (form) {
            form.setAttribute("data-post", post.id);
            form.hidden = openCommentPost !== post.id;
        }
        list.appendChild(card);
    });
    restoreDraft(list, draft);
}

function showPostError(message) {
    var el = document.getElementById("post-error");
    if (!el) return;
    el.textContent = message || "";
    el.hidden = !message;
}

function uploadPostImage() {
    if (!pendingImage) return Promise.resolve("");
    return fetch(pendingImage).then(function (response) { return response.blob(); }).then(function (blob) {
        var data = new FormData();
        data.append("file", blob, "post.jpg");
        return fetch("/Home/UploadPostImage", {
            method: "POST",
            credentials: "same-origin",
            headers: { "RequestVerificationToken": csrfToken(), "X-Requested-With": "XMLHttpRequest" },
            body: data
        });
    }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok) throw readError(response, data);
            return data.imageUrl;
        });
    });
}

document.getElementById("post-composer").addEventListener("submit", function (event) {
    event.preventDefault();
    var textBox = document.getElementById("post-text");
    var text = fieldValue(textBox).trim();
    if (!text && !pendingImage) return;

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
    requestJson("/Home/CreateComment", "POST", { postId: postId, text: text }).then(function () {
        clearField(box);
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
        var seen = seenIds();
        seen.push(story.id);
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
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
    document.getElementById("story-menu").hidden = group.author !== ME;
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

function itemFont(item) {
    return item.type === "sticker"
        ? item.size + "px sans-serif"
        : "700 " + item.size + "px Nunito Sans, sans-serif";
}

function itemBox(ctx, item) {
    ctx.font = itemFont(item);
    var lines = item.type === "sticker" ? [item.text] : wrapText(ctx, item.text, STORY_W - 80);
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

function drawItem(ctx, item, selected) {
    var box = itemBox(ctx, item);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = itemFont(item);
    if (selected) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(item.x - box.width / 2 - 12, item.y - box.height / 2 - 8, box.width + 24, box.height + 16);
        ctx.setLineDash([]);
    }
    box.lines.forEach(function (line, index) {
        var y = item.y - box.height / 2 + box.lineH / 2 + index * box.lineH;
        if (item.type === "text") {
            ctx.lineWidth = 6;
            ctx.strokeStyle = item.color === "#111111" ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)";
            ctx.strokeText(line, item.x, y);
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

function markColors(box, current) {
    if (!box) return;
    var dots = box.querySelectorAll("[data-color]");
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("on", dots[i].getAttribute("data-color") === current);
}

function renderToolPanel() {
    var panel = document.getElementById("story-edit-panel");
    var tool = storyDraft && storyDraft.tool;
    var buttons = document.querySelectorAll(".story-edit-tools [data-tool]");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.toggle("on", buttons[i].getAttribute("data-tool") === tool);
    }
    document.getElementById("story-editor").classList.toggle("drawing", tool === "draw");
    var textTool = document.getElementById("story-tool-text");
    var drawTool = document.getElementById("story-tool-draw");
    var stickerTool = document.getElementById("story-tool-sticker");
    if (textTool) textTool.hidden = tool !== "text";
    if (drawTool) drawTool.hidden = tool !== "draw";
    if (stickerTool) stickerTool.hidden = tool !== "sticker";
    panel.hidden = !tool;
    if (tool === "text") {
        markColors(textTool, storyDraft.textColor);
        document.getElementById("story-text").focus();
    } else if (tool === "draw") {
        markColors(drawTool, storyDraft.ink);
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
            textColor: "#ffffff"
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
        if (Math.abs(point.x - item.x) <= box.width / 2 + 16 && Math.abs(point.y - item.y) <= box.height / 2 + 16) {
            return i;
        }
    }
    return -1;
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
        color: storyDraft.textColor
    });
    storyDraft.undo.push("item");
    storyDraft.selected = storyDraft.items.length - 1;
    input.value = "";
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
    var button = event.target.closest("[data-tool]");
    if (!button) return;
    var tool = button.getAttribute("data-tool");
    storyDraft.tool = storyDraft.tool === tool ? null : tool;
    renderToolPanel();
});

document.getElementById("story-edit-panel").addEventListener("click", function (event) {
    if (!storyDraft) return;
    var color = event.target.closest("[data-color]");
    if (color) {
        var value = color.getAttribute("data-color");
        if (storyDraft.tool === "draw") storyDraft.ink = value;
        else storyDraft.textColor = value;
        var dots = color.parentNode.children;
        for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("on", dots[i] === color);
        return;
    }
    var sticker = event.target.closest("[data-sticker]");
    if (sticker) {
        storyDraft.items.push({
            type: "sticker",
            text: sticker.getAttribute("data-sticker"),
            x: STORY_W / 2,
            y: STORY_H / 2,
            size: 78,
            color: "#ffffff"
        });
        storyDraft.undo.push("item");
        storyDraft.selected = storyDraft.items.length - 1;
        paintDraft();
        return;
    }
    if (event.target.closest("#story-text-add")) addStoryText();
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
        storyDraft.drawing = { color: storyDraft.ink, size: 10, points: [point] };
        storyDraft.selected = -1;
        paintDraft();
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
    if (!storyDraft.drag) return;
    var item = storyDraft.items[storyDraft.drag.index];
    item.x = point.x - storyDraft.drag.dx;
    item.y = point.y - storyDraft.drag.dy;
    paintDraft();
});

document.getElementById("story-canvas").addEventListener("pointerup", function () {
    if (!storyDraft) return;
    if (storyDraft.drawing && storyDraft.drawing.points.length) {
        storyDraft.strokes.push(storyDraft.drawing);
        storyDraft.undo.push("stroke");
    }
    storyDraft.drawing = null;
    storyDraft.drag = null;
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
    readImage(file, function (url) {
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

    var commentOpen = event.target.closest("[data-comment-post]");
    if (commentOpen) {
        var commentPostId = commentOpen.getAttribute("data-comment-post");
        var commentForm = commentOpen.closest(".post").querySelector(".comment-form");
        var opening = commentForm.hidden || openCommentPost !== commentPostId;
        document.querySelectorAll(".social-view .comment-form").forEach(function (form) {
            form.hidden = true;
        });
        openCommentPost = opening ? commentPostId : null;
        commentForm.hidden = !opening;
        if (opening) commentForm.querySelector(".rich-text").focus();
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
    if (currentView === "explore" || currentView === "friends") loadFeed(currentView);
});

var logoutBtn = document.getElementById("me-logout");
if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        if (confirm("Are you sure you want to log out?")) {
            window.location.href = "./login.html";
        }
    });
}
