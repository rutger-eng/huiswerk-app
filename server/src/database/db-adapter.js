// Database adapter that automatically chooses between SQLite (development) and PostgreSQL (production)

const USE_POSTGRES = !!process.env.DATABASE_URL;

let userDb, studentDb, homeworkDb, dbInstance;

if (USE_POSTGRES) {
  console.log('📊 Using PostgreSQL database');
  const postgres = await import('./db-postgres.js');
  userDb = postgres.userDb;
  studentDb = postgres.studentDb;
  homeworkDb = postgres.homeworkDb;
  dbInstance = postgres.default;
} else {
  console.log('📊 Using SQLite database');
  const sqlite = await import('./db.js');
  userDb = sqlite.userDb;
  studentDb = sqlite.studentDb;
  homeworkDb = sqlite.homeworkDb;
  dbInstance = sqlite.default;
}

export { userDb, studentDb, homeworkDb };
export default dbInstance;
