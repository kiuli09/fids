
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

        document.getElementById(
            `counter-${selectedCounter}`
        ).textContent =
            `Counter ${selectedCounter} - Slide ${slideNumber}`;

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
