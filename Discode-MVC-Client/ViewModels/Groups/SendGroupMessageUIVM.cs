using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.ViewModels.Groups
{
    public class SendGroupMessageUIVM
    {
        public int Id { get; set; }
        public string? Text { get; set; }
        public int? ReplyToMessageId { get; set; }
        public List<MessageAttachmentUIVM>? Attachments { get; set; }
    }
}
