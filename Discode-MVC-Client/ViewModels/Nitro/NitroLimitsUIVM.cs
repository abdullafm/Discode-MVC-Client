namespace Discode_MVC_Client.ViewModels.Nitro
{
    public class NitroLimitsUIVM
    {
        public bool HasNitro { get; set; }
        public int MaxMessageLength { get; set; } = 2000;
        public long MaxFileBytes { get; set; } = 5L * 1024 * 1024;
    }
}
