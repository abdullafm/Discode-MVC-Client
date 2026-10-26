using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Friends
{
    public class FriendPendingUIVM
    {
        public List<FriendRequestUIVM> Sent { get; set; } = new List<FriendRequestUIVM>();
        public List<FriendRequestUIVM> Received { get; set; } = new List<FriendRequestUIVM>();
    }
}
