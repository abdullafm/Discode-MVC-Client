using Discode_MVC_Client.ViewModels.Home;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Text.Json;

namespace Discode_MVC_Client.Filters
{
    public class ApiFailureFilter : IExceptionFilter
    {
        private readonly ILogger<ApiFailureFilter> _logger;

        public ApiFailureFilter(ILogger<ApiFailureFilter> logger)
        {
            _logger = logger;
        }

        public void OnException(ExceptionContext context)
        {
            var request = context.HttpContext.Request;
            var (status, message) = Describe(context);
            if (status is null)
            {
                return;
            }

            _logger.LogWarning(context.Exception, "The API call failed: {Method} {Path}", request.Method, request.Path);

            context.ExceptionHandled = true;
            context.Result = WantsJson(request)
                ? new ObjectResult(new { isSuccess = false, errors = new[] { message }, traceId = context.HttpContext.TraceIdentifier }) { StatusCode = status }
                : PageResult(status.Value, message, context.HttpContext);
        }

        private static ViewResult PageResult(int status, string message, HttpContext http)
        {
            var model = new ErrorUIVM
            {
                Code = status,
                Title = status == StatusCodes.Status503ServiceUnavailable ? "Service unavailable" : "Taking too long",
                Message = message,
                RequestId = http.TraceIdentifier,
                SignedIn = http.User.Identity?.IsAuthenticated == true
            };
            return new ViewResult
            {
                ViewName = "~/Views/Shared/Error.cshtml",
                StatusCode = status,
                ViewData = new ViewDataDictionary<ErrorUIVM>(new EmptyModelMetadataProvider(), new ModelStateDictionary()) { Model = model }
            };
        }

        private static (int? Status, string Message) Describe(ExceptionContext context)
        {
            switch (context.Exception)
            {
                case HttpRequestException:
                case IOException:
                    return (StatusCodes.Status503ServiceUnavailable, "The service is unavailable right now. Please try again later.");
                case TaskCanceledException when !context.HttpContext.RequestAborted.IsCancellationRequested:
                case TimeoutException:
                    return (StatusCodes.Status504GatewayTimeout, "The service took too long to answer. Please try again.");
                case JsonException:
                    return (StatusCodes.Status502BadGateway, "The service sent an answer we could not read. Please try again.");
                default:
                    return (null, string.Empty);
            }
        }

        private static bool WantsJson(HttpRequest request)
        {
            if (request.Headers.XRequestedWith == "XMLHttpRequest" || request.Headers.ContainsKey("X-Admin-Refresh"))
            {
                return true;
            }

            var accept = request.Headers.Accept.ToString();
            return !accept.Contains("text/html", StringComparison.OrdinalIgnoreCase);
        }
    }
}
