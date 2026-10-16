using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Friends;
using Discode_MVC_Client.ViewModels.Home;
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
