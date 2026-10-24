namespace Discode_MVC_Client.ViewModels.Dm
{
    public class CreatePollVM
    {
        public string UserName { get; set; } = string.Empty;
        public string Question { get; set; } = string.Empty;
        public bool AllowMultiple { get; set; }
        public int DurationHours { get; set; } = 24;
        public List<CreatePollOptionVM> Options { get; set; } = new();
    }
}
