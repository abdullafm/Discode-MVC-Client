"use strict";
var micO = false;
var headO = false;
var ME = (document.querySelector(".social-view") || document.body).getAttribute("data-username") || "Anonymou5";
var currentView = "explore";
var pendingImage = "";
var pendingVideo = null;
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
    if (typeof updateMicHeadphoneIcon === "function") updateMicHeadphoneIcon();
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

var serverStories = [];
var seenNow = {};

function loadStories() {
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
            seen: !!item.seenByMe || !!seenNow[item.id]
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
        renderStories();
        openWantedStory();
    }).catch(function () {});
}

var wantedStory = Number(new URLSearchParams(window.location.search).get("story")) || 0;

function storyNotice(text) {
    var note = document.createElement("div");
    note.className = "story-notice";
    note.textContent = text;
    document.body.appendChild(note);
    setTimeout(function () {
        if (window.discodeDismiss) window.discodeDismiss(note);
        else if (note.parentNode) note.parentNode.removeChild(note);
    }, 3500);
}

function openWantedStory() {
    if (!wantedStory) return;
    var id = wantedStory;
    wantedStory = 0;
    var found = loadStories().filter(function (item) { return item.id === id; })[0];
    if (!found) {
        storyNotice("This story is no longer available.");
        return;
    }
    openStories(found.author);
    var group = storyGroups[storyCursor];
    if (!group) return;
    for (var i = 0; i < group.items.length; i++) {
        if (group.items[i].id === id) {
            storyIndex = i;
            paintStory();
            break;
        }
    }
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
var feeds = { explore: [], friends: [], mine: [] };

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


function mapComment(dto) {
    return {
        id: String(dto.id),
        parentId: dto.parentCommentId ? String(dto.parentCommentId) : "",
        author: dto.authorUserName,
        avatar: dto.authorAvatarUrl || "",
        text: dto.text || "",
        createdAt: utcMillis(dto.createdAt),
        edited: !!dto.editedAt,
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
            visibility: dto.visibility === "friends" ? "friends" : "public",
            createdAt: utcMillis(dto.createdAt),
            edited: !!dto.editedAt,
            likes: dto.likeCount || 0,
            liked: !!dto.likedByMe,
            reposts: dto.repostCount || 0,
            reposted: !!dto.repostedByMe,
            comments: (dto.comments || []).map(mapComment)
        };
    });
}

// Şərh düyməsi: şərhlər və yazı sahəsi birlikdə yumşaq açılır / bağlanır
function slideBlock(block, opening, done) {
    if (!block || !block.animate) {
        if (done) done();
        return;
    }
    var cs = getComputedStyle(block);
    var height = block.offsetHeight;
    var margin = cs.marginTop;
    var shut = { height: "0px", marginTop: "0px", paddingTop: "0px", paddingBottom: "0px", opacity: 0 };
    var wide = { height: height + "px", marginTop: margin, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, opacity: 1 };
    var previous = block.style.overflow;
    block.style.overflow = "hidden";
    block.style.boxSizing = "border-box";
    var run = block.animate(opening ? [shut, wide] : [wide, shut], { duration: 240, easing: "cubic-bezier(0.22, 0.8, 0.3, 1)" });
    run.onfinish = function () {
        block.style.overflow = previous;
        block.style.boxSizing = "";
        if (done) done();
    };
}

