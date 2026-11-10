namespace Discode_MVC_Client.ViewModels.Social
{
    public class SharePostUIVM
    {
        public int Id { get; set; }
        public List<string> UserNames { get; set; } = new();
        public List<int> GroupIds { get; set; } = new();
        public string Note { get; set; } = string.Empty;
    }
}
