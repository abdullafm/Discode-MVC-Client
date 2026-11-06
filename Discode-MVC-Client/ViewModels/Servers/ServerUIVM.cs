namespace Discode_MVC_Client.ViewModels.Servers
{
    public class ServerUIVM
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public string InviteCode { get; set; } = string.Empty;
        public string OwnerUserName { get; set; } = string.Empty;
        public bool IsOwner { get; set; }
        public int MemberCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
