let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];


// 1. Search notes
function searchNotes(word) {
    const searchWord = word.toLowerCase();

    return notes.filter(note =>
        note.text.toLowerCase().includes(searchWord)
    );
}


// 2. Find the longest note
function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    return notes.reduce((longest, note) => {
        if (note.text.length > longest.text.length) {
            return note;
        }

        return longest;
    });
}


// 3. Count notes by category
function countByCategory() {
    const counts = {
        personal: 0,
        work: 0,
        study: 0
    };

    notes.forEach(note => {
        if (counts[note.category] !== undefined) {
            counts[note.category]++;
        }
    });

    return counts;
}


// 4. Get summary
function getSummary() {
    const counts = countByCategory();
    const total = notes.length;

    return `${total} notes: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}


// 5. Check for duplicate
function isDuplicate(text) {
    const normalisedText = text.trim().replace(/\s+/g, " ").toLowerCase();

    return notes.some(note => {
        const existingText = note.text
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

        return existingText === normalisedText;
    });
}


// 6. Add a new note
function addNote(text, category) {

    // Check that text is a string
    if (typeof text !== "string") {
        console.log("Reason: Note text must be a string.");
        return false;
    }

    // Remove unnecessary spaces
    const cleanedText = text.trim().replace(/\s+/g, " ");

    // Check length
    if (cleanedText.length < 1 || cleanedText.length > 200) {
        console.log("Reason: Note must be between 1 and 200 characters.");
        return false;
    }

    // Check category
    const validCategories = ["personal", "work", "study"];

    if (!validCategories.includes(category)) {
        console.log("Reason: Category must be personal, work or study.");
        return false;
    }

    // Check duplicate
    if (isDuplicate(cleanedText)) {
        console.log("Reason: A note with the same text already exists.");
        return false;
    }

    // Create new ID
    const newId = notes.length > 0
        ? Math.max(...notes.map(note => note.id)) + 1
        : 1;

    // Add note
    notes.push({
        id: newId,
        text: cleanedText,
        category: category
    });

    console.log("Note added successfully.");
    return true;
}


// TESTS

console.log("Search for 'assignment':");
console.log(searchNotes("assignment"));

console.log("Search for 'JAVASCRIPT':");
console.log(searchNotes("JAVASCRIPT"));

console.log("Longest note:");
console.log(longestNote());

console.log("Count by category:");
console.log(countByCategory());

console.log("Summary:");
console.log(getSummary());

console.log("Duplicate test:");
console.log(isDuplicate("  BUY   MILK AND BREAD  "));

console.log("New note test:");
console.log(addNote("Complete my JavaScript practice", "study"));

console.log("Invalid category test:");
console.log(addNote("Go shopping", "shopping"));

console.log("Duplicate note test:");
console.log(addNote("  Buy    milk and bread  ", "personal"));

console.log("Empty note test:");
console.log(addNote("", "personal"));

console.log("Too long note test:");
console.log(addNote("This is a very long note that is being used to test whether the application correctly rejects notes that contain more than two hundred characters because the assignment specifically requires notes to be between one and two hundred characters long.", "personal"));

console.log("Updated notes:");
console.log(notes);

console.log("Updated summary:");
console.log(getSummary());
