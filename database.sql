-- Database Schema for School Management System

CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    staffCode TEXT UNIQUE,
    password TEXT,
    photoURL TEXT,
    subject TEXT,
    class_id TEXT,
    phone TEXT,
    isApproved BOOLEAN DEFAULT 0,
    lastLogin DATETIME
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    registration_number TEXT UNIQUE NOT NULL,
    class_id TEXT NOT NULL,
    stream TEXT,
    photo_url TEXT,
    gender TEXT,
    dob TEXT,
    contacts TEXT,
    academic_level TEXT,
    discipline_remarks TEXT,
    average REAL DEFAULT 0,
    total REAL DEFAULT 0,
    grade TEXT
);

CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    streams TEXT, -- JSON array
    teacher_id TEXT,
    level TEXT
);

CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    department TEXT,
    periods_per_week INTEGER DEFAULT 4
);

CREATE TABLE IF NOT EXISTS timetable (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    stream TEXT NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    subject_id TEXT,
    teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS teaching_logs (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    subject TEXT,
    topic TEXT,
    method TEXT,
    outcomes TEXT,
    homework TEXT,
    class_id TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_status (
    id TEXT PRIMARY KEY,
    is_active BOOLEAN DEFAULT 0,
    term TEXT,
    year TEXT,
    updatedBy TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    schoolName TEXT,
    isDarkMode BOOLEAN DEFAULT 0
);