function setCommentsOpen(card, open) {
    var form = card.querySelector(".comment-form");
    var blocks = [card.querySelector(".comment-list"), form].filter(Boolean);
    if (open) {
        card.classList.add("comments-open");
        if (form) form.hidden = false;
        blocks.forEach(function (block) { slideBlock(block, true); });
        return;
    }

    if (!card.classList.contains("comments-open")) return;
    var left = blocks.length;
    var finish = function () {
        left -= 1;
        if (left > 0) return;
        card.classList.remove("comments-open");
        if (form) form.hidden = true;
    };
    if (!blocks.length) finish();
    blocks.forEach(function (block) { slideBlock(block, false, finish); });
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

var feedRequest = { explore: 0, friends: 0, mine: 0 };

function feedKey(view) {
    return view === "compose" ? "mine" : view;
}

function loadFeed(view) {
    view = feedKey(view);
    var request = ++feedRequest[view];
    var url = view === "friends" ? "/Home/FriendsPosts" : view === "mine" ? "/Home/UserPosts?name=" + encodeURIComponent(ME) : "/Home/ExplorePosts";
    return requestJson(url).then(function (list) {
        if (request !== feedRequest[view]) return;
        feeds[view] = mapPosts(Array.isArray(list) ? list : []);
        if (feedKey(currentView) === view) renderFeed();
    }).catch(function () {});
}


function showView(view) {
    currentView = view;
    if (!document.getElementById("view-explore")) return;
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
    if (view === "explore" || view === "friends" || view === "compose") {
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
    pendingVideo = null;
    document.getElementById("post-image").value = "";
    var preview = document.getElementById("photo-preview");
    var image = document.getElementById("photo-preview-img");
    var clip = document.getElementById("photo-preview-video");
    preview.hidden = true;
    if (image) image.removeAttribute("src");
    if (clip) {
        clip.pause();
        if (clip.src) URL.revokeObjectURL(clip.src);
        clip.removeAttribute("src");
        clip.hidden = true;
    }
    if (image) image.hidden = false;
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

function setRepost(button, reposted, count) {
    button.classList.toggle("reposted", !!reposted);
    var total = button.querySelector("span");
    if (total) total.textContent = String(count || 0);
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

var replyTarget = null;

function threadComments(list) {
    var known = {};
    list.forEach(function (comment) { known[comment.id] = true; });
    var children = {};
    list.forEach(function (comment) {
        var key = comment.parentId && known[comment.parentId] ? comment.parentId : "0";
        if (!children[key]) children[key] = [];
        children[key].push(comment);
    });
    var ordered = [];
    (function walk(parent, depth) {
        (children[parent] || []).forEach(function (comment) {
            ordered.push({ comment: comment, depth: depth });
            walk(comment.id, depth + 1);
        });
    })("0", 0);
    return ordered;
}

function showReplyChip(card, post) {
    var chip = card.querySelector(".reply-chip");
    var form = card.querySelector(".comment-form");
    if (!chip || !form) return;
    var active = replyTarget && replyTarget.post === post;
    chip.hidden = !active || form.hidden;
    form.removeAttribute("data-parent");
    if (active) {
        form.setAttribute("data-parent", replyTarget.id);
        var label = chip.querySelector("span");
        if (label) label.textContent = "Replying to " + replyTarget.author;
        var box = form.querySelector(".rich-text");
        if (box) box.setAttribute("data-placeholder", "Reply to " + replyTarget.author + "...");
    }
}

// Feed yenilənəndə dəyişməyən postlar olduğu kimi qalır (şəkil və video yenidən yüklənib qaralmasın)
function postSignature(post) {
    return JSON.stringify([
        post.id, post.author, post.avatar, post.text, post.image, post.visibility, post.edited,
        (post.comments || []).map(function (c) { return [c.id, c.author, c.avatar, c.text, c.edited, c.parent || c.parentId || null]; })
    ]);
}

function refreshPostCounters(card, post) {
    var like = card.querySelector("[data-like-post]");
    if (like) setLike(like, post.liked, post.likes || 0);
    var repost = card.querySelector("[data-repost-post]");
    if (repost) setRepost(repost, post.reposted, post.reposts || 0);
    var commentButton = card.querySelector("[data-comment-post]");
    if (commentButton) commentButton.setAttribute("data-count", String((post.comments || []).length));
    var when = card.querySelector(".post-name time");
    if (when) when.textContent = timeAgo(post.createdAt);
    (post.comments || []).forEach(function (comment) {
        var heart = card.querySelector('[data-like="' + comment.id + '"]');
        if (heart) setLike(heart, comment.liked, comment.likes);
    });
}

function renderFeed() {
    closeEmojiPanel();
    var view = currentView === "friends" ? "friends" : currentView === "compose" ? "mine" : "explore";
    var list = document.getElementById(view + "-list");
    var empty = document.getElementById(view + "-empty");
    if (!list) return;
    var posts = feeds[view];
    var draft = captureDraft(list);
    var scroller = scrollParent(list);
    var keepTop = scroller ? scroller.scrollTop : 0;
    var keepHeight = list.offsetHeight;
    if (keepHeight) list.style.minHeight = keepHeight + "px";
    if (empty) empty.hidden = posts.length > 0;
    if (!posts.length) {
        while (list.firstChild) list.removeChild(list.firstChild);
        list.style.minHeight = "";
        return;
    }
    var oldCards = {};
    [].forEach.call(list.children, function (node) {
        var oldId = node.getAttribute && node.getAttribute("data-post");
        if (oldId && node.classList.contains("post")) oldCards[oldId] = node;
    });
    var cursor = list.firstElementChild;
    var rebuilt = {};
    var used = {};
    function place(node) {
        if (node === cursor) {
            cursor = cursor.nextElementSibling;
            return;
        }
        list.insertBefore(node, cursor);
    }
    var postTpl = document.getElementById("post-card");
    var commentTpl = document.getElementById("comment-card");
    posts.forEach(function (post) {
        if (!postTpl) return;
        var signature = postSignature(post);
        var before = oldCards[post.id];
        used[post.id] = true;
        if (before && before._sig === signature) {
            refreshPostCounters(before, post);
            var keptForm = before.querySelector(".comment-form");
            if (keptForm) keptForm.hidden = openCommentPost !== post.id;
            before.classList.toggle("comments-open", openCommentPost === post.id);
            showReplyChip(before, post.id);
            place(before);
            return;
        }
        var card = postTpl.content.firstElementChild.cloneNode(true);
        card._sig = signature;
        rebuilt[post.id] = true;
        var mine = post.author === ME;
        card.setAttribute("data-post", post.id);
        setPersonFace(card.querySelector(".post-author > img"), card.querySelector(".post-author > .avatar-letter"), post.author, post.avatar || DEFAULT_AVATAR);
        var formFaces = card.querySelectorAll(".comment-form > img, .comment-form > .avatar-letter");
        setPersonFace(formFaces[0], formFaces[1], ME, myPhoto() || DEFAULT_AVATAR);
        var name = card.querySelector(".post-name strong");
        var when = card.querySelector(".post-name time");
        if (name) name.textContent = post.author;
        if (when) when.textContent = timeAgo(post.createdAt);
        var scope = card.querySelector(".post-scope");
        if (scope) scope.hidden = post.visibility !== "friends";
        var menu = card.querySelector(".post-author .item-menu");
        if (menu) {
            menu.hidden = false;
            var reportPost = menu.querySelector("[data-report-post]");
            if (reportPost) {
                reportPost.setAttribute("data-report-post", post.id);
                reportPost.hidden = mine;
            }
            var remove = menu.querySelector("[data-delete-post]");
            if (remove) {
                remove.setAttribute("data-delete-post", post.id);
                remove.hidden = !mine;
            }
            var editPost = menu.querySelector("[data-edit-post]");
            if (editPost) {
                editPost.setAttribute("data-edit-post", post.id);
                editPost.hidden = !mine;
            }
        }
        var body = card.querySelector(".post-text");
        if (body) {
            body.hidden = !post.text;
            body.setAttribute("data-raw", post.text || "");
            if (post.text) fillText(body, post.text);
            if (post.text && post.edited) appendEditedTag(body);
        }
        var photo = card.querySelector(".post-photo");
        if (photo) {
            var showPhoto = post.image && post.image.indexOf("/uploads/posts/") === 0;
            if (showPhoto && window.discodeIsVideo(post.image)) {
                photo.hidden = true;
                photo.parentNode.insertBefore(window.discodeReel(post.image), photo);
            } else {
                photo.hidden = !showPhoto;
                if (showPhoto) photo.src = post.image;
            }
        }
        var like = card.querySelector("[data-like-post]");
        if (like) {
            like.setAttribute("data-like-post", post.id);
            setLike(like, post.liked, post.likes || 0);
        }
        var commentOpen = card.querySelector("[data-comment-post]");
        if (commentOpen) {
            commentOpen.setAttribute("data-comment-post", post.id);
            commentOpen.setAttribute("data-count", String((post.comments || []).length));
        }
        var repost = card.querySelector("[data-repost-post]");
        if (repost) {
            repost.setAttribute("data-repost-post", post.id);
            setRepost(repost, post.reposted, post.reposts || 0);
        }
        var comments = card.querySelector(".comment-list");
        threadComments(post.comments || []).forEach(function (entry) {
            var comment = entry.comment;
            if (!commentTpl || !comments) return;
            var item = commentTpl.content.firstElementChild.cloneNode(true);
            if (entry.depth > 0) {
                item.classList.add("is-reply");
                item.style.marginLeft = Math.min(entry.depth, 4) * 34 + "px";
            }
            var replyButton = item.querySelector("[data-reply-comment]");
            if (replyButton) {
                replyButton.setAttribute("data-reply-comment", comment.id);
                replyButton.setAttribute("data-reply-author", comment.author);
            }
            setPersonFace(item.querySelector("img"), item.querySelector(".avatar-letter"), comment.author, comment.avatar || DEFAULT_AVATAR);
            var who = item.querySelector("strong");
            var said = item.querySelector("p");
            var at = item.querySelector("time");
            if (who) who.textContent = comment.author;
            if (said) {
                fillText(said, comment.text);
                said.setAttribute("data-raw", comment.text || "");
                if (comment.edited) appendEditedTag(said);
            }
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
                commentMenu.hidden = false;
                var reportComment = commentMenu.querySelector("[data-report-comment]");
                if (reportComment) {
                    reportComment.setAttribute("data-report-comment", comment.id);
                    reportComment.hidden = comment.author === ME;
                }
                var drop = commentMenu.querySelector("[data-delete-comment]");
                if (drop) {
                    drop.setAttribute("data-delete-comment", comment.id);
                    drop.setAttribute("data-post", post.id);
                    drop.hidden = !canDelete;
                }
                var editComment = commentMenu.querySelector("[data-edit-comment]");
                if (editComment) {
                    editComment.setAttribute("data-edit-comment", comment.id);
                    editComment.hidden = comment.author !== ME;
                }
            }
            comments.appendChild(item);
        });
        var form = card.querySelector(".comment-form");
        if (form) {
            form.setAttribute("data-post", post.id);
            form.hidden = openCommentPost !== post.id;
        }
        card.classList.toggle("comments-open", openCommentPost === post.id);
        showReplyChip(card, post.id);
        if (before) {
            if (before === cursor) cursor = before.nextElementSibling;
            if (before.parentNode === list) list.removeChild(before);
        }
        place(card);
    });
    // artıq feeddə olmayan postlar silinir
    [].slice.call(list.children).forEach(function (node) {
        var nodeId = node.getAttribute && node.getAttribute("data-post");
        if (nodeId && !used[nodeId]) list.removeChild(node);
    });
    if (draft && rebuilt[draft.post]) restoreDraft(list, draft);
    list.style.minHeight = "";
    if (scroller) scroller.scrollTop = keepTop;
}

function scrollParent(node) {
    for (var el = node.parentElement; el; el = el.parentElement) {
        var overflow = getComputedStyle(el).overflowY;
        if ((overflow === "auto" || overflow === "scroll") && el.scrollHeight > el.clientHeight) return el;
    }
    return null;
}

function appendEditedTag(element) {
    var tag = document.createElement("span");
    tag.className = "edited-tag";
    tag.textContent = " (edited)";
    element.appendChild(tag);
}

function startTextEdit(textElement, raw, maxLength, save) {
    if (!textElement.parentNode || textElement.parentNode.querySelector(".edit-box")) return;
    var box = document.createElement("div");
    box.className = "edit-box";
    var field = document.createElement("div");
    field.className = "rich-text edit-field";
    field.setAttribute("contenteditable", "true");
    field.setAttribute("role", "textbox");
    field.setAttribute("data-maxlength", String(maxLength));
    field.setAttribute("data-empty", "0");
    nodesForText(raw).forEach(function (node) { field.appendChild(node); });
    var error = document.createElement("p");
    error.className = "edit-error";
    error.hidden = true;
    var actions = document.createElement("div");
    actions.className = "edit-actions";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "edit-cancel";
    cancel.textContent = "Cancel";
    var saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "edit-save";
    saveButton.textContent = "Save";
    actions.appendChild(cancel);
    actions.appendChild(saveButton);
    box.appendChild(field);
    box.appendChild(error);
    box.appendChild(actions);
    var wasHidden = textElement.hidden;
    textElement.hidden = true;
    textElement.parentNode.insertBefore(box, textElement.nextSibling);
    if (window.discodeMentions && window.discodeMentions.attach) window.discodeMentions.attach(field, window.discodeMentions.friends);
    field.focus();
    var range = document.createRange();
    range.selectNodeContents(field);
    range.collapse(false);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    function close() {
        if (box.parentNode) box.parentNode.removeChild(box);
        textElement.hidden = wasHidden;
    }

    function commit() {
        var text = fieldValue(field).trim();
        saveButton.disabled = true;
        error.hidden = true;
        save(text).then(function () {
            return loadFeed(currentView);
        }).catch(function (problem) {
            error.textContent = (problem && problem.message) || "Could not save the change.";
            error.hidden = false;
            saveButton.disabled = false;
        });
    }

    cancel.addEventListener("click", close);
    saveButton.addEventListener("click", commit);
    field.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            event.preventDefault();
            close();
        } else if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            commit();
        }
    });
}

function showPostError(message) {
    var el = document.getElementById("post-error");
    if (!el) return;
    el.textContent = message || "";
    el.hidden = !message;
}

function uploadPostVideo() {
    var data = new FormData();
    data.append("file", pendingVideo, pendingVideo.name || "post.mp4");
    return fetch("/Home/UploadPostVideo", {
        method: "POST",
        credentials: "same-origin",
        headers: { "RequestVerificationToken": csrfToken(), "X-Requested-With": "XMLHttpRequest" },
        body: data
    }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (result) {
            if (!response.ok) throw readError(response, result);
            return result.imageUrl;
        });
    });
}

function uploadPostImage() {
    if (pendingVideo) return uploadPostVideo();
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
