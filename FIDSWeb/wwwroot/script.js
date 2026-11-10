
// SAA FIDS - Counter Management

let selectedCounter = 1;

// Store the selected slide for each counter
const counters = {};

// Generate all 13 check-in counters
function loadCounters() {
    const grid = document.getElementById("counterGrid");

    if (!grid) {
        console.error("Counter grid not found!");
        return;
    }

    grid.innerHTML = "";

    for (let i = 1; i <= 13; i++) {
        const button = document.createElement("button");

        button.className = "counter-button";
        button.id = `counter-${i}`;
        button.textContent = `Counter ${i}`;

        button.addEventListener("click", () => {
            selectCounter(i);
        });

        grid.appendChild(button);
    }

    selectCounter(1);
}

// Select a counter
function selectCounter(number) {
    selectedCounter = number;

    document.getElementById("selectedCounter").textContent =
        `Counter ${number}`;

    // Highlight the selected counter
    document.querySelectorAll(".counter-button").forEach(button => {
        button.classList.remove("selected");
    });

    document.getElementById(`counter-${number}`)
        .classList.add("selected");

    // Restore previously selected slide
    document.getElementById("slideSelect").value =
        counters[number] || "1";
}

// Apply the selected slide
async function applySlide() {
    const slideNumber =
        document.getElementById("slideSelect").value;

    const status = document.getElementById("status");

    status.textContent =
        `Sending Slide ${slideNumber} to Counter ${selectedCounter}...`;

    try {
        // Send the command to the selected counter
        const response = await fetch(
            `/api/counters/${selectedCounter}/slide/${slideNumber}`,
            {
                method: "POST"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Controller returned HTTP ${response.status}`
            );
        }

        counters[selectedCounter] = slideNumber;

        refreshStatuses();

        status.textContent =
            `Counter ${selectedCounter}: Slide ${slideNumber} applied.`;
    }
    catch (error) {
        console.error(error);
        status.textContent = `Error: ${error.message}`;
    }
}

// Initialize after the HTML has loaded
document.addEventListener("DOMContentLoaded", loadCounters);


async function refreshStatuses() {
    const refreshButton = document.getElementById("refreshButton");
    const lastUpdated = document.getElementById("lastUpdated");

    refreshButton.disabled = true;
    refreshButton.textContent = "Checking...";

    try {
        const response = await fetch("/api/counters/status", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const statuses = await response.json();

        statuses.forEach(counter => {
            const button = document.getElementById(
                `counter-${counter.counter}`
            );

            if (!button) return;

            button.classList.remove(
                "connected",
                "disconnected",
                "not-configured",
                "slideshow-inactive"
            );

            let statusText = "";

            if (counter.status === "not_configured") {
                button.classList.add("not-configured");
                statusText = "Not Configured";
            }
            else if (counter.status === "disconnected") {
                button.classList.add("disconnected");
                statusText = "Disconnected";
            }
            else if (counter.status === "connected") {
                if (counter.slideshowActive) {
                    button.classList.add("connected");
                    statusText = "● Slideshow Active";
                }
                else {
                    button.classList.add("slideshow-inactive");
                    statusText = counter.powerpointRunning
                        ? "PowerPoint Open - No Slideshow"
                        : "PowerPoint Not Running";
                }
            }

            const slide = counters[counter.counter];
            const slideText = slide ? `Slide ${slide}` : "";

            button.replaceChildren();

            const name = document.createElement("strong");
            name.textContent = `Counter ${counter.counter}`;

            const status = document.createElement("small");
            status.textContent = statusText;

            button.appendChild(name);
            button.appendChild(status);

            if (slideText) {
                const slideLabel = document.createElement("small");
                slideLabel.textContent = slideText;
                button.appendChild(slideLabel);
            }
        });

        lastUpdated.textContent =
            `Last updated: ${new Date().toLocaleTimeString()}`;
    }
    catch (error) {
        console.error("Status refresh failed:", error);
        lastUpdated.textContent =
            "Unable to retrieve counter statuses.";
    }
    finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ Refresh Status";
    }
}

// Run first check when the dashboard loads
document.addEventListener("DOMContentLoaded", () => {
    refreshStatuses();

    // Refresh automatically every 10 seconds
    setInterval(refreshStatuses, 10000);
});

