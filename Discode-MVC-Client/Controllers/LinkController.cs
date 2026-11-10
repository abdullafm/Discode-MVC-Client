using Discode_MVC_Client.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class LinkController : Controller
    {
        private const int PerMinute = 40;

        private readonly ILinkPreviewService _previews;
        private readonly IMemoryCache _cache;

        public LinkController(ILinkPreviewService previews, IMemoryCache cache)
        {
            _previews = previews;
            _cache = cache;
        }

        [HttpGet]
        public async Task<IActionResult> Preview(string? url, CancellationToken cancel)
        {
            if (!LinkPreviewService.TryNormalize(url, out _))
            {
                return Ok(new LinkPreview());
            }

            var key = "linkrate:" + (User.FindFirstValue(ClaimTypes.NameIdentifier) ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? "x");
            var used = _cache.GetOrCreate(key, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
                return new int[1];
            })!;
            if (Interlocked.Increment(ref used[0]) > PerMinute)
            {
                return StatusCode(429, new { errors = new[] { "Too many previews. Try again in a minute." } });
            }

            return Ok(await _previews.GetAsync(url!, cancel));
        }
    }
}
