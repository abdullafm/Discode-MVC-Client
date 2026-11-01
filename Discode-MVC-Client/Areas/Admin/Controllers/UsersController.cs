using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class UsersController : AdminBaseController
    {
        public UsersController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        public async Task<IActionResult> Index(string? search, string? filter, int page = 1)
        {
            var term = (search ?? string.Empty).Trim();
            var kind = (filter ?? string.Empty).Trim().ToLowerInvariant();
            if (kind != "admins" && kind != "superadmins" && kind != "banned") kind = string.Empty;

            var model = new AdminUserListVM { Search = term, Filter = kind, Page = Math.Max(1, page) };
            try
            {
                var url = "api/admin/users?page=" + model.Page + "&pageSize=" + model.PageSize
                    + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty)
                    + (kind == "admins" ? "&role=Admin" : kind == "superadmins" ? "&role=SuperAdmin" : kind == "banned" ? "&bannedOnly=true" : string.Empty);
                var result = await Api.GetFromJsonAsync<AdminUserListVM>(url);
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

            return Request.Headers.XRequestedWith == "XMLHttpRequest" ? PartialView(model) : View(model);
        }
    }
}
