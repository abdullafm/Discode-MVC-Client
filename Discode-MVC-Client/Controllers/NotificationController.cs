using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using Discode_MVC_Client.ViewModels.Social;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class NotificationController : ApiControllerBase
    {
        public NotificationController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        [HttpGet]
        public async Task<IActionResult> Open(int id, string? tab, int? live)
        {
            var result = await PostAsync($"api/notification/{id}/read", new { });
            if (result.Status == HttpStatusCode.Unauthorized)
                return await SessionExpiredAsync();

            if (tab == "pending" || tab == "all")
                return RedirectToAction("Index", "Home", new { tab });

            if (live is > 0)
                return RedirectToAction("Index", "Social", new { live });

            return RedirectToAction("Index", "Social");
        }

        [HttpGet]
        public async Task<IActionResult> Unread()
        {
            var result = await GetAsync<List<NotificationVM>>("api/notification");
            if (result.Status == HttpStatusCode.Unauthorized)
                return Unauthorized();

            return Ok((result.Data ?? new List<NotificationVM>()).Where(n => !n.IsRead).Select(n => n.Id));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var result = await PostAsync("api/notification/read", new { });
            return await DoneAsync(result.Status);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await DeleteAsync($"api/notification/{id}");
            return await DoneAsync(result.Status);
        }

        private async Task<IActionResult> DoneAsync(HttpStatusCode? status)
        {
            if (status == HttpStatusCode.Unauthorized)
                return IsAjax ? Unauthorized() : await SessionExpiredAsync();

            return IsAjax ? NoContent() : RedirectToAction("Index", "Home");
        }
    }
}
