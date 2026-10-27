using Discode_MVC_Client.ViewModels.ServerRoles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    [Authorize]
    public class ServerRoleController : Controller
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public ServerRoleController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet]
        public Task<IActionResult> List(int serverId)
        {
            return Forward(client => client.GetAsync($"api/server/{serverId}/roles"));
        }

        [HttpGet]
        public Task<IActionResult> Members(int serverId, int roleId)
        {
            return Forward(client => client.GetAsync($"api/server/{serverId}/roles/{roleId}/members"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Create([FromBody] CreateServerRoleUIVM model)
        {
            return Forward(client => client.PostAsJsonAsync($"api/server/{model.ServerId}/roles", new { name = model.Name ?? string.Empty }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Update([FromBody] UpdateServerRoleUIVM model)
        {
            return Forward(client => client.PutAsJsonAsync($"api/server/{model.ServerId}/roles/{model.RoleId}", new
            {
                name = model.Name ?? string.Empty,
                color = model.Color,
                permissions = model.Permissions,
                displaySeparately = model.DisplaySeparately
            }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Reorder([FromBody] ReorderServerRolesUIVM model)
        {
            return Forward(client => client.PutAsJsonAsync($"api/server/{model.ServerId}/roles/order", new { roleIds = model.RoleIds }));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Delete([FromBody] DeleteServerRoleUIVM model)
        {
            return Forward(client => client.DeleteAsync($"api/server/{model.ServerId}/roles/{model.RoleId}"));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Assign([FromBody] AssignServerRoleUIVM model)
        {
            return Forward(client => client.PutAsync($"api/server/{model.ServerId}/roles/{model.RoleId}/members/{Uri.EscapeDataString(model.UserId ?? string.Empty)}", null));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public Task<IActionResult> Unassign([FromBody] AssignServerRoleUIVM model)
        {
            return Forward(client => client.DeleteAsync($"api/server/{model.ServerId}/roles/{model.RoleId}/members/{Uri.EscapeDataString(model.UserId ?? string.Empty)}"));
        }

        private async Task<IActionResult> Forward(Func<HttpClient, Task<HttpResponseMessage>> send)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                var response = await send(client);
                var payload = await response.Content.ReadAsStringAsync();
                return new ContentResult
                {
                    StatusCode = (int)response.StatusCode,
                    Content = string.IsNullOrWhiteSpace(payload) ? "{}" : payload,
                    ContentType = "application/json"
                };
            }
            catch (HttpRequestException)
            {
                return StatusCode(503, new { errors = new[] { "The API is not running. Start Discode-API-FinalProject and try again." } });
            }
        }
    }
}
