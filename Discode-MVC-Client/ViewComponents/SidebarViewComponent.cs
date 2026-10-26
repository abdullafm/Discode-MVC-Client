using Discode_MVC_Client.ViewModels.Dm;
using Discode_MVC_Client.ViewModels.Home;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.ViewComponents
{
    public class SidebarViewComponent : ViewComponent
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public SidebarViewComponent(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IViewComponentResult> InvokeAsync(HomeUIVM home)
        {
            var model = new SidebarUIVM
            {
                Profile = home.Profile,
                Update = home.Update,
                ActiveController = ViewContext.RouteData.Values["controller"]?.ToString() ?? string.Empty
            };
            if (model.ActiveController == "Dm")
                model.ActiveDm = HttpContext.Request.Query["name"].ToString().Trim();

            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                model.Conversations = await client.GetFromJsonAsync<List<ConversationUIVM>>("api/dm") ?? new List<ConversationUIVM>();
            }
            catch (HttpRequestException)
            {
            }
            catch (System.Text.Json.JsonException)
            {
            }

            return View(model);
        }
    }
}
