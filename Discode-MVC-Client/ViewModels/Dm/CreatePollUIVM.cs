namespace Discode_MVC_Client.ViewModels.Dm
{
    public class CreatePollUIVM
    {
        public string UserName { get; set; } = string.Empty;
        public string Question { get; set; } = string.Empty;
        public bool AllowMultiple { get; set; }
        public int DurationHours { get; set; } = 24;
        public List<CreatePollOptionUIVM> Options { get; set; } = new();
    }
}
