namespace Discode_MVC_Client.ViewModels.Servers
{
    public class UpdateServerCategoryUIVM
    {
        public int ServerId { get; set; }
        public int CategoryId { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
    }
}
