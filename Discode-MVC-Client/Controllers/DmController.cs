using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    public class DmController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
