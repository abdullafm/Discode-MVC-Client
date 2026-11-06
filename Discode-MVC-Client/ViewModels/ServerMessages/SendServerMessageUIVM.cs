using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.ViewModels.ServerMessages
{
    public class SendServerMessageUIVM
    {
        public int ServerId { get; set; }
        public int ChannelId { get; set; }
        public string? Text { get; set; }
        public int? ReplyToMessageId { get; set; }
        public List<MessageAttachmentUIVM>? Attachments { get; set; }
    }
}
