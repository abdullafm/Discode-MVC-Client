using Discode_MVC_Client.ViewModels.Account;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Home
{
    public class HomeUIVM
    {
        public ProfileUIVM Profile { get; set; } = new ProfileUIVM();
        public UpdateProfileUIVM Update { get; set; } = new UpdateProfileUIVM();
    }
}
