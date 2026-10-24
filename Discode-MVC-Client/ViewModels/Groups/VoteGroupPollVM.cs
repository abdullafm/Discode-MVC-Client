namespace Discode_MVC_Client.ViewModels.Groups
{
    public class VoteGroupPollVM
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public List<int> OptionIds { get; set; } = new();
    }
}
