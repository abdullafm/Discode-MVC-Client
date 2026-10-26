using Discode_MVC_Client.ViewModels.Home;

namespace Discode_MVC_Client.ViewModels.Dm
{
    public class DmPageUIVM : HomeUIVM
    {
        public string Name { get; set; } = string.Empty;
        public ChatUIVM? Chat { get; set; }
        public string Error { get; set; } = string.Empty;
        public int UtcOffsetMinutes { get; set; }
    }
}
