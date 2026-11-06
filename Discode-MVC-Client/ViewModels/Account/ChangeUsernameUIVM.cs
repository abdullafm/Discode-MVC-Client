using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Account
{
    public class ChangeUsernameUIVM
    {
        public string UserName { get; set; } = string.Empty;
        public string CurrentPassword { get; set; } = string.Empty;
    }
}
