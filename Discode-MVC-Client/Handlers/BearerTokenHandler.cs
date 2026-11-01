using Microsoft.AspNetCore.Authentication;
using System.Net.Http.Headers;

namespace Discode_MVC_Client.Handlers
{
    public class BearerTokenHandler : DelegatingHandler
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public BearerTokenHandler(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var context = _httpContextAccessor.HttpContext;
            if (context is not null)
            {
                var clientIp = context.Connection.RemoteIpAddress?.ToString();
                if (!string.IsNullOrEmpty(clientIp))
                {
                    request.Headers.TryAddWithoutValidation("X-Forwarded-For", clientIp);
                }

                var token = await context.GetTokenAsync("access_token");
                if (!string.IsNullOrEmpty(token))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                }
            }

            var response = await base.SendAsync(request, cancellationToken);
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized && context is not null && context.User.Identity?.IsAuthenticated == true && !context.Response.HasStarted)
            {
                // the API no longer accepts this token (kicked or banned): drop the web session so the next page asks for a login
                await context.SignOutAsync(Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme);
            }

            return response;
        }
    }
}
