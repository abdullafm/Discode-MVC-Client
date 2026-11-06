namespace Discode_MVC_Client.ViewModels.ServerRoles
{
    public class UpdateServerRoleUIVM
    {
        public int ServerId { get; set; }
        public int RoleId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = "gray";
        public long Permissions { get; set; }
        public bool DisplaySeparately { get; set; }
    }
}
