using Discode_MVC_Client.Services;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewComponents;
using System.Net;

namespace Discode_MVC_Client.ViewComponents
{
    // <vc:branding kind="logo" /> and <vc:branding kind="favicon" />: the admin-chosen image or the built-in one
    public class BrandingViewComponent : ViewComponent
    {
        private readonly BrandingProvider _branding;

        public BrandingViewComponent(BrandingProvider branding)
        {
            _branding = branding;
        }

        public async Task<IViewComponentResult> InvokeAsync(string kind, string? cssClass = null)
        {
            var branding = await _branding.GetAsync();
            var extra = string.IsNullOrWhiteSpace(cssClass) ? string.Empty : " " + WebUtility.HtmlEncode(cssClass);

            string html;
            if (kind == "favicon")
            {
                var href = branding.FaviconUrl.Length > 0 ? branding.FaviconUrl : Url.Content("~/assets/icons/favicon.ico");
                html = $"<link rel=\"shortcut icon\" href=\"{WebUtility.HtmlEncode(href)}\" data-brand=\"favicon\">";
            }
            else if (branding.LogoUrl.Length > 0)
            {
                html = $"<img data-brand=\"logo\" class=\"site-logo{extra}\" src=\"{WebUtility.HtmlEncode(branding.LogoUrl)}\" alt=\"\" style=\"width:1em;height:1em;object-fit:contain\">";
            }
            else
            {
                html = $"<i data-brand=\"logo\" class=\"fa-brands fa-discord{extra}\" aria-hidden=\"true\"></i>";
            }

            return new HtmlContentViewComponentResult(new HtmlString(html));
        }
    }
}
