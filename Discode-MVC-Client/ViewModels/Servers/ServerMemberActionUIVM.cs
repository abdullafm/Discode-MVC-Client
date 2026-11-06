namespace Discode_MVC_Client.ViewModels.Servers
{
    public class ServerMemberActionUIVM
    {
        public int ServerId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }
}
