// Select HTML elements
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearButton = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// Update character count, word count, and warning classes
function updateCounts() {
    const text = noteText.value;
    const characters = text.length;

    // Count words
    const trimmedText = text.trim();
    const words = trimmedText === ""
        ? 0
        : trimmedText.split(/\s+/).length;

    // Update counters
    charCount.textContent = `${characters} / 200 characters`;
    wordCount.textContent = `${words} words`;

    // Remove old warning classes
    charCount.classList.remove("warning", "over");

    // Apply the correct class
    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }
}

// Save the draft on every input event
noteText.addEventListener("input", function () {
    updateCounts();
    localStorage.setItem("quickNotesDraft", noteText.value);
});

// Clear the note and saved draft
function clearNote() {
    noteText.value = "";
    localStorage.removeItem("quickNotesDraft");
    updateCounts();
}

// Clear button
clearButton.addEventListener("click", function () {
    clearNote();
    noteText.focus();
});

// Escape key clears the note when pressed inside the textarea
noteText.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        clearNote();
    }
});

// Toggle between light and dark themes
themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");

    localStorage.setItem("quickNotesTheme", isDark ? "dark" : "light");

    updateThemeLabel();
});

// Update the theme button label
function updateThemeLabel() {
    const isDark = document.body.classList.contains("dark");

    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

// Restore saved draft and theme when the page loads
function loadSavedData() {
    const savedDraft = localStorage.getItem("quickNotesDraft");
    const savedTheme = localStorage.getItem("quickNotesTheme");

    if (savedDraft !== null) {
        noteText.value = savedDraft;
    }

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    }

    updateThemeLabel();
    updateCounts();
}

// Initialize the page
loadSavedData();
