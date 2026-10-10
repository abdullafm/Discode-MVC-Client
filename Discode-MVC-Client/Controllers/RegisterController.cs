using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    public class RegisterController : Controller
    {
        public IActionResult Index() => RedirectToAction("Register", "Account");
    }
}
