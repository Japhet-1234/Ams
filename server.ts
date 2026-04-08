import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.env.url || import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database Setup
const db = new sqlite3.Database('./school.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite database.');
});

// Initialize Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        staffCode TEXT UNIQUE,
        password TEXT,
        photoURL TEXT,
        subject TEXT,
        assigned_subjects TEXT, -- JSON string
        class_id TEXT,
        phone TEXT,
        isApproved BOOLEAN DEFAULT 0,
        lastLogin DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS students (
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
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        streams TEXT, -- JSON array
        teacher_id TEXT,
        level TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        department TEXT,
        periods_per_week INTEGER DEFAULT 4
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS timetable (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL,
        stream TEXT NOT NULL,
        day TEXT NOT NULL,
        period INTEGER NOT NULL,
        subject_id TEXT,
        teacher_id TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        teacher_id TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        schoolName TEXT,
        isDarkMode BOOLEAN DEFAULT 0
    )`);

    // Seed default settings
    db.run(`INSERT OR IGNORE INTO settings (id, schoolName, isDarkMode) VALUES ('school_info', 'AMS SCHOOL', 0)`);
});

// --- API Endpoints ---

// Auth
app.post('/api/login', (req, res) => {
    const { name, password, role } = req.body;
    const query = role === 'Student' 
        ? 'SELECT * FROM students WHERE full_name = ? AND registration_number = ?'
        : 'SELECT * FROM users WHERE name = ? AND password = ? AND role = ?';
    
    const params = role === 'Student' ? [name, password] : [name, password, role];

    db.get(query, params, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid credentials' });
        res.json(row);
    });
});

// Users/Staff
app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/users', (req, res) => {
    const { uid, name, role, staffCode, password, photoURL, subject, assigned_subjects, class_id, phone, isApproved } = req.body;
    const query = `INSERT INTO users (uid, name, role, staffCode, password, photoURL, subject, assigned_subjects, class_id, phone, isApproved) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [uid, name, role, staffCode, password, photoURL, subject, JSON.stringify(assigned_subjects), class_id, phone, isApproved], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Students
app.get('/api/students', (req, res) => {
    db.all('SELECT * FROM students', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/students', (req, res) => {
    const s = req.body;
    const query = `INSERT INTO students (id, full_name, registration_number, class_id, stream, photo_url, gender, dob, contacts, academic_level, discipline_remarks, average, total, grade) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [s.id, s.full_name, s.registration_number, s.class_id, s.stream, s.photo_url, s.gender, s.dob, s.contacts, s.academic_level, s.discipline_remarks, s.average, s.total, s.grade], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Classes
app.get('/api/classes', (req, res) => {
    db.all('SELECT * FROM classes', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ ...r, streams: JSON.parse(r.streams || '[]') })));
    });
});

// Subjects
app.get('/api/subjects', (req, res) => {
    db.all('SELECT * FROM subjects', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Timetable
app.get('/api/timetable', (req, res) => {
    db.all('SELECT * FROM timetable', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/timetable', (req, res) => {
    const { id, class_id, stream, day, period, subject_id, teacher_id } = req.body;
    const query = `INSERT OR REPLACE INTO timetable (id, class_id, stream, day, period, subject_id, teacher_id) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [id, class_id, stream, day, period, subject_id, teacher_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Settings
app.get('/api/settings', (req, res) => {
    db.get('SELECT * FROM settings WHERE id = "school_info"', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// Serve Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
