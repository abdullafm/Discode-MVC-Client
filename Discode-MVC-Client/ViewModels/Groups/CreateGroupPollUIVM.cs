using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.ViewModels.Groups
{
    public class CreateGroupPollUIVM
    {
        public int Id { get; set; }
        public string Question { get; set; } = string.Empty;
        public bool AllowMultiple { get; set; }
        public int DurationHours { get; set; } = 24;
        public List<CreatePollOptionUIVM> Options { get; set; } = new();
    }
}
