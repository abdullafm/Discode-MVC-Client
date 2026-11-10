"use strict";

(function () {
    var modal = null;
    var postId = 0;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function notice(text) {
        var note = el("div", "story-notice", text);
        document.body.appendChild(note);
        setTimeout(function () {
            if (window.discodeDismiss) window.discodeDismiss(note);
            else if (note.parentNode) note.parentNode.removeChild(note);
        }, 3000);
    }

    function build() {
        modal = el("div", "dm-modal");
        modal.id = "post-share-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "post-share-title");
        modal.hidden = true;
        modal.innerHTML =
            '<div class="dm-modal-backdrop" data-close></div>' +
            '<div class="dm-modal-card dm-forward-card">' +
            '<button type="button" class="dm-modal-x" aria-label="Close" data-close><i class="fa-solid fa-xmark"></i></button>' +
            '<h2 id="post-share-title">Send to friends and groups</h2>' +
            '<p class="dm-modal-text">Pick the friends and groups who get this post.</p>' +
            '<label class="dm-forward-search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="post-share-search" placeholder="Search" aria-label="Search" autocomplete="off"></label>' +
            '<div class="dm-forward-list" id="post-share-list"></div>' +
            '<input type="text" class="post-share-note" id="post-share-note" maxlength="500" placeholder="Write a message..." aria-label="Message" autocomplete="off">' +
            '<div class="dm-forward-foot"><p class="dm-forward-error" id="post-share-error" hidden></p><div class="dm-forward-send"><button type="button" id="post-share-submit" disabled>Send <i class="fa-solid fa-paper-plane"></i></button></div></div>' +
            '</div>';
        document.body.appendChild(modal);

        modal.addEventListener("click", function (event) {
            if (event.target.closest("[data-close]")) close();
        });
        modal.querySelector("#post-share-list").addEventListener("change", function () {
            modal.querySelector("#post-share-submit").disabled = modal.querySelectorAll(".dm-forward-check:checked").length === 0;
        });
        modal.querySelector("#post-share-search").addEventListener("input", function () {
            var term = this.value.trim().toLowerCase();
            [].forEach.call(modal.querySelectorAll(".dm-forward-item"), function (item) {
                item.hidden = term.length > 0 && item.getAttribute("data-name").indexOf(term) === -1 && item.getAttribute("data-key").toLowerCase().indexOf(term) === -1;
            });
        });
        modal.querySelector("#post-share-submit").addEventListener("click", send);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modal && !modal.hidden) close();
        });
    }

    function error(text) {
        var box = modal.querySelector("#post-share-error");
        box.textContent = text || "";
        box.hidden = !text;
    }

    function close() {
        if (modal) modal.hidden = true;
    }

    function open(id) {
        if (!modal) build();
        postId = id;
        error("");
        modal.querySelector("#post-share-list").textContent = "";
        modal.querySelector("#post-share-search").value = "";
        modal.querySelector("#post-share-note").value = "";
        modal.querySelector("#post-share-submit").disabled = true;
        modal.hidden = false;
        fetch("/Dm/ForwardTargets?groups=true", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            if (!response.ok) throw new Error("targets");
            return response.text();
        }).then(function (html) {
            modal.querySelector("#post-share-list").innerHTML = html;
        }).catch(function () {
            error("Could not load your friends. Try again.");
        });
    }

    function send() {
        var names = [];
        [].forEach.call(modal.querySelectorAll(".dm-forward-check:checked"), function (box) { names.push(box.value); });
        if (!postId || !names.length) return;
        var button = modal.querySelector("#post-share-submit");
        button.disabled = true;
        error("");
        requestJson("/Home/SharePost", "POST", { id: postId, userNames: names.filter(function (v) { return v.indexOf("group:") !== 0; }), groupIds: names.filter(function (v) { return v.indexOf("group:") === 0; }).map(function (v) { return Number(v.slice(6)); }), note: modal.querySelector("#post-share-note").value.trim() }).then(function () {
            close();
            notice(names.length === 1 ? "Sent." : "Sent to " + names.length + " chats.");
        }).catch(function (failure) {
            error((failure && failure.message) || "Could not send the post.");
            button.disabled = false;
        });
    }

    document.addEventListener("click", function (event) {
        var share = event.target.closest && event.target.closest("[data-share-post]");
        if (!share) return;
        event.preventDefault();
        event.stopPropagation();
        open(Number(share.getAttribute("data-share-post")));
    }, true);

    var viewer = null;

    function closeViewer() {
        if (viewer && viewer.parentNode) viewer.parentNode.removeChild(viewer);
        viewer = null;
        var url = new URL(window.location.href);
        if (url.searchParams.has("post")) {
            url.searchParams.delete("post");
            window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
        }
    }

    function showShared(id) {
        fetch("/Home/PostCard?id=" + id, { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (post) {
            if (viewer) closeViewer();
            viewer = el("div", "dm-modal");
            viewer.innerHTML = '<div class="dm-modal-backdrop" data-close></div><div class="dm-modal-card post-view-card"><button type="button" class="dm-modal-x" aria-label="Close" data-close><i class="fa-solid fa-xmark"></i></button></div>';
            var card = viewer.querySelector(".post-view-card");
            if (!post) {
                card.appendChild(el("h2", "", "This post is not available."));
                card.appendChild(el("p", "dm-modal-text", "It was deleted, or you are not allowed to see it."));
            } else {
                var head = el("div", "post-view-head");
                var face = el("img");
                face.alt = "";
                face.src = post.authorAvatarUrl || "/assets/img/img-icon-profile.jpeg";
                var names = el("span");
                names.appendChild(el("strong", "", post.authorDisplayName || post.authorUserName));
                names.appendChild(el("small", "", "@" + post.authorUserName + " · " + new Date(post.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })));
                head.appendChild(face);
                head.appendChild(names);
                card.appendChild(head);
                if (post.text) card.appendChild(el("p", "post-view-text", post.text));
                if (post.imageUrl) {
                    if (window.discodeIsVideo && window.discodeIsVideo(post.imageUrl)) {
                        var clip = el("video", "post-view-photo");
                        clip.src = post.imageUrl;
                        clip.controls = true;
                        clip.preload = "metadata";
                        clip.playsInline = true;
                        card.appendChild(clip);
                    } else {
                        var photo = el("img", "post-view-photo");
                        photo.alt = "";
                        photo.src = post.imageUrl;
                        card.appendChild(photo);
                    }
                }
                card.appendChild(el("p", "post-view-meta", post.likeCount + " likes · " + post.repostCount + " reposts · " + (post.comments || []).length + " comments"));
            }
            viewer.addEventListener("click", function (event) {
                if (event.target.closest("[data-close]")) closeViewer();
            });
            document.body.appendChild(viewer);
        }).catch(function () {});
    }

    function checkLink() {
        if (!/^\/social/i.test(window.location.pathname)) return;
        var id = Number(new URLSearchParams(window.location.search).get("post"));
        if (id > 0) showShared(id);
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && viewer) closeViewer();
    });
    document.addEventListener("discode-page-ready", checkLink);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", checkLink);
    else checkLink();
})();
