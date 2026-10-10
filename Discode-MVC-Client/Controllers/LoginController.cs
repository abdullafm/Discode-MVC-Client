using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    public class LoginController : Controller
    {
        public IActionResult Index() => RedirectToAction("Login", "Account");
    }
}
