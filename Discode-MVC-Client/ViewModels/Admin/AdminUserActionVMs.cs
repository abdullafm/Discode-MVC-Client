namespace Discode_MVC_Client.ViewModels.Admin
{
    public class WarnUserVM
    {
        public string? Reason { get; set; }
    }

    public class TimeoutUserVM
    {
        public string? Reason { get; set; }
        public int Minutes { get; set; }
    }

    public class KickUserVM
    {
        public string? Reason { get; set; }
    }

    public class BanUserVM
    {
        public string? Reason { get; set; }
        public int Days { get; set; }
    }

    public class LiveBanUserVM
    {
        public string? Reason { get; set; }
        public int Minutes { get; set; }
    }

    public class ChangeRoleVM
    {
        public string? Role { get; set; }
    }

    public class DeleteUserVM
    {
        public string? Reason { get; set; }
        public string? UserName { get; set; }
    }
}
