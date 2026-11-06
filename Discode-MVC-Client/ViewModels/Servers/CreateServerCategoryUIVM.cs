namespace Discode_MVC_Client.ViewModels.Servers
{
    public class CreateServerCategoryUIVM
    {
        public int ServerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
    }
}
