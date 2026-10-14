using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Account
{
    public class RegisterResponseVM
    {
        public bool IsSuccess { get; set; }
        public bool RequiresEmailConfirmation { get; set; }
        public string Email { get; set; } = string.Empty;
        public string[] Errors { get; set; } = Array.Empty<string>();
    }
}
