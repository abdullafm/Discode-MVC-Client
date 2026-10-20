namespace Discode_MVC_Client.ViewModels.Dm
{
    public class PinnedMessagesVM
    {
        public List<MessageVM> Messages { get; set; } = new();
        public int UtcOffsetMinutes { get; set; }
    }
}
