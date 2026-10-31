using Discode_MVC_Client.ViewModels.Language;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    public class LanguageController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public LanguageController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [AllowAnonymous]
        [HttpGet]
        public Task<IActionResult> Entries(string? lang)
        {
            var url = string.IsNullOrWhiteSpace(lang) ? "api/translation" : "api/translation?lang=" + Uri.EscapeDataString(lang);
            return Forward(client => client.GetAsync(url));
        }

        [Authorize]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Set([FromBody] SetLanguageUIVM model)
        {
            if (model is null)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose a language." } }));

            return Forward(client => client.PutAsJsonAsync("api/translation/language", new { language = model.Language ?? string.Empty }));
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
    }
}
