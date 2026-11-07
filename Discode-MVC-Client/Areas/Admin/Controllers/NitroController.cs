using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class NitroController : AdminBaseController
    {
        public NitroController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        public async Task<IActionResult> Index(string? tab, string? search, bool activeOnly = false, int page = 1)
        {
            var term = (search ?? string.Empty).Trim();
            var model = new AdminNitroListVM
            {
                Search = term,
                ActiveOnly = activeOnly,
                Page = Math.Max(1, page),
                Tab = string.Equals(tab, "members", StringComparison.OrdinalIgnoreCase) ? "members" : "events"
            };

            try
            {
                var url = "api/admin/nitro?page=" + model.Page + "&activeOnly=" + (activeOnly ? "true" : "false")
                    + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty);
                var result = await Api.GetFromJsonAsync<AdminNitroListVM>(url, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                if (result is not null)
                {
                    model.Subscriptions = result.Subscriptions;
                    model.Events = result.Events;
                    model.ActiveCount = result.ActiveCount;
                    model.TotalSubscriptions = result.TotalSubscriptions;
                    model.TotalEvents = result.TotalEvents;
                    model.PageSize = result.PageSize;
                }
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                model.Error = "Nitro could not be loaded. Try again in a moment.";
            }
            catch (JsonException)
            {
                model.Error = "Nitro could not be read from the API response.";
            }

            return Request.Headers.XRequestedWith == "XMLHttpRequest" ? PartialView(model) : View(model);
        }

        // giving and taking Nitro away by hand is for the SuperAdmin only (the API refuses everybody else too)
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Grant(string? userName, int days, string? tab)
        {
            if (!User.IsInRole("SuperAdmin"))
                return Forbid();

            var failure = await ApiCallAsync(() => Api.PostAsJsonAsync("api/admin/nitro/grant", new { userName = (userName ?? string.Empty).Trim(), days }));
            if (failure is null)
                TempData["AdminNotice"] = "Nitro was given to " + (userName ?? string.Empty).Trim() + " for " + days + (days == 1 ? " day." : " days.");
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Index), new { tab });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Revoke(string? userName, string? tab)
        {
            if (!User.IsInRole("SuperAdmin"))
                return Forbid();

            var failure = await ApiCallAsync(() => Api.PostAsJsonAsync("api/admin/nitro/revoke", new { userName = (userName ?? string.Empty).Trim() }));
            if (failure is null)
                TempData["AdminNotice"] = "Nitro was taken away from " + (userName ?? string.Empty).Trim() + ".";
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Index), new { tab });
        }
    }
}
