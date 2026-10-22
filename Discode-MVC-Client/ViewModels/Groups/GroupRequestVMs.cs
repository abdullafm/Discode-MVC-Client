namespace Discode_MVC_Client.ViewModels.Groups
{
    public class SendGroupMessageVM
    {
        public int Id { get; set; }
        public string? Text { get; set; }
    }

    public class UpdateGroupVM
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? IconUrl { get; set; }
    }

    public class AddGroupMembersVM
    {
        public int Id { get; set; }
        public List<string>? UserNames { get; set; }
    }

    public class RemoveGroupMemberVM
    {
        public int Id { get; set; }
        public string? UserName { get; set; }
    }

    public class GroupIdVM
    {
        public int Id { get; set; }
    }
}
