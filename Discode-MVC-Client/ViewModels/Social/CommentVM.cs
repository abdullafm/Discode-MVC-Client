namespace Discode_MVC_Client.ViewModels.Social
{
    public class CommentVM
    {
        public int Id { get; set; }
        public int PostId { get; set; }
        public string AuthorUserName { get; set; } = string.Empty;
        public string AuthorDisplayName { get; set; } = string.Empty;
        public string AuthorAvatarUrl { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int LikeCount { get; set; }
        public bool LikedByMe { get; set; }
    }
}
