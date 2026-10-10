namespace Discode_MVC_Client.ViewModels.Account
{
    public class RegisterResponseVM
    {
        public bool IsSuccess { get; set; }
        public string[] Errors { get; set; } = Array.Empty<string>();
    }
}
