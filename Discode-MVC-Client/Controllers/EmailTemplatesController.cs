using Discode_MVC_Client.ViewModels.Email;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    [Route("EmailTemplates/[action]")]
    public class EmailTemplatesController : Controller
    {
        [HttpPost]
        public IActionResult VerificationCode([FromForm] VerificationCodeEmailUIVM model)
        {
            if (string.IsNullOrWhiteSpace(model.Code))
                return BadRequest();

            return View(model);
        }

        [HttpPost]
        public IActionResult PasswordReset([FromForm] PasswordResetEmailUIVM model)
        {
            if (!Uri.TryCreate(model.ResetUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                return BadRequest();

            return View(model);
        }
    }
}
