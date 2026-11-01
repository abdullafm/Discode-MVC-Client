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

        public async Task<IActionResult> Index(string? search, string? filter, int page = 1)
        {
            var term = (search ?? string.Empty).Trim();
            var kind = (filter ?? string.Empty).Trim().ToLowerInvariant() == "banned" ? "banned" : string.Empty;

            var model = new AdminServerListVM { Search = term, Filter = kind, Page = Math.Max(1, page) };
            try
            {
                var url = (term.Length > 0 ? "api/admin/servers/search" : "api/admin/servers")
                    + "?page=" + model.Page + "&pageSize=" + model.PageSize
                    + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty)
                    + (kind == "banned" ? "&bannedOnly=true" : string.Empty);
                var result = await Api.GetFromJsonAsync<AdminServerListVM>(url);
                if (result is not null)
                {
                    model.Items = result.Items;
                    model.Total = result.Total;
                }
            }
            catch (HttpRequestException)
            {
                model.Error = "The servers could not be loaded. Restart the API so it runs the latest build, then try again.";
            }
            catch (JsonException)
            {
                model.Error = "The servers could not be read from the API response.";
            }

            return Request.Headers.XRequestedWith == "XMLHttpRequest" ? PartialView(model) : View(model);
        }
    }
}
