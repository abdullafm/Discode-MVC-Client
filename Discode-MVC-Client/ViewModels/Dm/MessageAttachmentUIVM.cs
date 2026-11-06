namespace Discode_MVC_Client.ViewModels.Dm
{
    public class MessageAttachmentUIVM
    {
        public string Url { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long Size { get; set; }

        public bool IsImage => ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
        public bool IsVideo => ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase);
        public bool IsAudio => ContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase);

        public string SizeText
        {
            get
            {
                if (Size < 1024) return Size + " B";
                if (Size < 1024 * 1024) return (Size / 1024.0).ToString("0.#", System.Globalization.CultureInfo.InvariantCulture) + " KB";
                return (Size / 1024.0 / 1024.0).ToString("0.#", System.Globalization.CultureInfo.InvariantCulture) + " MB";
            }
        }
    }
}
