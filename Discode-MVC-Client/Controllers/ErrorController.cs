using Discode_MVC_Client.ViewModels.Home;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Discode_MVC_Client.Controllers
{
    // Reached three ways: UseExceptionHandler (an unhandled crash), UseStatusCodePagesWithReExecute (404, 403, ...)
    // and ApiFailureFilter (the API could not be reached). It must work for signed-out users too.
    [AllowAnonymous]
    [Route("Error")]
    public class ErrorController : Controller
    {
        [Route("")]
        [Route("{code:int}")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Show(int? code)
        {
            // an exception handler re-executes with the failure attached; a status page re-executes with the code in the URL
            var crashed = HttpContext.Features.Get<IExceptionHandlerPathFeature>() is not null;
            var status = crashed ? StatusCodes.Status500InternalServerError : code ?? StatusCodes.Status500InternalServerError;

            // scripts that called us get the bare status back, exactly as before: they never want an HTML page, and a body
            // they do not read would keep the browser's request open
            if (!AcceptsHtml())
            {
                return StatusCode(status);
            }

            var (title, message) = Describe(status);
            Response.StatusCode = status;
            return View("Error", new ErrorUIVM
            {
                Code = status,
                Title = title,
                Message = message,
                RequestId = HttpContext.TraceIdentifier,
                SignedIn = User.Identity?.IsAuthenticated == true
            });
        }

        private bool AcceptsHtml()
        {
            return Request.Headers.Accept.ToString().Contains("text/html", StringComparison.OrdinalIgnoreCase)
                && Request.Headers.XRequestedWith != "XMLHttpRequest";
        }

        private static (string Title, string Message) Describe(int status)
        {
            return status switch
            {
                400 => ("Bad request", "That request could not be understood."),
                401 => ("Sign in required", "Please sign in to continue."),
                403 => ("Not allowed", "You do not have access to this page."),
                404 => ("Page not found", "This page does not exist or was moved."),
                408 or 504 => ("Taking too long", "The service took too long to answer. Please try again."),
                502 => ("Bad answer", "The service sent an answer we could not read. Please try again."),
                503 => ("Service unavailable", "We cannot reach the service right now. Please try again in a moment."),
                _ => ("Something went wrong", "An unexpected error happened. Please try again.")
            };
        }
    }
}
