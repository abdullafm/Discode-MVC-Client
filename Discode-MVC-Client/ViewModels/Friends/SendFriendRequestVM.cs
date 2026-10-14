using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Friends
{
    public class SendFriendRequestVM
    {
        public string? UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
    }
}
