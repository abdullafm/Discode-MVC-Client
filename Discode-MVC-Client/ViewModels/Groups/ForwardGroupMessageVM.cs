namespace Discode_MVC_Client.ViewModels.Groups
{
    public class ForwardGroupMessageVM
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public List<string> UserNames { get; set; } = new();
        public string Note { get; set; } = string.Empty;
    }
}
