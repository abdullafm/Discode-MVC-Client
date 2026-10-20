using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Friends;
using Discode_MVC_Client.ViewModels.Social;

namespace Discode_MVC_Client.ViewModels.Home
{
    public class HomeIndexVM : HomeVM
    {
        public static readonly string[] Tabs = { "online", "all", "pending", "blocked", "add" };

        public string Tab { get; set; } = "online";
        public string Search { get; set; } = string.Empty;
        public bool ApiUnavailable { get; set; }

        public List<FriendRequestVM> Friends { get; set; } = new();
        public FriendPendingVM Requests { get; set; } = new();
        public List<FriendRequestVM> Blocked { get; set; } = new();
        public List<UserSearchVM> SearchResults { get; set; } = new();
        public List<NotificationVM> Notifications { get; set; } = new();

        public int OnlineCount => Friends.Count(friend => friend.Status != "offline");
        public int UnreadCount => Notifications.Count(item => !item.IsRead);
    }
}
