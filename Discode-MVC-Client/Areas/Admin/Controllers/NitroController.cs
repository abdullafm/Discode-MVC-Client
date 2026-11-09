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
                Tab = string.Equals(tab, "members", StringComparison.OrdinalIgnoreCase) ? "members" : string.Equals(tab, "gifts", StringComparison.OrdinalIgnoreCase) ? "gifts" : "events"
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
                    model.RevenueCents = result.RevenueCents;
                    model.RevenueThisMonthCents = result.RevenueThisMonthCents;
                    model.PageSize = result.PageSize;
                }

                if (model.Tab == "gifts")
                {
                    var gifts = await Api.GetFromJsonAsync<AdminNitroGiftPageVM>("api/admin/nitro/gifts?page=" + model.Page + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty), new JsonSerializerOptions(JsonSerializerDefaults.Web));
                    if (gifts is not null)
                    {
                        model.Gifts = gifts.Items;
                        model.TotalGifts = gifts.Total;
                    }
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

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Grant(string? userName, int days, string? tab, string? back)
        {
            if (!User.IsInRole("SuperAdmin"))
                return Forbid();

            var failure = await ApiCallAsync(() => Api.PostAsJsonAsync("api/admin/nitro/grant", new { userName = (userName ?? string.Empty).Trim(), days }));
            if (failure is null)
                TempData["AdminNotice"] = "Nitro was given to " + (userName ?? string.Empty).Trim() + " for " + days + (days == 1 ? " day." : " days.");
            else
                TempData["AdminWarning"] = failure;

            return Back(back, tab);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> MakeGift(int days)
        {
            if (!User.IsInRole("SuperAdmin"))
                return Forbid();

            try
            {
                var response = await Api.PostAsJsonAsync("api/admin/nitro/gifts", new { days });
                if (response.IsSuccessStatusCode)
                {
                    using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    var link = document.RootElement.TryGetProperty("link", out var found) ? found.GetString() : string.Empty;
                    TempData["AdminNotice"] = "A free gift of " + days + (days == 1 ? " day" : " days") + " was made. Send this link: " + link;
                }
                else
                {
                    TempData["AdminWarning"] = "The gift could not be made. Choose between 1 and 3650 days.";
                }
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure) || failure is JsonException)
            {
                TempData["AdminWarning"] = "The gift could not be made right now. Try again in a moment.";
            }

            return RedirectToAction(nameof(Index), new { tab = "gifts" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RevokeGift(int id)
        {
            if (!User.IsInRole("SuperAdmin"))
                return Forbid();

            var failure = await ApiCallAsync(() => Api.DeleteAsync("api/admin/nitro/gifts/" + id));
            if (failure is null)
                TempData["AdminNotice"] = "The gift was taken back.";
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Index), new { tab = "gifts" });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Revoke(string? userName, string? tab, string? back)
        {
            if (!User.IsInRole("SuperAdmin"))
                return Forbid();

            var failure = await ApiCallAsync(() => Api.PostAsJsonAsync("api/admin/nitro/revoke", new { userName = (userName ?? string.Empty).Trim() }));
            if (failure is null)
                TempData["AdminNotice"] = "Nitro was taken away from " + (userName ?? string.Empty).Trim() + ".";
            else
                TempData["AdminWarning"] = failure;

            return Back(back, tab);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> BoostTime(string? userName, int hours, string? back)
        {
            if (!User.IsInRole("SuperAdmin"))
                return Forbid();

            var failure = await ApiCallAsync(() => Api.PostAsJsonAsync("api/admin/nitro/boost-time", new { userName = (userName ?? string.Empty).Trim(), hours }));
            if (failure is null)
                TempData["AdminNotice"] = "The wait on the boosts of " + (userName ?? string.Empty).Trim() + " was made " + (hours > 0 ? "longer" : "shorter") + " by " + Math.Abs(hours) + (Math.Abs(hours) == 1 ? " hour." : " hours.");
            else
                TempData["AdminWarning"] = failure;

            return Back(back, "members");
        }

        private IActionResult Back(string? back, string? tab)
        {
            if (!string.IsNullOrEmpty(back) && Url.IsLocalUrl(back))
                return LocalRedirect(back);

            return RedirectToAction(nameof(Index), new { tab });
        }
    }
}
