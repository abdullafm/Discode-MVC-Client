namespace Discode_MVC_Client.ViewModels.ServerVoice
{
    public class ModerateServerVoiceUIVM
    {
        public int ServerId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public bool? ServerMuted { get; set; }
        public bool? ServerDeafened { get; set; }
    }
}
