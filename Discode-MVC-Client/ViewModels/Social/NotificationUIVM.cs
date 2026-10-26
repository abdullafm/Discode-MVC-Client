namespace Discode_MVC_Client.ViewModels.Social
{
    public class NotificationUIVM
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string ActorUserName { get; set; } = string.Empty;
        public string ActorDisplayName { get; set; } = string.Empty;
        public string ActorAvatarUrl { get; set; } = string.Empty;
        public string Snippet { get; set; } = string.Empty;
        public int? PostId { get; set; }
        public int? StoryId { get; set; }
        public int? LiveStreamId { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
