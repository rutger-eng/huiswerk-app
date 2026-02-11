import express from 'express';
import { scheduleDb, studentDb } from '../database/db-adapter.js';
import { authenticateToken, requireParent } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if parent owns student
const checkStudentOwnership = async (parentId, studentId) => {
  const student = await studentDb.findById(studentId);
  if (!student || student.parent_id !== parentId) {
    return false;
  }
  return true;
};

// Get full schedule for a student
router.get('/student/:studentId', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const schedule = await scheduleDb.findByStudentId(studentId);
    res.json(schedule);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to get schedule' });
  }
});

// Get today's schedule for a student
router.get('/student/:studentId/today', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const schedule = await scheduleDb.getTodaySchedule(studentId);
    res.json(schedule);
  } catch (error) {
    console.error('Get today schedule error:', error);
    res.status(500).json({ error: 'Failed to get today\'s schedule' });
  }
});

// Get schedule for specific day (0-6)
router.get('/student/:studentId/day/:dayOfWeek', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const dayOfWeek = parseInt(req.params.dayOfWeek);

    // Validate day of week
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'Invalid day of week (must be 0-6)' });
    }

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const schedule = await scheduleDb.findByStudentIdAndDay(studentId, dayOfWeek);
    res.json(schedule);
  } catch (error) {
    console.error('Get day schedule error:', error);
    res.status(500).json({ error: 'Failed to get schedule for day' });
  }
});

// Get single schedule entry by id
router.get('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const scheduleEntry = await scheduleDb.findById(scheduleId);

    if (!scheduleEntry) {
      return res.status(404).json({ error: 'Schedule entry not found' });
    }

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, scheduleEntry.student_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(scheduleEntry);
  } catch (error) {
    console.error('Get schedule entry error:', error);
    res.status(500).json({ error: 'Failed to get schedule entry' });
  }
});

// Create new schedule entry (parent only)
router.post('/', authenticateToken, requireParent, async (req, res) => {
  try {
    const { student_id, day_of_week, time_start, time_end, subject, teacher_id, location } = req.body;

    // Validate required fields
    if (!student_id || day_of_week === undefined || !time_start || !time_end || !subject) {
      return res.status(400).json({
        error: 'Missing required fields: student_id, day_of_week, time_start, time_end, subject'
      });
    }

    // Validate day of week
    if (day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({ error: 'Invalid day of week (must be 0-6)' });
    }

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, student_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scheduleId = await scheduleDb.create(
      student_id,
      day_of_week,
      time_start.trim(),
      time_end.trim(),
      subject.trim(),
      teacher_id || null,
      location?.trim() || null
    );

    const scheduleEntry = await scheduleDb.findById(scheduleId);

    res.status(201).json({
      message: 'Schedule entry created successfully',
      schedule: scheduleEntry
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule entry' });
  }
});

// Update schedule entry (parent only)
router.put('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const { day_of_week, time_start, time_end, subject, teacher_id, location } = req.body;

    const scheduleEntry = await scheduleDb.findById(scheduleId);
    if (!scheduleEntry) {
      return res.status(404).json({ error: 'Schedule entry not found' });
    }

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, scheduleEntry.student_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (day_of_week !== undefined) {
      if (day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({ error: 'Invalid day of week (must be 0-6)' });
      }
      updates.day_of_week = day_of_week;
    }
    if (time_start !== undefined && time_start.trim() !== '') updates.time_start = time_start.trim();
    if (time_end !== undefined && time_end.trim() !== '') updates.time_end = time_end.trim();
    if (subject !== undefined && subject.trim() !== '') updates.subject = subject.trim();
    if (teacher_id !== undefined) updates.teacher_id = teacher_id || null;
    if (location !== undefined) updates.location = location?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    await scheduleDb.update(scheduleId, updates);

    const updatedEntry = await scheduleDb.findById(scheduleId);

    res.json({
      message: 'Schedule entry updated successfully',
      schedule: updatedEntry
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule entry' });
  }
});

// Delete schedule entry (parent only)
router.delete('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    const scheduleEntry = await scheduleDb.findById(scheduleId);
    if (!scheduleEntry) {
      return res.status(404).json({ error: 'Schedule entry not found' });
    }

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, scheduleEntry.student_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await scheduleDb.delete(scheduleId);

    res.json({ message: 'Schedule entry deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule entry' });
  }
});

// Delete all schedule entries for a student (parent only)
router.delete('/student/:studentId/all', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await scheduleDb.deleteByStudentId(studentId);

    res.json({ message: 'All schedule entries deleted successfully' });
  } catch (error) {
    console.error('Delete all schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule entries' });
  }
});

export default router;
