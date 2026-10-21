using Discode_MVC_Client.ViewModels.Account;

namespace Discode_MVC_Client.ViewModels.Dm
{
    public class DmProfileVM
    {
        public bool HasChat { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string Status { get; set; } = "offline";
        public string Bio { get; set; } = string.Empty;
        public string Pronouns { get; set; } = string.Empty;
        public string CustomStatus { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
        public DateTime MemberSince { get; set; }
        public int UtcOffsetMinutes { get; set; }

        public string Name => string.IsNullOrWhiteSpace(DisplayName) ? UserName : DisplayName;

        public static DmProfileVM From(ChatVM? chat, int utcOffsetMinutes)
        {
            if (chat is null)
            {
                return new DmProfileVM { UtcOffsetMinutes = utcOffsetMinutes };
            }

            return new DmProfileVM
            {
                HasChat = true,
                UserName = chat.UserName,
                DisplayName = chat.DisplayName,
                AvatarUrl = chat.AvatarUrl,
                Status = chat.Status,
                Bio = chat.Bio,
                Pronouns = chat.Pronouns,
                CustomStatus = chat.CustomStatus,
                IsPrivate = chat.IsPrivate,
                MemberSince = chat.MemberSince,
                UtcOffsetMinutes = utcOffsetMinutes
            };
        }

        public static DmProfileVM From(UserProfileVM profile, int utcOffsetMinutes)
        {
            return new DmProfileVM
            {
                HasChat = true,
                UserName = profile.UserName,
                DisplayName = profile.DisplayName,
                AvatarUrl = profile.AvatarUrl,
                Status = profile.Status,
                Bio = profile.Bio,
                Pronouns = profile.Pronouns,
                CustomStatus = profile.CustomStatus,
                IsPrivate = profile.IsPrivate,
                MemberSince = profile.MemberSince,
                UtcOffsetMinutes = utcOffsetMinutes
            };
        }
    }
}
