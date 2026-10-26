namespace Discode_MVC_Client.ViewModels.Servers
{
    public class UpdateServerProfileVM
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string BannerColor { get; set; } = "ink";
        public bool IsPrivate { get; set; }
        public IFormFile? Icon { get; set; }
    }
}
