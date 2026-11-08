using Microsoft.Extensions.Caching.Memory;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;

namespace Discode_MVC_Client.Services
{
    public class LinkPreview
    {
        // "image" (the address is a picture), "link" (a page with a title or a picture) or "none"
        public string Type { get; set; } = "none";
        public string Url { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public string SiteName { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
    }

    public interface ILinkPreviewService
    {
        Task<LinkPreview> GetAsync(string address, CancellationToken cancel);
    }

    // Looks at a web page for the card shown under a message. The address comes from a stranger, so this is careful:
    // only public internet addresses are contacted (not this machine, not the local network), every redirect is checked again,
    // and the answer is small and quick.
    public class LinkPreviewService : ILinkPreviewService
    {
        private const int MaxBytes = 400 * 1024;
        private const int MaxRedirects = 3;

        private static readonly Regex MetaTag = new("<meta\\s+[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex Attribute = new("([a-zA-Z:_-]+)\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", RegexOptions.Compiled);
        private static readonly Regex TitleTag = new("<title[^>]*>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

        private readonly IMemoryCache _cache;
        private readonly HttpMessageInvoker _client;
        private readonly SemaphoreSlim _gate = new(8);

        public LinkPreviewService(IMemoryCache cache)
        {
            _cache = cache;
            var handler = new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                UseCookies = false,
                ConnectTimeout = TimeSpan.FromSeconds(3),
                PooledConnectionLifetime = TimeSpan.FromMinutes(2),
                ConnectCallback = ConnectToPublicAddressAsync
            };
            _client = new HttpMessageInvoker(handler);
        }

        public async Task<LinkPreview> GetAsync(string address, CancellationToken cancel)
        {
            if (!TryNormalize(address, out var uri))
            {
                return new LinkPreview();
            }

            var key = "linkpreview:" + uri.AbsoluteUri;
            if (_cache.TryGetValue(key, out LinkPreview? cached) && cached is not null)
            {
                return cached;
            }

            LinkPreview result;
            await _gate.WaitAsync(cancel);
            try
            {
                using var limit = CancellationTokenSource.CreateLinkedTokenSource(cancel);
                limit.CancelAfter(TimeSpan.FromSeconds(5));
                result = await FetchAsync(uri, limit.Token);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException or IOException or SocketException or InvalidOperationException)
            {
                result = new LinkPreview();
            }
            finally
            {
                _gate.Release();
            }

            // a failure is remembered for a short while only, so that a page that is down is not asked again at once
            _cache.Set(key, result, result.Type == "none" ? TimeSpan.FromMinutes(5) : TimeSpan.FromHours(6));
            return result;
        }

        public static bool TryNormalize(string? address, out Uri uri)
        {
            uri = null!;
            if (string.IsNullOrWhiteSpace(address) || address.Length > 500)
            {
                return false;
            }

            if (!Uri.TryCreate(address.Trim(), UriKind.Absolute, out var parsed) || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
            {
                return false;
            }

            // no passwords in the address, only the usual ports
            if (!string.IsNullOrEmpty(parsed.UserInfo) || (parsed.Port != 80 && parsed.Port != 443))
            {
                return false;
            }

            uri = parsed;
            return true;
        }

        public static bool IsPublic(IPAddress address)
        {
            if (address.IsIPv4MappedToIPv6)
            {
                address = address.MapToIPv4();
            }

            if (IPAddress.IsLoopback(address) || address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any) || address.Equals(IPAddress.None))
            {
                return false;
            }

            var bytes = address.GetAddressBytes();
            if (address.AddressFamily == AddressFamily.InterNetwork)
            {
                return !(bytes[0] == 10
                    || bytes[0] == 127
                    || bytes[0] == 0
                    || (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127)
                    || (bytes[0] == 169 && bytes[1] == 254)
                    || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                    || (bytes[0] == 192 && bytes[1] == 168)
                    || (bytes[0] == 192 && bytes[1] == 0 && bytes[2] == 0)
                    || (bytes[0] == 198 && (bytes[1] == 18 || bytes[1] == 19))
                    || bytes[0] >= 224);
            }

            if (address.AddressFamily == AddressFamily.InterNetworkV6)
            {
                return !(address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast || (bytes[0] & 0xFE) == 0xFC);
            }

            return false;
        }

        // the address of the connection is chosen here and checked, so the name can not be switched to a private address afterwards
        private static async ValueTask<Stream> ConnectToPublicAddressAsync(SocketsHttpConnectionContext context, CancellationToken cancel)
        {
            var host = context.DnsEndPoint.Host;
            IPAddress[] addresses;
            if (IPAddress.TryParse(host, out var literal))
            {
                addresses = new[] { literal };
            }
            else
            {
                addresses = await Dns.GetHostAddressesAsync(host, cancel);
            }

            var allowed = addresses.Where(IsPublic).ToArray();
            if (allowed.Length == 0 || allowed.Length != addresses.Length)
            {
                throw new HttpRequestException("That address is not on the public internet.");
            }

            var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
            try
            {
                await socket.ConnectAsync(allowed, context.DnsEndPoint.Port, cancel);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        }

        private static bool IsYouTube(Uri uri)
        {
            var host = uri.Host.ToLowerInvariant();
            return host is "youtube.com" or "www.youtube.com" or "m.youtube.com" or "youtu.be";
        }

        // YouTube answers a program with a consent page, its own oEmbed address gives the title and the picture
        private async Task<LinkPreview> FetchYouTubeAsync(Uri video, CancellationToken cancel)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://www.youtube.com/oembed?format=json&url=" + Uri.EscapeDataString(video.AbsoluteUri));
            request.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (compatible; DiscodeLinkPreview/1.0)");
            using var response = await _client.SendAsync(request, cancel);
            if (!response.IsSuccessStatusCode)
            {
                return new LinkPreview();
            }

            using var document = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancel));
            string Read(string name) => document.RootElement.TryGetProperty(name, out var value) && value.ValueKind == System.Text.Json.JsonValueKind.String ? value.GetString() ?? string.Empty : string.Empty;
            var thumbnail = Read("thumbnail_url");
            return new LinkPreview
            {
                Type = "link",
                Url = video.AbsoluteUri,
                Title = Trim(Read("title"), 200),
                Description = Trim(Read("author_name"), 100),
                Image = Uri.TryCreate(thumbnail, UriKind.Absolute, out var picture) && picture.Scheme == Uri.UriSchemeHttps ? picture.AbsoluteUri : string.Empty,
                SiteName = "YouTube",
                Color = "#ff0000"
            };
        }

        private async Task<LinkPreview> FetchAsync(Uri start, CancellationToken cancel)
        {
            if (IsYouTube(start))
            {
                return await FetchYouTubeAsync(start, cancel);
            }

            var current = start;
            for (var hop = 0; hop <= MaxRedirects; hop++)
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, current);
                request.Headers.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (compatible; DiscodeLinkPreview/1.0)");
                request.Headers.TryAddWithoutValidation("Accept", "text/html,application/xhtml+xml,image/*;q=0.8");
                request.Headers.TryAddWithoutValidation("Accept-Language", "en");
                using var response = await _client.SendAsync(request, cancel);

                if ((int)response.StatusCode is >= 300 and < 400 && response.Headers.Location is { } next)
                {
                    var target = next.IsAbsoluteUri ? next : new Uri(current, next);
                    if (!TryNormalize(target.AbsoluteUri, out current))
                    {
                        return new LinkPreview();
                    }

                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    return new LinkPreview();
                }

                var type = response.Content.Headers.ContentType?.MediaType?.ToLowerInvariant() ?? string.Empty;
                if (type.StartsWith("image/") && type != "image/svg+xml")
                {
                    return new LinkPreview { Type = "image", Url = current.AbsoluteUri };
                }

                if (type != "text/html" && type != "application/xhtml+xml")
                {
                    return new LinkPreview();
                }

                var html = await ReadLimitedAsync(response, cancel);
                return Parse(html, current);
            }

