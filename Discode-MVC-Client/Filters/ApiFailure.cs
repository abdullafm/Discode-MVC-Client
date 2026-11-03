using System.Text.Json;

namespace Discode_MVC_Client.Filters
{
    // The ways a call to the API can fail without it being a bug in the client: unreachable (HttpRequestException),
    // no answer in time (TaskCanceledException / TimeoutException), connection cut in the middle of the body (IOException,
    // e.g. HttpIOException) and an answer that is not the JSON we expect. Catching only HttpRequestException missed the others.
    public static class ApiFailure
    {
        public static bool IsTransient(Exception ex)
        {
            return ex is HttpRequestException or TaskCanceledException or TimeoutException or IOException or JsonException;
        }
    }
}
