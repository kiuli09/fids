
using System.Collections.Concurrent;
using System.Runtime.InteropServices;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Serve the dashboard files
app.UseDefaultFiles();
app.UseStaticFiles();

// Locate the test PowerPoint file
string filePath = Path.GetFullPath(
    Path.Combine(
        app.Environment.ContentRootPath,
        "..",
        "FIDSController",
        "FIDS-Test",
        "fids_ppt.pptx"
    )
);

// Start one PowerPoint controller for this application
using var controller = new PowerPointController(filePath);

// Receive slide-change requests
app.MapPost("/api/slide/{number:int}", async (int number) =>
{
    if (number < 1)
        return Results.BadRequest("Invalid slide number.");

    try
    {
        string message = await controller.ChangeSlide(number);
        return Results.Ok(new { message });
    }
    catch (ArgumentOutOfRangeException ex)
    {
        return Results.BadRequest(ex.Message);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// Run locally for testing
app.Run("http://localhost:5014");


// Manages PowerPoint on one dedicated Windows STA thread
class PowerPointController : IDisposable
{
    private readonly BlockingCollection<Action> commands = new();
    private readonly Thread worker;

    private readonly string filePath;

    private dynamic? powerpoint;
    private dynamic? presentation;
    private dynamic? slideshow;

    public PowerPointController(string filePath)
    {
        this.filePath = filePath;

        // Start the controller thread
        worker = new Thread(ProcessCommands);
        worker.SetApartmentState(ApartmentState.STA);
        worker.IsBackground = true;
        worker.Start();
    }

    // Queue a slide change from the web dashboard
    public Task<string> ChangeSlide(int slideNumber)
    {
        var result = new TaskCompletionSource<string>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );

        commands.Add(() =>
        {
            try
            {
                EnsureSlideshow();

                // Validate the requested slide
                if (slideNumber > (int)presentation!.Slides.Count)
                    throw new ArgumentOutOfRangeException(
                        nameof(slideNumber),
                        "Slide does not exist."
                    );

                // Change the existing slideshow
                slideshow!.View.GotoSlide(slideNumber);

                result.SetResult(
                    $"Now displaying Slide {slideNumber}"
                );
            }
            catch (Exception ex)
            {
                result.SetException(ex);
            }
        });

        return result.Task;
    }

    // Open PowerPoint only when necessary
    private void EnsureSlideshow()
    {
        if (slideshow != null)
        {
            try
            {
                // Check whether the slideshow is still active
                _ = slideshow.View.CurrentShowPosition;
                return;
            }
            catch (COMException)
            {
                // The slideshow was closed
                slideshow = null;
            }
        }

        if (powerpoint == null)
        {
            Type? pptType = Type.GetTypeFromProgID(
                "PowerPoint.Application"
            );

            if (pptType == null)
                throw new Exception("PowerPoint not installed.");

            // Create the PowerPoint application
            powerpoint = Activator.CreateInstance(pptType);
        }

        if (presentation == null)
        {
            // Open the test presentation
            presentation = powerpoint.Presentations.Open(
                filePath, 0, 0, -1
            );
        }

        // Start a slideshow if one isn't running
        slideshow = presentation.SlideShowSettings.Run();
    }

    // Execute all commands on the same STA thread
    private void ProcessCommands()
    {
        foreach (Action command in commands.GetConsumingEnumerable())
        {
            command();
        }
    }

    // Stop accepting commands when the app closes
    public void Dispose()
    {
        commands.CompleteAdding();
    }
}
