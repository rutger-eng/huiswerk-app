import express from 'express';
import { homeworkDb, studentDb } from '../database/db-adapter.js';
import { authenticateToken, requireParent } from '../middleware/auth.js';
import { parseHomeworkText } from '../services/homeworkParser.js';

const router = express.Router();

// Helper to check if parent owns student
const checkStudentOwnership = async (parentId, studentId) => {
  const student = await studentDb.findById(studentId);
  if (!student || student.parent_id !== parentId) {
    return false;
  }
  return true;
};

// Helper to check if parent owns homework (via student)
const checkHomeworkOwnership = async (parentId, homeworkId) => {
  const homework = await homeworkDb.findById(homeworkId);
  if (!homework) return false;

  const student = await studentDb.findById(homework.student_id);
  if (!student || student.parent_id !== parentId) {
    return false;
  }
  return true;
};

// Parse text for homework suggestions
router.post('/parse', authenticateToken, requireParent, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const parsed = parseHomeworkText(text);

    res.json({
      success: true,
      count: parsed.length,
      items: parsed
    });
  } catch (error) {
    console.error('Parse homework error:', error);
    res.status(500).json({ error: 'Failed to parse homework' });
  }
});

// Get all homework for a student
router.get('/student/:studentId', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const homework = await homeworkDb.findByStudentId(studentId);

    res.json(homework);
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({ error: 'Failed to get homework' });
  }
});

// Get homework for today for a student
router.get('/student/:studentId/today', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const homework = await homeworkDb.findTodayByStudentId(studentId);

    res.json(homework);
  } catch (error) {
    console.error('Get today homework error:', error);
    res.status(500).json({ error: 'Failed to get today homework' });
  }
});

// Get homework for this week for a student
router.get('/student/:studentId/week', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const homework = await homeworkDb.findWeekByStudentId(studentId);

    res.json(homework);
  } catch (error) {
    console.error('Get week homework error:', error);
    res.status(500).json({ error: 'Failed to get week homework' });
  }
});

// Create new homework for a student
router.post('/student/:studentId', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { subject, description, deadline, items } = req.body;

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Support batch creation
    if (items && Array.isArray(items)) {
      const homeworkItems = items.map(item => ({
        studentId,
        subject: item.subject,
        description: item.description,
        deadline: item.deadline
      }));

      const ids = await homeworkDb.createBatch(homeworkItems);

      const created = await Promise.all(
        ids.map(id => homeworkDb.findById(id))
      );

      return res.status(201).json({
        message: `${created.length} homework items created successfully`,
        homework: created
      });
    }

    // Single item creation
    if (!subject || !deadline) {
      return res.status(400).json({ error: 'Subject and deadline are required' });
    }

    const homeworkId = await homeworkDb.create(
      studentId,
      subject,
      description || '',
      deadline
    );

    const homework = await homeworkDb.findById(homeworkId);

    res.status(201).json({
      message: 'Homework created successfully',
      homework
    });
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).json({ error: 'Failed to create homework' });
  }
});

// Update homework
router.put('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const homeworkId = parseInt(req.params.id);
    const { subject, description, deadline, completed } = req.body;

    // Check ownership
    const hasAccess = await checkHomeworkOwnership(req.user.id, homeworkId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (subject !== undefined) updates.subject = subject;
    if (description !== undefined) updates.description = description;
    if (deadline !== undefined) updates.deadline = deadline;
    if (completed !== undefined) updates.completed = completed ? 1 : 0;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    await homeworkDb.update(homeworkId, updates);

    const homework = await homeworkDb.findById(homeworkId);

    res.json({
      message: 'Homework updated successfully',
      homework
    });
  } catch (error) {
    console.error('Update homework error:', error);
    res.status(500).json({ error: 'Failed to update homework' });
  }
});

// Delete homework
router.delete('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const homeworkId = parseInt(req.params.id);

    // Check ownership
    const hasAccess = await checkHomeworkOwnership(req.user.id, homeworkId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await homeworkDb.delete(homeworkId);

    res.json({ message: 'Homework deleted successfully' });
  } catch (error) {
    console.error('Delete homework error:', error);
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

export default router;
