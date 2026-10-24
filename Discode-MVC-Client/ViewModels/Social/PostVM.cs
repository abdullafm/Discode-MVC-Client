namespace Discode_MVC_Client.ViewModels.Social
{
    public class PostVM
    {
        public int Id { get; set; }
        public string AuthorUserName { get; set; } = string.Empty;
        public string AuthorDisplayName { get; set; } = string.Empty;
        public string AuthorAvatarUrl { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string Visibility { get; set; } = "public";
        public DateTime CreatedAt { get; set; }
        public DateTime? EditedAt { get; set; }
        public int LikeCount { get; set; }
        public bool LikedByMe { get; set; }
        public int RepostCount { get; set; }
        public bool RepostedByMe { get; set; }
        public List<CommentVM> Comments { get; set; } = new List<CommentVM>();
    }
}
