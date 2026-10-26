namespace Discode_MVC_Client.ViewModels.Dm
{
    public class PinnedMessagesUIVM
    {
        public List<MessageUIVM> Messages { get; set; } = new();
        public int UtcOffsetMinutes { get; set; }
    }
}
