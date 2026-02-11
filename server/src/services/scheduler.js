import cron from 'node-cron';
import { studentDb } from '../database/db-adapter.js';
import { sendDailySummary } from './telegramBot.js';

let dailyNotificationJob = null;

// Start the scheduler
export function startScheduler() {
  // Default: 7:00 AM daily (0 7 * * *)
  const cronSchedule = process.env.NOTIFICATION_CRON || '0 7 * * *';

  console.log(`📅 Setting up daily notification scheduler: ${cronSchedule}`);

  // Schedule daily notifications
  dailyNotificationJob = cron.schedule(cronSchedule, async () => {
    console.log('⏰ Running daily homework notifications...');
    await sendDailyNotifications();
  });

  console.log('✅ Scheduler started successfully');
}

// Stop the scheduler
export function stopScheduler() {
  if (dailyNotificationJob) {
    dailyNotificationJob.stop();
    console.log('🛑 Scheduler stopped');
  }
}

// Send daily notifications to all students with linked Telegram
async function sendDailyNotifications() {
  try {
    // Get all students with linked Telegram accounts
    const students = await studentDb.getAllWithTelegram();

    console.log(`📨 Sending notifications to ${students.length} students...`);

    // Send summary to each student
    for (const student of students) {
      try {
        await sendDailySummary(student);
        console.log(`✅ Sent notification to ${student.name} (ID: ${student.id})`);
      } catch (error) {
        console.error(`❌ Failed to send notification to ${student.name}:`, error);
      }
    }

    console.log(`✅ Daily notifications completed (${students.length} students)`);
  } catch (error) {
    console.error('❌ Error in daily notification job:', error);
  }
}

// Manual trigger for testing
export async function triggerDailyNotifications() {
  console.log('🔔 Manually triggering daily notifications...');
  await sendDailyNotifications();
}

export default {
  startScheduler,
  stopScheduler,
  triggerDailyNotifications
};
