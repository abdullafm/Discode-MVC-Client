namespace Discode_MVC_Client.ViewModels.Admin
{
    public class AdminOverviewVM
    {
        public AdminUserStatsVM Users { get; set; } = new();
        public AdminServerStatsVM Servers { get; set; } = new();
        public AdminBanStatsVM Bans { get; set; } = new();
        public AdminContentStatsVM Content { get; set; } = new();
        public AdminReportStatsVM Reports { get; set; } = new();
    }

    public class AdminUserStatsVM
    {
        public int Total { get; set; }
        public int NewLast7Days { get; set; }
        public int NewLast30Days { get; set; }
        public int PublicAccounts { get; set; }
        public int PrivateAccounts { get; set; }
    }

    public class AdminServerStatsVM
    {
        public int Total { get; set; }
        public int Public { get; set; }
        public int Private { get; set; }
    }

    public class AdminBanStatsVM
    {
        public int TotalBans { get; set; }
        public int BansLast7Days { get; set; }
        public int UsersBanned { get; set; }
        public int ServersWithBans { get; set; }
        public int ActiveTimeouts { get; set; }
    }

    public class AdminContentStatsVM
    {
        public int Posts { get; set; }
        public int Comments { get; set; }
    }

    public class AdminReportStatsVM
    {
        public int Total { get; set; }
        public int Open { get; set; }
        public int Reviewed { get; set; }
        public int Dismissed { get; set; }
        public List<AdminReportReasonVM> TopReasons { get; set; } = new();
    }

    public class AdminReportReasonVM
    {
        public string Reason { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}
