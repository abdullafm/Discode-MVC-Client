using Discode_MVC_Client.ViewModels.Dm;

namespace Discode_MVC_Client.ViewModels.Groups
{
    public class SendGroupMessageVM
    {
        public int Id { get; set; }
        public string? Text { get; set; }
        public List<MessageAttachmentVM>? Attachments { get; set; }
    }

    public class CreateGroupPollVM
    {
        public int Id { get; set; }
        public string Question { get; set; } = string.Empty;
        public bool AllowMultiple { get; set; }
        public int DurationHours { get; set; } = 24;
        public List<CreatePollOptionVM> Options { get; set; } = new();
    }

    public class ReactGroupMessageVM
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public string Emoji { get; set; } = string.Empty;
    }

    public class VoteGroupPollVM
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public List<int> OptionIds { get; set; } = new();
    }

    public class UpdateGroupVM
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? IconUrl { get; set; }
    }

    public class AddGroupMembersVM
    {
        public int Id { get; set; }
        public List<string>? UserNames { get; set; }
    }

    public class RemoveGroupMemberVM
    {
        public int Id { get; set; }
        public string? UserName { get; set; }
    }

    public class GroupIdVM
    {
        public int Id { get; set; }
    }
}
