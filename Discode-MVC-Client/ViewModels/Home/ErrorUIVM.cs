namespace Discode_MVC_Client.ViewModels.Home
{
    public class ErrorUIVM
    {
        public int Code { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string RequestId { get; set; } = string.Empty;
        public bool SignedIn { get; set; }
    }
}
