using Discode_MVC_Client.ViewModels.Account;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Net;
using System.Security.Claims;
using System.Text.Json;

namespace Discode_MVC_Client.Controllers
{
    public class AccountController : Controller
    {
        private static readonly string[] Months =
        {
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        };

        private readonly IHttpClientFactory _httpClientFactory;

        public AccountController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public IActionResult Register()
        {
            if (User.Identity?.IsAuthenticated == true)
                return RedirectToAction("Index", "Home");

            return View(new RegisterVM { Email = TempData["AuthEmail"] as string ?? string.Empty });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterVM model)
        {
            model.Email = model.Email?.Trim() ?? string.Empty;
            model.DisplayName = model.DisplayName?.Trim() ?? string.Empty;
            model.UserName = model.UserName?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(model.Email) ||
                string.IsNullOrWhiteSpace(model.DisplayName) ||
                string.IsNullOrWhiteSpace(model.UserName) ||
                string.IsNullOrWhiteSpace(model.Password) ||
                string.IsNullOrWhiteSpace(model.Day) ||
                string.IsNullOrWhiteSpace(model.Month) ||
                string.IsNullOrWhiteSpace(model.Year) ||
                !TryParseBirthDay(model.Day, model.Month, model.Year, out var birthDay))
            {
                ModelState.AddModelError(string.Empty, "Fill in all fields.");
                return View(model);
            }

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/account/register", new
                {
                    model.Email,
                    model.DisplayName,
                    model.UserName,
                    birthDay,
                    model.Password
                });

                if (response.IsSuccessStatusCode)
                {
                    return RedirectToAction(nameof(VerifyEmail), new { email = model.Email });
                }

