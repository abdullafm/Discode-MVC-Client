using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Home;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class DiscoverController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public DiscoverController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IActionResult> Index()
        {
            ViewData["ServerChannels"] = "{}";

            var displayName = User.Identity?.Name ?? "";
            var profile = new ProfileUIVM
            {
                DisplayName = displayName,
                UserName = User.FindFirst("userName")?.Value ?? displayName,
                Email = User.FindFirst(ClaimTypes.Email)?.Value ?? ""
            };

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                profile = await client.GetFromJsonAsync<ProfileUIVM>("api/account/profile") ?? profile;
            }
            catch (HttpRequestException)
            {
            }
            catch (JsonException)
            {
            }

            return View(new HomeUIVM
            {
                Profile = profile,
                Update = new UpdateProfileUIVM
                {
                    UserName = profile.UserName,
                    DisplayName = profile.DisplayName,
                    AvatarUrl = profile.AvatarUrl,
                    CustomStatus = profile.CustomStatus,
                    IsPublic = profile.IsPublic,
                    Pronouns = profile.Pronouns,
                    Bio = profile.Bio
                }
            });
        }

        [HttpGet]
        public async Task<IActionResult> List(string? search)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.GetAsync("api/server/discover" + (string.IsNullOrWhiteSpace(search) ? string.Empty : "?search=" + Uri.EscapeDataString(search.Trim())));
                var payload = await response.Content.ReadAsStringAsync();
                return new ContentResult
                {
                    StatusCode = (int)response.StatusCode,
                    Content = string.IsNullOrWhiteSpace(payload) ? "[]" : payload,
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
