namespace Discode_MVC_Client.ViewModels.Servers
{
    public class UpdateServerBannerUIVM
    {
        public int Id { get; set; }
        public bool Remove { get; set; }
        public IFormFile? Banner { get; set; }
    }
}
