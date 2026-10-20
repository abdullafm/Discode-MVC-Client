namespace Discode_MVC_Client.ViewModels.Dm
{
    public class MessageVM
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public string SenderUserName { get; set; } = string.Empty;
        public string SenderDisplayName { get; set; } = string.Empty;
        public string SenderAvatarUrl { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? EditedAt { get; set; }
        public bool Mine { get; set; }
        public List<ReactionVM> Reactions { get; set; } = new();
        public ReplyVM? ReplyTo { get; set; }
        public DateTime? PinnedAt { get; set; }
    }
}
