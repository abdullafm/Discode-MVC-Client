using Discode_MVC_Client.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Discode_MVC_Client.Areas.Admin.Controllers
{
    public class BrandingController : AdminBaseController
    {
        private static readonly string[] Slots = { "logo", "favicon" };
        private static readonly string[] Extensions = { ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico" };

        private readonly IWebHostEnvironment _environment;
        private readonly BrandingProvider _branding;

        public BrandingController(IHttpClientFactory httpClientFactory, IWebHostEnvironment environment, BrandingProvider branding) : base(httpClientFactory)
        {
            _environment = environment;
            _branding = branding;
        }

        public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            if (!User.IsInRole("SuperAdmin"))
            {
                context.Result = RedirectToAction("Index", "Home", new { area = "Admin" });
                return;
            }

            await base.OnActionExecutionAsync(context, next);
        }

        public async Task<IActionResult> Index()
        {
            _branding.Invalidate();
            ViewData["Branding"] = await _branding.GetAsync();
            if (Request.Headers["X-Admin-Refresh"] == "1")
            {
                TempData.Keep();
            }

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Upload(string slot, IFormFile? file)
        {
            if (!Slots.Contains(slot))
                return RedirectToAction(nameof(Index));

            var extension = Path.GetExtension(file?.FileName ?? string.Empty).ToLowerInvariant();
            if (file is null || file.Length == 0 || !Extensions.Contains(extension))
            {
                TempData["AdminWarning"] = "Choose a PNG, JPG, GIF, WEBP, SVG or ICO image.";
                return RedirectToAction(nameof(Index));
            }

            if (file.Length > 2_000_000)
            {
                TempData["AdminWarning"] = "Choose an image that is at most 2 MB.";
                return RedirectToAction(nameof(Index));
            }

            var folder = Path.Combine(_environment.WebRootPath, "uploads", "branding");
            Directory.CreateDirectory(folder);
            var fileName = slot + "-" + Guid.NewGuid().ToString("N") + extension;
            using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
                await file.CopyToAsync(stream);

            var failure = await ApiCallAsync(() => Api.PutAsJsonAsync("api/admin/branding/" + slot, new { url = "/uploads/branding/" + fileName }));
            _branding.Invalidate();
            if (failure is null)
                TempData["AdminNotice"] = (slot == "logo" ? "The site logo" : "The favicon") + " was changed.";
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Reset(string slot)
        {
            if (!Slots.Contains(slot))
                return RedirectToAction(nameof(Index));

            var failure = await ApiCallAsync(() => Api.DeleteAsync("api/admin/branding/" + slot));
            _branding.Invalidate();
            if (failure is null)
                TempData["AdminNotice"] = (slot == "logo" ? "The site logo" : "The favicon") + " is back to the default.";
            else
                TempData["AdminWarning"] = failure;

            return RedirectToAction(nameof(Index));
        }
    }
}
