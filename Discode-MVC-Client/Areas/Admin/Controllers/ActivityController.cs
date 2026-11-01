using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class ActivityController : AdminBaseController
    {
        public ActivityController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        public async Task<IActionResult> Index(string? search, int page = 1)
        {
            var term = (search ?? string.Empty).Trim();
            var model = new AdminActionListVM { Search = term, Page = Math.Max(1, page) };
            try
            {
                var url = "api/admin/activity?page=" + model.Page + "&pageSize=" + model.PageSize
                    + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty);
                var result = await Api.GetFromJsonAsync<AdminActionListVM>(url);
                if (result is not null)
                {
                    model.Items = result.Items;
                    model.Total = result.Total;
                }
            }
            catch (HttpRequestException)
            {
                model.Error = "The activity could not be loaded. Restart the API so it runs the latest build, then try again.";
            }
            catch (JsonException)
            {
                model.Error = "The activity could not be read from the API response.";
            }

            return Request.Headers.XRequestedWith == "XMLHttpRequest" ? PartialView(model) : View(model);
        }
    }
}
