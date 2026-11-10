using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    public class AvatarController : Controller
    {
        [HttpGet("/avatar/letter/{letter}")]
        public IActionResult Letter(string letter)
        {
            var first = (letter ?? string.Empty).Trim().FirstOrDefault();
            var text = char.IsAsciiLetterOrDigit(first) ? char.ToUpperInvariant(first).ToString() : "?";
            var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\"><rect width=\"128\" height=\"128\" fill=\"#5865f2\"/>"
                + "<text x=\"64\" y=\"66\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"64\" font-weight=\"700\" fill=\"#ffffff\" text-anchor=\"middle\" dominant-baseline=\"central\">"
                + text + "</text></svg>";
            Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            return Content(svg, "image/svg+xml");
        }
    }
}
