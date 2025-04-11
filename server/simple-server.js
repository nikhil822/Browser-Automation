// A extremely simple server to test basic connectivity
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Basic CORS setup
app.use(cors());

// Basic middleware
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Simple test server is working!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
});
