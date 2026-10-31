using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class HomeController : AdminBaseController
    {
        public HomeController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        public async Task<IActionResult> Index()
        {
            var overview = new AdminOverviewVM();
            try
            {
                overview = await Api.GetFromJsonAsync<AdminOverviewVM>("api/admin/overview") ?? overview;
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
