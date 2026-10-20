using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    public abstract class ApiControllerBase : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        protected ApiControllerBase(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        protected HttpClient Api => _httpClientFactory.CreateClient("DiscodeApi");

        protected bool IsAjax => Request.Headers.XRequestedWith == "XMLHttpRequest";

        protected async Task<(T? Data, HttpStatusCode? Status)> GetAsync<T>(string url) where T : class
        {
            try
            {
                var response = await Api.GetAsync(url);
                if (!response.IsSuccessStatusCode) return (null, response.StatusCode);
                return (await response.Content.ReadFromJsonAsync<T>(), response.StatusCode);
            }
            catch (HttpRequestException)
            {
                return (null, null);
            }
            catch (JsonException)
            {
                return (null, HttpStatusCode.OK);
            }
        }

        protected async Task<(bool Success, string[] Errors, HttpStatusCode? Status)> PostAsync(string url, object body)
        {
            try
            {
                var response = await Api.PostAsJsonAsync(url, body);
                if (response.IsSuccessStatusCode) return (true, Array.Empty<string>(), response.StatusCode);
                return (false, await ReadErrorsAsync(response), response.StatusCode);
            }
            catch (HttpRequestException)
            {
                return (false, new[] { "The service is unavailable right now. Please try again later." }, null);
            }
        }

        protected async Task<(bool Success, string[] Errors, HttpStatusCode? Status)> DeleteAsync(string url)
        {
            try
            {
                var response = await Api.DeleteAsync(url);
                if (response.IsSuccessStatusCode) return (true, Array.Empty<string>(), response.StatusCode);
                return (false, await ReadErrorsAsync(response), response.StatusCode);
            }
            catch (HttpRequestException)
            {
                return (false, new[] { "The service is unavailable right now. Please try again later." }, null);
            }
        }

        protected async Task<IActionResult> SessionExpiredAsync()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Login", "Account");
        }

        private static async Task<string[]> ReadErrorsAsync(HttpResponseMessage response)
        {
            try
            {
                using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                var root = document.RootElement;
                if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("errors", out var errors) && errors.ValueKind == JsonValueKind.Array)
                {
                    var messages = errors.EnumerateArray()
                        .Where(item => item.ValueKind == JsonValueKind.String)
                        .Select(item => item.GetString()!)
                        .ToArray();

                    if (messages.Length > 0) return messages;
                }
            }
            catch (JsonException)
            {
            }

            return new[] { "Something went wrong. Please try again." };
        }
    }
}
