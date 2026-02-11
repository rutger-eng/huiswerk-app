// Dutch homework text parser
// Detects subjects, deadlines, and descriptions from pasted text

// Common Dutch school subjects and their variations
const SUBJECTS = {
  nederlands: ['nederlands', 'ned', 'ne'],
  engels: ['engels', 'eng', 'en'],
  wiskunde: ['wiskunde', 'wisk', 'wi', 'math', 'maths'],
  natuurkunde: ['natuurkunde', 'natuur', 'nat', 'nk'],
  scheikunde: ['scheikunde', 'schei', 'sk'],
  biologie: ['biologie', 'bio'],
  geschiedenis: ['geschiedenis', 'gesch', 'gs'],
  aardrijkskunde: ['aardrijkskunde', 'ak'],
  economie: ['economie', 'econ', 'ec'],
  informatica: ['informatica', 'inf'],
  lichamelijke_opvoeding: ['lichamelijke opvoeding', 'lo', 'gym'],
  maatschappijleer: ['maatschappijleer', 'ma'],
  frans: ['frans', 'fr'],
  duits: ['duits', 'du'],
  spaans: ['spaans', 'sp'],
  latijn: ['latijn', 'la'],
  grieks: ['grieks', 'gr'],
  kunst: ['kunst', 'kv', 'ckv', 'tekenen'],
  muziek: ['muziek', 'mu'],
  mentorles: ['mentorles', 'mentor']
};

// Date keywords
const DATE_KEYWORDS = {
  relative: {
    vandaag: 0,
    morgen: 1,
    overmorgen: 2
  },
  weekdays: {
    maandag: 1,
    dinsdag: 2,
    woensdag: 3,
    donderdag: 4,
    vrijdag: 5,
    zaterdag: 6,
    zondag: 0
  },
  deadlineWords: ['voor', 'tegen', 'uiterlijk', 'deadline', 'inleveren', 'inleverdatum']
};

// Normalize subject name
function normalizeSubject(text) {
  const lowerText = text.toLowerCase().trim();

  for (const [subject, variations] of Object.entries(SUBJECTS)) {
    if (variations.some(v => lowerText.includes(v))) {
      return subject.replace('_', ' ');
    }
  }

  return text.trim();
}

// Parse relative dates (vandaag, morgen, etc.)
function parseRelativeDate(text) {
  const lowerText = text.toLowerCase();

  for (const [keyword, daysOffset] of Object.entries(DATE_KEYWORDS.relative)) {
    if (lowerText.includes(keyword)) {
      const date = new Date();
      date.setDate(date.getDate() + daysOffset);
      return formatDate(date);
    }
  }

  return null;
}

// Parse weekday (e.g., "vrijdag", "volgende week maandag")
function parseWeekday(text) {
  const lowerText = text.toLowerCase();

  for (const [day, dayIndex] of Object.entries(DATE_KEYWORDS.weekdays)) {
    if (lowerText.includes(day)) {
      const today = new Date();
      const currentDayIndex = today.getDay();

      let daysUntil = dayIndex - currentDayIndex;

      // If the day has passed this week or is today, assume next week
      if (daysUntil <= 0) {
        daysUntil += 7;
      }

      // Check if "volgende week" is mentioned
      if (lowerText.includes('volgende week')) {
        daysUntil += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntil);

      return formatDate(targetDate);
    }
  }

  return null;
}

// Parse absolute dates (e.g., "12 maart", "15-03", "3/12")
function parseAbsoluteDate(text) {
  // Dutch month names
  const months = {
    januari: 0, jan: 0,
    februari: 1, feb: 1,
    maart: 2, mrt: 2,
    april: 3, apr: 3,
    mei: 4,
    juni: 5, jun: 5,
    juli: 6, jul: 6,
    augustus: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    oktober: 9, okt: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };

  // Try "12 maart" format
  const monthPattern = /(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|jan|feb|mrt|apr|jun|jul|aug|sep|sept|okt|oct|nov|dec)/i;
  const monthMatch = text.match(monthPattern);

  if (monthMatch) {
    const day = parseInt(monthMatch[1]);
    const month = months[monthMatch[2].toLowerCase()];
    const year = new Date().getFullYear();

    const date = new Date(year, month, day);

    // If date is in the past, assume next year
    if (date < new Date()) {
      date.setFullYear(year + 1);
    }

    return formatDate(date);
  }

  // Try "15-03" or "15/03" format
  const numericPattern = /(\d{1,2})[-\/](\d{1,2})/;
  const numericMatch = text.match(numericPattern);

  if (numericMatch) {
    const day = parseInt(numericMatch[1]);
    const month = parseInt(numericMatch[2]) - 1; // JS months are 0-indexed
    const year = new Date().getFullYear();

    const date = new Date(year, month, day);

    // If date is in the past, assume next year
    if (date < new Date()) {
      date.setFullYear(year + 1);
    }

    return formatDate(date);
  }

  return null;
}

// Parse deadline from text
function parseDeadline(text) {
  // Try different parsing methods
  return (
    parseRelativeDate(text) ||
    parseWeekday(text) ||
    parseAbsoluteDate(text) ||
    null
  );
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse a single line of homework
function parseLine(line) {
  if (!line || line.trim() === '') {
    return null;
  }

  const trimmedLine = line.trim();

  // Try to extract subject, description, and deadline
  let subject = '';
  let description = trimmedLine;
  let deadline = null;

  // Look for subject at the beginning (e.g., "Engels: ...")
  const subjectPattern = /^([a-zA-Z\s]+)[::\-]\s*(.+)/;
  const subjectMatch = trimmedLine.match(subjectPattern);

  if (subjectMatch) {
    subject = normalizeSubject(subjectMatch[1]);
    description = subjectMatch[2].trim();
  } else {
    // Try to find subject anywhere in the line
    subject = normalizeSubject(trimmedLine);
  }

  // Extract deadline
  deadline = parseDeadline(trimmedLine);

  // If no deadline found, default to tomorrow
  if (!deadline) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    deadline = formatDate(tomorrow);
  }

  // Clean up description (remove deadline text)
  const deadlineKeywords = Object.values(DATE_KEYWORDS).flatMap(obj => Object.keys(obj));
  let cleanDescription = description;

  for (const keyword of deadlineKeywords) {
    const regex = new RegExp(keyword, 'gi');
    cleanDescription = cleanDescription.replace(regex, '');
  }

  cleanDescription = cleanDescription
    .replace(/\s*[-:]\s*$/, '') // Remove trailing colons/dashes
    .trim();

  return {
    subject: subject || 'Onbekend vak',
    description: cleanDescription || description,
    deadline
  };
}

// Main parser function
export function parseHomeworkText(text) {
  if (!text || text.trim() === '') {
    return [];
  }

  // Split by newlines, bullets, or numbering
  const lines = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remove bullets and numbering
      return line.replace(/^[\-\*•●]\s*/, '').replace(/^\d+[\.)]\s*/, '');
    });

  // Parse each line
  const parsed = lines
    .map(line => parseLine(line))
    .filter(item => item !== null);

  return parsed;
}

// Export for testing
export default {
  parseHomeworkText,
  normalizeSubject,
  parseDeadline,
  formatDate
};
