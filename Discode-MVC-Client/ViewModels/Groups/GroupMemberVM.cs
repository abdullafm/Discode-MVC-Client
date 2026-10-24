namespace Discode_MVC_Client.ViewModels.Groups
{
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
