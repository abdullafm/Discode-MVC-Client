using Microsoft.Extensions.Caching.Memory;

namespace Discode_MVC_Client.Services
{
    public class SiteBranding
    {
        public string LogoUrl { get; set; } = string.Empty;
        public string FaviconUrl { get; set; } = string.Empty;
    }

    public class BrandingProvider
    {
        private const string CacheKey = "site-branding";
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;

        public BrandingProvider(IHttpClientFactory httpClientFactory, IMemoryCache cache)
        {
            _httpClientFactory = httpClientFactory;
            _cache = cache;
        }

        public async Task<SiteBranding> GetAsync()
        {
            if (_cache.TryGetValue(CacheKey, out SiteBranding? cached) && cached is not null)
                return cached;

            var branding = new SiteBranding();
            var ttl = TimeSpan.FromSeconds(5);
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                branding = await client.GetFromJsonAsync<SiteBranding>("api/branding") ?? branding;
                ttl = TimeSpan.FromSeconds(30);
            }
            catch (Exception)
            {
            }

            _cache.Set(CacheKey, branding, ttl);
            return branding;
        }

        public void Invalidate() => _cache.Remove(CacheKey);
    }
}
