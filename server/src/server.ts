// src/server.ts
import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { interact } from './routes/interact.js';
dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT as string, 10) || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} received`);
  console.log('Request headers:', req.headers);
  if (req.method === 'POST') {
    console.log('Request body:', req.body);
  }
  next();
});

// Add a basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Add a test endpoint to verify interact route is accessible
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint is working' });
});

// Simple test POST endpoint
app.post('/test', (req, res) => {
  console.log('POST /test was called');
  console.log('POST body:', req.body);
  res.json({ message: 'POST test endpoint is working', received: req.body });
});

// Add a direct POST endpoint for testing
app.post('/direct-interact', async (req, res) => {
  console.log('POST /direct-interact was called');
  console.log('Request body:', req.body);
  res.json({ success: true, message: 'Direct interact endpoint is working' });
});

// Mount interact router
app.use('/interact', interact);

// Debug info
console.log('Type of interact:', typeof interact);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
