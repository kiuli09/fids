
 // SAA FIDS - Counter Management

let selectedCounter = 1;

// Store the last successfully applied slide for each counter
const counters = {};

// Airline display presets from the actual FIDS PowerPoint
const airlinePresets = {
    "Air New Zealand": [
        { slide: 2, name: "Online Check-in" },
        { slide: 3, name: "NZ993 - Economy" },
        { slide: 4, name: "NZ993 - Premium" },
        { slide: 5, name: "NZ997 - Economy" },
        { slide: 6, name: "NZ997 - Premium" },
        { slide: 7, name: "NZ999 - Economy" },
        { slide: 8, name: "NZ999 - Premium" },
        { slide: 9, name: "NZ1307 - Economy" },
        { slide: 10, name: "NZ1307 - Premium" },
        { slide: 11, name: "Service Desk" }
    ],

    "Fiji Airways": [
        { slide: 12, name: "Premium" },
        { slide: 13, name: "Economy" },
        { slide: 14, name: "Bag Drop" },
        { slide: 15, name: "Power Bank Advisory" },
        { slide: 16, name: "Service Desk" }
    ],

    "Virgin Australia": [
        { slide: 17, name: "Priority Check-in" },
        { slide: 18, name: "Check-in" }
    ],

    "Qantas": [
        { slide: 19, name: "QF198 - Online Check-in" },
        { slide: 20, name: "QF198 - Business" },
        { slide: 21, name: "QF198 - Economy" },
        { slide: 22, name: "QF144 - Online Check-in" },
        { slide: 23, name: "QF144 - Business" },
        { slide: 24, name: "QF144 - Economy" },
        { slide: 25, name: "Travel Advisory" }
    ],

    "Samoa Airways": [
        { slide: 26, name: "Pago Pago Check-in" }
    ],

    "Talofa Airways": [
        { slide: 27, name: "Check-in / Ticket & Cargo Sales" }
    ],

    "SAA / General": [
        { slide: 1, name: "Airport Welcome" },
        { slide: 28, name: "Departure Tax - English" },
        { slide: 29, name: "Departure Tax - Samoan" }
    ]
};


// ==========================================
// AIRLINE AND DISPLAY PRESETS
// ==========================================

// Populate the airline dropdown
function loadAirlines() {
    const airlineSelect = document.getElementById("airlineSelect");

    airlineSelect.innerHTML = "";

    Object.keys(airlinePresets).forEach(airline => {
        const option = document.createElement("option");

        option.value = airline;
        option.textContent = airline;

        airlineSelect.appendChild(option);
    });

    loadDisplays();
}


// Populate displays for the selected airline
function loadDisplays() {
    const airline = document.getElementById("airlineSelect").value;
    const slideSelect = document.getElementById("slideSelect");

    slideSelect.innerHTML = "";

    airlinePresets[airline].forEach(preset => {
        const option = document.createElement("option");

        option.value = preset.slide;
        option.textContent = preset.name;

        slideSelect.appendChild(option);
    });

    updatePresetInfo();
}


// Show information about the selected preset
function updatePresetInfo() {
    const airline = document.getElementById("airlineSelect").value;
    const slideSelect = document.getElementById("slideSelect");

    const selectedName =
        slideSelect.options[slideSelect.selectedIndex]?.textContent;

    document.getElementById("presetInfo").textContent =
        `${airline} - ${selectedName} (Slide ${slideSelect.value})`;
}


// Restore airline and display based on a slide number
function selectPresetBySlide(slideNumber) {
    for (const [airline, presets] of Object.entries(airlinePresets)) {
        if (presets.some(preset => preset.slide === Number(slideNumber))) {

            document.getElementById("airlineSelect").value = airline;

            loadDisplays();

            document.getElementById("slideSelect").value =
                String(slideNumber);

            updatePresetInfo();

            return;
        }
    }
}


// ==========================================
// COUNTER MANAGEMENT
// ==========================================

