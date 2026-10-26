using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Friends;
using Discode_MVC_Client.ViewModels.Social;

namespace Discode_MVC_Client.ViewModels.Home
{
    public class HomeIndexUIVM : HomeUIVM
    {
        public static readonly string[] Tabs = { "online", "all", "pending", "blocked", "add" };

        public string Tab { get; set; } = "online";
        public string Search { get; set; } = string.Empty;
        public bool ApiUnavailable { get; set; }

        public List<FriendRequestUIVM> Friends { get; set; } = new();
        public FriendPendingUIVM Requests { get; set; } = new();
        public List<FriendRequestUIVM> Blocked { get; set; } = new();
        public List<UserSearchUIVM> SearchResults { get; set; } = new();
        public List<NotificationUIVM> Notifications { get; set; } = new();

        public int OnlineCount => Friends.Count(friend => friend.Status != "offline");
        public int UnreadCount => Notifications.Count(item => !item.IsRead);
    }
}
