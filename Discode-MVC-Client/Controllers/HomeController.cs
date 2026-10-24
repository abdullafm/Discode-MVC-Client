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
    public class HomeController : ApiControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;

        public HomeController(IHttpClientFactory httpClientFactory, IWebHostEnvironment environment, IConfiguration configuration)
            : base(httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
            _environment = environment;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> Index(string? tab, string? search)
        {
            var (profile, profileStatus) = await GetAsync<ProfileVM>("api/account/profile");
            if (profileStatus == System.Net.HttpStatusCode.Unauthorized)
                return await SessionExpiredAsync();

            var model = new HomeIndexVM
            {
                Tab = HomeIndexVM.Tabs.Contains(tab) ? tab! : "online",
                Search = search?.Trim() ?? string.Empty,
                ApiUnavailable = profile is null && profileStatus is null
            };
            ApplyProfile(model, profile ?? FallbackProfile());

            var friends = GetAsync<List<FriendRequestVM>>("api/friend");
            var requests = GetAsync<FriendPendingVM>("api/friend/pending");
            var blocked = GetAsync<List<FriendRequestVM>>("api/block");
            var notifications = GetAsync<List<NotificationVM>>("api/notification");
            await Task.WhenAll(friends, requests, blocked, notifications);

            model.Friends = friends.Result.Data ?? new List<FriendRequestVM>();
            model.Requests = requests.Result.Data ?? new FriendPendingVM();
            model.Blocked = blocked.Result.Data ?? new List<FriendRequestVM>();
            model.Notifications = notifications.Result.Data ?? new List<NotificationVM>();

            if (model.Tab == "add" && model.Search.Length > 0)
            {
                var (users, _) = await GetAsync<List<UserSearchVM>>("api/account/search?searchName=" + Uri.EscapeDataString(model.Search));
                model.SearchResults = users ?? new List<UserSearchVM>();
            }

            return View(model);
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

            return Ok(new { avatarUrl = "/uploads/avatars/" + userId + ".jpg?v=" + DateTime.UtcNow.Ticks });
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
        public async Task<IActionResult> UserFriends(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { errors = new[] { "Choose a user." } });

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.GetAsync("api/friend/user/" + Uri.EscapeDataString(name.Trim()));
                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode, new { errors = new[] { response.StatusCode == System.Net.HttpStatusCode.BadRequest ? "This profile is private." : "Friends are not available." } });

                var friends = await response.Content.ReadFromJsonAsync<List<FriendRequestVM>>();
                return Ok((friends ?? new List<FriendRequestVM>()).Select(f => new { userName = f.UserName, name = f.Name, avatarUrl = f.AvatarUrl, status = f.Status }));
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new { errors = new[] { "Friends are not available." } });
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<object>());
            }
        }

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

            return ForwardToApi(client => client.PostAsJsonAsync($"api/post/{model.PostId}/comments", new { text = model.Text ?? string.Empty, parentCommentId = model.ParentCommentId }));
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
        public Task<IActionResult> ReplyStory([FromBody] StoryReplyVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Story not found." } }));

            return ForwardToApi(client => client.PostAsJsonAsync($"api/story/{model.Id}/reply", new { text = model.Text ?? string.Empty }));
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

        private ProfileVM FallbackProfile()
        {
            var displayName = User.Identity?.Name ?? string.Empty;
            return new ProfileVM
            {
                DisplayName = displayName,
                UserName = User.FindFirst("userName")?.Value ?? displayName,
                Email = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty
            };
        }

        private static void ApplyProfile(HomeVM home, ProfileVM profile)
        {
            home.Profile = profile;
            home.Update = new UpdateProfileVM
            {
                UserName = profile.UserName,
                DisplayName = profile.DisplayName,
                AvatarUrl = profile.AvatarUrl,
                CustomStatus = profile.CustomStatus,
                IsPublic = profile.IsPublic,
                Pronouns = profile.Pronouns,
                Bio = profile.Bio
            };
        }

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
