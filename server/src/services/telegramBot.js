import TelegramBot from 'node-telegram-bot-api';
import { studentDb, homeworkDb, userDb } from '../database/db-adapter.js';
import * as parentCommands from './parentTelegramCommands.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const RAILWAY_PUBLIC_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.RAILWAY_STATIC_URL || 'https://huiswerk-app.up.railway.app';

let bot = null;

// Initialize bot
export function initBot() {
  if (!token) {
    console.warn('⚠️  Telegram bot token not configured. Bot functionality will be disabled.');
    return null;
  }

  try {
    // Use webhook for production (Railway), polling for development
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Initialize bot without polling (webhook mode)
      bot = new TelegramBot(token, { polling: false });
      console.log('✅ Telegram bot initialized (webhook mode)');

      // Set webhook URL
      const webhookUrl = `${RAILWAY_PUBLIC_URL}/api/telegram-webhook`;
      bot.setWebHook(webhookUrl)
        .then(() => {
          console.log(`✅ Telegram webhook set to: ${webhookUrl}`);
        })
        .catch((error) => {
          console.error('❌ Failed to set webhook:', error.message);
        });
    } else {
      // Development mode: use polling
      bot = new TelegramBot(token, { polling: true });
      console.log('✅ Telegram bot initialized (polling mode)');
    }

    setupCommands();
    setupMessageHandler();

    return bot;
  } catch (error) {
    console.error('❌ Failed to initialize Telegram bot:', error.message);
    return null;
  }
}

// Get bot instance for webhook handling
export function getBot() {
  return bot;
}

// Get student by chat ID
async function getStudentByChatId(chatId) {
  const student = await studentDb.findByTelegramChatId(chatId.toString());
  return student;
}

// Get parent by chat ID
async function getParentByChatId(chatId) {
  const parent = await userDb.findByTelegramChatId(chatId.toString());
  return parent;
}

// Check if chat is parent or student
async function getUserType(chatId) {
  const parent = await getParentByChatId(chatId);
  if (parent) return { type: 'parent', user: parent };

  const student = await getStudentByChatId(chatId);
  if (student) return { type: 'student', user: student };

  return { type: 'none', user: null };
}

// Format homework item for display
function formatHomework(homework) {
  const status = homework.completed ? '✅' : '❌';
  const deadline = new Date(homework.deadline).toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return `${status} *${homework.subject}*\n${homework.description || 'Geen beschrijving'}\n📅 ${deadline}`;
}

