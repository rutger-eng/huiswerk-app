import express from 'express';
import { teacherDb, studentDb } from '../database/db-adapter.js';
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

// Get all teachers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const teachers = await teacherDb.getAll();
    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Failed to get teachers' });
  }
});

// Get single teacher by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const teacher = await teacherDb.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(teacher);
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({ error: 'Failed to get teacher' });
  }
});

// Get teachers for a specific student (requires ownership check)
router.get('/student/:studentId', authenticateToken, requireParent, async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    // Check ownership
    const hasAccess = await checkStudentOwnership(req.user.id, studentId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const teachers = await teacherDb.findByStudentId(studentId);
    res.json(teachers);
  } catch (error) {
    console.error('Get student teachers error:', error);
    res.status(500).json({ error: 'Failed to get student teachers' });
  }
});

// Get teachers for a specific school
router.get('/school/:schoolId', authenticateToken, async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId);
    const teachers = await teacherDb.findBySchoolId(schoolId);
    res.json(teachers);
  } catch (error) {
    console.error('Get school teachers error:', error);
    res.status(500).json({ error: 'Failed to get school teachers' });
  }
});

// Create new teacher (parent only)
router.post('/', authenticateToken, requireParent, async (req, res) => {
  try {
    const { name, subjects, email, phone, school_id } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Teacher name is required' });
    }

    // Validate subjects is array if provided
    let subjectsArray = [];
    if (subjects) {
      if (Array.isArray(subjects)) {
        subjectsArray = subjects.filter(s => s && s.trim() !== '').map(s => s.trim());
      } else if (typeof subjects === 'string') {
        subjectsArray = [subjects.trim()];
      }
    }

    const teacherId = await teacherDb.create(
      name.trim(),
      subjectsArray,
      email?.trim() || null,
      phone?.trim() || null,
      school_id || null
    );

    const teacher = await teacherDb.findById(teacherId);

    res.status(201).json({
      message: 'Teacher created successfully',
      teacher
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// Update teacher (parent only)
router.put('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);
    const { name, subjects, email, phone, school_id } = req.body;

    const teacher = await teacherDb.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const updates = {};
    if (name !== undefined && name.trim() !== '') updates.name = name.trim();
    if (email !== undefined) updates.email = email?.trim() || null;
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (school_id !== undefined) updates.school_id = school_id || null;

    if (subjects !== undefined) {
      if (Array.isArray(subjects)) {
        updates.subjects = subjects.filter(s => s && s.trim() !== '').map(s => s.trim());
      } else if (typeof subjects === 'string') {
        updates.subjects = [subjects.trim()];
      } else {
        updates.subjects = [];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    await teacherDb.update(teacherId, updates);

    const updatedTeacher = await teacherDb.findById(teacherId);

    res.json({
      message: 'Teacher updated successfully',
      teacher: updatedTeacher
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// Delete teacher (parent only)
router.delete('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id);

    const teacher = await teacherDb.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await teacherDb.delete(teacherId);

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

export default router;
