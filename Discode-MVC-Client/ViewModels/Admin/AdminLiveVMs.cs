namespace Discode_MVC_Client.ViewModels.Admin
{
    public class AdminLiveStreamVM
    {
        public int Id { get; set; }
        public string HostId { get; set; } = string.Empty;
        public string HostUserName { get; set; } = string.Empty;
        public string HostDisplayName { get; set; } = string.Empty;
        public string HostAvatarUrl { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ThumbnailUrl { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public int ViewerCount { get; set; }
    }

    public class AdminLiveListVM
    {
        public List<AdminLiveStreamVM> Items { get; set; } = new();
        public string? Error { get; set; }
        public string? Notice { get; set; }
        public string? Warning { get; set; }
    }
}
