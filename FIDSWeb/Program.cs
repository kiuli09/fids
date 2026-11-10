
var builder = WebApplication.CreateBuilder(args);

// Allow the web application to communicate with FIDSController
builder.Services.AddHttpClient("FIDSController", client =>
{
    client.BaseAddress = new Uri("http://127.0.0.1:5100");
    client.Timeout = TimeSpan.FromSeconds(10);
});

var app = builder.Build();

// Serve the dashboard
app.UseDefaultFiles();
app.UseStaticFiles();

// Forward slide commands to FIDSController
app.MapPost("/api/slide/{number:int}", async (
    int number,
    IHttpClientFactory httpClientFactory) =>
{
    if (number < 1)
        return Results.BadRequest("Invalid slide number.");

    try
    {
        // Send the command to our PowerPoint controller
        var client = httpClientFactory.CreateClient("FIDSController");

        var response = await client.PostAsync(
            $"/api/slide/{number}",
            null
        );

        // Return the controller's response to the dashboard
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
            "Cannot connect to FIDSController."
        );
    }
    catch (TaskCanceledException)
    {
        return Results.Problem(
            "FIDSController did not respond in time."
        );
    }
});

// Run the dashboard locally
app.Run("http://127.0.0.1:5014");
