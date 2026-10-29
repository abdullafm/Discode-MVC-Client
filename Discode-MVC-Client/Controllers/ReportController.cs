using Discode_MVC_Client.ViewModels.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class ReportController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public ReportController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Create([FromBody] CreateReportUIVM model)
        {
            if (model is null)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "Choose what you are reporting." } }));

            return Forward(client => client.PostAsJsonAsync("api/report", new
            {
                targetType = model.TargetType ?? string.Empty,
                targetId = model.TargetId ?? string.Empty,
                reason = model.Reason ?? string.Empty,
                details = model.Details ?? string.Empty
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
