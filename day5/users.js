// Select HTML elements
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

// Store the users fetched from the API
let users = [];

// Fetch users from the API
async function loadUsers() {
    loadButton.disabled = true;
    statusMessage.textContent = "Loading users...";

    try {
        const response = await fetch(
            "https://jsonplaceholder.typicode.com/users"
        );

        // Check whether the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        // Convert the response to JSON
        const data = await response.json();

        users = data;

        // Display the users
        displayUsers();

        statusMessage.textContent =
            `Successfully loaded ${users.length} users.`;

    } catch (error) {
        statusMessage.textContent =
            "Error loading users. Please check your connection and try again.";

        console.error("Failed to load users:", error);

    } finally {
        loadButton.disabled = false;
    }
}

// Display users and apply the current filter
function displayUsers() {
    // Clear the existing list
    usersList.replaceChildren();

    const searchText = filterInput.value.trim().toLowerCase();

    // Filter users by name without another API request
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchText)
    );

    // Show a message if no users match
    if (filteredUsers.length === 0) {
        const listItem = document.createElement("li");
        listItem.textContent = "No users found.";
        usersList.appendChild(listItem);
        return;
    }

    // Create a list item for each user
    filteredUsers.forEach(user => {
        const listItem = document.createElement("li");

        const name = document.createElement("h3");
        name.textContent = user.name;

        const email = document.createElement("p");
        email.textContent = `Email: ${user.email}`;

        const city = document.createElement("p");
        city.textContent = `City: ${user.address.city}`;

        const company = document.createElement("p");
        company.textContent = `Company: ${user.company.name}`;

        listItem.appendChild(name);
        listItem.appendChild(email);
        listItem.appendChild(city);
        listItem.appendChild(company);

        usersList.appendChild(listItem);
    });
}

// Load users when the button is clicked
loadButton.addEventListener("click", loadUsers);

// Filter the already-loaded users as the user types
filterInput.addEventListener("input", function () {
    if (users.length > 0) {
        displayUsers();

        const searchText = filterInput.value.trim();

        if (searchText === "") {
            statusMessage.textContent =
                `Successfully loaded ${users.length} users.`;
        } else {
            const count = users.filter(user =>
                user.name.toLowerCase().includes(
                    searchText.toLowerCase()
                )
            ).length;

            statusMessage.textContent =
                `Found ${count} matching user(s).`;
        }
    }
});
