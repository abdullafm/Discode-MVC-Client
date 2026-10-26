namespace Discode_MVC_Client.ViewModels.Social
{
    public class StoryViewerUIVM
    {
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public bool Liked { get; set; }
        public DateTime ViewedAt { get; set; }
    }
}
