using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Dm;
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
        private readonly IWebHostEnvironment _environment;

        public GroupController(IHttpClientFactory httpClientFactory, IWebHostEnvironment environment) : base(httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
            _environment = environment;
        }

        public async Task<IActionResult> Index(int id)
        {
            var (profile, profileStatus) = await GetAsync<ProfileUIVM>("api/account/profile");
            if (profileStatus == System.Net.HttpStatusCode.Unauthorized)
                return await SessionExpiredAsync();

            var page = new GroupPageUIVM();
            ApplyProfile(page, profile ?? FallbackProfile());

            var (group, status) = await GetAsync<GroupUIVM>("api/group/" + id);
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
                var groups = await client.GetFromJsonAsync<List<GroupUIVM>>("api/group");
                return Ok(groups ?? new List<GroupUIVM>());
            }
            catch (HttpRequestException ex)
            {
                return StatusCode((int?)ex.StatusCode ?? 503, Array.Empty<GroupUIVM>());
            }
            catch (JsonException)
            {
                return Ok(Array.Empty<GroupUIVM>());
            }
        }

        [HttpGet]
        public Task<IActionResult> Details(int id)
        {
            return Forward(client => client.GetAsync($"api/group/{id}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Read([FromBody] GroupIdUIVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Group not found." } }));

            return Forward(client => client.PostAsJsonAsync($"api/group/{model.Id}/read", new { }));
        }

        [HttpGet]
        public Task<IActionResult> Messages(int id, int? before = null)
        {
            return Forward(client => client.GetAsync($"api/group/{id}/messages" + (before.HasValue ? "?before=" + before.Value : string.Empty)));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Send([FromBody] SendGroupMessageUIVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Group not found." } }));

            return Forward(client => client.PostAsJsonAsync($"api/group/{model.Id}/messages", new
            {
                text = model.Text ?? string.Empty,
                replyToMessageId = model.ReplyToMessageId,
                attachments = (model.Attachments ?? new List<MessageAttachmentUIVM>()).Select(a => new { url = a.Url, fileName = a.FileName, contentType = a.ContentType, size = a.Size })
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> DeleteMessage([FromBody] GroupMessageRefUIVM model)
        {
            if (model is null || model.Id <= 0 || model.MessageId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return Forward(client => client.DeleteAsync($"api/group/{model.Id}/messages/{model.MessageId}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> ForwardMessage([FromBody] ForwardGroupMessageUIVM model)
        {
            if (model is null || model.Id <= 0 || model.MessageId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return Forward(client => client.PostAsJsonAsync($"api/group/{model.Id}/messages/{model.MessageId}/forward", new { userNames = model.UserNames ?? new List<string>(), note = model.Note ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> CreatePoll([FromBody] CreateGroupPollUIVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Group not found." } }));

            return Forward(client => client.PostAsJsonAsync($"api/group/{model.Id}/polls", new
            {
                question = model.Question ?? string.Empty,
                allowMultiple = model.AllowMultiple,
                durationHours = model.DurationHours,
                options = (model.Options ?? new List<CreatePollOptionUIVM>()).Select(o => new { text = o.Text ?? string.Empty, emoji = o.Emoji ?? string.Empty })
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> React([FromBody] ReactGroupMessageUIVM model)
        {
            if (model is null || model.Id <= 0 || model.MessageId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return Forward(client => client.PutAsJsonAsync($"api/group/{model.Id}/messages/{model.MessageId}/reactions", new { emoji = model.Emoji ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> VotePoll([FromBody] VoteGroupPollUIVM model)
        {
            if (model is null || model.Id <= 0 || model.MessageId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Poll not found." } }));

            return Forward(client => client.PutAsJsonAsync($"api/group/{model.Id}/messages/{model.MessageId}/poll-votes", new { optionIds = model.OptionIds ?? new List<int>() }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Update([FromBody] UpdateGroupUIVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Group not found." } }));

            return Forward(client => client.PutAsJsonAsync($"api/group/{model.Id}", new { name = model.Name ?? string.Empty, iconUrl = model.IconUrl ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> AddMembers([FromBody] AddGroupMembersUIVM model)
        {
            if (model is null || model.Id <= 0 || model.UserNames is null || model.UserNames.Count == 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Pick at least one friend." } }));

            return Forward(client => client.PostAsJsonAsync($"api/group/{model.Id}/members", new { userNames = model.UserNames }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> TransferOwner([FromBody] TransferGroupOwnerUIVM model)
        {
            if (model is null || model.Id <= 0 || string.IsNullOrWhiteSpace(model.UserName))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a member." } }));

            return Forward(client => client.PostAsJsonAsync($"api/group/{model.Id}/owner", new { userName = model.UserName.Trim() }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> RemoveMember([FromBody] RemoveGroupMemberUIVM model)
        {
            if (model is null || model.Id <= 0 || string.IsNullOrWhiteSpace(model.UserName))
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a member." } }));

            return Forward(client => client.DeleteAsync($"api/group/{model.Id}/members/{Uri.EscapeDataString(model.UserName.Trim())}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Leave([FromBody] GroupIdUIVM model)
        {
            if (model is null || model.Id <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Group not found." } }));

            return Forward(client => client.PostAsJsonAsync($"api/group/{model.Id}/leave", new { }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [RequestSizeLimit(5_000_000)]
        public IActionResult UploadIcon(IFormFile file)
        {
            if (file is null || file.Length == 0 || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { errors = new[] { "Choose an image file." } });

            var folder = Path.Combine(_environment.WebRootPath, "uploads", "groups");
            Directory.CreateDirectory(folder);

            var fileName = Guid.NewGuid().ToString("N") + ".jpg";
            using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
                file.CopyTo(stream);

            return Ok(new { iconUrl = "/uploads/groups/" + fileName });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([FromBody] CreateGroupUIVM model)
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

        private async Task<IActionResult> Forward(Func<HttpClient, Task<HttpResponseMessage>> send)
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

        private ProfileUIVM FallbackProfile()
        {
            var displayName = User.Identity?.Name ?? string.Empty;
            return new ProfileUIVM
            {
                DisplayName = displayName,
                UserName = User.FindFirst("userName")?.Value ?? displayName,
                Email = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty
            };
        }

        private static void ApplyProfile(HomeUIVM home, ProfileUIVM profile)
        {
            home.Profile = profile;
            home.Update = new UpdateProfileUIVM
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
