import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userDb } from '../database/db-adapter.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register new parent account
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, address, postal_code, city, birth_date } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await userDb.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userId = await userDb.create(email, passwordHash, name, 'parent');

    // Update with additional fields if provided
    const updates = {};
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (address !== undefined) updates.address = address?.trim() || null;
    if (postal_code !== undefined) updates.postal_code = postal_code?.trim() || null;
    if (city !== undefined) updates.city = city?.trim() || null;
    if (birth_date !== undefined) updates.birth_date = birth_date || null;

    if (Object.keys(updates).length > 0) {
      await userDb.update(userId, updates);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, email, role: 'parent' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        email,
        name,
        role: 'parent'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await userDb.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await userDb.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      address: user.address,
      postal_code: user.postal_code,
      city: user.city,
      birth_date: user.birth_date,
      telegram_linked: user.telegram_linked === 1,
      telegram_chat_id: user.telegram_chat_id
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Generate Telegram link code for parent
router.get('/telegram-link', authenticateToken, async (req, res) => {
  try {
    // Generate unique 8-character code
    const linkCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Code expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await userDb.setLinkCode(req.user.id, linkCode, expiresAt);

    res.json({
      linkCode,
      expiresAt,
      message: 'Link code generated. Send /link ' + linkCode + ' to the Telegram bot'
    });
  } catch (error) {
    console.error('Generate parent link code error:', error);
    res.status(500).json({ error: 'Failed to generate link code' });
  }
});

// Check Telegram link status for parent
router.get('/telegram-status', authenticateToken, async (req, res) => {
  try {
    const user = await userDb.findById(req.user.id);

    res.json({
      linked: user.telegram_linked === 1,
      chatId: user.telegram_chat_id,
      hasLinkCode: !!user.telegram_link_code,
      linkCode: user.telegram_link_code,
      linkExpires: user.telegram_link_expires
    });
  } catch (error) {
    console.error('Get telegram status error:', error);
    res.status(500).json({ error: 'Failed to get telegram status' });
  }
});

// Update parent profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address, postal_code, city, birth_date } = req.body;

    const updates = {};
    if (name !== undefined && name.trim() !== '') updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (address !== undefined) updates.address = address?.trim() || null;
    if (postal_code !== undefined) updates.postal_code = postal_code?.trim() || null;
    if (city !== undefined) updates.city = city?.trim() || null;
    if (birth_date !== undefined) updates.birth_date = birth_date || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    await userDb.update(req.user.id, updates);

    const user = await userDb.findById(req.user.id);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        postal_code: user.postal_code,
        city: user.city,
        birth_date: user.birth_date,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
