namespace Discode_MVC_Client.ViewModels.Dm
{
    public class VotePollUIVM
    {
        public int Id { get; set; }
        public List<int> OptionIds { get; set; } = new();
    }
}
