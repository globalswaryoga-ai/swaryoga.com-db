import express from 'express';
import User from '../models/User.js';
import SignupData from '../models/SignupData';
import SigninData from '../models/SigninData';
import crypto from 'crypto';
const router = express.Router();
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const hashVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
}
function generateUserId(email) {
    const normalized = email.toLowerCase();
    return Buffer.from(normalized).toString('base64').replace(/=/g, '').substring(0, 20);
}
router.post('/register', async (req, res) => {
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
            name,
            phone,
            countryCode: countryCode || '+91',
            country,
            state,
            gender,
            age,
            profession,
            passwordHash: hashPassword(password),
            accountStatus: 'active'
        });
        await newUser.save();
        // Also save signup data for analytics
        try {
            const signupRecord = new SignupData({
                name,
                email: normalizedEmail,
                phone,
                countryCode: countryCode || '+91',
                country,
                state,
                gender,
                age,
                profession,
                registrationDate: new Date(),
                status: 'active',
                source: 'signup'
            });
            await signupRecord.save();
            console.log(`✅ Signup data saved for: ${email}`);
        }
        catch (signupError) {
            console.log(`⚠️  SignupData save failed for ${email}:`, signupError instanceof Error ? signupError.message : 'Unknown error');
        }
        console.log(`✅ New user registered: ${email} (ID: ${userId})`);
        res.status(201).json({ success: true, message: 'User registered successfully', userId });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Registration error:', errorMessage);
        res.status(500).json({ success: false, message: 'Registration failed', error: errorMessage });
    }
});
router.post('/login', async (req, res) => {
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
        console.log(`✅ User login: ${email}`);
        // Save signin data for analytics
        try {
            const signinRecord = new SigninData({
                email: normalizedEmail,
                timestamp: new Date(),
                status: 'success'
            });
            await signinRecord.save();
            console.log(`✅ Signin data saved for: ${email}`);
        }
        catch (signinError) {
            console.log(`⚠️  SigninData save failed for ${email}:`, signinError instanceof Error ? signinError.message : 'Unknown error');
        }
        res.json({ success: true, message: 'Login successful', userId: user.userId });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Login error:', errorMessage);
        res.status(500).json({ success: false, message: 'Login failed', error: errorMessage });
    }
});
router.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId }).select('-passwordHash').lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching profile:', errorMessage);
        res.status(500).json({ success: false, message: 'Error fetching profile', error: errorMessage });
    }
});
router.put('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        delete updates.passwordHash;
        delete updates.email;
        delete updates.userId;
        const user = await User.findOneAndUpdate({ userId }, updates, { new: true, runValidators: true }).select('-passwordHash');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        console.log(`✅ User profile updated: ${userId}`);
        res.json({ success: true, data: user, message: 'Profile updated successfully' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating profile:', errorMessage);
        res.status(500).json({ success: false, message: 'Error updating profile', error: errorMessage });
    }
});
router.post('/change-password/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { oldPassword, newPassword, confirmPassword } = req.body;
        if (!oldPassword || !newPassword || !confirmPassword) {
            res.status(400).json({ success: false, message: 'All password fields are required' });
            return;
        }
        if (newPassword !== confirmPassword) {
            res.status(400).json({ success: false, message: 'Passwords do not match' });
            return;
        }
        const user = await User.findOne({ userId });
        if (!user || !verifyPassword(oldPassword, user.passwordHash)) {
            res.status(401).json({ success: false, message: 'Old password is incorrect' });
            return;
        }
        user.passwordHash = hashPassword(newPassword);
        await user.save();
        console.log(`✅ Password changed for user: ${userId}`);
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error changing password:', errorMessage);
        res.status(500).json({ success: false, message: 'Error changing password', error: errorMessage });
    }
});
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1'));
        const limit = Math.min(100, parseInt(req.query.limit || '10'));
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User.find().select('-passwordHash').skip(skip).limit(limit).lean().sort({ createdAt: -1 }),
            User.countDocuments()
        ]);
        res.json({ success: true, data: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching users:', errorMessage);
        res.status(500).json({ success: false, message: 'Error fetching users', error: errorMessage });
    }
});
router.delete('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOneAndDelete({ userId });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        console.log(`✅ User deleted: ${userId}`);
        res.json({ success: true, message: 'User deleted successfully' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting user:', errorMessage);
        res.status(500).json({ success: false, message: 'Error deleting user', error: errorMessage });
    }
});
export default router;
//# sourceMappingURL=users.js.map