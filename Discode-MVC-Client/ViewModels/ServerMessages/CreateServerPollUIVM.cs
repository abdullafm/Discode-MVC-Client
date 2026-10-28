using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.ViewModels.ServerMessages
{
    public class CreateServerPollUIVM
    {
        public int ServerId { get; set; }
        public int ChannelId { get; set; }
        public string Question { get; set; } = string.Empty;
        public bool AllowMultiple { get; set; }
        public int DurationHours { get; set; } = 24;
        public List<CreatePollOptionUIVM> Options { get; set; } = new();
    }
}
