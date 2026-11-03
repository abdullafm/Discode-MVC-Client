namespace Discode_MVC_Client.ViewModels.Admin
{
    public class AdminContentItemVM
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public int? PostId { get; set; }
        public string AuthorId { get; set; } = string.Empty;
        public string AuthorUserName { get; set; } = string.Empty;
        public string AuthorDisplayName { get; set; } = string.Empty;
        public string AuthorAvatarUrl { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string MediaUrl { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int Likes { get; set; }
        public int Comments { get; set; }
        public int Views { get; set; }
        public int OpenReports { get; set; }
    }

    public class AdminContentListVM
    {
        public List<AdminContentItemVM> Items { get; set; } = new();
        public string Type { get; set; } = "Posts";
        public int Total { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public int PostCount { get; set; }
        public int CommentCount { get; set; }
        public int StoryCount { get; set; }
        public string Search { get; set; } = string.Empty;
        public string? Error { get; set; }
        public string? Notice { get; set; }
        public string? Warning { get; set; }
        public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)PageSize));
    }
}
