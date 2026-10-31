using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public class HomeController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public HomeController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IActionResult> Index()
        {
            var overview = new AdminOverviewVM();
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                overview = await client.GetFromJsonAsync<AdminOverviewVM>("api/admin/overview") ?? overview;
            }
            catch (HttpRequestException)
            {
            }
            catch (JsonException)
            {
            }

            return View(overview);
        }
    }
}
