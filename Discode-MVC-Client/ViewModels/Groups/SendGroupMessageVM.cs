using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.ViewModels.Groups
{
    public class SendGroupMessageVM
    {
        public int Id { get; set; }
        public string? Text { get; set; }
        public int? ReplyToMessageId { get; set; }
        public List<MessageAttachmentVM>? Attachments { get; set; }
    }
}
