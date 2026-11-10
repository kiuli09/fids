
// Send the selected slide to our C# backend
async function selectSlide(slideNumber) {
    const status = document.getElementById("status");

    status.textContent = `Switching to Slide ${slideNumber}...`;

    try {
        // Send a request to the PowerPoint controller
        const response = await fetch(`/api/slide/${slideNumber}`, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const result = await response.json();

        // Show the result on the dashboard
        status.textContent = result.message;
    }
    catch (error) {
        status.textContent = `Error: ${error.message}`;
    }
}
