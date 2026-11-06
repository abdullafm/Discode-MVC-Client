namespace Discode_MVC_Client.ViewModels.ServerRoles
{
    public class ReorderServerRolesUIVM
    {
        public int ServerId { get; set; }
        public List<int> RoleIds { get; set; } = new();
    }
}
