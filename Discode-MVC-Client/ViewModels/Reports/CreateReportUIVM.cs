namespace Discode_MVC_Client.ViewModels.Reports
{
    public class CreateReportUIVM
    {
        public string TargetType { get; set; } = string.Empty;
        public string TargetId { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? Details { get; set; }
    }
}
