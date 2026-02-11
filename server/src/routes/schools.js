import express from 'express';
import { schoolDb } from '../database/db-adapter.js';
import { authenticateToken, requireParent } from '../middleware/auth.js';

const router = express.Router();

// Get all schools
router.get('/', authenticateToken, async (req, res) => {
  try {
    const schools = await schoolDb.getAll();
    res.json(schools);
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ error: 'Failed to get schools' });
  }
});

// Search schools by name
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const schools = await schoolDb.searchByName(q.trim());
    res.json(schools);
  } catch (error) {
    console.error('Search schools error:', error);
    res.status(500).json({ error: 'Failed to search schools' });
  }
});

// Get single school by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id);
    const school = await schoolDb.findById(schoolId);

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ error: 'Failed to get school' });
  }
});

// Create new school (parent only)
router.post('/', authenticateToken, requireParent, async (req, res) => {
  try {
    const { name, address, postal_code, city, website } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'School name is required' });
    }

    const schoolId = await schoolDb.create(
      name.trim(),
      address?.trim() || null,
      postal_code?.trim() || null,
      city?.trim() || null,
      website?.trim() || null
    );

    const school = await schoolDb.findById(schoolId);

    res.status(201).json({
      message: 'School created successfully',
      school
    });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// Update school (parent only)
router.put('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id);
    const { name, address, postal_code, city, website } = req.body;

    const school = await schoolDb.findById(schoolId);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const updates = {};
    if (name !== undefined && name.trim() !== '') updates.name = name.trim();
    if (address !== undefined) updates.address = address?.trim() || null;
    if (postal_code !== undefined) updates.postal_code = postal_code?.trim() || null;
    if (city !== undefined) updates.city = city?.trim() || null;
    if (website !== undefined) updates.website = website?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    await schoolDb.update(schoolId, updates);

    const updatedSchool = await schoolDb.findById(schoolId);

    res.json({
      message: 'School updated successfully',
      school: updatedSchool
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// Delete school (parent only)
router.delete('/:id', authenticateToken, requireParent, async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id);

    const school = await schoolDb.findById(schoolId);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    await schoolDb.delete(schoolId);

    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

export default router;
