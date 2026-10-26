using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Discode_MVC_Client.ViewModels.Account
{
    public class UpdateProfileUIVM
    {
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string CustomStatus { get; set; } = string.Empty;
        public bool IsPublic { get; set; } = true;
        public string Pronouns { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
    }
}
