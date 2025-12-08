import express, { Request, Response, Router } from 'express';
import User from '../models/User.js';
import crypto from 'crypto';
import type { IUser } from '../models/User.js';

const router: Router = express.Router();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const hashVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

function generateUserId(email: string): string {
  const normalized = email.toLowerCase();
  return Buffer.from(normalized).toString('base64').replace(/=/g, '').substring(0, 20);
}

// Register endpoint
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, confirmPassword, countryCode, country, state, gender, age, profession } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match' });
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    const userId = generateUserId(normalizedEmail);
    const newUser = new User({
      userId,
      email: normalizedEmail,
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      countryCode: countryCode || '+91',
      country: country ? country.trim() : null,
      state: state ? state.trim() : null,
      gender: gender ? gender.trim() : null,
      age: age ? parseInt(age) : null,
      profession: profession ? profession.trim() : null,
      passwordHash: hashPassword(password),
      accountStatus: 'active',
      emailVerified: false,
      phoneVerified: false,
      loginCount: 0,
      signupDate: new Date()
    });

    const savedUser = await newUser.save();
    console.log(`✅ New user registered: ${normalizedEmail} (ID: ${userId})`);
    console.log(`   Details: ${name}, Phone: ${phone}, Country: ${country}, State: ${state}, Gender: ${gender}, Age: ${age}, Profession: ${profession}`);

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', 
      id: userId,
      email: normalizedEmail,
      name: name,
      phone: phone || null,
      countryCode: countryCode || '+91',
      country: country || null,
      state: state || null,
      gender: gender || null,
      age: age ? parseInt(age) : null,
      profession: profession || null
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Registration error:', errorMessage);
    res.status(500).json({ success: false, message: 'Registration failed', error: errorMessage });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (user.accountStatus !== 'active') {
      res.status(403).json({ success: false, message: `Account is ${user.accountStatus}` });
      return;
    }

    // Update login info
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ User login: ${email}`);
    res.json({ 
      success: true, 
      message: 'Login successful', 
      id: user.userId,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Login error:', errorMessage);
    res.status(500).json({ success: false, message: 'Login failed', error: errorMessage });
  }
});

export default router;
