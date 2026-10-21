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
        public bool Forwarded { get; set; }
        public bool Undelivered { get; set; }
        public bool IsCall { get; set; }
        public int? CallSeconds { get; set; }
        public bool CallMissed { get; set; }

        public string CallName => string.IsNullOrWhiteSpace(SenderDisplayName) ? SenderUserName : SenderDisplayName;
        public bool CallMissedForMe => CallMissed && !Mine;
        public string CallTail => CallSeconds is null ? " started a call." : " started a call that lasted " + CallDuration(CallSeconds.Value) + ".";

        private static string CallDuration(int seconds)
        {
            if (seconds < 60) return "a few seconds";
            if (seconds < 120) return "a minute";
            if (seconds < 3600) return (seconds / 60) + " minutes";
            if (seconds < 7200) return "an hour";
            return (seconds / 3600) + " hours";
        }
    }
}
