namespace Discode_MVC_Client.ViewModels.Dm
{
    public class DmTargetUIVM
    {
        public string UserName { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public int? ReplyToMessageId { get; set; }
        public List<MessageAttachmentUIVM> Attachments { get; set; } = new();
    }
}
