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
        // how long the status stays: null keeps what is set, 0 until changed, otherwise minutes
        public int? StatusClearMinutes { get; set; }
        // null keeps the banner, an empty text removes it
        public string? BannerUrl { get; set; }
        // null keeps the colour, empty clears it, otherwise #rrggbb
        public string? BannerColor { get; set; }
        // how long the status stays: null keeps what is set, 0 until changed, otherwise minutes
        public int? StatusClearMinutes { get; set; }
        // null keeps the banner, an empty text removes it
        public string? BannerUrl { get; set; }
        // null keeps the banner, an empty text removes it
        public string? BannerUrl { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string CustomStatus { get; set; } = string.Empty;
        public bool IsPublic { get; set; } = true;
        public string Pronouns { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
    }
}