// Setup bot commands
function setupCommands() {
  // /start command - link Telegram account
  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const linkCode = match[1]?.trim().toUpperCase();

    if (!linkCode) {
      const student = await getStudentByChatId(chatId);

      if (student) {
        bot.sendMessage(
          chatId,
          `👋 Hoi ${student.name}! Je account is al gekoppeld.\n\n` +
          `Gebruik deze commando's:\n` +
          `/today - Huiswerk voor vandaag\n` +
          `/week - Huiswerk voor deze week\n` +
          `/done [vak] - Markeer huiswerk als af`
        );
      } else {
        bot.sendMessage(
          chatId,
          `👋 Welkom bij de Huiswerk App!\n\n` +
          `Om je account te koppelen, vraag je ouder om een koppelcode te genereren in de app.\n` +
          `Stuur dan: /start [CODE]`
        );
      }
      return;
    }

    // Link account with code
    try {
      const student = await studentDb.findByLinkCode(linkCode);

      if (!student) {
        bot.sendMessage(
          chatId,
          '❌ Ongeldige of verlopen koppelcode.\n\n' +
          'Vraag je ouder om een nieuwe code te genereren.'
        );
        return;
      }

      // Link the account
      await studentDb.linkTelegram(student.id, chatId.toString());

      bot.sendMessage(
        chatId,
        `✅ Account succesvol gekoppeld!\n\n` +
        `Hoi ${student.name}! Je kunt nu:\n` +
        `/today - Huiswerk voor vandaag bekijken\n` +
        `/week - Huiswerk voor deze week bekijken\n` +
        `/done [vak] - Huiswerk markeren als af\n\n` +
        `Je krijgt elke ochtend een overzicht van je huiswerk!`
      );
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      bot.sendMessage(chatId, '❌ Er ging iets mis bij het koppelen. Probeer het opnieuw.');
    }
  });

  // /today command - show today's homework (student or parent)
  bot.onText(/\/today(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1]?.trim();
    const { type, user } = await getUserType(chatId);

    if (type === 'parent') {
      await parentCommands.handleParentToday(bot, chatId, user, arg);
      return;
    }

    const student = user;
    if (!student) {
      bot.sendMessage(
        chatId,
        '❌ Je account is nog niet gekoppeld.\n\n' +
        'Gebruik /start [CODE] om je account te koppelen.'
      );
      return;
    }

    try {
      const homework = await homeworkDb.findTodayByStudentId(student.id);

      if (homework.length === 0) {
        bot.sendMessage(
          chatId,
          `📚 Geen huiswerk voor vandaag, ${student.name}! 🎉`
        );
        return;
      }

      const completed = homework.filter(hw => hw.completed).length;
      const total = homework.length;

      let message = `📚 *Huiswerk voor vandaag* (${completed}/${total} af)\n\n`;
      message += homework.map(hw => formatHomework(hw)).join('\n\n');

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error fetching today homework:', error);
      bot.sendMessage(chatId, '❌ Er ging iets mis bij het ophalen van je huiswerk.');
    }
  });

  // /week command - show this week's homework (student or parent)
  bot.onText(/\/week(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const arg = match[1]?.trim();
    const { type, user } = await getUserType(chatId);

    if (type === 'parent') {
      await parentCommands.handleParentWeek(bot, chatId, user, arg);
      return;
    }

    const student = user;
    if (!student) {
      bot.sendMessage(
        chatId,
        '❌ Je account is nog niet gekoppeld.\n\n' +
        'Gebruik /start [CODE] om je account te koppelen.'
      );
      return;
    }

    try {
      const homework = await homeworkDb.findWeekByStudentId(student.id);

      if (homework.length === 0) {
        bot.sendMessage(
          chatId,
          `📚 Geen huiswerk gepland voor deze week, ${student.name}! 🎉`
        );
        return;
      }

      const completed = homework.filter(hw => hw.completed).length;
      const total = homework.length;

      let message = `📚 *Huiswerk deze week* (${completed}/${total} af)\n\n`;
      message += homework.map(hw => formatHomework(hw)).join('\n\n');

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error fetching week homework:', error);
      bot.sendMessage(chatId, '❌ Er ging iets mis bij het ophalen van je huiswerk.');
    }
  });

  // /done command - mark homework as completed
  bot.onText(/\/done(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const subject = match[1]?.trim();

    const student = await getStudentByChatId(chatId);

    if (!student) {
      bot.sendMessage(
        chatId,
        '❌ Je account is nog niet gekoppeld.\n\n' +
        'Gebruik /start [CODE] om je account te koppelen.'
      );
      return;
    }

    if (!subject) {
      bot.sendMessage(
        chatId,
        '❓ Welk vak wil je afvinken?\n\n' +
        'Gebruik: /done [vak]\n' +
        'Bijvoorbeeld: /done engels'
      );
      return;
    }

    try {
      // Find incomplete homework for this subject
      const homework = await homeworkDb.findIncompleteBySubject(student.id, subject);

      if (homework.length === 0) {
        bot.sendMessage(
          chatId,
          `❓ Geen openstaand huiswerk gevonden voor "${subject}".\n\n` +
          'Gebruik /today om je huiswerk te bekijken.'
        );
        return;
      }

      // Mark the first one as completed
      await homeworkDb.markCompleted(homework[0].id, 1);

      bot.sendMessage(
        chatId,
        `✅ Gelukt! Huiswerk voor *${homework[0].subject}* is afgevinkt.\n\n` +
        `${homework[0].description || 'Geen beschrijving'}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error marking homework done:', error);
      bot.sendMessage(chatId, '❌ Er ging iets mis bij het afvinken van je huiswerk.');
    }
  });

  // /link command - for parents
  bot.onText(/\/link(?:\s+(.+))?/, async (msg, match) => {
    const linkCode = match[1]?.trim();
    await parentCommands.handleParentLink(bot, msg, linkCode);
  });

  // /status command - for parents
  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const parent = await getParentByChatId(chatId);

    if (!parent) {
      bot.sendMessage(chatId, '❌ Parent account niet gekoppeld. Gebruik /link [CODE]');
      return;
    }

    await parentCommands.handleParentStatus(bot, chatId, parent);
  });

  // /help command - context-aware
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const { type, user } = await getUserType(chatId);

    if (type === 'parent') {
      parentCommands.sendParentHelp(bot, chatId, user);
    } else if (type === 'student') {
      bot.sendMessage(
        chatId,
        `📚 *Student Commands*\n\n` +
        `/start [CODE] - Koppel je account\n` +
        `/today - Huiswerk voor vandaag\n` +
        `/week - Huiswerk voor deze week\n` +
        `/done [vak] - Markeer huiswerk als af\n` +
        `/help - Dit helpbericht\n\n` +
        `Je kunt ook typen: "engels af"`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(
        chatId,
        `👋 Welkom bij de Huiswerk App!\n\n` +
        `*Voor Students:*\n` +
        `/start [CODE] - Koppel account\n\n` +
        `*Voor Ouders:*\n` +
        `/link [CODE] - Koppel account\n\n` +
        `Genereer een koppelcode in de web app!`,
        { parse_mode: 'Markdown' }
      );
    }
  });
}

// Setup message handler for natural language
function setupMessageHandler() {
  bot.on('message', async (msg) => {
    // Skip if it's a command
    if (msg.text?.startsWith('/')) return;

    const chatId = msg.chat.id;
    const text = msg.text?.toLowerCase() || '';

    const { type, user } = await getUserType(chatId);

    // Handle parent messages (for adding homework)
    if (type === 'parent') {
      await parentCommands.parseParentAddMessage(bot, chatId, user, msg.text);
      return;
    }

    // Check if student is linked
    const student = user;
    if (!student) return;

    // Parse natural language for "done" actions
    // Examples: "engels af", "huiswerk voor wiskunde af", "nederlands klaar"
    const donePattern = /(?:huiswerk\s+voor\s+)?(\w+)\s+(?:af|klaar|gedaan)/i;
    const match = text.match(donePattern);

    if (match) {
      const subject = match[1].trim();

      try {
        const homework = await homeworkDb.findIncompleteBySubject(student.id, subject);

        if (homework.length === 0) {
          bot.sendMessage(
            chatId,
            `❓ Geen openstaand huiswerk gevonden voor "${subject}".`
          );
          return;
        }

        await homeworkDb.markCompleted(homework[0].id, 1);

        bot.sendMessage(
          chatId,
          `✅ Top! Huiswerk voor *${homework[0].subject}* is afgevinkt.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error processing natural language:', error);
      }
    }
  });
}

// Send notification to student
export async function sendNotification(chatId, message, options = {}) {
  if (!bot) {
    console.warn('Bot not initialized, cannot send notification');
    return;
  }

  try {
    await bot.sendMessage(chatId, message, options);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Send daily homework summary to a student
export async function sendDailySummary(student) {
  if (!bot || !student.telegram_chat_id) return;

  try {
    const homework = await homeworkDb.findTodayByStudentId(student.id);

    if (homework.length === 0) {
      await sendNotification(
        student.telegram_chat_id,
        `☀️ Goedemorgen ${student.name}!\n\n📚 Geen huiswerk voor vandaag! 🎉`
      );
      return;
    }

    const completed = homework.filter(hw => hw.completed).length;
    const total = homework.length;

    let message = `☀️ Goedemorgen ${student.name}!\n\n`;
    message += `📚 *Huiswerk voor vandaag* (${completed}/${total} af)\n\n`;
    message += homework.map(hw => formatHomework(hw)).join('\n\n');

    await sendNotification(student.telegram_chat_id, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error sending daily summary:', error);
  }
}

export default { initBot, sendNotification, sendDailySummary };
