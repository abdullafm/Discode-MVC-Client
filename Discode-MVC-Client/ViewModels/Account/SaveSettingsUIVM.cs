namespace Discode_MVC_Client.ViewModels.Account
{
    // null = leave as it is
    public class SaveSettingsUIVM
    {
        public string? Theme { get; set; }
        public bool? NotifyAll { get; set; }
        public bool? NotifyDm { get; set; }
        public bool? NotifyFriends { get; set; }
        public bool? NotifySound { get; set; }
    }
}
