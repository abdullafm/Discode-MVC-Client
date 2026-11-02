using Discode_MVC_Client.ViewModels.Admin;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class LiveController : AdminBaseController
    {
        public LiveController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        public async Task<IActionResult> Index()
        {
            var model = new AdminLiveListVM();
            try
            {
                var result = await Api.GetFromJsonAsync<AdminLiveListVM>("api/admin/live", new JsonSerializerOptions(JsonSerializerDefaults.Web));
                if (result is not null)
                    model.Items = result.Items;
            }
            catch (HttpRequestException)
            {
                model.Error = "The live streams could not be loaded. Restart the API so it runs the latest build, then try again.";
            }
            catch (JsonException)
            {
                model.Error = "The live streams could not be read from the API response.";
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
        public Task<IActionResult> Warn(int id, string? reason)
        {
            return Act("api/admin/live/" + id + "/warn", new { reason = reason ?? string.Empty }, "The warning was sent to the streamer.");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> End(int id, string? reason)
        {
            return Act("api/admin/live/" + id + "/end", new { reason = reason ?? string.Empty }, "The stream was closed and the streamer was told why.");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Ban(string hostId, int minutes, string? reason)
        {
            return Act("api/admin/users/" + hostId + "/live-ban", new { reason = reason ?? string.Empty, minutes }, "The streamer cannot go live anymore and the stream was closed.");
        }

        private async Task<IActionResult> Act(string url, object body, string success)
        {
            var failure = await ApiCallAsync(() => Api.PostAsJsonAsync(url, body));
            if (failure is null)
                TempData["AdminNotice"] = success;
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Index));
        }
    }
}
