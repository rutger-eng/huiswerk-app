import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection and initialize database
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'parent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        telegram_chat_id TEXT,
        telegram_linked INTEGER DEFAULT 0,
        telegram_link_code TEXT,
        telegram_link_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS homework (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        description TEXT,
        deadline DATE NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');
    client.release();
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Initialize on import
await initializeDatabase();

// User operations
export const userDb = {
  create: async (email, passwordHash, name, role = 'parent') => {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, passwordHash, name, role]
    );
    return result.rows[0].id;
  },

  findByEmail: async (email) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  update: async (id, updates) => {
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE users SET ${fields} WHERE id = $${values.length}`, values);
  }
};

// Student operations
export const studentDb = {
  create: async (name, parentId, userId = null) => {
    const result = await pool.query(
      'INSERT INTO students (name, parent_id, user_id) VALUES ($1, $2, $3) RETURNING id',
      [name, parentId, userId]
    );
    return result.rows[0].id;
  },

  findByParentId: async (parentId) => {
    const result = await pool.query(
      'SELECT * FROM students WHERE parent_id = $1 ORDER BY name',
      [parentId]
    );
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    return result.rows[0];
  },

  findByTelegramChatId: async (chatId) => {
    const result = await pool.query(
      'SELECT * FROM students WHERE telegram_chat_id = $1',
      [chatId]
    );
    return result.rows[0];
  },

  findByLinkCode: async (linkCode) => {
    const result = await pool.query(
      'SELECT * FROM students WHERE telegram_link_code = $1 AND telegram_link_expires > NOW()',
      [linkCode]
    );
    return result.rows[0];
  },

  update: async (id, updates) => {
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE students SET ${fields} WHERE id = $${values.length}`, values);
  },

  delete: async (id) => {
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
  },

  setLinkCode: async (id, linkCode, expiresAt) => {
    await pool.query(
      'UPDATE students SET telegram_link_code = $1, telegram_link_expires = $2 WHERE id = $3',
      [linkCode, expiresAt, id]
    );
  },

  linkTelegram: async (id, chatId) => {
    await pool.query(
      'UPDATE students SET telegram_chat_id = $1, telegram_linked = 1, telegram_link_code = NULL, telegram_link_expires = NULL WHERE id = $2',
      [chatId, id]
    );
  },

  getAllWithTelegram: async () => {
    const result = await pool.query(
      'SELECT * FROM students WHERE telegram_linked = 1 AND telegram_chat_id IS NOT NULL'
    );
    return result.rows;
  }
};

// Homework operations
export const homeworkDb = {
  create: async (studentId, subject, description, deadline) => {
    const result = await pool.query(
      'INSERT INTO homework (student_id, subject, description, deadline) VALUES ($1, $2, $3, $4) RETURNING id',
      [studentId, subject, description, deadline]
    );
    return result.rows[0].id;
  },

  createBatch: async (homeworkItems) => {
    const ids = [];
    for (const item of homeworkItems) {
      const result = await pool.query(
        'INSERT INTO homework (student_id, subject, description, deadline) VALUES ($1, $2, $3, $4) RETURNING id',
        [item.studentId, item.subject, item.description, item.deadline]
      );
      ids.push(result.rows[0].id);
    }
    return ids;
  },

  findByStudentId: async (studentId) => {
    const result = await pool.query(
      'SELECT * FROM homework WHERE student_id = $1 ORDER BY deadline ASC, subject',
      [studentId]
    );
    return result.rows;
  },

  findByStudentIdAndDate: async (studentId, date) => {
    const result = await pool.query(
      'SELECT * FROM homework WHERE student_id = $1 AND DATE(deadline) = DATE($2) ORDER BY subject',
      [studentId, date]
    );
    return result.rows;
  },

  findTodayByStudentId: async (studentId) => {
    const result = await pool.query(
      'SELECT * FROM homework WHERE student_id = $1 AND DATE(deadline) = CURRENT_DATE ORDER BY subject',
      [studentId]
    );
    return result.rows;
  },

  findWeekByStudentId: async (studentId) => {
    const result = await pool.query(
      `SELECT * FROM homework
       WHERE student_id = $1
       AND DATE(deadline) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       ORDER BY deadline ASC, subject`,
      [studentId]
    );
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM homework WHERE id = $1', [id]);
    return result.rows[0];
  },

  update: async (id, updates) => {
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE homework SET ${fields} WHERE id = $${values.length}`, values);
  },

  markCompleted: async (id, completed = 1) => {
    await pool.query('UPDATE homework SET completed = $1 WHERE id = $2', [completed, id]);
  },

  delete: async (id) => {
    await pool.query('DELETE FROM homework WHERE id = $1', [id]);
  },

  findIncompleteBySubject: async (studentId, subject) => {
    const result = await pool.query(
      'SELECT * FROM homework WHERE student_id = $1 AND subject ILIKE $2 AND completed = 0 ORDER BY deadline',
      [studentId, `%${subject}%`]
    );
    return result.rows;
  }
};

export default pool;
