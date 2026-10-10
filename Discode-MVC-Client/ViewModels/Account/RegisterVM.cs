namespace Discode_MVC_Client.ViewModels.Account
{
    public class RegisterVM
    {
        public string Email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Day { get; set; }
        public string? Month { get; set; }
        public string? Year { get; set; }
    }
}
