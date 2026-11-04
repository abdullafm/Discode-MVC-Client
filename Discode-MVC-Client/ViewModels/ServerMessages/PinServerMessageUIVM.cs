namespace Discode_MVC_Client.ViewModels.ServerMessages
{
    public class PinServerMessageUIVM
    {
        public int ServerId { get; set; }
        public int ChannelId { get; set; }
        public int MessageId { get; set; }
        public bool Pinned { get; set; }
    }
}
