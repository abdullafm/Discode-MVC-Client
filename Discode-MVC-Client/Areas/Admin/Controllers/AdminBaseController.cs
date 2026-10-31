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
            catch (HttpRequestException)
            {
            }
            catch (JsonException)
            {
            }

            ViewData["AdminProfile"] = profile;
            await next();
        }
    }
}
