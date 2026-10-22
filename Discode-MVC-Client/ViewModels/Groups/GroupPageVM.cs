using Discode_MVC_Client.ViewModels.Home;

namespace Discode_MVC_Client.ViewModels.Groups
{
    public class GroupPageVM : HomeVM
    {
        public GroupVM? Group { get; set; }
        public string Error { get; set; } = string.Empty;
    }
}
