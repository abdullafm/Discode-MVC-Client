namespace Discode_MVC_Client.ViewModels.Social
{
    public class EmojiCategoryVM
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public List<EmojiVM> Emojis { get; set; } = new List<EmojiVM>();
    }
}
