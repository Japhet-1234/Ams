// ACADEMIC MANAGEMENT SYSTEM
// CLEAN BACKEND CODE
// ===============================

import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

const app = express();
app.use(express.json());

// ===============================
// DATABASE CONNECTION
// ===============================
let db;

(async () => {
  db = await open({
    filename: './school.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      staffCode TEXT UNIQUE,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      registration_number TEXT UNIQUE,
      password TEXT NOT NULL,
      class_id INTEGER,
      stream TEXT
    );
  `);
})();

// ===============================
// REGISTER USER
// ===============================
app.post('/api/register', async (req, res) => {
  const { name, role, staffCode, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.run(
      'INSERT INTO users (name, role, staffCode, password) VALUES (?, ?, ?, ?)',
      [name, role, staffCode, hashedPassword]
    );

    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'User already exists or database error' });
  }
});

// ===============================
// LOGIN USER
// ===============================
app.post('/api/login', async (req, res) => {
  const { staffCode, password } = req.body;

  const user = await db.get(
    'SELECT * FROM users WHERE staffCode = ?',
    [staffCode]
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.json({
    message: 'Login successful',
    user
  });
});

// ===============================
// ADD STUDENT
// ===============================
app.post('/api/students', async (req, res) => {
  const { full_name, registration_number, password, class_id, stream } = req.body;

  if (!full_name || !registration_number || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.run(
      `INSERT INTO students 
      (full_name, registration_number, password, class_id, stream) 
      VALUES (?, ?, ?, ?, ?)`,
      [full_name, registration_number, hashedPassword, class_id, stream]
    );

    res.json({ message: 'Student added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Student already exists or database error' });
  }
});

// ===============================
// GET ALL STUDENTS
// ===============================
app.get('/api/students', async (req, res) => {
  const students = await db.all('SELECT * FROM students');
  res.json(students);
});

// ===============================
// START SERVER
// ===============================
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
