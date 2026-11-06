namespace Discode_MVC_Client.ViewModels.Social
{
    public class CreateCommentUIVM
    {
        public int PostId { get; set; }
        public string? Text { get; set; }
        public int? ParentCommentId { get; set; }
    }
}
