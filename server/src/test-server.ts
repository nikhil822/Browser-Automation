// A minimal test server to debug the 403 issue
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

// Apply CORS middleware with very permissive settings
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint is working!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Catch-all route for debugging
app.use('*', (req, res) => {
  res.json({ 
    message: 'Catch-all route reached',
    method: req.method,
    url: req.originalUrl,
    headers: req.headers
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
