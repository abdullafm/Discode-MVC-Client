namespace Discode_MVC_Client.ViewModels.Social
{
    public class EmojiCategoryUIVM
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public List<EmojiUIVM> Emojis { get; set; } = new List<EmojiUIVM>();
    }
}
