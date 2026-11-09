using Discode_MVC_Client.ViewModels.Nitro;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Text.Json;

namespace Discode_MVC_Client.Filters
{
    public class AttachmentLimitFilter : IAsyncResourceFilter
    {
        public const string LimitKey = "attachment-limits";

        private readonly IHttpClientFactory _httpClientFactory;

        public AttachmentLimitFilter(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
        {
            var limits = new NitroLimitsUIVM();
            try
            {
                var client = _httpClientFactory.CreateClient("DiscodeApi");
                limits = await client.GetFromJsonAsync<NitroLimitsUIVM>("api/nitro/limits") ?? limits;
            }
            catch (Exception failure) when (ApiFailure.IsTransient(failure))
            {
            }
            catch (JsonException)
            {
            }

            context.HttpContext.Items[LimitKey] = limits;

            if (context.HttpContext.Request.ContentLength is long length && length > limits.MaxFileBytes + 1_000_000)
            {
                context.Result = new JsonResult(new { errors = new[] { TooBig(limits) } }) { StatusCode = 400 };
                return;
            }

            await next();
        }

        public static string TooBig(NitroLimitsUIVM limits)
        {
            return limits.HasNitro
                ? "A file can be at most 2 GB."
                : "A file can be at most 5 MB. Nitro lets you send files up to 2 GB.";
        }
    }
}
