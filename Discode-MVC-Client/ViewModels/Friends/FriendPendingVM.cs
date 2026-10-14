using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Friends
{
    public class FriendPendingVM
    {
        public List<FriendRequestVM> Sent { get; set; } = new List<FriendRequestVM>();
        public List<FriendRequestVM> Received { get; set; } = new List<FriendRequestVM>();
    }
}
