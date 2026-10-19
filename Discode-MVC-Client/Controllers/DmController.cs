using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Dm;
using Discode_MVC_Client.ViewModels.Home;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class DmController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public DmController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
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
        public async Task<IActionResult> Conversations()
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var conversations = await client.GetFromJsonAsync<List<ConversationVM>>("api/dm");
                return Ok(conversations ?? new List<ConversationVM>());
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, Array.Empty<ConversationVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<ConversationVM>());
            }
        }

        [HttpGet]
        public async Task<IActionResult> Chat(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { errors = new[] { "Choose a friend." } });

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.GetAsync("api/dm/" + Uri.EscapeDataString(name.Trim()));
                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode, new { errors = new[] { "This conversation is not available." } });

                var chat = await response.Content.ReadFromJsonAsync<ChatVM>();
                return Ok(chat ?? new ChatVM());
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new { errors = new[] { "The API is not running. Start Discode-API-FinalProject and try again." } });
            }
            catch (JsonException)
            {
                return StatusCode(502, new { errors = new[] { "The chat could not be read." } });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Send([FromBody] DmTargetVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.UserName))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a friend." } }));

            return ForwardToApi(client => client.PostAsJsonAsync("api/dm/" + Uri.EscapeDataString(model.UserName.Trim()), new { text = model.Text ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Read([FromBody] DmTargetVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.UserName))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a friend." } }));

            return ForwardToApi(client => client.PostAsJsonAsync("api/dm/" + Uri.EscapeDataString(model.UserName.Trim()) + "/read", new { }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Close([FromBody] DmTargetVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.UserName))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a friend." } }));

            return ForwardToApi(client => client.DeleteAsync("api/dm/" + Uri.EscapeDataString(model.UserName.Trim())));
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
    }
}
