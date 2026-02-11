import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import homeworkRoutes from './routes/homework.js';
import telegramRoutes from './routes/telegram.js';
import { initBot } from './services/telegramBot.js';
import { startScheduler } from './services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
if (process.env.NODE_ENV === 'production') {
  // In production, frontend is served from same domain
  app.use(cors({
    origin: true,
    credentials: true
  }));
} else {
  // In development, allow specific frontend URL
  app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
  }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api', telegramRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));

  // Handle client-side routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // Development - show API info
  app.get('/', (req, res) => {
    res.json({
      name: 'Huiswerk App API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        students: '/api/students',
        homework: '/api/homework',
        health: '/api/health'
      }
    });
  });

  // 404 handler for development
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend URL: ${FRONTEND_URL}\n`);

  // Initialize Telegram bot
  const bot = initBot();

  if (bot) {
    // Start scheduler for daily notifications
    startScheduler();
  } else {
    console.log('⚠️  Telegram bot not initialized. Notifications disabled.');
    console.log('💡 Add TELEGRAM_BOT_TOKEN to .env to enable Telegram features.\n');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

export default app;
