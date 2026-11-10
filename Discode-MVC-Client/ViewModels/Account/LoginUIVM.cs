namespace Discode_MVC_Client.ViewModels.Account
{
    public class LoginUIVM
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? ReturnUrl { get; set; }
    }
}
