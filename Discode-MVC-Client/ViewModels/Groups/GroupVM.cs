namespace Discode_MVC_Client.ViewModels.Groups
{
    public class GroupVM
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
        public List<GroupMemberVM> Members { get; set; } = new();
    }

    public class GroupMemberVM
    {
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public bool IsOwner { get; set; }

        public string Name => string.IsNullOrWhiteSpace(DisplayName) ? UserName : DisplayName;
    }
}
