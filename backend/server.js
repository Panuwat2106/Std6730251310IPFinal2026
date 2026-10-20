const express = require('express');
const cors = require('cors');
const { kmeans1D } = require('./kmeans');

const app = express();
const PORT = process.env.PORT || 3098;
const TOKEN = 'mock-jwt-token';

app.use(cors());
app.use(express.json());

// ---------- In-memory data ----------
let employees = [
  { id: '1', name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { id: '2', name: 'Jane Smith', position: 'HR Officer', status: 'Active', salary: 32000 },
  { id: '3', name: 'Somchai Jaidee', position: 'Intern', status: 'On Leave', salary: 15000 },
  { id: '4', name: 'Mary Johnson', position: 'Engineering Manager', status: 'Active', salary: 85000 },
  { id: '5', name: 'Anan Rakdee', position: 'Accountant', status: 'Active', salary: 28000 },
  { id: '6', name: 'Lisa Wong', position: 'Director', status: 'Active', salary: 120000 },
];

// ---------- Auth middleware ----------
function authToken(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Access Token Required' });
  if (token !== TOKEN) return res.status(401).json({ success: false, error: 'Invalid Token' });
  next();
}

app.get('/api', (req, res) => res.send('API is running'));

// ---------- Login ----------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({ success: true, token: TOKEN });
  }
  res.status(401).json({ success: false, error: 'Invalid username or password' });
});

// ---------- Salary clusters (declared before any /:id route) ----------
app.get('/api/employees/salary-clusters', authToken, (req, res) => {
  try {
    const clusters = kmeans1D(employees.map((e) => Number(e.salary)), 3);
    res.status(200).json({ success: true, clusters });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Failed to compute clusters' });
  }
});

// ---------- CRUD ----------
app.get('/api/employees', authToken, (req, res) => {
  res.status(200).json(employees);
});

app.post('/api/employees', authToken, (req, res) => {
  const { name, position, salary } = req.body || {};
  const nameOk = typeof name === 'string' && name.trim() !== '';
  const posOk = typeof position === 'string' && position.trim() !== '';
  const salaryEmpty = salary === undefined || salary === null || String(salary).trim() === '';
  if (!nameOk || !posOk || salaryEmpty) {
    return res.status(400).json({ success: false, error: 'name, position and salary are required' });
  }
  const salaryNum = Number(salary);
  if (!Number.isFinite(salaryNum) || salaryNum < 0) {
    return res.status(400).json({ success: false, error: 'salary must be a valid non-negative number' });
  }
  const maxId = employees.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0);
  const emp = {
    id: String(maxId + 1),
    name: name.trim(),
    position: position.trim(),
    status: 'Active',
    salary: salaryNum,
  };
  employees.push(emp);
  res.status(201).json(emp);
});

app.put('/api/employees/:id/status', authToken, (req, res) => {
  const emp = employees.find((e) => e.id === String(req.params.id));
  if (!emp) return res.status(404).json({ success: false, error: 'Employee not found' });
  emp.status = emp.status === 'Active' ? 'On Leave' : 'Active';
  res.status(200).json(emp);
});

app.delete('/api/employees/:id', authToken, (req, res) => {
  const idx = employees.findIndex((e) => e.id === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, error: 'Employee not found' });
  employees.splice(idx, 1);
  res.status(200).json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`API running on port ${PORT}`));
