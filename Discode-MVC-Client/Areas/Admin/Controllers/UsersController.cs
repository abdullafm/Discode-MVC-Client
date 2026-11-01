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
                model.Error = "The members could not be loaded. Restart the API so it runs the latest build, then try again.";
            }
            catch (JsonException)
            {
                model.Error = "The members could not be read from the API response.";
            }

            return Request.Headers.XRequestedWith == "XMLHttpRequest" ? PartialView(model) : View(model);
        }

        public async Task<IActionResult> Details(string id)
        {
            var model = new AdminUserDetailVM();
            try
            {
                var response = await Api.GetAsync("api/admin/users/" + Uri.EscapeDataString(id));
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    TempData["AdminNotice"] = "That member no longer exists.";
                    return RedirectToAction(nameof(Index));
                }

                if (!response.IsSuccessStatusCode)
                {
                    model.Error = "The member could not be loaded.";
                }
                else
                {
                    model = await response.Content.ReadFromJsonAsync<AdminUserDetailVM>() ?? model;
                }
            }
            catch (HttpRequestException)
            {
                model.Error = "The member could not be loaded. Restart the API so it runs the latest build, then try again.";
            }
            catch (JsonException)
            {
                model.Error = "The member could not be read from the API response.";
            }

            if (Request.Headers["X-Admin-Refresh"] != "1")
            {
                model.Notice = TempData["AdminNotice"] as string;
                model.Warning = TempData["AdminWarning"] as string;
            }

            return Request.Headers.XRequestedWith == "XMLHttpRequest" ? PartialView(model) : View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Warn(string id, string? reason)
        {
            return Moderate(id, "The warning was sent.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/warn", new { reason = reason ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Timeout(string id, string? reason, int minutes)
        {
            return Moderate(id, "The member was timed out.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/timeout", new { reason = reason ?? string.Empty, minutes }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> ClearTimeout(string id)
        {
            return Moderate(id, "The timeout was removed.", () => Api.PostAsync("api/admin/users/" + id + "/timeout/clear", null));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Kick(string id, string? reason)
        {
            return Moderate(id, "The member was signed out of every device.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/kick", new { reason = reason ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Ban(string id, string? reason, int days)
        {
            return Moderate(id, "The member was banned.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/ban", new { reason = reason ?? string.Empty, days }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Unban(string id)
        {
            return Moderate(id, "The member was unbanned.", () => Api.PostAsync("api/admin/users/" + id + "/unban", null));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> ChangeRole(string id, string? role)
        {
            return Moderate(id, "The role was changed. They are signed out so the new role applies.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/role", new { role = role ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(string id, string? reason, string? userName)
        {
            var request = new HttpRequestMessage(HttpMethod.Delete, "api/admin/users/" + id)
            {
                Content = JsonContent.Create(new { reason = reason ?? string.Empty, userName = userName ?? string.Empty })
            };
            var failure = await ApiCallAsync(() => Api.SendAsync(request));
            if (failure is null)
                TempData["AdminNotice"] = "The account was deleted.";
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Details), new { id });
        }

        private async Task<IActionResult> Moderate(string id, string success, Func<Task<HttpResponseMessage>> send)
        {
            var failure = await ApiCallAsync(send);
            if (failure is null)
                TempData["AdminNotice"] = success;
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Details), new { id });
        }
    }
}
