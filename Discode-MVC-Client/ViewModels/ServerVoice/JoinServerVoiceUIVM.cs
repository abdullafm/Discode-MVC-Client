namespace Discode_MVC_Client.ViewModels.ServerVoice
{
    public class JoinServerVoiceUIVM
    {
        public int ServerId { get; set; }
        public int ChannelId { get; set; }
        public bool IsMuted { get; set; }
        public bool IsDeafened { get; set; }
    }
}
