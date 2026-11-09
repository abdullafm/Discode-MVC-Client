namespace Discode_MVC_Client.ViewModels.Nitro
{
    public class NitroStatusUIVM
    {
        public bool HasNitro { get; set; }
        public string Source { get; set; } = string.Empty;
        public DateTime? ExpiresAt { get; set; }
        public bool CancelAtPeriodEnd { get; set; }
        public bool CanManageBilling { get; set; }
        public bool IsBooster { get; set; }
        public string StaffRole { get; set; } = string.Empty;
        public int BoostSlots { get; set; }
        public int BoostsUsed { get; set; }
        public int MaxMessageLength { get; set; } = 2000;
        public long MaxFileBytes { get; set; } = 5L * 1024 * 1024;
        public int PriceCents { get; set; } = 299;
        public string Currency { get; set; } = "usd";

        public string Price => (PriceCents / 100m).ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);
    }
}
