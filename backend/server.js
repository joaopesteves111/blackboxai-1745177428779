const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3000;

// In-memory data storage for demo purposes
let users = [
  {
    id: 1,
    email: 'Joaopesteves001@gmail.com',
    password: 'Joaopedro1**',
    role: 'admin',
    membershipCode: '2014',
  },
];
let workouts = {};
let sessions = {};

app.use(cors());
app.use(bodyParser.json());

// Simple session middleware
app.use((req, res, next) => {
  const token = req.headers['authorization'];
  if (token && sessions[token]) {
    req.user = sessions[token];
  }
  next();
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password, membershipCode } = req.body;
  const user = users.find(
    (u) =>
      u.email === email &&
      u.password === password &&
      (u.role === 'admin' ? u.membershipCode === membershipCode : true)
  );
  if (user) {
    // Generate simple token
    const token = Math.random().toString(36).substring(2);
    sessions[token] = user;
    res.json({ success: true, token, role: user.role, userId: user.id });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Middleware to check admin role
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
}

// Get all students with workouts (admin only)
app.get('/api/students', requireAdmin, (req, res) => {
  const students = users
    .filter((u) => u.role === 'student')
    .map((student) => ({
      id: student.id,
      email: student.email,
      workouts: workouts[student.id] || [],
    }));
  res.json({ success: true, students });
});

// Create student endpoint (admin only)
app.post('/api/students', requireAdmin, (req, res) => {
  const { email, password } = req.body;
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ success: false, message: 'Email already exists' });
  }
  const newStudent = {
    id: users.length + 1,
    email,
    password,
    role: 'student',
  };
  users.push(newStudent);
  res.json({ success: true, student: newStudent });
});

// Assign workout to student (admin only)
app.post('/api/students/:id/workouts', requireAdmin, (req, res) => {
  const studentId = parseInt(req.params.id);
  const { workout } = req.body;
  const student = users.find((u) => u.id === studentId && u.role === 'student');
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  if (!workouts[studentId]) {
    workouts[studentId] = [];
  }
  workouts[studentId].push(workout);
  res.json({ success: true, workouts: workouts[studentId] });
});

// Get workouts for logged-in student
app.get('/api/myworkouts', (req, res) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Student access required' });
  }
  res.json({ success: true, workouts: workouts[req.user.id] || [] });
});

app.listen(port, () => {
  console.log(`Gym app backend listening at http://localhost:${port}`);
});
