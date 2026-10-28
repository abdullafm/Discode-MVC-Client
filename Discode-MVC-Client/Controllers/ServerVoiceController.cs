using Discode_MVC_Client.ViewModels.ServerVoice;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class ServerVoiceController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public ServerVoiceController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public Task<IActionResult> State(int serverId)
        {
            return Forward(client => client.GetAsync($"api/server/{serverId}/voice"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Join([FromBody] JoinServerVoiceUIVM model)
        {
            if (model is null || model.ServerId <= 0 || model.ChannelId <= 0)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Channel not found." } }));

            return Forward(client => client.PostAsJsonAsync($"api/server/{model.ServerId}/channels/{model.ChannelId}/voice", new
            {
                isMuted = model.IsMuted,
                isDeafened = model.IsDeafened
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Leave()
        {
            return Forward(client => client.DeleteAsync("api/voice"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Update([FromBody] UpdateServerVoiceUIVM model)
        {
            return Forward(client => client.PutAsJsonAsync("api/voice", new
            {
                isMuted = model?.IsMuted ?? false,
                isDeafened = model?.IsDeafened ?? false,
                isCameraOn = model?.IsCameraOn ?? false,
                isStreaming = model?.IsStreaming ?? false
            }));
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
