
using System.Collections.Concurrent;
using System.Runtime.InteropServices;

Console.WriteLine("=== SAA FIDS Controller ===");

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Process PowerPoint commands on one STA thread
using var controller = new PowerPointController();

// Receive slide-change requests from the dashboard
app.MapPost("/api/slide/{number:int}", async (int number) =>
{
    if (number < 1)
        return Results.BadRequest("Invalid slide number.");

    try
    {
        string message = await controller.ChangeSlide(number);

        return Results.Ok(new
        {
            message
        });
    }
    catch (ArgumentOutOfRangeException ex)
    {
        return Results.BadRequest(ex.Message);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error: {ex.Message}");

        return Results.Problem(
            "Unable to change PowerPoint slide."
        );
    }
});

// Listen only on this computer during testing
app.Run("http://127.0.0.1:5100");


// Controls an existing PowerPoint slideshow
class PowerPointController : IDisposable
{
    private readonly BlockingCollection<Action> commands = new();
    private readonly Thread worker;

    public PowerPointController()
    {
        // PowerPoint COM operations use an STA thread
        worker = new Thread(ProcessCommands);
        worker.SetApartmentState(ApartmentState.STA);
        worker.IsBackground = true;
        worker.Start();
    }

    // Request a slide change
    public Task<string> ChangeSlide(int slideNumber)
    {
        var completion = new TaskCompletionSource<string>(
            TaskCreationOptions.RunContinuationsAsynchronously
        );

        commands.Add(() =>
        {
            try
            {
                // Connect to the running PowerPoint application
                dynamic powerpoint = GetRunningPowerPoint();

                Console.WriteLine(
                    "Connected to PowerPoint application."
                );

                // Check for an active slideshow
                int slideshowCount =
                    powerpoint.SlideShowWindows.Count;

                Console.WriteLine(
                    $"Active slideshows: {slideshowCount}"
                );

                if (slideshowCount == 0)
                {
                    throw new Exception(
                        "No active PowerPoint slideshow found."
                    );
                }

                // Connect to the existing slideshow
                dynamic slideshow =
                    powerpoint.SlideShowWindows[1];

                // Validate the requested slide
                int totalSlides =
                    slideshow.Presentation.Slides.Count;

                if (slideNumber > totalSlides)
                {
                    throw new ArgumentOutOfRangeException(
                        nameof(slideNumber),
                        $"Slide {slideNumber} does not exist."
                    );
                }

                // Change the slide without reopening PowerPoint
                slideshow.View.GotoSlide(slideNumber);

                Console.WriteLine(
                    $"Switched to Slide {slideNumber}"
                );

                completion.SetResult(
                    $"Now displaying Slide {slideNumber}"
                );
            }
            catch (Exception ex)
            {
                completion.SetException(ex);
            }
        });

        return completion.Task;
    }

    // Execute commands on the dedicated STA thread
    private void ProcessCommands()
    {
        foreach (Action command in commands.GetConsumingEnumerable())
        {
            try
            {
                command();
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Controller error: {ex.Message}"
                );
            }
        }
    }

    // Find the running PowerPoint application
    private static object GetRunningPowerPoint()
    {
        Guid clsid = new(
            "91493441-5A91-11CF-8700-00AA0060263B"
        );

        int result = GetActiveObject(
            ref clsid,
            IntPtr.Zero,
            out object powerpoint
        );

        if (result != 0)
            Marshal.ThrowExceptionForHR(result);

        return powerpoint;
    }

    // Windows COM API
    [DllImport("oleaut32.dll", PreserveSig = true)]
    private static extern int GetActiveObject(
        ref Guid rclsid,
        IntPtr reserved,
        [MarshalAs(UnmanagedType.Interface)] out object ppunk
    );

    // Stop accepting new commands
    public void Dispose()
    {
        commands.CompleteAdding();
    }
}
