using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Groups;
using Discode_MVC_Client.ViewModels.Home;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class GroupController : ApiControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public GroupController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IActionResult> Index(int id)
        {
            var (profile, profileStatus) = await GetAsync<ProfileVM>("api/account/profile");
            if (profileStatus == System.Net.HttpStatusCode.Unauthorized)
                return await SessionExpiredAsync();

            var page = new GroupPageVM();
            ApplyProfile(page, profile ?? FallbackProfile());

            var (group, status) = await GetAsync<GroupVM>("api/group/" + id);
            page.Group = group;
            if (group is null)
                page.Error = status is null ? "The API is not running. Start Discode-API-FinalProject and try again." : "This group is not available.";

            ViewData["Title"] = "Discord | " + (group?.Name ?? "Group");
            return View(page);
        }

        [HttpGet]
        public async Task<IActionResult> Mine()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var groups = await client.GetFromJsonAsync<List<GroupVM>>("api/group");
                return Ok(groups ?? new List<GroupVM>());
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, Array.Empty<GroupVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<GroupVM>());
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([FromBody] CreateGroupVM model)
        {
            if (model is null || model.UserNames is null || model.UserNames.Count == 0)
                return BadRequest(new { errors = new[] { "Pick at least two friends for a group." } });

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/group", new { name = model.Name ?? string.Empty, userNames = model.UserNames });
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
    }
}
