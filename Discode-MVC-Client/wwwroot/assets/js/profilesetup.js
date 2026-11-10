(function () {
    if (window.discodeProfileSetup) return;
    window.discodeProfileSetup = true;

    function token() {
        var input = document.querySelector("input[name='__RequestVerificationToken']");
        return input ? input.value : "";
    }

    function loadStyles() {
        if (document.getElementById("profilesetup-css")) return;
        var link = document.createElement("link");
        link.id = "profilesetup-css";
        link.rel = "stylesheet";
        link.href = "/assets/css/profilesetup.css";
        document.head.appendChild(link);
    }

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function squarePhoto(file) {
        return new Promise(function (resolve) {
            if (file.type === "image/gif") {
                resolve(file);
                return;
            }
            var url = URL.createObjectURL(file);
            var image = new Image();
            image.onload = function () {
                var size = 256;
                var canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                var scale = Math.max(size / image.width, size / image.height);
                var width = image.width * scale;
                var height = image.height * scale;
                canvas.getContext("2d").drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
                URL.revokeObjectURL(url);
                canvas.toBlob(function (blob) { resolve(blob || file); }, "image/jpeg", 0.88);
            };
            image.onerror = function () {
                URL.revokeObjectURL(url);
                resolve(file);
            };
            image.src = url;
        });
    }

    function open(userName) {
        loadStyles();
        var chosen = null;
        var preview = "";

        var overlay = element("div", "ps-overlay");
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "ps-title");

        var card = element("div", "ps-card");
        var title = element("h2", "ps-title", "Add a profile picture");
        title.id = "ps-title";
        var lead = element("p", "ps-lead", "Pick a photo so people know it is you. You can skip this and change it later. We will use the first letter of your username.");

        var pick = element("button", "ps-avatar");
        pick.type = "button";
        pick.setAttribute("aria-label", "Choose a photo");
        var letter = element("span", "ps-letter", (userName || "?").trim().charAt(0).toUpperCase() || "?");
        var image = element("img");
        image.alt = "";
        image.hidden = true;
        var camera = element("span", "ps-camera");
        var cameraIcon = element("i", "fa-solid fa-camera");
        cameraIcon.setAttribute("aria-hidden", "true");
        camera.appendChild(cameraIcon);
        pick.appendChild(letter);
        pick.appendChild(image);
        pick.appendChild(camera);

        var file = element("input");
        file.type = "file";
        file.accept = "image/*";
        file.hidden = true;

        var error = element("p", "ps-error");
        error.hidden = true;
        error.setAttribute("role", "alert");

        var actions = element("div", "ps-actions");
        var upload = element("button", "ps-secondary", "Upload a photo");
        upload.type = "button";
        var remove = element("button", "ps-link", "Remove");
        remove.type = "button";
        remove.hidden = true;
        var done = element("button", "ps-primary", "Skip for now");
        done.type = "button";
        actions.appendChild(upload);
        actions.appendChild(remove);
        actions.appendChild(done);

        card.appendChild(title);
        card.appendChild(lead);
        card.appendChild(pick);
        card.appendChild(file);
        card.appendChild(error);
        card.appendChild(actions);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        done.focus();

        function showError(message) {
            error.textContent = message || "";
            error.hidden = !message;
        }

        function paint() {
            image.hidden = !preview;
            letter.hidden = !!preview;
            if (preview) image.src = preview;
            remove.hidden = !chosen;
            done.textContent = chosen ? "Save" : "Skip for now";
        }

        function choose() {
            file.value = "";
            file.click();
        }

        pick.addEventListener("click", choose);
        upload.addEventListener("click", choose);
        remove.addEventListener("click", function () {
            if (preview) URL.revokeObjectURL(preview);
            chosen = null;
            preview = "";
            showError("");
            paint();
        });

        file.addEventListener("change", function () {
            var picked = file.files && file.files[0];
            if (!picked) return;
            if (picked.type.indexOf("image/") !== 0) {
                showError("Choose an image file.");
                return;
            }
            if (picked.size > 8 * 1024 * 1024) {
                showError("Choose an image that is at most 8 MB.");
                return;
            }
            showError("");
            squarePhoto(picked).then(function (blob) {
                if (preview) URL.revokeObjectURL(preview);
                chosen = { blob: blob, name: picked.type === "image/gif" ? "avatar.gif" : "avatar.jpg" };
                preview = URL.createObjectURL(blob);
                paint();
            });
        });

        function fail(response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                throw new Error((body && body.errors && body.errors[0]) || "Something went wrong. Try again.");
            });
        }

        function finish(avatarUrl) {
            return fetch("/Account/CompleteSetup", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": token(),
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify({ avatarUrl: avatarUrl || "" })
            }).then(function (response) {
                if (!response.ok) return fail(response);
                return response.json();
            });
        }

        done.addEventListener("click", function () {
            if (done.disabled) return;
            done.disabled = true;
            upload.disabled = true;
            remove.disabled = true;
            showError("");
            var work;
            if (chosen) {
                var data = new FormData();
                data.append("file", chosen.blob, chosen.name);
                data.append("__RequestVerificationToken", token());
                work = fetch("/Home/UploadAvatar", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "RequestVerificationToken": token(), "X-Requested-With": "XMLHttpRequest" },
                    body: data
                }).then(function (response) {
                    if (!response.ok) return fail(response);
                    return response.json();
                }).then(function (body) { return finish(body.avatarUrl); });
            } else {
                work = finish("");
            }
            work.then(function () {
                window.location.reload();
            }).catch(function (failure) {
                showError(failure && failure.message ? failure.message : "Something went wrong. Try again.");
                done.disabled = false;
                upload.disabled = false;
                remove.disabled = false;
            });
        });
    }

    function start() {
        fetch("/Account/SetupState", { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (state) {
                if (state && state.needed && !document.querySelector(".ps-overlay")) open(state.userName);
            })
            .catch(function () {});
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
})();
