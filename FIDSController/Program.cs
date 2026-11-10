
using System;

Console.WriteLine("=== SAA FIDS Controller ===");

// Locate the PowerPoint presentation
string filePath = Path.GetFullPath(
    Path.Combine("FIDS-Test", "fids_ppt.pptx")
);

try
{
    // Find the installed PowerPoint application
    Type? pptType = Type.GetTypeFromProgID(
        "PowerPoint.Application"
    );

    if (pptType == null)
    {
        Console.WriteLine("PowerPoint not found. Check your filepath ti'o :)");
        return;
    }

    // Connect to PowerPoint
    dynamic powerpoint = Activator.CreateInstance(pptType)!;

    // Open the FIDS presentation
    dynamic presentation = powerpoint.Presentations.Open(
        filePath, 0, 0, -1
    );

    // Start the slideshow
    dynamic slideshow = presentation.SlideShowSettings.Run();

    Console.WriteLine("FIDS slideshow started!");

    // Keep the controller running for slide changes babooommmm
    while (true)
    {
        Console.Write("\nEnter slide number (or Q to quit): ");
        string? input = Console.ReadLine();

        // Exit the controller when Q is entered
        if (input?.ToUpper() == "Q")
            break;

        // Check if the input is a valid number
        if (int.TryParse(input, out int slideNumber))
        {
            // Make sure the slide exists in the presentation yaknowww
            if (slideNumber >= 1 &&
                slideNumber <= presentation.Slides.Count)
            {
                // Switch to the selected slide
                slideshow.View.GotoSlide(slideNumber);

                Console.WriteLine(
                    $"Now displaying Slide {slideNumber}"
                );
            }
            else
            {
                Console.WriteLine("Invalid slide number ti'o.");
            }
        }
        else
        {
            Console.WriteLine("Please enter a valid number.");
        }
    }
}
catch (Exception ex)
{
    // Display any errors (hopefully nadaa)
    Console.WriteLine($"Error: {ex.Message}");
}
