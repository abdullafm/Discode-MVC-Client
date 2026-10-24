using Discode_MVC_Client.ViewModels.Account;
using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.Mappers
{
    public static class DmProfileMapper
    {
        public static DmProfileVM ToDmProfile(this ChatVM? chat, int utcOffsetMinutes)
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

        public static DmProfileVM ToDmProfile(this UserProfileVM profile, int utcOffsetMinutes)
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
