using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Discode_MVC_Client.Filters
{
    // Many actions relay the API's answer as a ContentResult with the API's status code. When the API answers 204 (or 205/304),
    // HTTP forbids a body, and Kestrel throws "Content-Length is not allowed on responses with status code 204" -> the relay becomes a 500.
    public class EmptyStatusResultFilter : IResultFilter
    {
        public void OnResultExecuting(ResultExecutingContext context)
        {
            if (context.Result is ContentResult { StatusCode: StatusCodes.Status204NoContent or StatusCodes.Status205ResetContent or StatusCodes.Status304NotModified } relay)
            {
                context.Result = new StatusCodeResult(relay.StatusCode!.Value);
            }
        }

        public void OnResultExecuted(ResultExecutedContext context)
        {
        }
    }
}
