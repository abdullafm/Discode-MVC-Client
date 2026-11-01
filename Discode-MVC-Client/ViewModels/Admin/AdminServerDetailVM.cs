namespace Discode_MVC_Client.ViewModels.Admin
{
    public class AdminServerDetailVM
    {
        public int Id { get; set; }
        public string PublicId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string InviteCode { get; set; } = string.Empty;
        public string OwnerUserName { get; set; } = string.Empty;
        public string OwnerDisplayName { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
        public DateTime CreatedAt { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("members")]
        public int MemberCount { get; set; }
        public int TextChannels { get; set; }
        public int VoiceChannels { get; set; }
        public int Roles { get; set; }
        public int Messages { get; set; }
        public int MemberBans { get; set; }
        public bool IsBanned { get; set; }
        public DateTime? BannedAt { get; set; }
        public string BanReason { get; set; } = string.Empty;
        public string BannedByUserName { get; set; } = string.Empty;
        [System.Text.Json.Serialization.JsonIgnore]
        public AdminServerMemberListVM Members { get; set; } = new();
        public string? Error { get; set; }
        public string? Notice { get; set; }
        public string? Warning { get; set; }
    }

    public class AdminServerMemberListVM
    {
        public int ServerId { get; set; }
        public List<AdminServerMemberVM> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 4;
        public string Search { get; set; } = string.Empty;
        public string? Error { get; set; }
        public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)Math.Max(1, PageSize)));
    }

    public class AdminServerMemberVM
    {
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public DateTime JoinedAt { get; set; }
        public bool IsOwner { get; set; }
    }
}
