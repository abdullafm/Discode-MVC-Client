using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Discode_MVC_Client.Filters
{
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
