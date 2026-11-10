namespace Discode_MVC_Client.ViewModels.Servers
{
    public class SaveServerTemplateUIVM
    {
        public int ServerId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class ServerTemplateActionUIVM
    {
        public int ServerId { get; set; }
    }

    public class UseServerTemplateUIVM
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}
