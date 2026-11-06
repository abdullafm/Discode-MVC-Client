namespace Discode_MVC_Client.ViewModels.ServerMessages
{
    public class VoteServerPollUIVM
    {
        public int ServerId { get; set; }
        public int ChannelId { get; set; }
        public int MessageId { get; set; }
        public List<int> OptionIds { get; set; } = new();
    }
}
