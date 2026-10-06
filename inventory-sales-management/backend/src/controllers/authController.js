import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export async function login(req, res) {
  const identifier = String(req.body.identifier || '').trim().toLowerCase();
  const { password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Username or email and password are required.' });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] }
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}

export async function register(req, res) {
  const name = String(req.body.name || '').trim();
  const username = String(req.body.username || '').trim().toLowerCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !username || !email || password.length < 8) {
    return res.status(400).json({ message: 'Name, username, email, and a password of at least 8 characters are required.' });
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ message: 'Username must be 3-30 characters using letters, numbers, dots, underscores, or hyphens.' });

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, username, email, passwordHash, role: 'USER' }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'That username or email is already in use.' });
    throw error;
  }
}
