// Absolute minimal Express server for testing POST requests
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Basic middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple test GET endpoint
app.get('/test', (req, res) => {
  console.log('GET /test was called');
  res.json({ message: 'GET endpoint is working' });
});

// Simple test POST endpoint
app.post('/test', (req, res) => {
  console.log('POST /test was called');
  console.log('Request body:', req.body);
  res.json({ message: 'POST endpoint is working', body: req.body });
});

// Debug logging for all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} was received`);
  next();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Minimal test server running on port ${PORT}`);
});
