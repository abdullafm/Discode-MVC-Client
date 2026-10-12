using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Home;
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

        public HomeController(IHttpClientFactory httpClientFactory, IWebHostEnvironment environment)
        {
            _httpClientFactory = httpClientFactory;
            _environment = environment;
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

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileVM model)
        {
            if (model is null)
                return BadRequest(new UpdateProfileResponseVM { Errors = new[] { "Profile data is missing." } });

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PutAsJsonAsync("api/account/profile", model);
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
    }
}
