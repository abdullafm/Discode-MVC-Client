namespace Discode_MVC_Client.ViewModels.Dm
{
    public class ReactionVM
    {
        public string Emoji { get; set; } = string.Empty;
        public int Count { get; set; }
        public bool Reacted { get; set; }
    }
}
