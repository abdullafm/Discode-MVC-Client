using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.ViewModels.Home
{
    public class SidebarUIVM : HomeUIVM
    {
        public string ActiveController { get; set; } = string.Empty;
        public string ActiveDm { get; set; } = string.Empty;
        public List<ConversationUIVM> Conversations { get; set; } = new();
    }
}
