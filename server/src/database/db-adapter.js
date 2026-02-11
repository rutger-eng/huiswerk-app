// Database adapter that automatically chooses between SQLite (development) and PostgreSQL (production)

const USE_POSTGRES = !!process.env.DATABASE_URL;

let userDb, studentDb, homeworkDb, schoolDb, teacherDb, scheduleDb, studentTeacherDb, dbInstance;

if (USE_POSTGRES) {
  console.log('📊 Using PostgreSQL database');
  const postgres = await import('./db-postgres.js');
  userDb = postgres.userDb;
  studentDb = postgres.studentDb;
  homeworkDb = postgres.homeworkDb;
  schoolDb = postgres.schoolDb;
  teacherDb = postgres.teacherDb;
  scheduleDb = postgres.scheduleDb;
  studentTeacherDb = postgres.studentTeacherDb;
  dbInstance = postgres.default;
} else {
  console.log('📊 Using SQLite database');
  const sqlite = await import('./db.js');
  userDb = sqlite.userDb;
  studentDb = sqlite.studentDb;
  homeworkDb = sqlite.homeworkDb;
  schoolDb = sqlite.schoolDb;
  teacherDb = sqlite.teacherDb;
  scheduleDb = sqlite.scheduleDb;
  studentTeacherDb = sqlite.studentTeacherDb;
  dbInstance = sqlite.default;
}

export { userDb, studentDb, homeworkDb, schoolDb, teacherDb, scheduleDb, studentTeacherDb };
export default dbInstance;
