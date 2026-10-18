-- ==========================================
-- DAY 6: SCHOOL DATABASE
-- ==========================================

-- Enable foreign key enforcement in SQLite
PRAGMA foreign_keys = ON;

-- Drop existing tables so the script can be rerun
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ==========================================
-- 1. CREATE TABLES
-- ==========================================

-- Students table
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- Courses table
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    course_code TEXT NOT NULL UNIQUE
);

-- Enrolments table
-- Connects students to courses
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id)
        REFERENCES students(student_id),

    FOREIGN KEY (course_id)
        REFERENCES courses(course_id),

    UNIQUE (student_id, course_id)
);

-- ==========================================
-- 2. INSERT SAMPLE STUDENTS
-- ==========================================

INSERT INTO students (name, email) VALUES
('Amina Hassan', 'amina@example.com'),
('Brian Otieno', 'brian@example.com'),
('Grace Wanjiku', 'grace@example.com'),
('David Mwangi', 'david@example.com');

-- ==========================================
-- 3. INSERT SAMPLE COURSES
-- ==========================================

INSERT INTO courses (course_name, course_code) VALUES
('Database Systems', 'DB101'),
('Web Development', 'WEB101'),
('Computer Networks', 'NET101');

-- ==========================================
-- 4. INSERT SAMPLE ENROLMENTS
-- ==========================================

INSERT INTO enrolments (student_id, course_id, grade) VALUES
(1, 1, 'A'),
(1, 2, 'B'),
(2, 1, 'B'),
(2, 3, 'A'),
(3, 2, 'A'),
(4, 1, NULL);

-- ==========================================
-- 5. QUERY: ALL COURSES FOR ONE STUDENT
-- Find courses taken by Amina Hassan
-- ==========================================

SELECT
    students.name AS student_name,
    courses.course_name,
    courses.course_code,
    enrolments.grade
FROM students
JOIN enrolments
    ON students.student_id = enrolments.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE students.name = 'Amina Hassan';

-- ==========================================
-- 6. QUERY: ALL STUDENTS ON ONE COURSE
-- Find students taking Database Systems
-- ==========================================

SELECT
    courses.course_name,
    students.name AS student_name,
    students.email
FROM courses
JOIN enrolments
    ON courses.course_id = enrolments.course_id
JOIN students
    ON enrolments.student_id = students.student_id
WHERE courses.course_name = 'Database Systems';

-- ==========================================
-- 7. QUERY: NUMBER OF STUDENTS PER COURSE
-- Include courses with zero students
-- ==========================================

SELECT
    courses.course_name,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
    ON courses.course_id = enrolments.course_id
GROUP BY courses.course_id, courses.course_name
ORDER BY courses.course_name;

-- ==========================================
-- 8. QUERY: STUDENTS WITH NO ENROLMENTS
-- ==========================================

SELECT
    students.student_id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.student_id = enrolments.student_id
WHERE enrolments.enrolment_id IS NULL;

-- ==========================================
-- 9. UPDATE ONE ENROLMENT'S GRADE
-- Change Amina's Database Systems grade to A+
-- ==========================================

UPDATE enrolments
SET grade = 'A+'
WHERE student_id = (
    SELECT student_id
    FROM students
    WHERE name = 'Amina Hassan'
)
AND course_id = (
    SELECT course_id
    FROM courses
    WHERE course_code = 'DB101'
);

-- Verify the grade update
SELECT
    students.name AS student_name,
    courses.course_name,
    enrolments.grade
FROM enrolments
JOIN students
    ON enrolments.student_id = students.student_id
JOIN courses
    ON enrolments.course_id = courses.course_id
WHERE students.name = 'Amina Hassan'
AND courses.course_code = 'DB101';
