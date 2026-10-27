namespace Discode_MVC_Client.ViewModels.Servers
{
    public class CreateServerChannelUIVM
    {
        public int ServerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Kind { get; set; } = "text";
        public int? CategoryId { get; set; }
        public bool IsPrivate { get; set; }
        public int UserLimit { get; set; }
    }
}
