import { studentDb, homeworkDb, userDb } from '../database/db-adapter.js';
import { parseHomeworkText } from './homeworkParser.js';

// Format homework for parent view
function formatHomeworkForParent(homework, studentName) {
  const status = homework.completed ? '✅' : '❌';
  const deadline = new Date(homework.deadline).toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return `${status} *${studentName}* - ${homework.subject}\n${homework.description || 'Geen beschrijving'}\n📅 ${deadline}`;
}

// /link command - link parent Telegram account
export async function handleParentLink(bot, msg, linkCode) {
  const chatId = msg.chat.id;

  if (!linkCode) {
    bot.sendMessage(
      chatId,
      '❓ Gebruik: /link [CODE]\n\n' +
      'Genereer een koppelcode in de web app en gebruik die hier.'
    );
    return;
  }

  try {
    const parent = await userDb.findByLinkCode(linkCode.toUpperCase());

    if (!parent) {
      bot.sendMessage(
        chatId,
        '❌ Ongeldige of verlopen koppelcode.\n\n' +
        'Genereer een nieuwe code in de web app.'
      );
      return;
    }

    // Link the account
    await userDb.linkTelegram(parent.id, chatId.toString());

    const students = await studentDb.findByParentId(parent.id);

    bot.sendMessage(
      chatId,
      `✅ Account succesvol gekoppeld!\n\n` +
      `Welkom ${parent.name}! Je hebt *${students.length} kind(eren)*.\n\n` +
      `Parent Commands:\n` +
      `/status - Overzicht van alle kinderen\n` +
      `/today [kind] - Huiswerk voor vandaag\n` +
      `/week [kind] - Huiswerk deze week\n` +
      `/add - Voeg huiswerk toe\n` +
      `/help - Alle commands`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error linking parent account:', error);
    bot.sendMessage(chatId, '❌ Er ging iets mis bij het koppelen. Probeer het opnieuw.');
  }
}

// /status command - show overview of all children
export async function handleParentStatus(bot, chatId, parent) {
  try {
    const students = await studentDb.findByParentId(parent.id);

    if (students.length === 0) {
      bot.sendMessage(chatId, '📚 Nog geen kinderen toegevoegd in de web app.');
      return;
    }

    let message = `📊 *Status Overzicht*\n\n`;

    for (const student of students) {
      const todayHomework = await homeworkDb.findTodayByStudentId(student.id);
      const allHomework = await homeworkDb.findByStudentId(student.id);
      const completed = todayHomework.filter(hw => hw.completed).length;
      const totalToday = todayHomework.length;
      const totalOpen = allHomework.filter(hw => !hw.completed).length;

      const telegramStatus = student.telegram_linked ? '📱' : '❌';

      message += `*${student.name}* ${telegramStatus}\n`;
      message += `├ Vandaag: ${completed}/${totalToday} af\n`;
      message += `└ Totaal open: ${totalOpen}\n\n`;
    }

    message += `_Gebruik /today [kind] om details te zien_`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error fetching parent status:', error);
    bot.sendMessage(chatId, '❌ Er ging iets mis bij het ophalen van de status.');
  }
}

// /today [kind] - show today's homework for specific child or all
export async function handleParentToday(bot, chatId, parent, childName) {
  try {
    const students = await studentDb.findByParentId(parent.id);

    if (students.length === 0) {
      bot.sendMessage(chatId, '📚 Nog geen kinderen toegevoegd in de web app.');
      return;
    }

    let targetStudents = students;

    // If child name specified, filter
    if (childName) {
      targetStudents = students.filter(s =>
        s.name.toLowerCase().includes(childName.toLowerCase())
      );

      if (targetStudents.length === 0) {
        const names = students.map(s => s.name).join(', ');
        bot.sendMessage(
          chatId,
          `❓ Kind "${childName}" niet gevonden.\n\nJe kinderen: ${names}`
        );
        return;
      }
    }

    let message = `📚 *Huiswerk voor vandaag*\n\n`;
    let totalItems = 0;

    for (const student of targetStudents) {
      const homework = await homeworkDb.findTodayByStudentId(student.id);

      if (homework.length === 0) {
        message += `*${student.name}*: Geen huiswerk 🎉\n\n`;
      } else {
        const completed = homework.filter(hw => hw.completed).length;
        message += `*${student.name}* (${completed}/${homework.length} af):\n`;
        homework.forEach(hw => {
          const status = hw.completed ? '✅' : '❌';
          message += `${status} ${hw.subject}\n`;
        });
        message += `\n`;
        totalItems += homework.length;
      }
    }

    if (totalItems === 0) {
      message += `Geen huiswerk voor vandaag! 🎊`;
    }

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error fetching parent today:', error);
    bot.sendMessage(chatId, '❌ Er ging iets mis.');
  }
}

// /week [kind] - show this week's homework
export async function handleParentWeek(bot, chatId, parent, childName) {
  try {
    const students = await studentDb.findByParentId(parent.id);

    if (students.length === 0) {
      bot.sendMessage(chatId, '📚 Nog geen kinderen toegevoegd in de web app.');
      return;
    }

    let targetStudents = students;

    if (childName) {
      targetStudents = students.filter(s =>
        s.name.toLowerCase().includes(childName.toLowerCase())
      );

      if (targetStudents.length === 0) {
        const names = students.map(s => s.name).join(', ');
        bot.sendMessage(
          chatId,
          `❓ Kind "${childName}" niet gevonden.\n\nJe kinderen: ${names}`
        );
        return;
      }
    }

    let message = `📅 *Huiswerk deze week*\n\n`;

    for (const student of targetStudents) {
      const homework = await homeworkDb.findWeekByStudentId(student.id);

      if (homework.length === 0) {
        message += `*${student.name}*: Niets gepland 🎉\n\n`;
      } else {
        const completed = homework.filter(hw => hw.completed).length;
        message += `*${student.name}* (${completed}/${homework.length} af):\n`;
        homework.slice(0, 5).forEach(hw => {
          const status = hw.completed ? '✅' : '❌';
          const date = new Date(hw.deadline).toLocaleDateString('nl-NL', {
            day: 'numeric',
            month: 'short'
          });
          message += `${status} ${hw.subject} - ${date}\n`;
        });

        if (homework.length > 5) {
          message += `... en ${homework.length - 5} meer\n`;
        }
        message += `\n`;
      }
    }

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error fetching parent week:', error);
    bot.sendMessage(chatId, '❌ Er ging iets mis.');
  }
}

// /add command - add homework (interactive)
export async function handleParentAdd(bot, chatId, parent) {
  const students = await studentDb.findByParentId(parent.id);

  if (students.length === 0) {
    bot.sendMessage(chatId, '📚 Voeg eerst kinderen toe in de web app.');
    return;
  }

  bot.sendMessage(
    chatId,
    `➕ *Huiswerk toevoegen*\n\n` +
    `Stuur een bericht in dit format:\n` +
    `[Kind naam] [Vak]: [Beschrijving] - [datum]\n\n` +
    `Bijvoorbeeld:\n` +
    `Emma Engels: Werkblad 5 - morgen\n` +
    `Lisa Wiskunde: Hoofdstuk 3 - vrijdag\n\n` +
    `Of plak meerdere regels tegelijk!`,
    { parse_mode: 'Markdown' }
  );
}

// Parse parent message for adding homework
export async function parseParentAddMessage(bot, chatId, parent, text) {
  try {
    const students = await studentDb.findByParentId(parent.id);
    const lines = text.split('\n').filter(l => l.trim());

    let added = 0;

    for (const line of lines) {
      // Try to extract: [name] [subject]: [description] - [date]
      const match = line.match(/^(\w+)\s+(.+?):\s*(.+?)\s*-\s*(.+)$/i);

      if (match) {
        const [, name, subject, description, dateText] = match;

        // Find student
        const student = students.find(s =>
          s.name.toLowerCase().startsWith(name.toLowerCase())
        );

        if (student) {
          // Parse date
          const parsed = parseHomeworkText(`${subject}: ${description} - ${dateText}`);

          if (parsed && parsed.length > 0) {
            await homeworkDb.create(
              student.id,
              parsed[0].subject,
              parsed[0].description,
              parsed[0].deadline
            );
            added++;
          }
        }
      }
    }

    if (added > 0) {
      bot.sendMessage(
        chatId,
        `✅ ${added} huiswerk item(s) toegevoegd!`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(
        chatId,
        `❌ Geen huiswerk herkend.\n\n` +
        `Format: [Kind] [Vak]: [Beschrijving] - [datum]\n` +
        `Bijvoorbeeld: Emma Engels: Werkblad 5 - morgen`
      );
    }
  } catch (error) {
    console.error('Error parsing parent add:', error);
    bot.sendMessage(chatId, '❌ Er ging iets mis bij het toevoegen.');
  }
}

// Help message for parents
export function sendParentHelp(bot, chatId, parent) {
  bot.sendMessage(
    chatId,
    `👨‍👩‍👧 *Parent Commands*\n\n` +
    `/status - Overzicht van alle kinderen\n` +
    `/today [kind] - Huiswerk voor vandaag\n` +
    `/week [kind] - Huiswerk deze week\n` +
    `/add - Huiswerk toevoegen (interactief)\n` +
    `/help - Dit helpbericht\n\n` +
    `_Je kunt ook gewoon tekst sturen om huiswerk toe te voegen!_\n` +
    `Format: [Kind] [Vak]: [Beschrijving] - [datum]`,
    { parse_mode: 'Markdown' }
  );
}

export default {
  handleParentLink,
  handleParentStatus,
  handleParentToday,
  handleParentWeek,
  handleParentAdd,
  parseParentAddMessage,
  sendParentHelp
};
