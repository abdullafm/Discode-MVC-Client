using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.ViewModels.Home
{
    public class SidebarVM : HomeVM
    {
        public string ActiveController { get; set; } = string.Empty;
        public string ActiveDm { get; set; } = string.Empty;
        public List<ConversationVM> Conversations { get; set; } = new();
    }
}
