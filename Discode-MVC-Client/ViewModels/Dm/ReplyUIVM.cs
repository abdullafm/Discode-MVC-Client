namespace Discode_MVC_Client.ViewModels.Dm
{
    public class ReplyUIVM
    {
        public int MessageId { get; set; }
        public string SenderUserName { get; set; } = string.Empty;
        public string SenderDisplayName { get; set; } = string.Empty;
        public string SenderAvatarUrl { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
    }
}
