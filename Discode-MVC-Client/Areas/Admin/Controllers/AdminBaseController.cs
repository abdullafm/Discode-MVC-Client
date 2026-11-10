using Discode_MVC_Client.ViewModels.Account;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public abstract class AdminBaseController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        protected AdminBaseController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        protected HttpClient Api => _httpClientFactory.CreateClient("DiscodeApi");

        protected static async Task<string?> ApiCallAsync(Func<Task<HttpResponseMessage>> send)
        {
            try
            {
                var response = await send();
                if (response.IsSuccessStatusCode)
                    return null;

                var body = await response.Content.ReadAsStringAsync();
                using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(body) ? "{}" : body);
                if (document.RootElement.ValueKind == JsonValueKind.Object
                    && document.RootElement.TryGetProperty("errors", out var errors)
                    && errors.ValueKind == JsonValueKind.Array
                    && errors.GetArrayLength() > 0)
                {
                    return errors[0].GetString();
                }

                return "That did not work. Try again.";
            }
            catch (Exception ex) when (ex is HttpRequestException || ex is TaskCanceledException)
            {
                return "The API is not reachable right now.";
            }
            catch (JsonException)
            {
                return "That did not work. Try again.";
            }
        }

        public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var displayName = User.Identity?.Name ?? string.Empty;
            var profile = new ProfileUIVM
            {
                DisplayName = displayName,
                UserName = User.FindFirst("userName")?.Value ?? displayName,
                Email = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty
            };

            try
            {
                profile = await Api.GetFromJsonAsync<ProfileUIVM>("api/account/profile") ?? profile;
            }
            catch (Exception ex) when (ex is HttpRequestException || ex is JsonException || ex is TaskCanceledException)
            {
            }

            ViewData["AdminProfile"] = profile;
            await next();
        }
    }
}
