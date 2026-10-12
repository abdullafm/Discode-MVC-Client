namespace Discode_MVC_Client.ViewModels.Account
{
    public class UpdateProfileResponseVM
    {
        public bool IsSuccess { get; set; }
        public string[] Errors { get; set; } = Array.Empty<string>();
        public ProfileVM? Profile { get; set; }
    }
}
