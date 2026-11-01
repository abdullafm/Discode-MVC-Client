namespace Discode_MVC_Client.ViewModels.Admin
{
    public class AdminUserRowVM
    {
        public string Id { get; set; } = string.Empty;
        public string PublicId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public bool IsPublic { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> Roles { get; set; } = new();
        public int ServersJoined { get; set; }
        public int BansReceived { get; set; }
    }

    public class AdminUserListVM
    {
        public List<AdminUserRowVM> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string Search { get; set; } = string.Empty;
        public string Filter { get; set; } = string.Empty;
        public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)Math.Max(1, PageSize)));
    }

    public class AdminServerRowVM
    {
        public int Id { get; set; }
        public string PublicId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string IconUrl { get; set; } = string.Empty;
        public string OwnerUserName { get; set; } = string.Empty;
        public bool IsPrivate { get; set; }
        public DateTime CreatedAt { get; set; }
        public int Members { get; set; }
        public int Bans { get; set; }
    }

    public class AdminServerListVM
    {
        public List<AdminServerRowVM> Items { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string Search { get; set; } = string.Empty;
        public string Filter { get; set; } = string.Empty;
        public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)Math.Max(1, PageSize)));
    }
}
