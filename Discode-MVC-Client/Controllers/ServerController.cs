using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class ServerController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
