namespace Discode_MVC_Client.ViewModels.Dm
{
    public class DmProfileVM
    {
        public bool HasChat { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string Status { get; set; } = "offline";
        public string Bio { get; set; } = string.Empty;
        public string Pronouns { get; set; } = string.Empty;
        public string CustomStatus { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
        public DateTime MemberSince { get; set; }
        public int UtcOffsetMinutes { get; set; }

        public string Name => string.IsNullOrWhiteSpace(DisplayName) ? UserName : DisplayName;
    }
}