                var result = await ReadJsonAsync<RegisterResponseVM>(response);
                foreach (var error in result?.Errors is { Length: > 0 } ? result.Errors : new[] { "Could not create the account. Check the details and try again." })
                    ModelState.AddModelError(string.Empty, error);
            }
            catch (HttpRequestException)
            {
                ModelState.AddModelError(string.Empty, "The service is unavailable right now. Please try again later.");
            }

            return View(model);
        }

        [HttpGet]
        public IActionResult Login(string? returnUrl = null)
        {
            if (User.Identity?.IsAuthenticated == true)
                return RedirectToAction("Index", "Home");

            return View(new LoginVM
            {
                ReturnUrl = returnUrl,
                Email = TempData["AuthEmail"] as string ?? string.Empty
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginVM model)
        {
            var password = model.Password;
            model.Email = model.Email?.Trim() ?? string.Empty;
            model.Password = string.Empty;

            if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(password))
            {
                ModelState.AddModelError(string.Empty, "Enter your email and password.");
                return View(model);
            }

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/account/login", new
                {
                    email = model.Email.Trim(),
                    password
                });

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    ModelState.AddModelError(string.Empty, "Too many attempts. Please wait a minute and try again.");
                    return View(model);
                }

                var result = await ReadJsonAsync<LoginResponseVM>(response);
                if (!response.IsSuccessStatusCode || result is null || !result.IsSuccess || string.IsNullOrEmpty(result.Token))
                {
                    foreach (var error in result?.Errors is { Length: > 0 } ? result.Errors : new[] { "Could not log in. Check your details and try again." })
                        ModelState.AddModelError(string.Empty, error);
                    return View(model);
                }

                await SignInAsync(result);
                if (!string.IsNullOrEmpty(model.ReturnUrl) && Url.IsLocalUrl(model.ReturnUrl))
                    return LocalRedirect(model.ReturnUrl);

                return RedirectToAction("Index", "Home");
            }
            catch (HttpRequestException)
            {
                ModelState.AddModelError(string.Empty, "The service is unavailable right now. Please try again later.");
                return View(model);
            }
        }

        [HttpGet]
        public IActionResult VerifyEmail(string? email)
        {
            if (User.Identity?.IsAuthenticated == true)
                return RedirectToAction("Index", "Home");

            if (string.IsNullOrWhiteSpace(email))
                return RedirectToAction(nameof(Register));

            return View(new VerifyEmailVM { Email = email.Trim() });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> VerifyEmail(VerifyEmailVM model)
        {
            if (User.Identity?.IsAuthenticated == true)
                return RedirectToAction("Index", "Home");

            model.Email = model.Email?.Trim() ?? string.Empty;
            model.Code = new string((model.Code ?? string.Empty).Where(char.IsDigit).ToArray());

            if (string.IsNullOrWhiteSpace(model.Email) || string.IsNullOrWhiteSpace(model.Code))
            {
                ModelState.AddModelError(string.Empty, "Enter the 4-digit code.");
                return View(model);
            }

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/account/verify-email", new
                {
                    model.Email,
                    model.Code
                });

                var result = await ReadJsonAsync<RegisterResponseVM>(response);
                if (response.IsSuccessStatusCode && result is not null && result.IsSuccess)
                {
                    TempData["AuthEmail"] = model.Email;
                    TempData["Info"] = "Email confirmed. You can sign in now.";
                    return RedirectToAction(nameof(Login));
                }

                foreach (var error in result?.Errors is { Length: > 0 } ? result.Errors : new[] { "That code is incorrect." })
                    ModelState.AddModelError(string.Empty, error);
            }
            catch (HttpRequestException)
            {
                ModelState.AddModelError(string.Empty, "The service is unavailable right now. Please try again later.");
            }

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResendCode(VerifyEmailVM model)
        {
            if (User.Identity?.IsAuthenticated == true)
                return RedirectToAction("Index", "Home");

            model.Email = model.Email?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(model.Email))
                return RedirectToAction(nameof(Register));

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await client.PostAsJsonAsync("api/account/resend-code", new { model.Email });
                var result = await ReadJsonAsync<RegisterResponseVM>(response);
                if (response.IsSuccessStatusCode && result is not null && result.IsSuccess)
                    TempData["Info"] = "A new code was sent to your email.";
                else
                    foreach (var error in result?.Errors is { Length: > 0 } ? result.Errors : new[] { "Could not resend the code." })
                        ModelState.AddModelError(string.Empty, error);
            }
            catch (HttpRequestException)
            {
                ModelState.AddModelError(string.Empty, "The service is unavailable right now. Please try again later.");
            }

            return View(nameof(VerifyEmail), new VerifyEmailVM { Email = model.Email });
        }

        [HttpGet]
        public IActionResult ForgotPassword()
        {
            if (User.Identity?.IsAuthenticated == true)
                return RedirectToAction("Index", "Home");

            return View(new ForgotPasswordVM());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult ForgotPassword(ForgotPasswordVM model)
        {
            if (User.Identity?.IsAuthenticated == true)
                return RedirectToAction("Index", "Home");

            model.Email = model.Email?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(model.Email))
            {
                ModelState.AddModelError(string.Empty, "Enter your email.");
                return View(model);
            }

            ViewBag.Info = "If an account exists for this email, we will send a reset link.";
            return View(new ForgotPasswordVM());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction(nameof(Login));
        }

        private async Task SignInAsync(LoginResponseVM login)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, login.UserId ?? string.Empty),
                new(ClaimTypes.Email, login.Email ?? string.Empty),
                new(ClaimTypes.Name, login.DisplayName ?? login.UserName ?? login.Email ?? string.Empty),
                new("userName", login.UserName ?? string.Empty)
            };
            claims.AddRange(login.Roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var principal = new ClaimsPrincipal(
                new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));

            var properties = new AuthenticationProperties
            {
                IsPersistent = false,
                AllowRefresh = false,
                ExpiresUtc = login.ExpiresAt
            };

            properties.StoreTokens(new[]
            {
                new AuthenticationToken
                {
                    Name = "access_token",
                    Value = login.Token!
                }
            });

            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, properties);
        }

        private static bool TryParseBirthDay(string? day, string? month, string? year, out DateTime birthDay)
        {
            birthDay = default;
            if (!int.TryParse(day, out var d) || !int.TryParse(year, out var y))
                return false;

            var m = Array.FindIndex(Months, n => string.Equals(n, month, StringComparison.OrdinalIgnoreCase)) + 1;
            return m > 0 && DateTime.TryParseExact($"{y:D4}-{m:D2}-{d:D2}", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out birthDay);
        }

        private static async Task<T?> ReadJsonAsync<T>(HttpResponseMessage response) where T : class
        {
            try
            {
                return await response.Content.ReadFromJsonAsync<T>();
            }
            catch (JsonException)
            {
                return null;
            }
        }
    }
}
