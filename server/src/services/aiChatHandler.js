import OpenAI from 'openai';
import { studentDb, homeworkDb, userDb } from '../database/db-adapter.js';
import { parseHomeworkText } from './homeworkParser.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Conversation context per user (chat_id)
const conversationHistory = new Map();
const MAX_HISTORY = 10;

// Get or create conversation history
function getConversation(chatId) {
  if (!conversationHistory.has(chatId)) {
    conversationHistory.set(chatId, []);
  }
  return conversationHistory.get(chatId);
}

// Add message to conversation
function addToConversation(chatId, role, content) {
  const history = getConversation(chatId);
  history.push({ role, content });

  // Keep only last MAX_HISTORY messages
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

// System prompt for the AI
function getSystemPrompt(userType, userData) {
  if (userType === 'parent') {
    const studentNames = userData.students.map(s => s.name).join(', ');
    return `Je bent een behulpzame huiswerk management assistent voor ouders.

Je helpt ${userData.name} (een ouder) met het beheren van huiswerk voor hun kinderen: ${studentNames}.

Je kunt:
- Huiswerk tonen voor specifieke kinderen of alle kinderen
- Huiswerk toevoegen voor kinderen
- Status overzichten geven
- Huiswerk als afgerond markeren

Wees vriendelijk, behulpzaam en conversationeel. Gebruik Nederlands.
Als je niet zeker bent welk kind bedoeld wordt, vraag het!`;
  } else if (userType === 'student') {
    return `Je bent een behulpzame huiswerk management assistent voor studenten.

Je helpt ${userData.name} met hun huiswerk.

Je kunt:
- Huiswerk voor vandaag of deze week tonen
- Huiswerk als afgerond markeren
- Status updates geven

Wees vriendelijk, motiverend en behulpzaam. Gebruik Nederlands.`;
  }
}

// Function definitions for OpenAI function calling
const functions = [
  {
    name: 'show_homework',
    description: 'Toon huiswerk voor een student (vandaag, deze week, of alle)',
    parameters: {
      type: 'object',
      properties: {
        student_name: {
          type: 'string',
          description: 'Naam van de student (optioneel voor ouders, verplicht als meerdere kinderen)'
        },
        timeframe: {
          type: 'string',
          enum: ['today', 'week', 'all'],
          description: 'Welke periode: today (vandaag), week (deze week), all (alles)'
        }
      },
      required: ['timeframe']
    }
  },
  {
    name: 'add_homework',
    description: 'Voeg huiswerk toe voor een student',
    parameters: {
      type: 'object',
      properties: {
        student_name: {
          type: 'string',
          description: 'Naam van de student'
        },
        subject: {
          type: 'string',
          description: 'Vak (bijv. Engels, Wiskunde)'
        },
        description: {
          type: 'string',
          description: 'Beschrijving van de opdracht'
        },
        deadline: {
          type: 'string',
          description: 'Deadline in natuurlijke taal (bijv. morgen, vrijdag, 15 maart)'
        }
      },
      required: ['student_name', 'subject', 'description', 'deadline']
    }
  },
  {
    name: 'mark_homework_done',
    description: 'Markeer huiswerk als afgerond',
    parameters: {
      type: 'object',
      properties: {
        student_name: {
          type: 'string',
          description: 'Naam van de student (optioneel voor studenten zelf)'
        },
        subject: {
          type: 'string',
          description: 'Vak van het huiswerk dat af is'
        }
      },
      required: ['subject']
    }
  },
  {
    name: 'show_status',
    description: 'Toon status overzicht van alle kinderen (alleen voor ouders)',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
];

// Execute function calls
async function executeFunction(functionName, args, userType, user) {
  switch (functionName) {
    case 'show_homework':
      return await handleShowHomework(args, userType, user);

    case 'add_homework':
      return await handleAddHomework(args, userType, user);

    case 'mark_homework_done':
      return await handleMarkDone(args, userType, user);

    case 'show_status':
      return await handleShowStatus(user);

    default:
      return { error: 'Unknown function' };
  }
}

// Show homework handler
async function handleShowHomework(args, userType, user) {
  try {
    let students = [];

    if (userType === 'parent') {
      students = await studentDb.findByParentId(user.id);

      // Filter by student name if provided
      if (args.student_name) {
        students = students.filter(s =>
          s.name.toLowerCase().includes(args.student_name.toLowerCase())
        );
      }
    } else {
      students = [user];
    }

    if (students.length === 0) {
      return { error: 'Student niet gevonden' };
    }

    let results = [];

    for (const student of students) {
      let homework = [];

      if (args.timeframe === 'today') {
        homework = await homeworkDb.findTodayByStudentId(student.id);
      } else if (args.timeframe === 'week') {
        homework = await homeworkDb.findWeekByStudentId(student.id);
      } else {
        homework = await homeworkDb.findByStudentId(student.id);
      }

      results.push({
        student: student.name,
        homework: homework.map(hw => ({
          subject: hw.subject,
          description: hw.description,
          deadline: hw.deadline,
          completed: hw.completed === 1
        }))
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Error in handleShowHomework:', error);
    return { error: 'Er ging iets mis bij het ophalen van huiswerk' };
  }
}

// Add homework handler
async function handleAddHomework(args, userType, user) {
  try {
    let students = [];

    if (userType === 'parent') {
      students = await studentDb.findByParentId(user.id);
      students = students.filter(s =>
        s.name.toLowerCase().includes(args.student_name.toLowerCase())
      );
    } else {
      students = [user];
    }

    if (students.length === 0) {
      return { error: 'Student niet gevonden' };
    }

    const student = students[0];

    // Parse deadline using our existing parser
    const parsed = parseHomeworkText(`${args.subject}: ${args.description} - ${args.deadline}`);

    if (!parsed || parsed.length === 0) {
      return { error: 'Kon deadline niet interpreteren' };
    }

    await homeworkDb.create(
      student.id,
      args.subject,
      args.description,
      parsed[0].deadline
    );

    return {
      success: true,
      message: `Huiswerk toegevoegd voor ${student.name}: ${args.subject} - deadline ${parsed[0].deadline}`
    };
  } catch (error) {
    console.error('Error in handleAddHomework:', error);
    return { error: 'Er ging iets mis bij het toevoegen van huiswerk' };
  }
}

// Mark homework done handler
async function handleMarkDone(args, userType, user) {
  try {
    let students = [];

    if (userType === 'parent' && args.student_name) {
      students = await studentDb.findByParentId(user.id);
      students = students.filter(s =>
        s.name.toLowerCase().includes(args.student_name.toLowerCase())
      );
    } else {
      students = [user];
    }

    if (students.length === 0) {
      return { error: 'Student niet gevonden' };
    }

    const student = students[0];
    const homework = await homeworkDb.findIncompleteBySubject(student.id, args.subject);

    if (homework.length === 0) {
      return { error: `Geen openstaand huiswerk gevonden voor ${args.subject}` };
    }

    await homeworkDb.markCompleted(homework[0].id, 1);

    return {
      success: true,
      message: `Huiswerk voor ${args.subject} is afgevinkt voor ${student.name}`
    };
  } catch (error) {
    console.error('Error in handleMarkDone:', error);
    return { error: 'Er ging iets mis bij het afvinken' };
  }
}

// Show status handler
async function handleShowStatus(user) {
  try {
    const students = await studentDb.findByParentId(user.id);
    const results = [];

    for (const student of students) {
      const todayHomework = await homeworkDb.findTodayByStudentId(student.id);
      const allHomework = await homeworkDb.findByStudentId(student.id);

      results.push({
        student: student.name,
        todayTotal: todayHomework.length,
        todayCompleted: todayHomework.filter(hw => hw.completed).length,
        totalOpen: allHomework.filter(hw => !hw.completed).length,
        telegramLinked: student.telegram_linked === 1
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Error in handleShowStatus:', error);
    return { error: 'Er ging iets mis bij het ophalen van status' };
  }
}

// Main AI chat handler
export async function handleAIChat(chatId, userMessage, userType, user) {
  try {
    // Add user message to history
    addToConversation(chatId, 'user', userMessage);

    // Prepare user data for system prompt
    let userData = { name: user.name };
    if (userType === 'parent') {
      userData.students = await studentDb.findByParentId(user.id);
    }

    // Get conversation history
    const history = getConversation(chatId);

    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: getSystemPrompt(userType, userData) },
        ...history
      ],
      functions: functions,
      function_call: 'auto',
      temperature: 0.7,
      max_tokens: 500
    });

    const message = response.choices[0].message;

    // Check if AI wants to call a function
    if (message.function_call) {
      const functionName = message.function_call.name;
      const functionArgs = JSON.parse(message.function_call.arguments);

      // Execute the function
      const functionResult = await executeFunction(functionName, functionArgs, userType, user);

      // Call AI again with function result to generate natural response
      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: getSystemPrompt(userType, userData) },
          ...history,
          message,
          {
            role: 'function',
            name: functionName,
            content: JSON.stringify(functionResult)
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const finalMessage = secondResponse.choices[0].message.content;

      // Add assistant response to history
      addToConversation(chatId, 'assistant', finalMessage);

      return finalMessage;
    } else {
      // No function call, just return the response
      const assistantMessage = message.content;

      // Add to history
      addToConversation(chatId, 'assistant', assistantMessage);

      return assistantMessage;
    }
  } catch (error) {
    console.error('Error in handleAIChat:', error);
    return 'Sorry, er ging iets mis. Probeer het opnieuw of gebruik een commando zoals /help';
  }
}

// Clear conversation history (optional, for /reset command)
export function clearConversation(chatId) {
  conversationHistory.delete(chatId);
}

export default { handleAIChat, clearConversation };
