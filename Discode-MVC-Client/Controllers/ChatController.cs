using Discode_MVC_Client.ViewModels.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    // Where I stopped reading a chat (so the page can show the NEW line); the chats keep it for me on the account
    [Authorize]
    public class ChatController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public ChatController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public Task<IActionResult> ReadMarker(string? kind, string? key)
        {
            return Forward(client => client.GetAsync("api/readmarker?kind=" + Uri.EscapeDataString(kind ?? string.Empty) + "&key=" + Uri.EscapeDataString(key ?? string.Empty)));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> MarkRead([FromBody] MarkReadUIVM model)
        {
            if (model is null)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a chat." } }));

            return Forward(client => client.PutAsJsonAsync("api/readmarker", new { kind = model.Kind, key = model.Key }));
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
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                return StatusCode(503, new { errors = new[] { "The service is unavailable right now. Please try again later." } });
            }
        }
    }
}
