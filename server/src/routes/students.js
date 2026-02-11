import express from 'express';
import crypto from 'crypto';
import { studentDb, homeworkDb } from '../database/db-adapter.js';
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

// Get all students for logged in parent
router.get('/', authenticateToken, requireParent, async (req, res) => {
  try {
    const students = await studentDb.findByParentId(req.user.id);

    // Add homework summary for each student
    const studentsWithSummary = await Promise.all(
      students.map(async (student) => {
        const todayHomework = await homeworkDb.findTodayByStudentId(student.id);
        const totalToday = todayHomework.length;
        const completedToday = todayHomework.filter(hw => hw.completed).length;

        return {
          ...student,
          todayHomework: {
            total: totalToday,
            completed: completedToday,
            remaining: totalToday - completedToday
          }
        };
      })
    );

    res.json(studentsWithSummary);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
});

// Get single student by id
router.get('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await studentDb.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Add homework summary
    const todayHomework = await homeworkDb.findTodayByStudentId(student.id);
    const allHomework = await homeworkDb.findByStudentId(student.id);

    res.json({
      ...student,
      todayHomework: {
        total: todayHomework.length,
        completed: todayHomework.filter(hw => hw.completed).length,
        remaining: todayHomework.filter(hw => !hw.completed).length
      },
      totalHomework: allHomework.length
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to get student' });
  }
});

// Create new student
router.post('/', authenticateToken, requireParent, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Student name is required' });
    }

    const studentId = await studentDb.create(name.trim(), req.user.id);

    const student = await studentDb.findById(studentId);

    res.status(201).json({
      message: 'Student created successfully',
      student
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// Update student
router.put('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { name } = req.body;

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (name && name.trim() !== '') {
      updates.name = name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    await studentDb.update(studentId, updates);

    const student = await studentDb.findById(studentId);

    res.json({
      message: 'Student updated successfully',
      student
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete student
router.delete('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await studentDb.delete(studentId);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Generate Telegram link code for student
router.get('/:id/telegram-link', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate unique 8-character code
    const linkCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Code expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await studentDb.setLinkCode(studentId, linkCode, expiresAt);

    res.json({
      linkCode,
      expiresAt,
      message: 'Link code generated. Student should send /start ' + linkCode + ' to the Telegram bot'
    });
  } catch (error) {
    console.error('Generate link code error:', error);
    res.status(500).json({ error: 'Failed to generate link code' });
  }
});

// Check Telegram link status
router.get('/:id/telegram-status', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await studentDb.findById(studentId);

    res.json({
      linked: student.telegram_linked === 1,
      chatId: student.telegram_chat_id,
      hasLinkCode: !!student.telegram_link_code,
      linkCode: student.telegram_link_code,
      linkExpires: student.telegram_link_expires
    });
  } catch (error) {
    console.error('Get telegram status error:', error);
    res.status(500).json({ error: 'Failed to get telegram status' });
  }
});

export default router;
