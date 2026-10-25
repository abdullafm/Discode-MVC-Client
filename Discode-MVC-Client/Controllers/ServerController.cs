using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Home;
using Discode_MVC_Client.ViewModels.Servers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class ServerController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public ServerController(IHttpClientFactory httpClientFactory)
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
        public Task<IActionResult> List()
        {
            return Forward(client => client.GetAsync("api/server"));
        }

        [HttpGet]
        public Task<IActionResult> Get(int id)
        {
            return Forward(client => client.GetAsync($"api/server/{id}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Create([FromBody] CreateServerVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.Name))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Enter a server name." } }));

            return Forward(client => client.PostAsJsonAsync("api/server", new { name = model.Name.Trim() }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Join([FromBody] JoinServerVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.Invite))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Enter an invite link." } }));

            return Forward(client => client.PostAsJsonAsync("api/server/join", new { invite = model.Invite.Trim() }));
        }

        [HttpGet("/{code:regex(^(?=.*[[0-9]])(?=.*[[A-Za-z]])[[A-Za-z0-9]]{{7}}$)}")]
        public async Task<IActionResult> Invite(string code)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/server/join", new { invite = code });
                if (response.IsSuccessStatusCode)
                {
                    var server = await response.Content.ReadFromJsonAsync<ServerVM>();
                    if (server is not null)
                        return LocalRedirect("/Server/Index?id=" + server.Id);
                }
            }
            catch (HttpRequestException)
            {
            }
            catch (JsonException)
            {
            }

            TempData["Error"] = "That invite is invalid or has expired.";
            return RedirectToAction("Index", "Home");
        }

        private async Task<IActionResult> Forward(Func<HttpClient, Task<HttpResponseMessage>> send)
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
