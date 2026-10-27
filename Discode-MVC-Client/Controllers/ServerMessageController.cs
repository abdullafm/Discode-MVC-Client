using Discode_MVC_Client.ViewModels.Dm;
using Discode_MVC_Client.ViewModels.ServerMessages;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class ServerMessageController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public ServerMessageController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public Task<IActionResult> List(int serverId, int channelId, int? before = null)
        {
            return Forward(client => client.GetAsync($"api/server/{serverId}/channels/{channelId}/messages" + (before.HasValue ? "?before=" + before.Value : string.Empty)));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Send([FromBody] SendServerMessageUIVM model)
        {
            if (model is null || model.ServerId <= 0 || model.ChannelId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Channel not found." } }));

            return Forward(client => client.PostAsJsonAsync($"api/server/{model.ServerId}/channels/{model.ChannelId}/messages", new
            {
                text = model.Text ?? string.Empty,
                replyToMessageId = model.ReplyToMessageId,
                attachments = (model.Attachments ?? new List<MessageAttachmentUIVM>()).Select(a => new { url = a.Url, fileName = a.FileName, contentType = a.ContentType, size = a.Size })
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Delete([FromBody] ServerMessageRefUIVM model)
        {
            if (model is null || model.ServerId <= 0 || model.ChannelId <= 0 || model.MessageId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return Forward(client => client.DeleteAsync($"api/server/{model.ServerId}/channels/{model.ChannelId}/messages/{model.MessageId}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> React([FromBody] ReactServerMessageUIVM model)
        {
            if (model is null || model.ServerId <= 0 || model.ChannelId <= 0 || model.MessageId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Message not found." } }));

            return Forward(client => client.PutAsJsonAsync($"api/server/{model.ServerId}/channels/{model.ChannelId}/messages/{model.MessageId}/reactions", new { emoji = model.Emoji ?? string.Empty }));
        }

        private async Task<IActionResult> Forward(Func<HttpClient, Task<HttpResponseMessage>> send)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await send(client);
                var payload = await response.Content.ReadAsStringAsync();
                if (response.StatusCode == System.Net.HttpStatusCode.NoContent)
                {
                    return new StatusCodeResult(StatusCodes.Status204NoContent);
                }

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
