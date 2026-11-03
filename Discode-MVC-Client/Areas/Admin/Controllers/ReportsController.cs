using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class ReportsController : AdminBaseController
    {
        private static readonly string[] Statuses = { "Open", "Reviewed", "Dismissed", "All" };

        public ReportsController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        public async Task<IActionResult> Index(string? status, string? search, int page = 1)
        {
            var term = (search ?? string.Empty).Trim();
            var current = Statuses.FirstOrDefault(x => string.Equals(x, status, StringComparison.OrdinalIgnoreCase)) ?? "Open";

            var model = new AdminReportListVM { Search = term, Status = current, Page = Math.Max(1, page) };
            try
            {
                var url = "api/admin/reports?status=" + current + "&page=" + model.Page + "&pageSize=" + model.PageSize
                    + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty);
                var result = await Api.GetFromJsonAsync<AdminReportListVM>(url, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                if (result is not null)
                {
                    model.Items = result.Items;
                    model.Total = result.Total;
                    model.OpenCount = result.OpenCount;
                    model.ReviewedCount = result.ReviewedCount;
                    model.DismissedCount = result.DismissedCount;
                }
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                model.Error = "The reports could not be loaded. Try again in a moment.";
            }
            catch (JsonException)
            {
                model.Error = "The reports could not be read from the API response.";
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
        public async Task<IActionResult> SetStatus(int id, string? status, string? filter, string? search, int page = 1)
        {
            var target = (status ?? string.Empty).Trim();
            var failure = await ApiCallAsync(() => Api.PostAsJsonAsync("api/admin/reports/" + id + "/status", new { status = target }));
            if (failure is null)
            {
                TempData["AdminNotice"] = target switch
                {
                    "Reviewed" => "The report was marked as reviewed.",
                    "Dismissed" => "The report was dismissed.",
                    _ => "The report is open again."
                };
            }
            else
            {
                TempData["AdminWarning"] = failure;
            }

            return RedirectToAction(nameof(Index), new { status = filter, search, page });
        }
    }
}
