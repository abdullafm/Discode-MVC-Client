using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Dm;
using Discode_MVC_Client.ViewModels.Friends;
using Discode_MVC_Client.ViewModels.Home;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class DmController : ApiControllerBase
    {
        private const long MaxAttachmentBytes = 25L * 1024 * 1024;
        private static readonly HashSet<string> BlockedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".html", ".htm", ".xhtml", ".svg", ".js", ".mjs", ".exe", ".bat", ".cmd", ".com", ".msi", ".dll", ".scr", ".ps1", ".vbs", ".jar"
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IWebHostEnvironment _environment;

        public DmController(IHttpClientFactory httpClientFactory, IWebHostEnvironment environment) : base(httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
            _environment = environment;
        }

        public async Task<IActionResult> Index(string? name)
        {
            var (profile, profileStatus) = await GetAsync<ProfileVM>("api/account/profile");
            if (profileStatus == System.Net.HttpStatusCode.Unauthorized)
                return await SessionExpiredAsync();

            var page = new DmPageVM { Name = name?.Trim() ?? string.Empty };
            if (int.TryParse(Request.Cookies["tz"], out var offset) && Math.Abs(offset) <= 14 * 60)
                page.UtcOffsetMinutes = offset;

            if (page.Name.Length > 0)
            {
                var (chat, chatStatus) = await GetAsync<ChatVM>("api/dm/" + Uri.EscapeDataString(page.Name));
                page.Chat = chat;
                if (chat is null)
                    page.Error = chatStatus is null ? "The API is not running. Start Discode-API-FinalProject and try again." : "This conversation is not available.";
            }

            ApplyProfile(page, profile ?? FallbackProfile());
            ViewData["Title"] = "Discord | " + (page.Chat is null
                ? (page.Name.Length > 0 ? page.Name : "Direct Messages")
                : (string.IsNullOrWhiteSpace(page.Chat.DisplayName) ? page.Chat.UserName : page.Chat.DisplayName));
            return View(page);
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

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Send([FromBody] DmTargetVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.UserName))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a friend." } }));

            return ForwardToApi(client => client.PostAsJsonAsync("api/dm/" + Uri.EscapeDataString(model.UserName.Trim()), new { text = model.Text ?? string.Empty, replyToMessageId = model.ReplyToMessageId, attachments = model.Attachments ?? new List<MessageAttachmentVM>() }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [RequestSizeLimit(27_000_000)]
        [RequestFormLimits(MultipartBodyLengthLimit = 27_000_000)]
        public IActionResult UploadAttachment(IFormFile file)
        {
            if (file is null || file.Length == 0)
                return BadRequest(new { errors = new[] { "Choose a file." } });

            if (file.Length > MaxAttachmentBytes)
                return BadRequest(new { errors = new[] { "A file can be at most 25 MB." } });

            var original = Path.GetFileName(file.FileName ?? string.Empty).Trim();
            if (original.Length == 0)
                original = "file";
            if (original.Length > 150)
                original = original.Substring(original.Length - 150);

            var extension = Path.GetExtension(original).ToLowerInvariant();
            if (BlockedExtensions.Contains(extension))
                return BadRequest(new { errors = new[] { "This type of file cannot be sent." } });

            var provider = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
            string? contentType = null;
            var known = extension.Length > 1 && extension.Length <= 10 && extension.Skip(1).All(char.IsLetterOrDigit) && provider.TryGetContentType("x" + extension, out contentType);
            if (!known)
            {
                extension = ".bin";
                contentType = "application/octet-stream";
            }

            var folder = Path.Combine(_environment.WebRootPath, "uploads", "dm");
            Directory.CreateDirectory(folder);

            var storedName = Guid.NewGuid().ToString("N") + extension;
            using (var stream = System.IO.File.Create(Path.Combine(folder, storedName)))
                file.CopyTo(stream);

            return Ok(new { url = "/uploads/dm/" + storedName, fileName = original, contentType = contentType ?? "application/octet-stream", size = file.Length });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Edit([FromBody] EditMessageVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return ForwardToApi(client => client.PutAsJsonAsync($"api/dm/messages/{model.Id}", new { text = model.Text ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> DeleteMessage([FromBody] EditMessageVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return ForwardToApi(client => client.DeleteAsync($"api/dm/messages/{model.Id}"));
        }

        [HttpGet]
        public async Task<IActionResult> Relation(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { errors = new[] { "Choose a friend." } });

            var (relation, status) = await GetAsync<DmRelationVM>("api/dm/" + Uri.EscapeDataString(name.Trim()) + "/relation");
            if (status == System.Net.HttpStatusCode.Unauthorized)
                return Unauthorized();
            if (relation is null)
                return NotFound();

            relation.UserName = name.Trim();
            return PartialView("_DmRelation", relation);
        }

        [HttpGet]
        public async Task<IActionResult> ProfileInfo(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { errors = new[] { "Choose a friend." } });

            var (profile, status) = await GetAsync<UserProfileVM>("api/account/users/" + Uri.EscapeDataString(name.Trim()));
            if (status == System.Net.HttpStatusCode.Unauthorized)
                return Unauthorized();
            if (profile is null)
                return NotFound();

            var offset = int.TryParse(Request.Cookies["tz"], out var minutes) && Math.Abs(minutes) <= 14 * 60 ? minutes : 0;
            return PartialView("_DmProfileInfo", DmProfileVM.From(profile, offset));
        }

        [HttpGet]
        public async Task<IActionResult> ForwardTargets()
        {
            var (friends, status) = await GetAsync<List<FriendRequestVM>>("api/friend");
            if (status == System.Net.HttpStatusCode.Unauthorized)
                return Unauthorized();

            var model = new ForwardTargetsVM
            {
                People = (friends ?? new List<FriendRequestVM>())
                    .OrderBy(friend => friend.Name, StringComparer.OrdinalIgnoreCase)
                    .Select(friend => new ForwardTargetVM { Kind = "user", Key = friend.UserName, Name = friend.Name, Subtitle = friend.UserName, AvatarUrl = friend.AvatarUrl })
                    .ToList()
            };
            return PartialView("_ForwardTargets", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Forward([FromBody] ForwardMessageVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return ForwardToApi(client => client.PostAsJsonAsync($"api/dm/messages/{model.Id}/forward", new { userNames = model.UserNames ?? new List<string>(), note = model.Note ?? string.Empty }));
        }

        [HttpGet]
        public async Task<IActionResult> Pins(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { errors = new[] { "Choose a friend." } });

            var (messages, status) = await GetAsync<List<MessageVM>>("api/dm/" + Uri.EscapeDataString(name.Trim()) + "/pins");
            if (status == System.Net.HttpStatusCode.Unauthorized)
                return Unauthorized();

            var model = new PinnedMessagesVM { Messages = messages ?? new List<MessageVM>() };
            if (int.TryParse(Request.Cookies["tz"], out var offset) && Math.Abs(offset) <= 14 * 60)
                model.UtcOffsetMinutes = offset;

            return PartialView("_PinnedMessages", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Pin([FromBody] PinMessageVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return ForwardToApi(client => client.PutAsJsonAsync($"api/dm/messages/{model.Id}/pin", new { pinned = model.Pinned }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> React([FromBody] ReactMessageVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return ForwardToApi(client => client.PutAsJsonAsync($"api/dm/messages/{model.Id}/reactions", new { emoji = model.Emoji ?? string.Empty }));
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
                if (response.StatusCode == System.Net.HttpStatusCode.NoContent)
                    return new StatusCodeResult(StatusCodes.Status204NoContent);

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
