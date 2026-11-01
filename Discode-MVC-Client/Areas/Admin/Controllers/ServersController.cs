using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class ServersController : AdminBaseController
    {
        public ServersController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        public async Task<IActionResult> Index(string? search, int page = 1)
        {
            var term = (search ?? string.Empty).Trim();
            var model = new AdminServerListVM { Search = term, Page = Math.Max(1, page) };
            try
            {
                var url = "api/admin/servers?page=" + model.Page + "&pageSize=" + model.PageSize + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty);
                var result = await Api.GetFromJsonAsync<AdminServerListVM>(url);
                if (result is not null)
                {
                    model.Items = result.Items;
                    model.Total = result.Total;
                }
            }
            catch (HttpRequestException)
            {
            }
            catch (JsonException)
            {
            }

            return View(model);
        }
    }
}
