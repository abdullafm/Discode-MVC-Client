namespace Discode_MVC_Client.ViewModels.Social
{
    public class LiveStreamUIVM
    {
        public int Id { get; set; }
        public string HostUserName { get; set; } = string.Empty;
        public string HostDisplayName { get; set; } = string.Empty;
        public string HostAvatarUrl { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ThumbnailUrl { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public int ViewerCount { get; set; }
        public bool IsFriend { get; set; }
        public bool IsMine { get; set; }
    }
}