            return new LinkPreview();
        }

        private static async Task<string> ReadLimitedAsync(HttpResponseMessage response, CancellationToken cancel)
        {
            await using var stream = await response.Content.ReadAsStreamAsync(cancel);
            var buffer = new byte[MaxBytes];
            var total = 0;
            while (total < buffer.Length)
            {
                var read = await stream.ReadAsync(buffer.AsMemory(total, buffer.Length - total), cancel);
                if (read == 0)
                {
                    break;
                }

                total += read;
            }

            Encoding encoding = Encoding.UTF8;
            var charset = response.Content.Headers.ContentType?.CharSet?.Trim('"');
            if (!string.IsNullOrEmpty(charset))
            {
                try
                {
                    encoding = Encoding.GetEncoding(charset);
                }
                catch (ArgumentException)
                {
                }
            }

            return encoding.GetString(buffer, 0, total);
        }

        public static LinkPreview Parse(string html, Uri page)
        {
            var head = html;
            var close = head.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
            if (close > 0)
            {
                head = head.Substring(0, close);
            }

            var meta = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (Match tag in MetaTag.Matches(head))
            {
                string? name = null;
                string? content = null;
                foreach (Match attribute in Attribute.Matches(tag.Value))
                {
                    var key = attribute.Groups[1].Value.ToLowerInvariant();
                    var value = attribute.Groups[2].Success ? attribute.Groups[2].Value : attribute.Groups[3].Success ? attribute.Groups[3].Value : attribute.Groups[4].Value;
                    if (key is "property" or "name")
                    {
                        name ??= value;
                    }
                    else if (key == "content")
                    {
                        content = value;
                    }
                }

                if (name is not null && content is not null && !meta.ContainsKey(name))
                {
                    meta[name] = WebUtility.HtmlDecode(content).Trim();
                }
            }

            string Pick(params string[] names)
            {
                foreach (var name in names)
                {
                    if (meta.TryGetValue(name, out var value) && value.Length > 0)
                    {
                        return value;
                    }
                }

                return string.Empty;
            }

            var title = Pick("og:title", "twitter:title");
            if (title.Length == 0)
            {
                var found = TitleTag.Match(head);
                if (found.Success)
                {
                    title = WebUtility.HtmlDecode(Regex.Replace(found.Groups[1].Value, "\\s+", " ")).Trim();
                }
            }

            var image = Pick("og:image", "og:image:url", "twitter:image", "twitter:image:src");
            if (image.Length > 0)
            {
                image = Uri.TryCreate(page, image, out var absolute) && (absolute.Scheme == Uri.UriSchemeHttp || absolute.Scheme == Uri.UriSchemeHttps) ? absolute.AbsoluteUri : string.Empty;
            }

            var color = Pick("theme-color");
            if (!Regex.IsMatch(color, "^#[0-9a-fA-F]{3,8}$"))
            {
                color = string.Empty;
            }

            var result = new LinkPreview
            {
                Type = "link",
                Url = Pick("og:url").Length > 0 && Uri.TryCreate(Pick("og:url"), UriKind.Absolute, out var canonical) && canonical.Host == page.Host ? canonical.AbsoluteUri : page.AbsoluteUri,
                Title = Trim(title, 200),
                Description = Trim(Pick("og:description", "twitter:description", "description"), 400),
                Image = image,
                SiteName = Trim(Pick("og:site_name"), 80),
                Color = color
            };

            if (result.Title.Length == 0 && result.Description.Length == 0 && result.Image.Length == 0)
            {
                return new LinkPreview();
            }

            if (result.SiteName.Length == 0)
            {
                result.SiteName = page.Host.StartsWith("www.") ? page.Host.Substring(4) : page.Host;
            }

            return result;
        }

        private static string Trim(string value, int length)
        {
            value = Regex.Replace(value ?? string.Empty, "\\s+", " ").Trim();
            return value.Length > length ? value.Substring(0, length - 1) + "\u2026" : value;
        }
    }
}
