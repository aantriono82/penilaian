import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db/init.js';
import routes from './routes/index.js';
import { getLocalStorageDir, getStorageProvider } from './utils/storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Init DB
initDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded images
if (getStorageProvider() === 'local') {
  app.use('/api/uploads', express.static(getLocalStorageDir(), {
    maxAge: '30d',
    immutable: true
  }));
}

// Request logging (simple)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0', timestamp: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route tidak ditemukan' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📚 Atiga Asesmen API v1.0.0`);
  console.log(`🌍 Mode: ${process.env.NODE_ENV || 'development'}`);
});
