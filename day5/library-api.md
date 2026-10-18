# Library Books REST API Design

## Overview

This REST API manages books in a library system. It supports listing books,
retrieving individual books, creating new books, updating existing books,
deleting books, and filtering books by author.

Base URL: `https://api.example.com`

Resource: `/books`

## Book Data Structure

A book can contain the following fields:

```json
{
  "id": 1,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "genre": "Fiction"
}
