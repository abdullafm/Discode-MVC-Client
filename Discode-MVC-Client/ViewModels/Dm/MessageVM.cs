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
        public List<MessageAttachmentVM> Attachments { get; set; } = new();
        public bool IsPoll { get; set; }
        public PollVM? Poll { get; set; }

        public string CallName => string.IsNullOrWhiteSpace(SenderDisplayName) ? SenderUserName : SenderDisplayName;
        public bool CallMissedForMe => CallMissed && !Mine;
        public string CallTail => CallSeconds is null ? " started a call." : " started a call that lasted " + CallDuration(CallSeconds.Value) + ".";

        private static string CallDuration(int seconds)
        {
            var total = Math.Max(1, seconds);
            var hours = total / 3600;
            var minutes = total % 3600 / 60;
            var rest = total % 60;
            var parts = new List<string>();
            if (hours > 0) parts.Add(hours + (hours == 1 ? " hour" : " hours"));
            if (minutes > 0) parts.Add(minutes + (minutes == 1 ? " minute" : " minutes"));
            if (rest > 0 && hours == 0) parts.Add(rest + (rest == 1 ? " second" : " seconds"));
            return string.Join(" ", parts);
        }
    }
}
