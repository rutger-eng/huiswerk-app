import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../database.sqlite');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table (parents)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'parent',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Students table
    db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        parent_id INTEGER NOT NULL,
        telegram_chat_id TEXT,
        telegram_linked INTEGER DEFAULT 0,
        telegram_link_code TEXT,
        telegram_link_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Homework table
    db.run(`
      CREATE TABLE IF NOT EXISTS homework (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        description TEXT,
        deadline DATE NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    console.log('Database tables initialized');
  });
}

// Helper function to run queries with promises
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper function to get a single row
const getOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Helper function to get multiple rows
const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// User operations
export const userDb = {
  // Create new user (parent)
  create: async (email, passwordHash, name, role = 'parent') => {
    const result = await runQuery(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [email, passwordHash, name, role]
    );
    return result.lastID;
  },

  // Find user by email
  findByEmail: async (email) => {
    return await getOne('SELECT * FROM users WHERE email = ?', [email]);
  },

  // Find user by id
  findById: async (id) => {
    return await getOne('SELECT * FROM users WHERE id = ?', [id]);
  },

  // Update user
  update: async (id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    return await runQuery(`UPDATE users SET ${fields} WHERE id = ?`, values);
  }
};

// Student operations
export const studentDb = {
  // Create new student
  create: async (name, parentId, userId = null) => {
    const result = await runQuery(
      'INSERT INTO students (name, parent_id, user_id) VALUES (?, ?, ?)',
      [name, parentId, userId]
    );
    return result.lastID;
  },

  // Find students by parent id
  findByParentId: async (parentId) => {
    return await getAll('SELECT * FROM students WHERE parent_id = ? ORDER BY name', [parentId]);
  },

  // Find student by id
  findById: async (id) => {
    return await getOne('SELECT * FROM students WHERE id = ?', [id]);
  },

  // Find student by telegram chat id
  findByTelegramChatId: async (chatId) => {
    return await getOne('SELECT * FROM students WHERE telegram_chat_id = ?', [chatId]);
  },

  // Find student by link code
  findByLinkCode: async (linkCode) => {
    return await getOne(
      'SELECT * FROM students WHERE telegram_link_code = ? AND telegram_link_expires > datetime("now")',
      [linkCode]
    );
  },

  // Update student
  update: async (id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    return await runQuery(`UPDATE students SET ${fields} WHERE id = ?`, values);
  },

  // Delete student
  delete: async (id) => {
    return await runQuery('DELETE FROM students WHERE id = ?', [id]);
  },

  // Set telegram link code
  setLinkCode: async (id, linkCode, expiresAt) => {
    return await runQuery(
      'UPDATE students SET telegram_link_code = ?, telegram_link_expires = ? WHERE id = ?',
      [linkCode, expiresAt, id]
    );
  },

  // Link telegram account
  linkTelegram: async (id, chatId) => {
    return await runQuery(
      'UPDATE students SET telegram_chat_id = ?, telegram_linked = 1, telegram_link_code = NULL, telegram_link_expires = NULL WHERE id = ?',
      [chatId, id]
    );
  },

  // Get all students with linked telegram
  getAllWithTelegram: async () => {
    return await getAll('SELECT * FROM students WHERE telegram_linked = 1 AND telegram_chat_id IS NOT NULL');
  }
};

// Homework operations
export const homeworkDb = {
  // Create new homework
  create: async (studentId, subject, description, deadline) => {
    const result = await runQuery(
      'INSERT INTO homework (student_id, subject, description, deadline) VALUES (?, ?, ?, ?)',
      [studentId, subject, description, deadline]
    );
    return result.lastID;
  },

  // Create multiple homework items
  createBatch: async (homeworkItems) => {
    const ids = [];
    for (const item of homeworkItems) {
      const result = await runQuery(
        'INSERT INTO homework (student_id, subject, description, deadline) VALUES (?, ?, ?, ?)',
        [item.studentId, item.subject, item.description, item.deadline]
      );
      ids.push(result.lastID);
    }
    return ids;
  },

  // Find homework by student id
  findByStudentId: async (studentId) => {
    return await getAll(
      'SELECT * FROM homework WHERE student_id = ? ORDER BY deadline ASC, subject',
      [studentId]
    );
  },

  // Find homework by student id and date
  findByStudentIdAndDate: async (studentId, date) => {
    return await getAll(
      'SELECT * FROM homework WHERE student_id = ? AND DATE(deadline) = DATE(?) ORDER BY subject',
      [studentId, date]
    );
  },

  // Find homework for today by student id
  findTodayByStudentId: async (studentId) => {
    return await getAll(
      'SELECT * FROM homework WHERE student_id = ? AND DATE(deadline) = DATE("now") ORDER BY subject',
      [studentId]
    );
  },

  // Find homework for this week by student id
  findWeekByStudentId: async (studentId) => {
    return await getAll(
      `SELECT * FROM homework
       WHERE student_id = ?
       AND DATE(deadline) BETWEEN DATE("now") AND DATE("now", "+7 days")
       ORDER BY deadline ASC, subject`,
      [studentId]
    );
  },

  // Find homework by id
  findById: async (id) => {
    return await getOne('SELECT * FROM homework WHERE id = ?', [id]);
  },

  // Update homework
  update: async (id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    return await runQuery(`UPDATE homework SET ${fields} WHERE id = ?`, values);
  },

  // Mark homework as completed
  markCompleted: async (id, completed = 1) => {
    return await runQuery('UPDATE homework SET completed = ? WHERE id = ?', [completed, id]);
  },

  // Delete homework
  delete: async (id) => {
    return await runQuery('DELETE FROM homework WHERE id = ?', [id]);
  },

  // Find incomplete homework by student and subject
  findIncompleteBySubject: async (studentId, subject) => {
    return await getAll(
      'SELECT * FROM homework WHERE student_id = ? AND subject LIKE ? AND completed = 0 ORDER BY deadline',
      [studentId, `%${subject}%`]
    );
  }
};

export default db;
