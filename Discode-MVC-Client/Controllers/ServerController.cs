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
        private readonly IWebHostEnvironment _environment;

        public ServerController(IHttpClientFactory httpClientFactory, IWebHostEnvironment environment)
        {
            _httpClientFactory = httpClientFactory;
            _environment = environment;
        }

        public async Task<IActionResult> Index(int id = 0)
        {
            ViewData["ServerChannels"] = await LoadChannelsAsync(id);

            var displayName = User.Identity?.Name ?? "";
            var fallback = new ProfileUIVM
            {
                DisplayName = displayName,
                UserName = User.FindFirst("userName")?.Value ?? displayName,
                Email = User.FindFirst(ClaimTypes.Email)?.Value ?? ""
            };

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var profile = await client.GetFromJsonAsync<ProfileUIVM>("api/account/profile");
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
        public Task<IActionResult> Channels(int id)
        {
            return Forward(client => client.GetAsync($"api/server/{id}/channels"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> CreateChannel([FromBody] CreateServerChannelUIVM model)
        {
            return Forward(client => client.PostAsJsonAsync($"api/server/{model.ServerId}/channels", new
            {
                name = model.Name ?? string.Empty,
                kind = model.Kind,
                categoryId = model.CategoryId,
                isPrivate = model.IsPrivate
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> CreateCategory([FromBody] CreateServerCategoryUIVM model)
        {
            return Forward(client => client.PostAsJsonAsync($"api/server/{model.ServerId}/categories", new
            {
                name = model.Name ?? string.Empty,
                isPrivate = model.IsPrivate
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> UpdateChannel([FromBody] UpdateServerChannelUIVM model)
        {
            return Forward(client => client.PutAsJsonAsync($"api/server/{model.ServerId}/channels/{model.ChannelId}", new
            {
                name = model.Name ?? string.Empty,
                isPrivate = model.IsPrivate,
                isReadOnly = model.IsReadOnly
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> DeleteChannel([FromBody] DeleteServerChannelUIVM model)
        {
            return Forward(client => client.DeleteAsync($"api/server/{model.ServerId}/channels/{model.ChannelId}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> UpdateCategory([FromBody] UpdateServerCategoryUIVM model)
        {
            return Forward(client => client.PutAsJsonAsync($"api/server/{model.ServerId}/categories/{model.CategoryId}", new
            {
                name = model.Name ?? string.Empty,
                isPrivate = model.IsPrivate
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> DeleteCategory([FromBody] DeleteServerCategoryUIVM model)
        {
            return Forward(client => client.DeleteAsync($"api/server/{model.ServerId}/categories/{model.CategoryId}"));
        }

        [HttpGet]
        public Task<IActionResult> List()
        {
            return Forward(client => client.GetAsync("api/server"));
        }

        [HttpGet]
        public Task<IActionResult> Audit(int id, string? actorId, string? kind, int? beforeId, int take = 50)
        {
            var query = "take=" + take;
            if (!string.IsNullOrWhiteSpace(actorId)) query += "&actorId=" + Uri.EscapeDataString(actorId);
            if (!string.IsNullOrWhiteSpace(kind)) query += "&action=" + Uri.EscapeDataString(kind);
            if (beforeId is not null) query += "&beforeId=" + beforeId;

            return Forward(client => client.GetAsync($"api/server/{id}/audit?{query}"));
        }

        [HttpGet]
        public Task<IActionResult> Bans(int id, string? search, int? beforeId, int take = 50)
        {
            var query = "take=" + take;
            if (!string.IsNullOrWhiteSpace(search)) query += "&search=" + Uri.EscapeDataString(search);
            if (beforeId is not null) query += "&beforeId=" + beforeId;

            return Forward(client => client.GetAsync($"api/server/{id}/bans?{query}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Ban([FromBody] ServerMemberActionUIVM model)
        {
            return Forward(client => client.PostAsJsonAsync($"api/server/{model.ServerId}/bans", new { userId = model.UserId ?? string.Empty, reason = model.Reason ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Unban([FromBody] ServerMemberActionUIVM model)
        {
            return Forward(client => client.DeleteAsync($"api/server/{model.ServerId}/bans/{Uri.EscapeDataString(model.UserId ?? string.Empty)}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Kick([FromBody] ServerMemberActionUIVM model)
        {
            return Forward(client => client.DeleteAsync($"api/server/{model.ServerId}/members/{Uri.EscapeDataString(model.UserId ?? string.Empty)}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Delete([FromBody] DeleteServerUIVM model)
        {
            return Forward(client => client.PostAsJsonAsync($"api/server/{model.ServerId}/delete", new { name = model.Name ?? string.Empty }));
        }

        [HttpGet]
        public Task<IActionResult> Members(int id)
        {
            return Forward(client => client.GetAsync($"api/server/{id}/members"));
        }

        [HttpGet]
        public Task<IActionResult> Preview(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
                return Task.FromResult<IActionResult>(NotFound(new { errors = new[] { "That invite is invalid or has expired." } }));

            return Forward(client => client.GetAsync("api/server/invite/" + Uri.EscapeDataString(code.Trim())));
        }

        [HttpGet]
        public Task<IActionResult> Get(int id)
        {
            return Forward(client => client.GetAsync($"api/server/{id}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Create([FromBody] CreateServerUIVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.Name))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Enter a server name." } }));

            return Forward(client => client.PostAsJsonAsync("api/server", new { name = model.Name.Trim() }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Join([FromBody] JoinServerUIVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.Invite))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Enter an invite link." } }));

            return Forward(client => client.PostAsJsonAsync("api/server/join", new { invite = model.Invite.Trim() }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Profile([FromForm] UpdateServerProfileUIVM model)
        {
            if (model is null || model.Id <= 0)
                return BadRequest(new { errors = new[] { "Server not found." } });

            string? iconUrl = null;
            if (model.Icon is { Length: > 0 })
            {
                if (!model.Icon.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) || model.Icon.Length > 5_000_000)
                    return BadRequest(new { errors = new[] { "Choose an image that is at most 5 MB." } });

                var folder = Path.Combine(_environment.WebRootPath, "uploads", "servers");
                Directory.CreateDirectory(folder);
                var fileName = Guid.NewGuid().ToString("N") + Path.GetExtension(model.Icon.FileName).ToLowerInvariant();
                using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
                    await model.Icon.CopyToAsync(stream);
                iconUrl = "/uploads/servers/" + fileName;
            }

            return await Forward(client => client.PutAsJsonAsync($"api/server/{model.Id}/profile", new
            {
                name = model.Name ?? string.Empty,
                description = model.Description ?? string.Empty,
                bannerColor = model.BannerColor,
                isPrivate = model.IsPrivate,
                iconUrl
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Banner([FromForm] UpdateServerBannerUIVM model)
        {
            if (model is null || model.Id <= 0)
                return BadRequest(new { errors = new[] { "Server not found." } });

            var bannerUrl = string.Empty;
            if (!model.Remove)
            {
                if (model.Banner is not { Length: > 0 })
                    return BadRequest(new { errors = new[] { "Choose an image." } });

                if (!model.Banner.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase) || model.Banner.Length > 8_000_000)
                    return BadRequest(new { errors = new[] { "Choose an image that is at most 8 MB." } });

                var folder = Path.Combine(_environment.WebRootPath, "uploads", "servers");
                Directory.CreateDirectory(folder);
                var fileName = Guid.NewGuid().ToString("N") + Path.GetExtension(model.Banner.FileName).ToLowerInvariant();
                using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
                    await model.Banner.CopyToAsync(stream);
                bannerUrl = "/uploads/servers/" + fileName;
            }

            return await Forward(client => client.PutAsJsonAsync($"api/server/{model.Id}/banner", new { bannerUrl }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> CustomInvite([FromBody] UpdateServerInviteUIVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Server not found." } }));

            return Forward(client => client.PutAsJsonAsync($"api/server/{model.Id}/invite", new { inviteCode = model.Code ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Preferences([FromBody] UpdateServerPreferencesUIVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Server not found." } }));

            return Forward(client => client.PutAsJsonAsync($"api/server/{model.Id}/preferences", new
            {
                muteMinutes = model.MuteMinutes,
                notificationLevel = model.NotificationLevel,
                hideMutedChannels = model.HideMutedChannels,
                showAllChannels = model.ShowAllChannels
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Reorder([FromBody] ReorderServersUIVM model)
        {
            return Forward(client => client.PutAsJsonAsync("api/server/order", new { serverIds = model?.ServerIds ?? new List<int>() }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Leave([FromBody] LeaveServerUIVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Server not found." } }));

            return Forward(client => client.PostAsJsonAsync($"api/server/{model.Id}/leave", new { }));
        }

        [HttpGet("/{code:regex(^(?!(account|api|assets|admin|dm|emailtemplates|friend|group|home|hubs|login|logout|nitro|notification|register|server|servers|social|swagger|uploads)$)[[A-Za-z0-9_-]]{{3,32}}$)}")]
        public async Task<IActionResult> Invite(string code)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/server/join", new { invite = code });
                if (response.IsSuccessStatusCode)
                {
                    var server = await response.Content.ReadFromJsonAsync<ServerUIVM>();
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

        private async Task<string> LoadChannelsAsync(int serverId)
        {
            if (serverId <= 0)
                return "{}";

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.GetAsync($"api/server/{serverId}/channels");
                if (response.IsSuccessStatusCode)
                    return await response.Content.ReadAsStringAsync();
            }
            catch (HttpRequestException)
            {
            }

            return "{}";
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

        private static HomeUIVM ToHome(ProfileUIVM profile) => new()
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
        };
    }
}
