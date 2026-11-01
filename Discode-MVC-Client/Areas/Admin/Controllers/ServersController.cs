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

            if (Request.Headers["X-Admin-Refresh"] != "1")
                model.Notice = TempData["AdminNotice"] as string;

            return Request.Headers.XRequestedWith == "XMLHttpRequest" ? PartialView(model) : View(model);
        }

        public async Task<IActionResult> Details(int id)
        {
            var model = new AdminServerDetailVM();
            try
            {
                var response = await Api.GetAsync("api/admin/servers/" + id);
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    TempData["AdminNotice"] = "That server no longer exists.";
                    return RedirectToAction(nameof(Index));
                }

                if (!response.IsSuccessStatusCode)
                {
                    model.Error = "The server could not be loaded.";
                }
                else
                {
                    model = await response.Content.ReadFromJsonAsync<AdminServerDetailVM>() ?? model;
                }
            }
            catch (HttpRequestException)
            {
                model.Error = "The server could not be loaded. Restart the API so it runs the latest build, then try again.";
            }
            catch (JsonException)
            {
                model.Error = "The server could not be read from the API response.";
            }

            if (Request.Headers["X-Admin-Refresh"] != "1")
            {
                model.Notice = TempData["AdminNotice"] as string;
                model.Warning = TempData["AdminWarning"] as string;
            }

            if (string.IsNullOrEmpty(model.Error))
                model.Members = await LoadMembersAsync(id, null, 1);
            return Request.Headers.XRequestedWith == "XMLHttpRequest" ? PartialView(model) : View(model);
        }

        public async Task<IActionResult> Members(int id, string? search, int page = 1)
        {
            return PartialView("_Members", await LoadMembersAsync(id, search, Math.Max(1, page)));
        }

        private async Task<AdminServerMemberListVM> LoadMembersAsync(int id, string? search, int page)
        {
            var term = (search ?? string.Empty).Trim();
            var model = new AdminServerMemberListVM { ServerId = id, Search = term, Page = page };
            try
            {
                var url = (term.Length > 0 ? "api/admin/servers/" + id + "/members/search" : "api/admin/servers/" + id + "/members")
                    + "?page=" + page + "&pageSize=" + model.PageSize
                    + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty);
                var result = await Api.GetFromJsonAsync<AdminServerMemberListVM>(url);
                if (result is not null)
                {
                    model.Items = result.Items;
                    model.Total = result.Total;
                }
            }
            catch (HttpRequestException)
            {
                model.Error = "The members could not be loaded.";
            }
            catch (JsonException)
            {
                model.Error = "The members could not be read from the API response.";
            }

            return model;
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Warn(int id, string? reason)
        {
            var failure = await SendAsync(() => Api.PostAsJsonAsync("api/admin/servers/" + id + "/warn", new { reason = reason ?? string.Empty }));
            if (failure is null)
                TempData["AdminNotice"] = "The warning was sent to the server owner as a direct message.";
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Details), new { id });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Ban(int id, string? reason)
        {
            var failure = await SendAsync(() => Api.PostAsJsonAsync("api/admin/servers/" + id + "/ban", new { reason = reason ?? string.Empty }));
            if (failure is null)
                TempData["AdminNotice"] = "The server was banned. Nobody can open it until you unban it.";
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Details), new { id });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Unban(int id)
        {
            var failure = await SendAsync(() => Api.PostAsync("api/admin/servers/" + id + "/unban", null));
            if (failure is null)
                TempData["AdminNotice"] = "The server was unbanned and can be opened again.";
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Details), new { id });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var failure = await SendAsync(() => Api.DeleteAsync("api/admin/servers/" + id));
            if (failure is null)
            {
                TempData["AdminNotice"] = "The server was deleted.";
                return RedirectToAction(nameof(Index));
            }

            TempData["AdminWarning"] = failure;
            return RedirectToAction(nameof(Details), new { id });
        }

        private static async Task<string?> SendAsync(Func<Task<HttpResponseMessage>> send)
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
            catch (HttpRequestException)
            {
                return "The API is not reachable right now.";
            }
            catch (JsonException)
            {
                return "That did not work. Try again.";
            }
        }
    }
}
