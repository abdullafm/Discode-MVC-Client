using System.Text.RegularExpressions;
using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Friends;
using Discode_MVC_Client.ViewModels.Home;
using Discode_MVC_Client.ViewModels.Social;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    [Route("[controller]/[action]")]
    public class HomeController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public HomeController(IHttpClientFactory httpClientFactory, IWebHostEnvironment environment, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _environment = environment;
            _configuration = configuration;
        }

        public async Task<IActionResult> Index()
        {
            var displayName = User.Identity?.Name ?? "";
            var fallback = new ProfileVM
            {
                DisplayName = displayName,
                UserName = User.FindFirst("userName")?.Value ?? displayName,
                Email = User.FindFirst(ClaimTypes.Email)?.Value ?? ""
            };

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var profile = await client.GetFromJsonAsync<ProfileVM>("api/account/profile");
                if (profile is not null)
                    return View(ToHome(profile));
            }
            catch (HttpRequestException)
            {
            }
            catch (JsonException)
            {
            }

            return View(ToHome(fallback));
        }

        [HttpGet]
        public async Task<IActionResult> HubToken()
        {
            var token = await HttpContext.GetTokenAsync("access_token");
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            Response.Headers.CacheControl = "no-store";
            return Ok(new
            {
                token,
                hubUrl = _configuration["ApiSettings:BaseUrl"]!.TrimEnd('/') + "/hubs/presence"
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileVM model)
        {
            if (model is null)
                return BadRequest(new UpdateProfileResponseVM { Errors = new[] { "Profile data is missing." } });

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PutAsJsonAsync("api/account/myprofileupdate", model);
                if (response.StatusCode is System.Net.HttpStatusCode.NotFound or System.Net.HttpStatusCode.MethodNotAllowed)
                    response = await client.PutAsJsonAsync("api/account/profile", model);
                var result = await ReadJsonAsync<UpdateProfileResponseVM>(response);

                if (!response.IsSuccessStatusCode || result is null || !result.IsSuccess)
                {
                    var error = result?.Errors is { Length: > 0 }
                        ? result.Errors[0]
                        : $"Could not update the profile ({(int)response.StatusCode}).";
                    return BadRequest(new UpdateProfileResponseVM { Errors = new[] { error } });
                }

                return Ok(result);
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new UpdateProfileResponseVM { Errors = new[] { "The API is not running. Start Discode-API-FinalProject and try again." } });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ChangeUsername([FromBody] ChangeUsernameVM model)
        {
            if (model is null)
                return BadRequest(new UpdateProfileResponseVM { Errors = new[] { "Username data is missing." } });

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PutAsJsonAsync("api/account/username", model);
                var result = await ReadJsonAsync<UpdateProfileResponseVM>(response);

                if (!response.IsSuccessStatusCode || result is null || !result.IsSuccess)
                {
                    var error = result?.Errors is { Length: > 0 }
                        ? result.Errors[0]
                        : "Could not change the username.";
                    return BadRequest(new UpdateProfileResponseVM { Errors = new[] { error } });
                }

                return Ok(result);
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new UpdateProfileResponseVM { Errors = new[] { "The API is not running. Start Discode-API-FinalProject and try again." } });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordVM model)
        {
            if (model is null)
                return BadRequest(new UpdateProfileResponseVM { Errors = new[] { "Password data is missing." } });

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PutAsJsonAsync("api/account/password", model);
                var result = await ReadJsonAsync<UpdateProfileResponseVM>(response);

                if (!response.IsSuccessStatusCode || result is null || !result.IsSuccess)
                {
                    var error = result?.Errors is { Length: > 0 }
                        ? result.Errors[0]
                        : "Could not change the password.";
                    return BadRequest(new UpdateProfileResponseVM { Errors = new[] { error } });
                }

                return Ok(result);
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new UpdateProfileResponseVM { Errors = new[] { "The API is not running. Start Discode-API-FinalProject and try again." } });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [RequestSizeLimit(2_000_000)]
        public IActionResult UploadAvatar(IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            if (file is null || file.Length == 0 || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { errors = new[] { "Choose an image file." } });

            var folder = Path.Combine(_environment.WebRootPath, "uploads", "avatars");
            Directory.CreateDirectory(folder);

            var path = Path.Combine(folder, userId + ".jpg");
            using (var stream = System.IO.File.Create(path))
                file.CopyTo(stream);

            return Ok(new { avatarUrl = "/uploads/avatars/" + userId + ".jpg" });
        }

        [HttpGet]
        public async Task<IActionResult> SearchUsers(string searchName)
        {
            if (string.IsNullOrWhiteSpace(searchName))
                return Ok(Array.Empty<UserSearchVM>());

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var users = await client.GetFromJsonAsync<List<UserSearchVM>>(
                    "api/account/search?searchName=" + Uri.EscapeDataString(searchName.Trim()));

                return Ok(users ?? new List<UserSearchVM>());
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, Array.Empty<UserSearchVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<UserSearchVM>());
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> SendFriendRequest([FromBody] SendFriendRequestVM model)
        {
            if (model is null || (string.IsNullOrWhiteSpace(model.UserName) && string.IsNullOrWhiteSpace(model.UserId)))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a user." } }));

            return ForwardToApi(client => client.PostAsJsonAsync("api/friend/request", new
            {
                userId = string.IsNullOrWhiteSpace(model.UserId) ? null : model.UserId.Trim(),
                userName = model.UserName?.Trim()
            }));
        }

        [HttpGet]
        public async Task<IActionResult> Friends()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var data = await client.GetFromJsonAsync<List<FriendRequestVM>>("api/friend");
                return Ok(data ?? new List<FriendRequestVM>());
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, Array.Empty<FriendRequestVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<FriendRequestVM>());
            }
        }

        [HttpGet]
        public async Task<IActionResult> FriendPending()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var data = await client.GetFromJsonAsync<FriendPendingVM>("api/friend/pending");
                return Ok(data ?? new FriendPendingVM());
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new FriendPendingVM());
            }
            catch (JsonException)
            {
                return Ok(new FriendPendingVM());
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> CancelFriendRequest([FromBody] FriendRequestIdVM model)
            => ForwardFriendAction(model, id => $"api/friend/request/{id}", HttpMethod.Delete);

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> AcceptFriendRequest([FromBody] FriendRequestIdVM model)
            => ForwardFriendAction(model, id => $"api/friend/request/{id}/accept", HttpMethod.Post);

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> DeclineFriendRequest([FromBody] FriendRequestIdVM model)
            => ForwardFriendAction(model, id => $"api/friend/request/{id}/decline", HttpMethod.Post);

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> RemoveFriend([FromBody] FriendRequestIdVM model)
            => ForwardFriendAction(model, id => $"api/friend/{id}", HttpMethod.Delete);

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> BlockUser([FromBody] BlockUserVM model)
        {
            if (model is null || (string.IsNullOrWhiteSpace(model.UserName) && string.IsNullOrWhiteSpace(model.UserId)))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a user." } }));

            return ForwardToApi(client => client.PostAsJsonAsync("api/block", new
            {
                userId = string.IsNullOrWhiteSpace(model.UserId) ? null : model.UserId.Trim(),
                userName = model.UserName?.Trim()
            }));
        }

        [HttpGet]
        public async Task<IActionResult> UserProfile(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { errors = new[] { "Choose a user." } });

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var profile = await client.GetFromJsonAsync<UserProfileVM>("api/account/users/" + Uri.EscapeDataString(name.Trim()));
                if (profile is null)
                    return NotFound(new { errors = new[] { "User not found." } });

                return Ok(profile);
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, new { errors = new[] { "Could not load the profile." } });
            }
            catch (JsonException)
            {
                return NotFound(new { errors = new[] { "User not found." } });
            }
        }

        [HttpGet]
        public Task<IActionResult> ExplorePosts()
            => GetPosts("api/post/explore");

        [HttpGet]
        public Task<IActionResult> FriendsPosts()
            => GetPosts("api/post/friends");

        [HttpGet]
        public Task<IActionResult> UserPosts(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a user." } }));

            return GetPosts("api/post/user/" + Uri.EscapeDataString(name.Trim()));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> CreatePost([FromBody] CreatePostVM model)
        {
            if (model is null)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Post data is missing." } }));

            return ForwardToApi(client => client.PostAsJsonAsync("api/post", new
            {
                text = model.Text ?? string.Empty,
                imageUrl = model.ImageUrl ?? string.Empty
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> DeletePost([FromBody] PostIdVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Post not found." } }));

            return ForwardToApi(client => client.DeleteAsync($"api/post/{model.Id}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> TogglePostLike([FromBody] PostIdVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Post not found." } }));

            return ForwardToApi(client => client.PostAsJsonAsync($"api/post/{model.Id}/like", new { }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> CreateComment([FromBody] CreateCommentVM model)
        {
            if (model is null || model.PostId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Post not found." } }));

            return ForwardToApi(client => client.PostAsJsonAsync($"api/post/{model.PostId}/comments", new { text = model.Text ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> DeleteComment([FromBody] CommentIdVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Comment not found." } }));

            return ForwardToApi(client => client.DeleteAsync($"api/post/comments/{model.Id}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> ToggleCommentLike([FromBody] CommentIdVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Comment not found." } }));

            return ForwardToApi(client => client.PostAsJsonAsync($"api/post/comments/{model.Id}/like", new { }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [RequestSizeLimit(5_000_000)]
        public IActionResult UploadPostImage(IFormFile file)
        {
            if (file is null || file.Length == 0 || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { errors = new[] { "Choose an image file." } });

            var folder = Path.Combine(_environment.WebRootPath, "uploads", "posts");
            Directory.CreateDirectory(folder);

            var fileName = Guid.NewGuid().ToString("N") + ".jpg";
            using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
                file.CopyTo(stream);

            return Ok(new { imageUrl = "/uploads/posts/" + fileName });
        }

        [HttpGet]
        [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Client)]
        public async Task<IActionResult> Emojis()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var categories = await client.GetFromJsonAsync<List<EmojiCategoryVM>>("api/emoji");
                return Ok(categories ?? new List<EmojiCategoryVM>());
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, Array.Empty<EmojiCategoryVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<EmojiCategoryVM>());
            }
        }

        [HttpGet]
        public async Task<IActionResult> LiveStreams()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var streams = await client.GetFromJsonAsync<List<LiveStreamVM>>("api/live");
                return Ok(streams ?? new List<LiveStreamVM>());
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, Array.Empty<LiveStreamVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<LiveStreamVM>());
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [RequestSizeLimit(2_000_000)]
        public IActionResult UploadLiveThumbnail(IFormFile file, string? previous)
        {
            if (file is null || file.Length == 0 || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { errors = new[] { "Choose an image file." } });

            DeleteLiveThumbnailFile(previous);

            var folder = Path.Combine(_environment.WebRootPath, "uploads", "live");
            Directory.CreateDirectory(folder);

            var fileName = Guid.NewGuid().ToString("N") + ".jpg";
            using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
                file.CopyTo(stream);

            return Ok(new { imageUrl = "/uploads/live/" + fileName });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult RemoveLiveThumbnail([FromBody] LiveThumbnailVM model)
        {
            DeleteLiveThumbnailFile(model?.ImageUrl);
            return Ok(new { });
        }

        private void DeleteLiveThumbnailFile(string? url)
        {
            if (string.IsNullOrEmpty(url) || !Regex.IsMatch(url, "^/uploads/live/[0-9a-f]{32}\\.jpg$"))
                return;

            var path = Path.Combine(_environment.WebRootPath, "uploads", "live", Path.GetFileName(url));
            if (System.IO.File.Exists(path))
                System.IO.File.Delete(path);
        }

        [HttpGet]
        public async Task<IActionResult> Stories()
        {
            DeleteExpiredStoryImages();

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var stories = await client.GetFromJsonAsync<List<StoryVM>>("api/story");
                return Ok(stories ?? new List<StoryVM>());
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, Array.Empty<StoryVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<StoryVM>());
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> CreateStory([FromBody] CreateStoryVM model)
        {
            if (model is null)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Story data is missing." } }));

            return ForwardToApi(client => client.PostAsJsonAsync("api/story", new { imageUrl = model.ImageUrl ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> ToggleStoryLike([FromBody] PostIdVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Story not found." } }));

            return ForwardToApi(client => client.PostAsJsonAsync($"api/story/{model.Id}/like", new { }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> RecordStoryView([FromBody] PostIdVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Story not found." } }));

            return ForwardToApi(client => client.PostAsJsonAsync($"api/story/{model.Id}/view", new { }));
        }

        [HttpGet]
        public async Task<IActionResult> StoryViewers(int id)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var viewers = await client.GetFromJsonAsync<List<StoryViewerVM>>($"api/story/{id}/viewers");
                return Ok(viewers ?? new List<StoryViewerVM>());
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, Array.Empty<StoryViewerVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<StoryViewerVM>());
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteStory([FromBody] DeleteStoryVM model)
        {
            if (model is null || model.Id <= 0)
                return BadRequest(new { errors = new[] { "Story not found." } });

            var result = await ForwardToApi(client => client.DeleteAsync($"api/story/{model.Id}"));
            if (result is ContentResult { StatusCode: >= 200 and < 300 })
                DeleteStoryImageFile(model.ImageUrl);

            return result;
        }

        private void DeleteExpiredStoryImages()
        {
            var folder = Path.Combine(_environment.WebRootPath, "uploads", "stories");
            if (!Directory.Exists(folder))
                return;

            foreach (var path in Directory.EnumerateFiles(folder, "*.jpg"))
            {
                if (System.IO.File.GetLastWriteTimeUtc(path) <= DateTime.UtcNow.AddHours(-24))
                    System.IO.File.Delete(path);
            }
        }

        private void DeleteStoryImageFile(string? url)
        {
            if (string.IsNullOrEmpty(url) || !Regex.IsMatch(url, "^/uploads/stories/[0-9a-f]{32}\\.jpg$"))
                return;

            var path = Path.Combine(_environment.WebRootPath, "uploads", "stories", Path.GetFileName(url));
            if (System.IO.File.Exists(path))
                System.IO.File.Delete(path);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [RequestSizeLimit(5_000_000)]
        public IActionResult UploadStoryImage(IFormFile file)
        {
            if (file is null || file.Length == 0 || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { errors = new[] { "Choose an image file." } });

            var folder = Path.Combine(_environment.WebRootPath, "uploads", "stories");
            Directory.CreateDirectory(folder);

            var fileName = Guid.NewGuid().ToString("N") + ".jpg";
            using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
                file.CopyTo(stream);

            return Ok(new { imageUrl = "/uploads/stories/" + fileName });
        }

        [HttpGet]
        public async Task<IActionResult> Blocked()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var data = await client.GetFromJsonAsync<List<FriendRequestVM>>("api/block");
                return Ok(data ?? new List<FriendRequestVM>());
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, Array.Empty<FriendRequestVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<FriendRequestVM>());
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> UnblockUser([FromBody] FriendRequestIdVM model)
            => ForwardFriendAction(model, id => $"api/block/{id}", HttpMethod.Delete);

        private async Task<IActionResult> GetPosts(string url)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var posts = await client.GetFromJsonAsync<List<PostVM>>(url);
                return Ok(posts ?? new List<PostVM>());
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, Array.Empty<PostVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<PostVM>());
            }
        }

        private static HomeVM ToHome(ProfileVM profile) => new()
        {
            Profile = profile,
            Update = new UpdateProfileVM
            {
                UserName = profile.UserName,
                DisplayName = profile.DisplayName,
                AvatarUrl = profile.AvatarUrl,
                CustomStatus = profile.CustomStatus,
                IsPublic = profile.IsPublic,
                Pronouns = profile.Pronouns,
                Bio = profile.Bio
            }
        };

        private static async Task<T?> ReadJsonAsync<T>(HttpResponseMessage response) where T : class
        {
            try
            {
                return await response.Content.ReadFromJsonAsync<T>();
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private Task<IActionResult> ForwardFriendAction(FriendRequestIdVM model, Func<int, string> url, HttpMethod method)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Friend request not found." } }));

            return ForwardToApi(client =>
            {
                if (method == HttpMethod.Delete)
                    return client.DeleteAsync(url(model.Id));
                return client.PostAsJsonAsync(url(model.Id), new { });
            });
        }

        private async Task<IActionResult> ForwardToApi(Func<HttpClient, Task<HttpResponseMessage>> send)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await send(client);
                var payload = await response.Content.ReadAsStringAsync();
                return new ContentResult
                {
                    StatusCode = (int)response.StatusCode,
                    Content = string.IsNullOrWhiteSpace(payload) ? "{}" : payload,
                    ContentType = "application/json"
                };
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new { errors = new[] { "The API is not running. Start Discode-API-FinalProject and try again." } });
            }
        }
    }
}
