using System.Text.Json;

namespace Discode_MVC_Client.Filters
{
    public static class ApiFailure
    {
        public static bool IsTransient(Exception ex)
        {
            return ex is HttpRequestException or TaskCanceledException or TimeoutException or IOException or JsonException;
        }
    }
}
