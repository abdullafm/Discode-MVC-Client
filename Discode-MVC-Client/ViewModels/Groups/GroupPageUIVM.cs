using Discode_MVC_Client.ViewModels.Home;

namespace Discode_MVC_Client.ViewModels.Groups
{
    public class GroupPageUIVM : HomeUIVM
    {
        public GroupUIVM? Group { get; set; }
        public string Error { get; set; } = string.Empty;
    }
}
