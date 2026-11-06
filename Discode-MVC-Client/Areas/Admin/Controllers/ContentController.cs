using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class ContentController : AdminBaseController
    {
        private static readonly string[] Types = { "Posts", "Comments", "Stories" };

        public ContentController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        public async Task<IActionResult> Index(string? type, string? search, int page = 1)
        {
            var term = (search ?? string.Empty).Trim();
            var current = Types.FirstOrDefault(x => string.Equals(x, type, StringComparison.OrdinalIgnoreCase)) ?? "Posts";

            var model = new AdminContentListVM { Type = current, Search = term, Page = Math.Max(1, page) };
            try
            {
                var url = "api/admin/content?type=" + current + "&page=" + model.Page + "&pageSize=" + model.PageSize
                    + (term.Length > 0 ? "&search=" + Uri.EscapeDataString(term) : string.Empty);
                var result = await Api.GetFromJsonAsync<AdminContentListVM>(url, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                if (result is not null)
                {
                    model.Items = result.Items;
                    model.Total = result.Total;
                    model.PostCount = result.PostCount;
                    model.CommentCount = result.CommentCount;
                    model.StoryCount = result.StoryCount;
                }
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                model.Error = "The content could not be loaded. Try again in a moment.";
            }
            catch (JsonException)
            {
                model.Error = "The content could not be read from the API response.";
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
        public Task<IActionResult> Warn(string type, int id, string? reason, string? returnTo, int page = 1)
        {
            return Act("api/admin/content/" + type + "/" + id + "/warn", reason, "The warning was sent to the author.", type, returnTo, page);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Delete(string type, int id, string? reason, string? returnTo, int page = 1)
        {
            return Act("api/admin/content/" + type + "/" + id + "/delete", reason, "The content was removed and the author was told why.", type, returnTo, page);
        }

        private async Task<IActionResult> Act(string url, string? reason, string success, string type, string? returnTo, int page)
        {
            var failure = await ApiCallAsync(() => Api.PostAsJsonAsync(url, new { reason = reason ?? string.Empty }));
            if (failure is null)
                TempData["AdminNotice"] = success;
            else
                TempData["AdminWarning"] = failure;

            if (returnTo == "reports")
                return RedirectToAction("Index", "Reports");

            var tab = type.StartsWith("c", StringComparison.OrdinalIgnoreCase) ? "Comments" : type.StartsWith("s", StringComparison.OrdinalIgnoreCase) ? "Stories" : "Posts";
            return RedirectToAction(nameof(Index), new { type = tab, page });
        }
    }
}
