
 // SAA FIDS - Counter Management
 // Phase 5: Improved Operator Controls

let selectedCounter = 1;

// Actual slides reported by the PowerPoint controllers
const counters = {};

// Store pending display selections separately for each counter
const pendingSelections = {};

// Latest connection status for each counter
const counterStatuses = {};

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

// Find the airline and display for a slide
function getPresetBySlide(slideNumber) {
    for (const [airline, presets] of Object.entries(airlinePresets)) {
        const preset = presets.find(
            item => item.slide === Number(slideNumber)
        );

        if (preset) {
            return {
                airline,
                name: preset.name,
                slide: preset.slide
            };
        }
    }

    return null;
}


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

    if (!airlinePresets[airline]) {
        updatePresetInfo();
        return;
    }

    airlinePresets[airline].forEach(preset => {
        const option = document.createElement("option");

        option.value = preset.slide;
        option.textContent = preset.name;

        slideSelect.appendChild(option);
    });

    updatePresetInfo();
}


// Show information about the pending selection
function updatePresetInfo() {
    const airline = document.getElementById("airlineSelect").value;
    const slideSelect = document.getElementById("slideSelect");

    const selectedName =
        slideSelect.selectedOptions[0]?.textContent;

    const slideNumber = Number(slideSelect.value);

    document.getElementById("presetInfo").textContent =
        selectedName
            ? `${airline} - ${selectedName} (Slide ${slideNumber})`
            : "Choose an airline and display.";

    // Remember the pending selection for this counter
    if (selectedName && slideNumber > 0) {
        pendingSelections[selectedCounter] = slideNumber;
    }
}


// Set the pending dropdowns to a particular slide
function selectPresetBySlide(slideNumber) {
    const preset = getPresetBySlide(slideNumber);

    if (!preset) return;

    document.getElementById("airlineSelect").value =
        preset.airline;

    loadDisplays();

    document.getElementById("slideSelect").value =
        String(preset.slide);

    updatePresetInfo();
}


// ==========================================
// COUNTER MANAGEMENT
// ==========================================

// Generate all 13 check-in counter buttons
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

    // Restore this counter's pending selection if available.
    // Otherwise, use the actual current display.
    const pendingSlide = pendingSelections[number];
    const currentSlide = counters[number];

    selectPresetBySlide(pendingSlide ?? currentSlide ?? 1);

    updateCurrentDisplay();
}


// ==========================================
// CURRENT DISPLAY
// ==========================================

// Show the actual display reported by PowerPoint
function updateCurrentDisplay() {
    const currentDisplay = document.getElementById("currentDisplay");
    const currentSlideInfo = document.getElementById("currentSlideInfo");

    const connection = counterStatuses[selectedCounter];

    if (!connection) {
        currentDisplay.textContent = "Checking counter status...";
        currentSlideInfo.textContent = "";
        return;
    }

    if (connection.status === "not_configured") {
        currentDisplay.textContent = "Counter not configured";
        currentSlideInfo.textContent = "";
        return;
    }

    if (connection.status === "disconnected") {
        currentDisplay.textContent = "Controller disconnected";
        currentSlideInfo.textContent = "";
        return;
    }

    if (!connection.slideshowActive) {
        currentDisplay.textContent = "No active PowerPoint slideshow";
        currentSlideInfo.textContent = "";
        return;
    }

    const slideNumber = counters[selectedCounter];

    if (slideNumber == null) {
        currentDisplay.textContent = "Unable to identify current display";
        currentSlideInfo.textContent = "";
        return;
    }

    const preset = getPresetBySlide(slideNumber);

    if (preset) {
        currentDisplay.textContent =
            `${preset.airline} - ${preset.name}`;

        currentSlideInfo.textContent =
            `Slide ${preset.slide}`;
    }
    else {
        currentDisplay.textContent = "Unknown display";
        currentSlideInfo.textContent = `Slide ${slideNumber}`;
    }
}


// ==========================================
// APPLY DISPLAY
// ==========================================

// Apply the selected display to the selected counter
async function applySlide() {
    const counterNumber = selectedCounter;

    const slideNumber =
        Number(document.getElementById("slideSelect").value);

    const preset = getPresetBySlide(slideNumber);

    const status = document.getElementById("status");
    const applyButton = document.getElementById("applyButton");

    if (!preset) {
        status.textContent = "Please select a valid display.";
        return;
    }

    status.textContent =
        `Applying ${preset.airline} - ${preset.name} to Counter ${counterNumber}...`;

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

        status.textContent =
            `Counter ${counterNumber}: ${preset.airline} - ${preset.name} command sent successfully.`;

        // Refresh actual display from PowerPoint.
        // Do not assume the requested slide is already active.
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

// Retrieve current status and actual slides from all controllers
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
            counterStatuses[counter.counter] = counter;

            if (
                counter.status === "connected" &&
                counter.slideshowActive &&
                counter.currentSlide != null
            ) {
                counters[counter.counter] = Number(counter.currentSlide);
            }
            else {
                delete counters[counter.counter];
            }
        });

        // Update actual display information.
        // Never overwrite the operator's pending dropdown selection.
        updateCurrentDisplay();

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
            const preset = getPresetBySlide(slide);

            let displayText = "";

            if (preset) {
                displayText =
                    `${preset.airline} - ${preset.name}`;
            }
            else if (slide != null) {
                displayText = `Unknown Slide ${slide}`;
            }

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

    // Populate airline and display dropdowns
    loadAirlines();

    // Generate the 13 counter buttons
    loadCounters();

    // Update available displays when airline changes
    document.getElementById("airlineSelect")
        .addEventListener("change", loadDisplays);

    // Update pending selection when display changes
    document.getElementById("slideSelect")
        .addEventListener("change", updatePresetInfo);

    // Retrieve current display information
    refreshStatuses();

    // Refresh statuses every 10 seconds
    setInterval(refreshStatuses, 10000);
});
