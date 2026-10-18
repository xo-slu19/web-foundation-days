# School Database Design

## 1. Students Table

The `students` table stores information about students.

It contains three main fields:

- `student_id`: The primary key that uniquely identifies each student.
- `name`: The student's full name. It cannot be NULL.
- `email`: The student's email address. It cannot be NULL and must be unique.

The primary key makes it possible to identify each student without relying on their name or email address.

The UNIQUE constraint prevents two students from registering with the same email address.

## 2. Courses Table

The `courses` table stores information about courses offered by the school.

It contains three main fields:

- `course_id`: The primary key that uniquely identifies each course.
- `course_name`: The name of the course. It cannot be NULL.
- `course_code`: A unique code identifying the course. It cannot be NULL.

The UNIQUE constraint on `course_code` prevents duplicate course codes.

## 3. Enrolments Table

The `enrolments` table records which students are enrolled in which courses.

It contains the following fields:

- `enrolment_id`: The primary key for each enrolment.
- `student_id`: A foreign key referencing the students table.
- `course_id`: A foreign key referencing the courses table.
- `grade`: The student's grade for the course. It can be NULL until a grade is assigned.

The foreign keys help maintain referential integrity by ensuring that each enrolment refers to an existing student and course.

The UNIQUE constraint on `(student_id, course_id)` prevents the same student from enrolling in the same course more than once.

## 4. Relationships Between the Tables

### One-to-Many: Students and Enrolments

One student can have many enrolment records, but each enrolment belongs to one student.

This is a one-to-many relationship because the same `student_id` can appear in multiple rows in the enrolments table.

### One-to-Many: Courses and Enrolments

One course can have many enrolment records, but each enrolment belongs to one course.

This is also a one-to-many relationship because the same `course_id` can appear in multiple rows in the enrolments table.

### Many-to-Many: Students and Courses

Students and courses have a many-to-many relationship.

A student can enrol in multiple courses, and each course can have multiple students.

The `enrolments` table is a join table that connects students and courses using their IDs.

A join table is needed because a many-to-many relationship cannot be represented cleanly using a single foreign key in either the students table or the courses table. The join table also stores additional information, such as each student's grade.

## 5. Index Recommendation

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);
```

This index can improve queries that find all students enrolled in a particular course and queries that count students per course.

The index helps SQLite locate matching enrolment records more efficiently, especially as the number of enrolments grows.

The UNIQUE constraint on `(student_id, course_id)` also creates an index in SQLite, but that index begins with `student_id`. A separate index on `course_id` is useful for queries that search by course.

## 6. SQL or NoSQL?

I would choose a relational SQL database for this school system. Students, courses, and enrolments have clearly defined relationships, and the database needs to enforce rules such as unique student emails, valid foreign keys, and preventing duplicate enrolments. SQL supports these constraints and allows tables to be joined to answer questions about students, courses, and grades. SQLite is a suitable choice for a small school application because it is lightweight and supports relational tables, foreign keys, and SQL queries. A NoSQL database could be useful for more flexible or unstructured data, but a relational database is a better fit for this system's structured data and relationships.
