using Discode_MVC_Client.ViewModels.Home;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.ViewComponents
{
    public class FriendsToolbarViewComponent : ViewComponent
    {
        public IViewComponentResult Invoke(HomeIndexUIVM home)
        {
            return View(home);
        }
    }
}
