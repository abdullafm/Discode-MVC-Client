using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Friends
{
    public class FriendRequestVM
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Status { get; set; } = "offline";
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;

        public string Name => string.IsNullOrWhiteSpace(DisplayName) ? UserName : DisplayName;
    }
}
