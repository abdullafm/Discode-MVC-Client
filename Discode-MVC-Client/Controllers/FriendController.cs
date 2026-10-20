using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class FriendController : ApiControllerBase
    {
        public FriendController(IHttpClientFactory httpClientFactory) : base(httpClientFactory)
        {
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Send(string? userName, string? userId, string? tab, string? returnUrl)
        {
            if (string.IsNullOrWhiteSpace(userName) && string.IsNullOrWhiteSpace(userId))
                return await DoneAsync(false, new[] { "Choose a user." }, string.Empty, "add", returnUrl, null);

            var result = await PostAsync("api/friend/request", new
            {
                userId = string.IsNullOrWhiteSpace(userId) ? null : userId.Trim(),
                userName = userName?.Trim()
            });

            return await DoneAsync(result.Success, result.Errors, "Friend request sent.", tab ?? "pending", returnUrl, result.Status);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Accept(int id, string? tab, string? returnUrl)
        {
            var result = await PostAsync($"api/friend/request/{id}/accept", new { });
            return await DoneAsync(result.Success, result.Errors, "Friend request accepted.", tab ?? "all", returnUrl, result.Status);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Decline(int id, string? tab, string? returnUrl)
        {
            var result = await PostAsync($"api/friend/request/{id}/decline", new { });
            return await DoneAsync(result.Success, result.Errors, "Friend request declined.", tab ?? "pending", returnUrl, result.Status);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Cancel(int id, string? tab, string? returnUrl)
        {
            var result = await DeleteAsync($"api/friend/request/{id}");
            return await DoneAsync(result.Success, result.Errors, "Friend request cancelled.", tab ?? "pending", returnUrl, result.Status);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Remove(int id, string? tab, string? returnUrl)
        {
            var result = await DeleteAsync($"api/friend/{id}");
            return await DoneAsync(result.Success, result.Errors, "Friend removed.", tab ?? "all", returnUrl, result.Status);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Block(string? userName, string? userId, string? tab, string? returnUrl)
        {
            if (string.IsNullOrWhiteSpace(userName) && string.IsNullOrWhiteSpace(userId))
                return await DoneAsync(false, new[] { "Choose a user." }, string.Empty, tab, returnUrl, null);

            var result = await PostAsync("api/block", new
            {
                userId = string.IsNullOrWhiteSpace(userId) ? null : userId.Trim(),
                userName = userName?.Trim()
            });

            return await DoneAsync(result.Success, result.Errors, "User blocked.", tab ?? "blocked", returnUrl, result.Status);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Unblock(int id, string? tab, string? returnUrl)
        {
            var result = await DeleteAsync($"api/block/{id}");
            return await DoneAsync(result.Success, result.Errors, "User unblocked.", tab ?? "blocked", returnUrl, result.Status);
        }

        private async Task<IActionResult> DoneAsync(bool success, string[] errors, string message, string? tab, string? returnUrl, HttpStatusCode? status)
        {
            if (status == HttpStatusCode.Unauthorized)
                return IsAjax ? Unauthorized() : await SessionExpiredAsync();

            if (IsAjax)
                return success ? Ok(new { isSuccess = true }) : BadRequest(new { errors });

            if (success) TempData["Success"] = message;
            else TempData["Error"] = string.Join(" ", errors);

            if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
                return LocalRedirect(returnUrl);

            return RedirectToAction("Index", "Home", new { tab });
        }
    }
}
