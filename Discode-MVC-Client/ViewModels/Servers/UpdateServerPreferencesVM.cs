namespace Discode_MVC_Client.ViewModels.Servers
{
    public class UpdateServerPreferencesVM
    {
        public int Id { get; set; }
        public int? MuteMinutes { get; set; }
        public string? NotificationLevel { get; set; }
        public bool? HideMutedChannels { get; set; }
        public bool? ShowAllChannels { get; set; }
    }
}
