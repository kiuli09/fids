
var builder = WebApplication.CreateBuilder(args);

// Register the HTTP client
builder.Services.AddHttpClient("FIDSController", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Temporary counter configuration for local testing
var counters = new Dictionary<int, string>
{
    { 1, "http://127.0.0.1:5100" }
};

// Send a slide command to a specific counter
app.MapPost("/api/counters/{counter:int}/slide/{slide:int}",
    async (int counter, int slide,
           IHttpClientFactory httpClientFactory) =>
{
    // Validate the counter and slide
    if (counter < 1 || counter > 13 || slide < 1)
        return Results.BadRequest("Invalid counter or slide.");

    // Check whether the counter is configured
    if (!counters.TryGetValue(counter, out string? controllerUrl))
    {
        return Results.NotFound(new
        {
            message = $"Counter {counter} is not configured yet."
        });
    }

    try
    {
        // Send the command to this counter's controller
        var client = httpClientFactory.CreateClient("FIDSController");

        var response = await client.PostAsync(
            $"{controllerUrl}/api/slide/{slide}",
            null
        );

        string result = await response.Content.ReadAsStringAsync();

        return Results.Content(
            result,
            "application/json",
            statusCode: (int)response.StatusCode
        );
    }
    catch (HttpRequestException)
    {
        return Results.Problem(
            $"Unable to connect to Counter {counter}."
        );
    }
    catch (TaskCanceledException)
    {
        return Results.Problem(
            $"Counter {counter} did not respond in time."
        );
    }
});


 // Get the status of all 13 counters
app.MapGet("/api/counters/status", async (
    IHttpClientFactory httpClientFactory) =>
{
    var client = httpClientFactory.CreateClient("FIDSController");

    var results = new List<object>();

    for (int counter = 1; counter <= 13; counter++)
    {
        if (!counters.TryGetValue(counter, out string? controllerUrl))
        {
            results.Add(new
            {
                counter,
                status = "not_configured",
                powerpointRunning = false,
                slideshowActive = false
            });

            continue;
        }

        try
        {
            using var cancellation = new CancellationTokenSource(
                TimeSpan.FromSeconds(3)
            );

            var response = await client.GetAsync(
                $"{controllerUrl}/api/status",
                cancellation.Token
            );

            if (!response.IsSuccessStatusCode)
                throw new HttpRequestException("Status check failed.");

            var controllerStatus =
                await response.Content.ReadFromJsonAsync<
                    ControllerStatus>();

            results.Add(new
            {
                counter,
                status = "connected",
                powerpointRunning =
                    controllerStatus?.PowerpointRunning ?? false,
                slideshowActive =
                    controllerStatus?.SlideshowActive ?? false
            });
        }
        catch (Exception ex) when (
            ex is HttpRequestException ||
            ex is TaskCanceledException)
        {
            results.Add(new
            {
                counter,
                status = "disconnected",
                powerpointRunning = false,
                slideshowActive = false
            });
        }
    }

    return Results.Ok(results);
});


// Run the dashboard locally
app.Run("http://127.0.0.1:5014");


public class ControllerStatus
{
    public bool ControllerOnline { get; set; }
    public bool PowerpointRunning { get; set; }
    public bool SlideshowActive { get; set; }
}

