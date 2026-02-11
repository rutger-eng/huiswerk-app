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

    // Add Telegram fields to users table if they don't exist (for parent Telegram linking)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='telegram_chat_id') THEN
          ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;
          ALTER TABLE users ADD COLUMN telegram_linked INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN telegram_link_code TEXT;
          ALTER TABLE users ADD COLUMN telegram_link_expires TIMESTAMP;
        END IF;
      END $$;
    `);

    // Add new parent profile fields to users table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
          ALTER TABLE users ADD COLUMN phone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='address') THEN
          ALTER TABLE users ADD COLUMN address TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='postal_code') THEN
          ALTER TABLE users ADD COLUMN postal_code TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='city') THEN
          ALTER TABLE users ADD COLUMN city TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='birth_date') THEN
          ALTER TABLE users ADD COLUMN birth_date DATE;
        END IF;
      END $$;
    `);

    // Schools table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        postal_code TEXT,
        city TEXT,
        website TEXT,
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

    // Add new student profile fields
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='year') THEN
          ALTER TABLE students ADD COLUMN year INTEGER;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='level') THEN
          ALTER TABLE students ADD COLUMN level TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='birth_date') THEN
          ALTER TABLE students ADD COLUMN birth_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='school_id') THEN
          ALTER TABLE students ADD COLUMN school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Teachers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        subjects TEXT,
        email TEXT,
        phone TEXT,
        school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Schedule table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        time_start TEXT NOT NULL,
        time_end TEXT NOT NULL,
        subject TEXT NOT NULL,
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Student-Teachers junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_teachers (
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (student_id, teacher_id, subject)
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
  },

  // Parent Telegram operations
  findByTelegramChatId: async (chatId) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE telegram_chat_id = $1',
      [chatId]
    );
    return result.rows[0];
  },

  findByLinkCode: async (linkCode) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE telegram_link_code = $1 AND telegram_link_expires > NOW()',
      [linkCode]
    );
    return result.rows[0];
  },

  setLinkCode: async (id, linkCode, expiresAt) => {
    await pool.query(
      'UPDATE users SET telegram_link_code = $1, telegram_link_expires = $2 WHERE id = $3',
      [linkCode, expiresAt, id]
    );
  },

  linkTelegram: async (id, chatId) => {
    await pool.query(
      'UPDATE users SET telegram_chat_id = $1, telegram_linked = 1, telegram_link_code = NULL, telegram_link_expires = NULL WHERE id = $2',
      [chatId, id]
    );
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

// School operations
export const schoolDb = {
  create: async (name, address, postal_code, city, website) => {
    const result = await pool.query(
      'INSERT INTO schools (name, address, postal_code, city, website) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, address, postal_code, city, website]
    );
    return result.rows[0].id;
  },

  getAll: async () => {
    const result = await pool.query('SELECT * FROM schools ORDER BY name');
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM schools WHERE id = $1', [id]);
    return result.rows[0];
  },

  searchByName: async (searchTerm) => {
    const result = await pool.query(
      'SELECT * FROM schools WHERE name ILIKE $1 ORDER BY name',
      [`%${searchTerm}%`]
    );
    return result.rows;
  },

  update: async (id, updates) => {
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE schools SET ${fields} WHERE id = $${values.length}`, values);
  },

  delete: async (id) => {
    await pool.query('DELETE FROM schools WHERE id = $1', [id]);
  }
};

// Teacher operations
export const teacherDb = {
  create: async (name, subjects, email, phone, school_id) => {
    const subjectsJson = Array.isArray(subjects) ? JSON.stringify(subjects) : subjects;
    const result = await pool.query(
      'INSERT INTO teachers (name, subjects, email, phone, school_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, subjectsJson, email, phone, school_id]
    );
    return result.rows[0].id;
  },

  getAll: async () => {
    const result = await pool.query('SELECT * FROM teachers ORDER BY name');
    return result.rows.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM teachers WHERE id = $1', [id]);
    const teacher = result.rows[0];
    if (teacher && teacher.subjects) {
      teacher.subjects = JSON.parse(teacher.subjects);
    }
    return teacher;
  },

  findBySchoolId: async (schoolId) => {
    const result = await pool.query(
      'SELECT * FROM teachers WHERE school_id = $1 ORDER BY name',
      [schoolId]
    );
    return result.rows.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  findBySubject: async (subject) => {
    const result = await pool.query(
      'SELECT * FROM teachers WHERE subjects ILIKE $1 ORDER BY name',
      [`%${subject}%`]
    );
    return result.rows.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  findByStudentId: async (studentId) => {
    const result = await pool.query(
      `SELECT DISTINCT t.*, st.subject as teaching_subject
       FROM teachers t
       INNER JOIN student_teachers st ON t.id = st.teacher_id
       WHERE st.student_id = $1
       ORDER BY t.name`,
      [studentId]
    );
    return result.rows.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  update: async (id, updates) => {
    if (updates.subjects && Array.isArray(updates.subjects)) {
      updates.subjects = JSON.stringify(updates.subjects);
    }
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE teachers SET ${fields} WHERE id = $${values.length}`, values);
  },

  delete: async (id) => {
    await pool.query('DELETE FROM teachers WHERE id = $1', [id]);
  }
};

