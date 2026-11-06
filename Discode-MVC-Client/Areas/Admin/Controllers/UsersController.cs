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
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                model.Error = "The members could not be loaded. Try again in a moment.";
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
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                model.Error = "The member could not be loaded. Try again in a moment.";
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
        public Task<IActionResult> Warn(string id, [FromForm] WarnUserVM model)
        {
            return Moderate(id, "The warning was sent.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/warn", new { reason = model.Reason ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Timeout(string id, [FromForm] TimeoutUserVM model)
        {
            return Moderate(id, "The member was timed out.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/timeout", new { reason = model.Reason ?? string.Empty, minutes = model.Minutes }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> ClearTimeout(string id)
        {
            return Moderate(id, "The timeout was removed.", () => Api.PostAsync("api/admin/users/" + id + "/timeout/clear", null));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Kick(string id, [FromForm] KickUserVM model)
        {
            return Moderate(id, "The member was signed out of every device.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/kick", new { reason = model.Reason ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Ban(string id, [FromForm] BanUserVM model)
        {
            return Moderate(id, "The member was banned.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/ban", new { reason = model.Reason ?? string.Empty, days = model.Days }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Unban(string id)
        {
            return Moderate(id, "The member was unbanned.", () => Api.PostAsync("api/admin/users/" + id + "/unban", null));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> LiveBan(string id, [FromForm] LiveBanUserVM model)
        {
            return Moderate(id, "They cannot go live anymore. A stream that was running is closed.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/live-ban", new { reason = model.Reason ?? string.Empty, minutes = model.Minutes }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> LiveUnban(string id)
        {
            return Moderate(id, "They can go live again.", () => Api.PostAsync("api/admin/users/" + id + "/live-unban", null));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> ChangeRole(string id, [FromForm] ChangeRoleVM model)
        {
            return Moderate(id, "The role was changed. They are signed out so the new role applies.", () => Api.PostAsJsonAsync("api/admin/users/" + id + "/role", new { role = model.Role ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(string id, [FromForm] DeleteUserVM model)
        {
            var request = new HttpRequestMessage(HttpMethod.Delete, "api/admin/users/" + id)
            {
                Content = JsonContent.Create(new { reason = model.Reason ?? string.Empty, userName = model.UserName ?? string.Empty })
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
