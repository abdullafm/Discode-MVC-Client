namespace Discode_MVC_Client.ViewModels.Dm
{
    public class PollVM
    {
        public string Question { get; set; } = string.Empty;
        public bool AllowMultiple { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool Ended { get; set; }
        public int TotalVoters { get; set; }
        public bool Voted { get; set; }
        public List<PollOptionVM> Options { get; set; } = new();
    }
}
