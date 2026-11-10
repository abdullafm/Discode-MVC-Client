using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using System.Net;
using System.Text;
using System.Text.Json;

namespace Discode_MVC_Client.ViewComponents
{
    public class ServerRailViewComponent : ViewComponent
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public ServerRailViewComponent(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IViewComponentResult> InvokeAsync()
        {
            var html = new StringBuilder("<div id=\"server-list\">");
            try
            {
                var response = await _httpClientFactory.CreateClient("DiscodeApi").GetAsync("api/server");
                if (response.IsSuccessStatusCode)
                {
                    var servers = await response.Content.ReadFromJsonAsync<JsonElement>();
                    var current = HttpContext.Request.Path.StartsWithSegments("/Server", StringComparison.OrdinalIgnoreCase)
                        ? HttpContext.Request.Query["id"].ToString()
                        : string.Empty;

                    if (servers.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var server in servers.EnumerateArray())
                        {
                            var id = server.TryGetProperty("id", out var idValue) ? idValue.ToString() : string.Empty;
                            var name = server.TryGetProperty("name", out var nameValue) ? nameValue.GetString() ?? "Server" : "Server";
                            var icon = server.TryGetProperty("iconUrl", out var iconValue) ? iconValue.GetString() ?? string.Empty : string.Empty;
                            var mentions = server.TryGetProperty("mentionCount", out var mentionValue) && mentionValue.ValueKind == JsonValueKind.Number ? mentionValue.GetInt32() : 0;

                            html.Append("<button type=\"button\" class=\"server-chip").Append(current.Length > 0 && current == id ? " on" : string.Empty).Append("\" aria-label=\"")
                                .Append(WebUtility.HtmlEncode(name)).Append("\" data-id=\"").Append(WebUtility.HtmlEncode(id)).Append("\">");
                            if (icon.Length > 0)
                                html.Append("<img alt=\"\" src=\"").Append(WebUtility.HtmlEncode(icon)).Append("\" class=\"server-chip-icon\" draggable=\"false\">");
                            else
                                html.Append(WebUtility.HtmlEncode(name.Trim().Length > 0 ? name.Trim().Substring(0, 1).ToUpperInvariant() : string.Empty));
                            html.Append("<span class=\"server-badge\"").Append(mentions > 0 ? string.Empty : " hidden").Append('>')
                                .Append(mentions > 99 ? "99+" : mentions.ToString()).Append("</span></button>");
                        }
                    }
                }
            }
            catch (Exception failure) when (Filters.ApiFailure.IsTransient(failure) || failure is JsonException)
            {
            }

            html.Append("</div>");
            return new HtmlContentViewComponentResult(new HtmlString(html.ToString()));
        }
    }
}
