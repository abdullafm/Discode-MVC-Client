namespace Discode_MVC_Client.ViewModels.Groups
{
    public class GroupUIVM
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public string OwnerUserName { get; set; } = string.Empty;
        public int MemberCount { get; set; }
        public int MaxMembers { get; set; }
        public bool Existing { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
        public List<GroupMemberUIVM> Members { get; set; } = new();
    }
}
