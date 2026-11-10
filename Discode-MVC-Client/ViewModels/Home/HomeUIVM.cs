using Discode_MVC_Client.ViewModels.Account;

namespace Discode_MVC_Client.ViewModels.Home
{
    public class HomeUIVM
    {
        public ProfileUIVM Profile { get; set; } = new ProfileUIVM();
        public UpdateProfileUIVM Update { get; set; } = new UpdateProfileUIVM();
    }
}
