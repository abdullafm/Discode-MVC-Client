using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Home;
using Discode_MVC_Client.ViewModels.Nitro;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class NitroController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public NitroController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IActionResult> Index()
        {
            var displayName = User.Identity?.Name ?? "";
            var fallback = new ProfileUIVM
            {
                DisplayName = displayName,
                UserName = User.FindFirst("userName")?.Value ?? displayName,
                Email = User.FindFirst(ClaimTypes.Email)?.Value ?? ""
            };

            var status = new NitroStatusUIVM();
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var profile = await client.GetFromJsonAsync<ProfileUIVM>("api/account/profile");
                if (profile is not null)
                    fallback = profile;
                status = await client.GetFromJsonAsync<NitroStatusUIVM>("api/nitro") ?? status;
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
            }
            catch (JsonException)
            {
            }

            ViewData["Nitro"] = status;
            ViewData["NitroNotice"] = TempData["NitroNotice"];
            ViewData["NitroError"] = TempData["NitroError"];
            ViewData["NitroGiftLink"] = TempData["NitroGiftLink"];
            return View(ToHome(fallback));
        }

        // the live status: the pages ask for it to know the person's limits and badges
        [HttpGet]
        public Task<IActionResult> Status()
        {
            return Forward(client => client.GetAsync("api/nitro"));
        }

        // opens the Stripe payment page: the browser is sent to the address it answers with
        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Subscribe()
        {
            var site = $"{Request.Scheme}://{Request.Host}";
            return Forward(client => client.PostAsJsonAsync("api/nitro/checkout", new
            {
                successUrl = site + "/Nitro/Success",
                cancelUrl = site + "/Nitro/Index?canceled=1"
            }));
        }

        // Stripe sends the buyer back here after paying
        [HttpGet]
        public async Task<IActionResult> Success(string? session_id)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/nitro/confirm", new { sessionId = session_id ?? string.Empty });
                if (response.IsSuccessStatusCode)
                    TempData["NitroNotice"] = "Welcome to Nitro! Your perks are on.";
                else
                    TempData["NitroError"] = await ReadErrorAsync(response);
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                TempData["NitroError"] = "We could not check the payment right now. If you were charged, Nitro will start in a moment.";
            }

            return RedirectToAction(nameof(Index));
        }

        // ---- gifts: one month of Nitro for a friend, paid once

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> GiftCheckout()
        {
            var site = $"{Request.Scheme}://{Request.Host}";
            return Forward(client => client.PostAsJsonAsync("api/nitro/gift/checkout", new
            {
                successUrl = site + "/Nitro/GiftSuccess",
                cancelUrl = site + "/Nitro/Index?canceled=1"
            }));
        }

        // Stripe sends the buyer back here after paying for a gift: the link is shown on the Nitro page
        [HttpGet]
        public async Task<IActionResult> GiftSuccess(string? session_id)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/nitro/gift/confirm", new { sessionId = session_id ?? string.Empty });
                if (response.IsSuccessStatusCode)
                {
                    using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    TempData["NitroGiftLink"] = document.RootElement.TryGetProperty("link", out var link) ? link.GetString() : null;
                    TempData["NitroNotice"] = "Your gift is ready. Send the link to your friend.";
                }
                else
                {
                    TempData["NitroError"] = await ReadErrorAsync(response);
                }
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                TempData["NitroError"] = "We could not check the payment right now. If you were charged, your gift is under Your gifts in a moment.";
            }
            catch (JsonException)
            {
                TempData["NitroError"] = "That did not work. Your gift, if you paid, is under Your gifts.";
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public Task<IActionResult> Gifts()
        {
            return Forward(client => client.GetAsync("api/nitro/gifts"));
        }

        [HttpGet]
        public Task<IActionResult> GiftInfo(string code)
        {
            if (string.IsNullOrWhiteSpace(code) || code.Length > 64)
                return Task.FromResult<IActionResult>(NotFound(new { errors = new[] { "This gift link is not valid." } }));

            return Forward(client => client.GetAsync("api/nitro/gift/" + Uri.EscapeDataString(code.Trim())));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Redeem([FromBody] RedeemGiftUIVM model)
        {
            if (model is null || string.IsNullOrWhiteSpace(model.Code) || model.Code.Length > 64)
                return Task.FromResult<IActionResult>(BadRequest(new { errors = new[] { "This gift link is not valid." } }));

            return Forward(client => client.PostAsJsonAsync("api/nitro/gift/" + Uri.EscapeDataString(model.Code.Trim()) + "/redeem", new { }));
        }

        // the link people send each other: it opens the page with the gift window
        [HttpGet("/gift/{code}")]
        public IActionResult Gift(string code)
        {
            return Redirect("/Home/Index?gift=" + Uri.EscapeDataString(code ?? string.Empty));
        }

        // Stripe's own page to change the card, cancel or resume
        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Manage()
        {
            var site = $"{Request.Scheme}://{Request.Host}";
            return Forward(client => client.PostAsJsonAsync("api/nitro/portal", new { returnUrl = site + "/Nitro/Index" }));
        }

        private static async Task<string> ReadErrorAsync(HttpResponseMessage response)
        {
            try
            {
                using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                if (document.RootElement.TryGetProperty("errors", out var errors) && errors.ValueKind == JsonValueKind.Array && errors.GetArrayLength() > 0)
                    return errors[0].GetString() ?? "That did not work.";
            }
            catch (JsonException)
            {
            }

            return "That did not work. Try again.";
        }

        private async Task<IActionResult> Forward(Func<HttpClient, Task<HttpResponseMessage>> send)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await send(client);
                var payload = await response.Content.ReadAsStringAsync();
                return new ContentResult
                {
                    StatusCode = (int)response.StatusCode,
                    Content = string.IsNullOrWhiteSpace(payload) ? "{}" : payload,
                    ContentType = "application/json"
                };
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure))
            {
                return StatusCode(503, new { errors = new[] { "The service is unavailable right now. Please try again later." } });
            }
        }

        private static HomeUIVM ToHome(ProfileUIVM profile) => new()
        {
            Profile = profile,
            Update = new UpdateProfileUIVM
            {
                UserName = profile.UserName,
                DisplayName = profile.DisplayName,
                AvatarUrl = profile.AvatarUrl,
                CustomStatus = profile.CustomStatus,
                IsPublic = profile.IsPublic,
                Pronouns = profile.Pronouns,
                Bio = profile.Bio
            }
        };
    }
}
