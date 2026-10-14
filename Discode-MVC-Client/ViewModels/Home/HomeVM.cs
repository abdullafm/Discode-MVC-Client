using Discode_MVC_Client.ViewModels.Account;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Home
{
    public class HomeVM
    {
        public ProfileVM Profile { get; set; } = new ProfileVM();
        public UpdateProfileVM Update { get; set; } = new UpdateProfileVM();
    }
}
