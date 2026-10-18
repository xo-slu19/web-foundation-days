const loadButton = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const status = document.getElementById("status");
const usersList = document.getElementById("users-list");

let allUsers = [];

// Load users from the API
async function loadUsers() {
  loadButton.disabled = true;
  status.textContent = "Loading users...";

  try {
    const response = await fetch(
      "https://jsonplaceholder.typicode.com/users"
    );

    if (!response.ok) {
      throw new Error("Failed to fetch users.");
    }

    const data = await response.json();

    allUsers = data;

    renderUsers(allUsers);

    status.textContent = `Successfully loaded ${allUsers.length} users.`;
  } catch (error) {
    status.textContent = "Error loading users. Please try again.";
    console.error("Error:", error);
  } finally {
    loadButton.disabled = false;
  }
}

// Display the users passed into this function
function renderUsers(users) {
  usersList.replaceChildren();

  if (users.length === 0) {
    const message = document.createElement("li");
    message.textContent = "No users found.";
    usersList.appendChild(message);
    return;
  }

  users.forEach((user) => {
    const li = document.createElement("li");

    const name = document.createElement("h3");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    li.append(name, email, city, company);
    usersList.appendChild(li);
  });
}

// Filter users separately from rendering
function filterUsers() {
  const query = filterInput.value.trim().toLowerCase();

  const filteredUsers = allUsers.filter((user) => {
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.address.city.toLowerCase().includes(query) ||
      user.company.name.toLowerCase().includes(query)
    );
  });

  renderUsers(filteredUsers);
}

// Load users when the button is clicked
loadButton.addEventListener("click", loadUsers);

// Filter users as the user types
filterInput.addEventListener("input", filterUsers);
