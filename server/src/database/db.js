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
        telegram_chat_id TEXT,
        telegram_linked INTEGER DEFAULT 0,
        telegram_link_code TEXT,
        telegram_link_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns to users table (with error handling for existing columns)
    db.run('ALTER TABLE users ADD COLUMN phone TEXT', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding phone column:', err);
    });
    db.run('ALTER TABLE users ADD COLUMN address TEXT', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding address column:', err);
    });
    db.run('ALTER TABLE users ADD COLUMN postal_code TEXT', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding postal_code column:', err);
    });
    db.run('ALTER TABLE users ADD COLUMN city TEXT', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding city column:', err);
    });
    db.run('ALTER TABLE users ADD COLUMN birth_date DATE', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding birth_date column:', err);
    });

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

    // Add new columns to students table
    db.run('ALTER TABLE students ADD COLUMN year INTEGER', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding year column:', err);
    });
    db.run('ALTER TABLE students ADD COLUMN level TEXT', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding level column:', err);
    });
    db.run('ALTER TABLE students ADD COLUMN birth_date DATE', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding birth_date column:', err);
    });
    db.run('ALTER TABLE students ADD COLUMN school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL', (err) => {
      if (err && !err.message.includes('duplicate column')) console.error('Error adding school_id column:', err);
    });

    // Schools table
    db.run(`
      CREATE TABLE IF NOT EXISTS schools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        postal_code TEXT,
        city TEXT,
        website TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Teachers table
    db.run(`
      CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subjects TEXT,
        email TEXT,
        phone TEXT,
        school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Schedule table
    db.run(`
      CREATE TABLE IF NOT EXISTS schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        time_start TEXT NOT NULL,
        time_end TEXT NOT NULL,
        subject TEXT NOT NULL,
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Student-Teachers junction table
    db.run(`
      CREATE TABLE IF NOT EXISTS student_teachers (
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (student_id, teacher_id, subject)
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
  },

  // Parent Telegram operations
  findByTelegramChatId: async (chatId) => {
    return await getOne('SELECT * FROM users WHERE telegram_chat_id = ?', [chatId]);
  },

  findByLinkCode: async (linkCode) => {
    return await getOne(
      'SELECT * FROM users WHERE telegram_link_code = ? AND telegram_link_expires > datetime("now")',
      [linkCode]
    );
  },

  setLinkCode: async (id, linkCode, expiresAt) => {
    return await runQuery(
      'UPDATE users SET telegram_link_code = ?, telegram_link_expires = ? WHERE id = ?',
      [linkCode, expiresAt, id]
    );
  },

  linkTelegram: async (id, chatId) => {
    return await runQuery(
      'UPDATE users SET telegram_chat_id = ?, telegram_linked = 1, telegram_link_code = NULL, telegram_link_expires = NULL WHERE id = ?',
      [chatId, id]
    );
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

// School operations
export const schoolDb = {
  create: async (name, address, postal_code, city, website) => {
    const result = await runQuery(
      'INSERT INTO schools (name, address, postal_code, city, website) VALUES (?, ?, ?, ?, ?)',
      [name, address, postal_code, city, website]
    );
    return result.lastID;
  },

  getAll: async () => {
    return await getAll('SELECT * FROM schools ORDER BY name');
  },

  findById: async (id) => {
    return await getOne('SELECT * FROM schools WHERE id = ?', [id]);
  },

  searchByName: async (searchTerm) => {
    return await getAll(
      'SELECT * FROM schools WHERE name LIKE ? ORDER BY name',
      [`%${searchTerm}%`]
    );
  },

  update: async (id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    return await runQuery(`UPDATE schools SET ${fields} WHERE id = ?`, values);
  },

  delete: async (id) => {
    return await runQuery('DELETE FROM schools WHERE id = ?', [id]);
  }
};

// Teacher operations
export const teacherDb = {
  create: async (name, subjects, email, phone, school_id) => {
    const subjectsJson = Array.isArray(subjects) ? JSON.stringify(subjects) : subjects;
    const result = await runQuery(
      'INSERT INTO teachers (name, subjects, email, phone, school_id) VALUES (?, ?, ?, ?, ?)',
      [name, subjectsJson, email, phone, school_id]
    );
    return result.lastID;
  },

  getAll: async () => {
    const teachers = await getAll('SELECT * FROM teachers ORDER BY name');
    return teachers.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  findById: async (id) => {
    const teacher = await getOne('SELECT * FROM teachers WHERE id = ?', [id]);
    if (teacher && teacher.subjects) {
      teacher.subjects = JSON.parse(teacher.subjects);
    }
    return teacher;
  },

  findBySchoolId: async (schoolId) => {
    const teachers = await getAll(
      'SELECT * FROM teachers WHERE school_id = ? ORDER BY name',
      [schoolId]
    );
    return teachers.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  findBySubject: async (subject) => {
    const teachers = await getAll(
      'SELECT * FROM teachers WHERE subjects LIKE ? ORDER BY name',
      [`%${subject}%`]
    );
    return teachers.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  findByStudentId: async (studentId) => {
    const teachers = await getAll(
      `SELECT DISTINCT t.*, st.subject as teaching_subject
       FROM teachers t
       INNER JOIN student_teachers st ON t.id = st.teacher_id
       WHERE st.student_id = ?
       ORDER BY t.name`,
      [studentId]
    );
    return teachers.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  update: async (id, updates) => {
    if (updates.subjects && Array.isArray(updates.subjects)) {
      updates.subjects = JSON.stringify(updates.subjects);
    }
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    return await runQuery(`UPDATE teachers SET ${fields} WHERE id = ?`, values);
  },

  delete: async (id) => {
    return await runQuery('DELETE FROM teachers WHERE id = ?', [id]);
  }
};

// Schedule operations
export const scheduleDb = {
  create: async (studentId, dayOfWeek, timeStart, timeEnd, subject, teacherId, location) => {
    const result = await runQuery(
      'INSERT INTO schedule (student_id, day_of_week, time_start, time_end, subject, teacher_id, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [studentId, dayOfWeek, timeStart, timeEnd, subject, teacherId, location]
    );
    return result.lastID;
  },

  findByStudentId: async (studentId) => {
    return await getAll(
      'SELECT * FROM schedule WHERE student_id = ? ORDER BY day_of_week, time_start',
      [studentId]
    );
  },

  findByStudentIdAndDay: async (studentId, dayOfWeek) => {
    return await getAll(
      'SELECT * FROM schedule WHERE student_id = ? AND day_of_week = ? ORDER BY time_start',
      [studentId, dayOfWeek]
    );
  },

  getTodaySchedule: async (studentId) => {
    const today = new Date().getDay();
    return await getAll(
      'SELECT * FROM schedule WHERE student_id = ? AND day_of_week = ? ORDER BY time_start',
      [studentId, today]
    );
  },

  findById: async (id) => {
    return await getOne('SELECT * FROM schedule WHERE id = ?', [id]);
  },

  update: async (id, updates) => {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];
    return await runQuery(`UPDATE schedule SET ${fields} WHERE id = ?`, values);
  },

  delete: async (id) => {
    return await runQuery('DELETE FROM schedule WHERE id = ?', [id]);
  },

  deleteByStudentId: async (studentId) => {
    return await runQuery('DELETE FROM schedule WHERE student_id = ?', [studentId]);
  }
};

// Student-Teacher junction operations
export const studentTeacherDb = {
  link: async (studentId, teacherId, subject) => {
    return await runQuery(
      'INSERT OR IGNORE INTO student_teachers (student_id, teacher_id, subject) VALUES (?, ?, ?)',
      [studentId, teacherId, subject]
    );
  },

  unlink: async (studentId, teacherId, subject) => {
    return await runQuery(
      'DELETE FROM student_teachers WHERE student_id = ? AND teacher_id = ? AND subject = ?',
      [studentId, teacherId, subject]
    );
  },

  getTeachersByStudent: async (studentId) => {
    const teachers = await getAll(
      `SELECT t.*, st.subject as teaching_subject
       FROM teachers t
       INNER JOIN student_teachers st ON t.id = st.teacher_id
       WHERE st.student_id = ?
       ORDER BY t.name`,
      [studentId]
    );
    return teachers.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  getStudentsByTeacher: async (teacherId) => {
    return await getAll(
      `SELECT s.*, st.subject
       FROM students s
       INNER JOIN student_teachers st ON s.id = st.student_id
       WHERE st.teacher_id = ?
       ORDER BY s.name`,
      [teacherId]
    );
  }
};

export default db;
