namespace Discode_MVC_Client.ViewModels.Servers
{
    public class TimeoutServerMemberUIVM
    {
        public int ServerId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int Minutes { get; set; }
    }
}
