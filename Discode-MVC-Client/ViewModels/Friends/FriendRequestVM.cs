namespace Discode_MVC_Client.ViewModels.Friends
{
    public class SendFriendRequestVM
    {
        public string? UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
    }

    public class FriendRequestIdVM
    {
        public int Id { get; set; }
    }

    public class FriendRequestVM
    {
        public int Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
    }

    public class FriendPendingVM
    {
        public List<FriendRequestVM> Sent { get; set; } = new();
        public List<FriendRequestVM> Received { get; set; } = new();
    }
}
