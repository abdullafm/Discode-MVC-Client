using Discode_MVC_Client.ViewModels.Home;

namespace Discode_MVC_Client.ViewModels.Dm
{
    public class DmPageVM : HomeVM
    {
        public string Name { get; set; } = string.Empty;
        public ChatVM? Chat { get; set; }
        public string Error { get; set; } = string.Empty;
        public int UtcOffsetMinutes { get; set; }
    }
}
