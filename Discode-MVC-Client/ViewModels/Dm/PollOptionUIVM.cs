namespace Discode_MVC_Client.ViewModels.Dm
{
    public class PollOptionUIVM
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Emoji { get; set; } = string.Empty;
        public int Votes { get; set; }
        public bool Voted { get; set; }
    }
}
