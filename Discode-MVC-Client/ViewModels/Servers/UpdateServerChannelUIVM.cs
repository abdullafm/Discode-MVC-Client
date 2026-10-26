namespace Discode_MVC_Client.ViewModels.Servers
{
    public class UpdateServerChannelUIVM
    {
        public int ServerId { get; set; }
        public int ChannelId { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
        public bool IsReadOnly { get; set; }
        public List<int>? AccessRoleIds { get; set; }
        public List<string>? AccessUserIds { get; set; }
    }
}
