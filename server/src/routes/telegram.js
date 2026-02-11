import express from 'express';
import { getBot } from '../services/telegramBot.js';

const router = express.Router();

// Telegram webhook endpoint
router.post('/telegram-webhook', async (req, res) => {
  const bot = getBot();

  if (!bot) {
    console.warn('⚠️  Telegram webhook received but bot is not initialized');
    return res.status(503).json({ error: 'Bot not initialized' });
  }

  try {
    // Process the update
    await bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error processing Telegram webhook:', error);
    res.sendStatus(500);
  }
});

// Webhook info endpoint (for debugging)
router.get('/telegram-webhook-info', async (req, res) => {
  const bot = getBot();

  if (!bot) {
    return res.status(503).json({ error: 'Bot not initialized' });
  }

  try {
    const webhookInfo = await bot.getWebHookInfo();
    res.json(webhookInfo);
  } catch (error) {
    console.error('❌ Error getting webhook info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Diagnostic endpoint to check database and environment
router.get('/diagnostic', async (req, res) => {
  res.json({
    database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
    databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set',
    openaiKey: process.env.OPENAI_API_KEY ? 'Set (hidden)' : 'Not set',
    telegramToken: process.env.TELEGRAM_BOT_TOKEN ? 'Set (hidden)' : 'Not set',
    nodeEnv: process.env.NODE_ENV,
    railwayDomain: process.env.RAILWAY_PUBLIC_DOMAIN || 'Not set'
  });
});

export default router;
