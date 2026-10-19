namespace Discode_MVC_Client.ViewModels.Dm
{
    public class ConversationVM
    {
        public int ConversationId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string Status { get; set; } = "offline";
        public string LastMessage { get; set; } = string.Empty;
        public bool LastMessageMine { get; set; }
        public DateTime LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
    }
}
