namespace Discode_MVC_Client.ViewModels.Admin
{
    public class AdminReportVM
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string TargetType { get; set; } = string.Empty;
        public string TargetId { get; set; } = string.Empty;
        public string Snapshot { get; set; } = string.Empty;
        public string? ReporterId { get; set; }
        public string ReporterUserName { get; set; } = string.Empty;
        public string ReporterDisplayName { get; set; } = string.Empty;
        public string ReporterAvatarUrl { get; set; } = string.Empty;
        public string? OwnerId { get; set; }
        public string OwnerUserName { get; set; } = string.Empty;
        public string OwnerDisplayName { get; set; } = string.Empty;
        public string OwnerAvatarUrl { get; set; } = string.Empty;
        public int? ServerId { get; set; }
        public string ServerName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string ReviewedBy { get; set; } = string.Empty;
        public DateTime? ReviewedAt { get; set; }
    }

    public class AdminReportListVM
    {
        public List<AdminReportVM> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public int OpenCount { get; set; }
        public int ReviewedCount { get; set; }
        public int DismissedCount { get; set; }
        public string Search { get; set; } = string.Empty;
        public string Status { get; set; } = "Open";
        public string? Error { get; set; }
        public string? Notice { get; set; }
        public string? Warning { get; set; }
        public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)PageSize));
    }
}
