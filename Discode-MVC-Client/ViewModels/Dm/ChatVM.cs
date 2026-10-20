namespace Discode_MVC_Client.ViewModels.Dm
{
    public class ChatVM
    {
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string Status { get; set; } = "offline";
        public DateTime MemberSince { get; set; }
        public bool IsFriend { get; set; }
        public List<MessageVM> Messages { get; set; } = new List<MessageVM>();
    }
}
