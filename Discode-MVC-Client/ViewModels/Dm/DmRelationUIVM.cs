namespace Discode_MVC_Client.ViewModels.Dm
{
    public class DmRelationUIVM
    {
        public string UserName { get; set; } = string.Empty;
        public string Relation { get; set; } = "none";
        public int? FriendRequestId { get; set; }
        public int? BlockId { get; set; }
    }
}
