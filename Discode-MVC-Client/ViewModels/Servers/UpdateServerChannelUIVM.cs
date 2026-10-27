namespace Discode_MVC_Client.ViewModels.Servers
{
    public class UpdateServerChannelUIVM
    {
        public int ServerId { get; set; }
        public int ChannelId { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool? SyncWithCategory { get; set; }
        public int? UserLimit { get; set; }
        public List<ServerOverwriteInputUIVM>? Overwrites { get; set; }
    }
}
