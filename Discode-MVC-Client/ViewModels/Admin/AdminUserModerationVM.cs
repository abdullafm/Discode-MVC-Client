namespace Discode_MVC_Client.ViewModels.Admin
{
    public class AdminUserDetailVM
    {
        public string Id { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public bool IsPublic { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> Roles { get; set; } = new();
        public bool IsDeleted { get; set; }
        public bool IsBanned { get; set; }
        public DateTime? BannedUntil { get; set; }
        public DateTime? BannedAt { get; set; }
        public string BanReason { get; set; } = string.Empty;
        public string BannedByUserName { get; set; } = string.Empty;
        public bool TimedOut { get; set; }
        public DateTime? TimeoutUntil { get; set; }
        public string TimeoutReason { get; set; } = string.Empty;
        public int ServersJoined { get; set; }
        public int BansReceived { get; set; }
        public int Warnings { get; set; }
        public int ReportsAgainst { get; set; }
        public int Posts { get; set; }
        public int Comments { get; set; }
        public bool CanModerate { get; set; }
        public bool CanDelete { get; set; }
        public bool CanChangeRole { get; set; }
        public bool LiveBanned { get; set; }
        public DateTime? LiveBannedUntil { get; set; }
        public string LiveBanReason { get; set; } = string.Empty;
        public List<AdminUserWarningVM> RecentWarnings { get; set; } = new();
        public List<AdminActionVM> History { get; set; } = new();
        public string? Error { get; set; }
        public string? Notice { get; set; }
        public string? Warning { get; set; }
    }

    public class AdminUserWarningVM
    {
        public int Id { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string IssuedByUserName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool Seen { get; set; }
    }

    public class AdminActionVM
    {
        public int Id { get; set; }
        public string AdminUserName { get; set; } = string.Empty;
        public string TargetType { get; set; } = string.Empty;
        public string TargetId { get; set; } = string.Empty;
        public string TargetName { get; set; } = string.Empty;
        public string Kind { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class AdminActionListVM
    {
        public List<AdminActionVM> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string Search { get; set; } = string.Empty;
        public string? Error { get; set; }
        public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)Math.Max(1, PageSize)));
    }
}
