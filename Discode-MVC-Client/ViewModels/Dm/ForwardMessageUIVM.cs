namespace Discode_MVC_Client.ViewModels.Dm
{
    public class ForwardMessageUIVM
    {
        public int Id { get; set; }
        public List<string> UserNames { get; set; } = new();
        public string Note { get; set; } = string.Empty;
    }
}
