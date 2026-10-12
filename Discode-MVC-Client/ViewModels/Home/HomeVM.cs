using Discode_MVC_Client.ViewModels.Account;

namespace Discode_MVC_Client.ViewModels.Home
{
    public class HomeVM
    {
        public ProfileVM Profile { get; set; } = new();
        public UpdateProfileVM Update { get; set; } = new();
    }
}