// Generate the 13 check-in counter buttons
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
        button.type = "button";
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

    document.querySelectorAll(".counter-button").forEach(button => {
        button.classList.remove("selected");
    });

    document.getElementById(`counter-${number}`)
        .classList.add("selected");

    // Restore the actual slide reported by the controller
    selectPresetBySlide(counters[number] || 1);
}



// ==========================================
// APPLY DISPLAY
// ==========================================

// Apply the selected slide to the selected counter
async function applySlide() {
    const counterNumber = selectedCounter;

    const slideNumber =
        document.getElementById("slideSelect").value;

    const airline =
        document.getElementById("airlineSelect").value;

    const displayName =
        document.getElementById("slideSelect")
            .selectedOptions[0]?.textContent;

    const status = document.getElementById("status");
    const applyButton = document.getElementById("applyButton");

    status.textContent =
        `Applying ${airline} - ${displayName} to Counter ${counterNumber}...`;

    applyButton.disabled = true;

    try {
        const response = await fetch(
            `/api/counters/${counterNumber}/slide/${slideNumber}`,
            {
                method: "POST"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Controller returned HTTP ${response.status}`
            );
        }

        // Remember the successfully applied slide
        counters[counterNumber] = slideNumber;

        status.textContent =
            `Counter ${counterNumber}: ${airline} - ${displayName} applied successfully.`;

        // Update the counter display
        await refreshStatuses();
    }
    catch (error) {
        console.error("Slide change failed:", error);

        status.textContent =
            `Error applying display to Counter ${counterNumber}: ${error.message}`;
    }
    finally {
        applyButton.disabled = false;
    }
}


// ==========================================
// CONNECTION STATUS MONITORING
// ==========================================

// Check the connection status of all counters
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

        //Synchronise the dashboard with actual Powerpoint slides
        statuses.forEach(counter => {

            if (
                counter.status === "connected" &&
                counter.slideshowActive &&
                counter.currentSlide != null
            ){
                counters[counter.counter] = counter.currentSlide;
            } else {
                delete counters[counter.counter];
            }
        });

        // Update the selected counter's dropdowns
        // Only when the actual displayed slide has changed
        const actualSlide = counters[selectedCounter];

        if (actualSlide != null){
            const displayedSlide = Number(document.getElementById("slideSelect").value);

            if(displayedSlide !== Number(actualSlide)){
                selectPresetBySlide(actualSlide);
            }
        }

        statuses.forEach(counter => {
            const button = document.getElementById(
                `counter-${counter.counter}`
            );

            if (!button) return;

            // Clear previous connection status
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

            // Get the last applied display
            const slide = counters[counter.counter];

            let displayText = "";

            if (slide) {
                for (const [airline, presets] of Object.entries(airlinePresets)) {
                    const preset = presets.find(
                        item => item.slide === Number(slide)
                    );

                    if (preset) {
                        displayText = `${airline} - ${preset.name}`;
                        break;
                    }
                }
            }

            // Rebuild the counter button content
            button.replaceChildren();

            const name = document.createElement("strong");
            name.textContent = `Counter ${counter.counter}`;

            const connection = document.createElement("small");
            connection.textContent = statusText;

            button.appendChild(name);
            button.appendChild(connection);

            if (displayText) {
                const displayLabel = document.createElement("small");
                displayLabel.textContent = displayText;

                button.appendChild(displayLabel);
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


// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // Initialize airline and display dropdowns first
    loadAirlines();

    // Populate all 13 counters
    loadCounters();

    // Update display options when airline changes
    document.getElementById("airlineSelect")
        .addEventListener("change", loadDisplays);

    // Update preset information when display changes
    document.getElementById("slideSelect")
        .addEventListener("change", updatePresetInfo);

    // Run the initial status check
    refreshStatuses();

    // Automatically check counter status every 10 seconds
    setInterval(refreshStatuses, 10000);
});
