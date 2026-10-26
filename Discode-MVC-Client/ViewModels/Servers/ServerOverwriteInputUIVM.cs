namespace Discode_MVC_Client.ViewModels.Servers
{
    public class ServerOverwriteInputUIVM
    {
        public int? RoleId { get; set; }
        public string? UserId { get; set; }
        public long Allow { get; set; }
        public long Deny { get; set; }
    }
}
