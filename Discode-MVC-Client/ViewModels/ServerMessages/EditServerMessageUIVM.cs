namespace Discode_MVC_Client.ViewModels.ServerMessages
{
    public class EditServerMessageUIVM
    {
        public int ServerId { get; set; }
        public int ChannelId { get; set; }
        public int MessageId { get; set; }
        public string Text { get; set; } = string.Empty;
    }
}
