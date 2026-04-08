// ===============================
// ACADEMIC MANAGEMENT SYSTEM
// CLEAN BACKEND CODE (INTEGRATED)
// ===============================

import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===============================
// DATABASE CONNECTION
// ===============================
let db: any;

(async () => {
  db = await open({
    filename: './school.db',
    driver: sqlite3.Database
  });

  // Initialize Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      staffCode TEXT UNIQUE,
      password TEXT NOT NULL,
      photoURL TEXT,
      subject TEXT,
      assigned_subjects TEXT,
      class_id TEXT,
      phone TEXT,
      isApproved BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      registration_number TEXT UNIQUE,
      password TEXT NOT NULL,
      class_id TEXT,
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

    CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        schoolName TEXT,
        isDarkMode BOOLEAN DEFAULT 0
    );

    INSERT OR IGNORE INTO settings (id, schoolName, isDarkMode) VALUES ('school_info', 'AMS SCHOOL', 0);
  `);

  // Seed an admin user if none exists (password: admin123)
  const adminExists = await db.get('SELECT * FROM users WHERE staffCode = ?', ['ADMIN001']);
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO users (uid, name, role, staffCode, password, isApproved) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin-uid', 'Mkuu wa Shule', 'HeadOffice', 'ADMIN001', hashedPassword, 1]
    );
  }
})();

// ===============================
// AUTHENTICATION
// ===============================

app.post('/api/register', async (req, res) => {
  const { name, role, staffCode, password, uid } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.run(
      'INSERT INTO users (uid, name, role, staffCode, password) VALUES (?, ?, ?, ?, ?)',
      [uid || Date.now().toString(), name, role, staffCode, hashedPassword]
    );
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'User already exists or database error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { name, staffCode, password, role } = req.body;

  // Handle both staffCode (from snippet) and name (from frontend)
  const query = role === 'Student' 
    ? 'SELECT * FROM students WHERE registration_number = ? OR full_name = ?'
    : 'SELECT * FROM users WHERE staffCode = ? OR name = ?';
  
  const identifier = role === 'Student' ? (staffCode || password) : (staffCode || name);

  try {
    const user = await db.get(query, [identifier, identifier]);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // For students, we might use reg number as password if not hashed yet, 
    // but the snippet uses bcrypt so we'll stick to that.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ===============================
// STUDENTS
// ===============================

app.get('/api/students', async (req, res) => {
  const students = await db.all('SELECT * FROM students');
  res.json(students);
});

app.post('/api/students', async (req, res) => {
  const s = req.body;
  if (!s.full_name || !s.registration_number || !s.password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashedPassword = await bcrypt.hash(s.password, 10);

  try {
    await db.run(
      `INSERT INTO students 
      (id, full_name, registration_number, password, class_id, stream, photo_url, gender, dob, contacts, academic_level, discipline_remarks, average, total, grade) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id || Date.now().toString(), s.full_name, s.registration_number, hashedPassword, s.class_id, s.stream, s.photo_url, s.gender, s.dob, s.contacts, s.academic_level, s.discipline_remarks, s.average, s.total, s.grade]
    );
    res.json({ message: 'Student added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Student already exists or database error' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Delete failed' }); }
});

// ===============================
// OTHER DATA
// ===============================

app.get('/api/users', async (req, res) => {
    const users = await db.all('SELECT * FROM users');
    res.json(users);
});

app.delete('/api/users/:uid', async (req, res) => {
    try {
        await db.run('DELETE FROM users WHERE uid = ?', [req.params.uid]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Delete failed' }); }
});

app.get('/api/classes', async (req, res) => {
    const rows = await db.all('SELECT * FROM classes');
    res.json(rows.map((r: any) => ({ ...r, streams: JSON.parse(r.streams || '[]') })));
});

app.delete('/api/classes/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM classes WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Delete failed' }); }
});

app.get('/api/subjects', async (req, res) => {
    const rows = await db.all('SELECT * FROM subjects');
    res.json(rows);
});

app.get('/api/timetable', async (req, res) => {
    const rows = await db.all('SELECT * FROM timetable');
    res.json(rows);
});

app.post('/api/timetable', async (req, res) => {
    const { id, class_id, stream, day, period, subject_id, teacher_id } = req.body;
    try {
        await db.run(`INSERT OR REPLACE INTO timetable (id, class_id, stream, day, period, subject_id, teacher_id) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                       [id, class_id, stream, day, period, subject_id, teacher_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Save failed' }); }
});

app.get('/api/settings', async (req, res) => {
    const row = await db.get('SELECT * FROM settings WHERE id = "school_info"');
    res.json(row);
});

// ===============================
// SERVE FRONTEND
// ===============================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===============================
// START SERVER
// ===============================
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://localhost:3000');
});
