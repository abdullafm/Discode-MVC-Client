namespace Discode_MVC_Client.ViewModels.Dm
{
    public class VotePollVM
    {
        public int Id { get; set; }
        public List<int> OptionIds { get; set; } = new();
    }
}