// Schedule operations
export const scheduleDb = {
  create: async (studentId, dayOfWeek, timeStart, timeEnd, subject, teacherId, location) => {
    const result = await pool.query(
      'INSERT INTO schedule (student_id, day_of_week, time_start, time_end, subject, teacher_id, location) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [studentId, dayOfWeek, timeStart, timeEnd, subject, teacherId, location]
    );
    return result.rows[0].id;
  },

  findByStudentId: async (studentId) => {
    const result = await pool.query(
      'SELECT * FROM schedule WHERE student_id = $1 ORDER BY day_of_week, time_start',
      [studentId]
    );
    return result.rows;
  },

  findByStudentIdAndDay: async (studentId, dayOfWeek) => {
    const result = await pool.query(
      'SELECT * FROM schedule WHERE student_id = $1 AND day_of_week = $2 ORDER BY time_start',
      [studentId, dayOfWeek]
    );
    return result.rows;
  },

  getTodaySchedule: async (studentId) => {
    const today = new Date().getDay();
    const result = await pool.query(
      'SELECT * FROM schedule WHERE student_id = $1 AND day_of_week = $2 ORDER BY time_start',
      [studentId, today]
    );
    return result.rows;
  },

  findById: async (id) => {
    const result = await pool.query('SELECT * FROM schedule WHERE id = $1', [id]);
    return result.rows[0];
  },

  update: async (id, updates) => {
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE schedule SET ${fields} WHERE id = $${values.length}`, values);
  },

  delete: async (id) => {
    await pool.query('DELETE FROM schedule WHERE id = $1', [id]);
  },

  deleteByStudentId: async (studentId) => {
    await pool.query('DELETE FROM schedule WHERE student_id = $1', [studentId]);
  }
};

// Student-Teacher junction operations
export const studentTeacherDb = {
  link: async (studentId, teacherId, subject) => {
    try {
      await pool.query(
        'INSERT INTO student_teachers (student_id, teacher_id, subject) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [studentId, teacherId, subject]
      );
    } catch (err) {
      // Ignore duplicate key errors
      if (!err.message.includes('duplicate key')) throw err;
    }
  },

  unlink: async (studentId, teacherId, subject) => {
    await pool.query(
      'DELETE FROM student_teachers WHERE student_id = $1 AND teacher_id = $2 AND subject = $3',
      [studentId, teacherId, subject]
    );
  },

  getTeachersByStudent: async (studentId) => {
    const result = await pool.query(
      `SELECT t.*, st.subject as teaching_subject
       FROM teachers t
       INNER JOIN student_teachers st ON t.id = st.teacher_id
       WHERE st.student_id = $1
       ORDER BY t.name`,
      [studentId]
    );
    return result.rows.map(t => ({
      ...t,
      subjects: t.subjects ? JSON.parse(t.subjects) : []
    }));
  },

  getStudentsByTeacher: async (teacherId) => {
    const result = await pool.query(
      `SELECT s.*, st.subject
       FROM students s
       INNER JOIN student_teachers st ON s.id = st.student_id
       WHERE st.teacher_id = $1
       ORDER BY s.name`,
      [teacherId]
    );
    return result.rows;
  }
};

export default pool;
