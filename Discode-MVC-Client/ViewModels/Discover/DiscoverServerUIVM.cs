namespace Discode_MVC_Client.ViewModels.Discover
{
    public class DiscoverServerUIVM
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public string BannerUrl { get; set; } = string.Empty;
        public string BannerColor { get; set; } = "ink";
        public string Description { get; set; } = string.Empty;
        public string InviteCode { get; set; } = string.Empty;
        public int MemberCount { get; set; }
        public int OnlineCount { get; set; }
    }
}
