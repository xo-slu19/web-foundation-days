# Library API Design

## Overview

The Library API allows users to manage books in a library system.

**Base URL:** `/api`

**Resource:** `books`

Each book has the following data structure:

```json
{
  "id": 1,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "genre": "Fiction"
}
```

## 1. Get All Books

- **Method:** GET
- **Path:** `/api/books`
- **Description:** Returns a list of all books in the library.
- **Request Body:** None
- **Success Status:** `200 OK`

Example response:

```json
[
  {
    "id": 1,
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958,
    "genre": "Fiction"
  }
]
```

## 2. Get a Single Book

- **Method:** GET
- **Path:** `/api/books/:id`
- **Description:** Returns the book with the specified ID.
- **Request Body:** None
- **Success Status:** `200 OK`

Example response:

```json
{
  "id": 1,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "genre": "Fiction"
}
```

If the book does not exist, the API returns `404 Not Found`.

## 3. Create a Book

- **Method:** POST
- **Path:** `/api/books`
- **Description:** Creates a new book.
- **Request Body:** JSON containing the book's title, author, published year, and genre.
- **Success Status:** `201 Created`

Example request body:

```json
{
  "title": "The River Between",
  "author": "Ngugi wa Thiong'o",
  "publishedYear": 1965,
  "genre": "Fiction"
}
```

The server generates the book ID and returns the newly created book.

## 4. Update a Book

- **Method:** PUT
- **Path:** `/api/books/:id`
- **Description:** Updates an existing book using its ID.
- **Request Body:** JSON containing the updated title, author, published year, and genre.
- **Success Status:** `200 OK`

Example request body:

```json
{
  "title": "The River Between",
  "author": "Ngugi wa Thiong'o",
  "publishedYear": 1965,
  "genre": "Literature"
}
```

If the book does not exist, the API returns `404 Not Found`.

## 5. Delete a Book

- **Method:** DELETE
- **Path:** `/api/books/:id`
- **Description:** Deletes the book with the specified ID.
- **Request Body:** None
- **Success Status:** `204 No Content`

If the book does not exist, the API returns `404 Not Found`.

## 6. Get Books by Author

- **Method:** GET
- **Path:** `/api/books?author=Chinua%20Achebe`
- **Description:** Returns books written by the specified author.
- **Request Body:** None
- **Success Status:** `200 OK`

The `author` query parameter filters the results. If no books match, the API returns an empty array with `200 OK`.

## Error Responses

### 400 Bad Request

**Meaning:** The request is invalid, incomplete, or contains incorrect data.

Example: A client attempts to create a book without a title or author.

Example response:

```json
{
  "error": "Bad Request",
  "message": "Title and author are required."
}
```

The client should correct the request data before trying again.

### 404 Not Found

**Meaning:** The requested resource does not exist.

Example: A client requests `/api/books/999`, but book 999 does not exist.

Example response:

```json
{
  "error": "Not Found",
  "message": "The requested book was not found."
}
```

The client should check the book ID or resource path.

## Summary Table

| Operation | HTTP Method | Endpoint | Success Status |
|---|---|---|---|
| Get all books | GET | `/api/books` | 200 OK |
| Get one book | GET | `/api/books/:id` | 200 OK |
| Create a book | POST | `/api/books` | 201 Created |
| Update a book | PUT | `/api/books/:id` | 200 OK |
| Delete a book | DELETE | `/api/books/:id` | 204 No Content |
| Get books by author | GET | `/api/books?author=Chinua%20Achebe` | 200 OK |
