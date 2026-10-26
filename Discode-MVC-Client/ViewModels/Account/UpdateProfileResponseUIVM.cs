using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Account
{
    public class UpdateProfileResponseUIVM
    {
        public bool IsSuccess { get; set; }
        public string[] Errors { get; set; } = Array.Empty<string>();
        public ProfileUIVM? Profile { get; set; }
    }
}
