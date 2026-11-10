namespace Discode_MVC_Client.ViewModels.Admin
{
    public class AdminNitroSubscriptionVM
    {
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AvatarUrl { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime CurrentPeriodEnd { get; set; }
        public bool CancelAtPeriodEnd { get; set; }
        public int Boosts { get; set; }
        public long TotalPaidCents { get; set; }
        public int Payments { get; set; }
        public DateTime? LastPaymentAt { get; set; }
    }

    public class AdminNitroEventVM
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Kind { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public int? AmountCents { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string ActorName { get; set; } = string.Empty;
    }

    public class AdminNitroGiftVM
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Link { get; set; } = string.Empty;
        public string BuyerUserName { get; set; } = string.Empty;
        public int Days { get; set; }
        public int AmountCents { get; set; }
        public bool IsFree { get; set; }
        public string Status { get; set; } = string.Empty;
        public string RedeemedByUserName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? RedeemedAt { get; set; }
    }

    public class AdminNitroGiftPageVM
    {
        public int Total { get; set; }
        public List<AdminNitroGiftVM> Items { get; set; } = new();
    }

    public class AdminNitroListVM
    {
        public List<AdminNitroGiftVM> Gifts { get; set; } = new();
        public int TotalGifts { get; set; }
        public List<AdminNitroSubscriptionVM> Subscriptions { get; set; } = new();
        public List<AdminNitroEventVM> Events { get; set; } = new();
        public int ActiveCount { get; set; }
        public int TotalSubscriptions { get; set; }
        public int TotalEvents { get; set; }
        public long RevenueCents { get; set; }
        public long RevenueThisMonthCents { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string Search { get; set; } = string.Empty;
        public bool ActiveOnly { get; set; }
        public string Tab { get; set; } = "events";
        public string? Error { get; set; }
        public int TotalPages => Math.Max(1, (int)Math.Ceiling((Tab == "members" ? TotalSubscriptions : Tab == "gifts" ? TotalGifts : TotalEvents) / (double)PageSize));
    }
}
