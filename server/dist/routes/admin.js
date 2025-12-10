import express from 'express';
import crypto from 'crypto';
import Admin from '../models/Admin.js.js';
import Contact from '../models/Contact.js.js';
import User from '../models/User.js.js';
const router = express.Router();
// ===== UTILITY FUNCTIONS =====
/**
 * Hash password with PBKDF2
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}
/**
 * Verify password against stored hash
 */
function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const hashVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
}
/**
 * Generate admin userId from email
 */
function generateAdminUserId(email) {
    const normalized = email.toLowerCase();
    return Buffer.from(normalized).toString('base64').replace(/=/g, '').substring(0, 20);
}
// ===== ADMIN SIGNIN =====
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
            return;
        }
        const normalizedEmail = email.toLowerCase();
        const admin = await Admin.findOne({ email: normalizedEmail });
        if (!admin) {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
            return;
        }
        // Check if account is active
        if (admin.accountStatus !== 'active') {
            res.status(403).json({
                success: false,
                message: `Account is ${admin.accountStatus}. Contact support.`
            });
            return;
        }
        // Verify password
        if (!verifyPassword(password, admin.passwordHash)) {
            res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
            return;
        }
        // Log signin activity
        if (!admin.loginHistory)
            admin.loginHistory = [];
        admin.loginHistory.push({
            date: new Date(),
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            device: req.body.deviceType || 'web',
            browser: req.body.browser || 'unknown',
            status: 'success'
        });
        admin.lastLogin = new Date();
        admin.loginCount = (admin.loginCount || 0) + 1;
        await admin.save();
        console.log(`✅ Admin signin: ${email} (ID: ${admin.adminId})`);
        const adminData = {
            id: generateAdminUserId(email),
            adminId: admin.adminId,
            email: admin.email,
            name: admin.name,
            role: admin.role || 'admin',
            permissions: admin.permissions,
            accountStatus: admin.accountStatus,
            timestamp: new Date().toISOString()
        };
        res.json({
            success: true,
            message: 'Admin signin successful',
            admin: adminData
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Admin signin error:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Signin failed',
            error: errorMessage
        });
    }
});
// ===== ADMIN SIGNUP =====
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name, role = 'admin' } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({
                success: false,
                message: 'Email, password, and name are required'
            });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
            return;
        }
        const normalizedEmail = email.toLowerCase();
        // Check if email already exists
        const existingAdmin = await Admin.findOne({ email: normalizedEmail });
        if (existingAdmin) {
            res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
            return;
        }
        // Create new admin
        const adminId = generateAdminUserId(normalizedEmail);
        const newAdmin = new Admin({
            adminId,
            email: normalizedEmail,
            name,
            passwordHash: hashPassword(password),
            role,
            permissions: role === 'superadmin' ? ['manage_users', 'manage_workshops', 'manage_orders', 'manage_contacts', 'manage_admins', 'view_analytics', 'view_reports', 'manage_settings'] : ['manage_workshops', 'manage_contacts'],
            accountStatus: 'active',
            loginHistory: [{
                    date: new Date(),
                    ipAddress: req.ip || 'unknown',
                    userAgent: req.get('user-agent') || 'unknown',
                    device: req.body.deviceType || 'web',
                    browser: req.body.browser || 'unknown',
                    status: 'success'
                }]
        });
        await newAdmin.save();
        console.log(`✅ New admin registered: ${email} (ID: ${adminId})`);
        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            admin: {
                id: adminId,
                adminId: newAdmin.adminId,
                email: newAdmin.email,
                name: newAdmin.name,
                role: newAdmin.role
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Admin signup error:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Signup failed',
            error: errorMessage
        });
    }
});
// ===== GET ADMIN PROFILE =====
router.get('/profile/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
            return;
        }
        const adminData = {
            id: adminId,
            adminId: admin.adminId,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            permissions: admin.permissions,
            accountStatus: admin.accountStatus,
            lastLogin: admin.lastLogin,
            loginCount: admin.loginCount,
            createdAt: admin.createdAt
        };
        res.json({
            success: true,
            data: adminData
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching admin profile:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: errorMessage
        });
    }
});
// ===== UPDATE ADMIN PROFILE =====
router.put('/profile/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        const updates = req.body;
        // Remove sensitive fields
        delete updates.adminId;
        delete updates.email;
        delete updates.passwordHash;
        delete updates.accountStatus;
        delete updates.loginCount;
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
            return;
        }
        // Update allowed fields
        if (updates.name)
            admin.name = updates.name;
        if (updates.metadata)
            admin.metadata = { ...admin.metadata, ...updates.metadata };
        await admin.save();
        console.log(`✅ Admin profile updated: ${adminId}`);
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: adminId,
                email: admin.email,
                name: admin.name,
                role: admin.role
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating profile:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: errorMessage
        });
    }
});
// ===== CHANGE PASSWORD =====
router.post('/change-password/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        const { oldPassword, newPassword, confirmPassword } = req.body;
        if (!oldPassword || !newPassword || !confirmPassword) {
            res.status(400).json({
                success: false,
                message: 'Old password and new password are required'
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
            return;
        }
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
            return;
        }
        // Verify old password
        if (!verifyPassword(oldPassword, admin.passwordHash)) {
            res.status(401).json({
                success: false,
                message: 'Old password is incorrect'
            });
            return;
        }
        admin.passwordHash = hashPassword(newPassword);
        if (!admin.metadata)
            admin.metadata = {};
        admin.metadata.lastPasswordChange = new Date();
        await admin.save();
        console.log(`✅ Admin password changed: ${adminId}`);
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error changing password:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: errorMessage
        });
    }
});
// ===== CREATE NEW ADMIN =====
router.post('/create', async (req, res) => {
    try {
        const { email, password, name, role = 'admin' } = req.body;
        if (!email || !password || !name) {
            res.status(400).json({
                success: false,
                message: 'Email, password, and name are required'
            });
            return;
        }
        const normalizedEmail = email.toLowerCase();
        // Check if email already exists
        const existingAdmin = await Admin.findOne({ email: normalizedEmail });
        if (existingAdmin) {
            res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
            return;
        }
        // Create new admin
        const adminId = generateAdminUserId(normalizedEmail);
        const newAdmin = new Admin({
            adminId,
            email: normalizedEmail,
            name,
            passwordHash: hashPassword(password),
            role,
            permissions: role === 'superadmin' ? ['manage_users', 'manage_workshops', 'manage_orders', 'manage_contacts', 'manage_admins', 'view_analytics', 'view_reports', 'manage_settings'] : ['manage_workshops', 'manage_contacts'],
            accountStatus: 'active'
        });
        await newAdmin.save();
        console.log(`✅ New admin created: ${email} (ID: ${adminId})`);
        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            data: {
                id: adminId,
                email: newAdmin.email,
                name: newAdmin.name,
                role: newAdmin.role
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating admin:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error creating admin',
            error: errorMessage
        });
    }
});
// ===== GET ALL ADMINS =====
router.get('/all', async (req, res) => {
    try {
        const admins = await Admin.find({}, '-passwordHash').lean();
        res.json({
            success: true,
            count: admins.length,
            data: admins
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching admins:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error fetching admins',
            error: errorMessage
        });
    }
});
// ===== DEACTIVATE ADMIN =====
router.post('/deactivate/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
            return;
        }
        admin.accountStatus = 'inactive';
        await admin.save();
        console.log(`✅ Admin deactivated: ${adminId}`);
        res.json({
            success: true,
            message: 'Admin deactivated successfully'
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deactivating admin:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error deactivating admin',
            error: errorMessage
        });
    }
});
// ===== CONTACT MESSAGES =====
// Get all contact messages
router.get('/contact/messages', async (req, res) => {
    try {
        const { status, priority, limit = 100, skip = 0 } = req.query;
        let query = {};
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        const messages = await Contact.find(query)
            .sort({ submittedAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();
        const total = await Contact.countDocuments(query);
        res.json({
            success: true,
            count: messages.length,
            total,
            messages
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching contact messages:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages',
            error: errorMessage
        });
    }
});
// Get single contact message
router.get('/contact/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Contact.findOne({
            $or: [{ contactId: id }, { _id: id }]
        });
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Contact message not found'
            });
            return;
        }
        res.json({
            success: true,
            data: message
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching contact message:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error fetching message',
            error: errorMessage
        });
    }
});
// Update contact message status/reply
router.put('/contact/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, replyMessage, assignedTo } = req.body;
        const message = await Contact.findOne({
            $or: [{ contactId: id }, { _id: id }]
        });
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Contact message not found'
            });
            return;
        }
        if (status)
            message.status = status;
        if (priority)
            message.priority = priority;
        if (replyMessage) {
            message.response = replyMessage;
            message.respondedAt = new Date();
            message.status = 'replied';
        }
        if (assignedTo)
            message.assignedTo = assignedTo;
        await message.save();
        console.log(`✅ Contact message updated: ${id}`);
        res.json({
            success: true,
            message: 'Message updated successfully',
            data: message
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating contact message:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error updating message',
            error: errorMessage
        });
    }
});
// Delete contact message
router.delete('/contact/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Contact.findOneAndDelete({
            $or: [{ contactId: id }, { _id: id }]
        });
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Contact message not found'
            });
            return;
        }
        console.log(`✅ Contact message deleted: ${id}`);
        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting contact message:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error deleting message',
            error: errorMessage
        });
    }
});
// ===== ADMIN SIGNOUT =====
router.post('/signout', async (req, res) => {
    try {
        const { adminId } = req.body;
        if (!adminId) {
            res.status(400).json({
                success: false,
                message: 'adminId is required'
            });
            return;
        }
        const admin = await Admin.findOne({ adminId });
        if (!admin) {
            res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
            return;
        }
        console.log(`✅ Admin signed out: ${adminId}`);
        res.json({
            success: true,
            message: 'Admin signed out successfully'
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Admin signout error:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Signout failed',
            error: errorMessage
        });
    }
});
// ===== ADMIN DATA ENDPOINTS =====
/**
 * GET /api/admin/signup-data
 * Fetch all signup users from MongoDB for admin dashboard
 */
router.get('/signup-data', async (req, res) => {
    try {
        const { limit = 1000, skip = 0, status = 'active' } = req.query;
        // Fetch users from MongoDB, excluding password hash
        const query = {};
        if (status) {
            query.accountStatus = status;
        }
        const users = await User.find(query)
            .select('-passwordHash')
            .sort({ signupDate: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();
        const total = await User.countDocuments(query);
        // Format data for admin display
        const formattedUsers = users.map((user) => ({
            id: user.userId,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            countryCode: user.countryCode || '+91',
            country: user.country || '',
            state: user.state || '',
            gender: user.gender || '',
            age: user.age || '',
            profession: user.profession || '',
            registrationDate: user.signupDate?.toISOString() || new Date().toISOString(),
            status: user.accountStatus || 'active',
            source: 'signup',
            lastLogin: user.lastLogin?.toISOString() || null,
            loginCount: user.loginCount || 0,
            emailVerified: user.emailVerified || false,
            phoneVerified: user.phoneVerified || false
        }));
        console.log(`✅ Fetched ${formattedUsers.length} signup users for admin`);
        res.json({
            success: true,
            data: formattedUsers,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                remaining: Math.max(0, total - (parseInt(skip) + parseInt(limit)))
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching signup data:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error fetching signup data',
            error: errorMessage
        });
    }
});
/**
 * GET /api/admin/signin-data
 * Fetch signin events - currently using user login history
 * Note: For detailed signin tracking, implement separate SignInData model
 */
router.get('/signin-data', async (req, res) => {
    try {
        const { limit = 1000, skip = 0 } = req.query;
        // Fetch users with login information
        const users = await User.find({ loginCount: { $gt: 0 } })
            .select('email name userId lastLogin loginCount')
            .sort({ lastLogin: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();
        const total = await User.countDocuments({ loginCount: { $gt: 0 } });
        // Format data for admin display
        const formattedSignins = users.map((user) => ({
            id: user.userId || user._id,
            email: user.email,
            name: user.name,
            lastLogin: user.lastLogin?.toISOString() || null,
            loginCount: user.loginCount || 0,
            status: 'success', // Since these are successful logins (loginCount > 0)
            date: user.lastLogin?.toISOString() || new Date().toISOString()
        }));
        console.log(`✅ Fetched ${formattedSignins.length} signin records for admin`);
        res.json({
            success: true,
            data: formattedSignins,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                remaining: Math.max(0, total - (parseInt(skip) + parseInt(limit)))
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching signin data:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error fetching signin data',
            error: errorMessage
        });
    }
});
/**
 * GET /api/admin/dashboard-stats
 * Fetch dashboard statistics for admin overview
 */
router.get('/dashboard-stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ accountStatus: 'active' });
        const totalContacts = await Contact.countDocuments();
        const unreadContacts = await Contact.countDocuments({ status: 'unread' });
        // Get recent activity
        const recentSignups = await User.countDocuments({
            signupDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });
        const recentMessages = await Contact.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });
        console.log(`✅ Fetched dashboard stats for admin`);
        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    recentSignups: recentSignups
                },
                contacts: {
                    total: totalContacts,
                    unread: unreadContacts,
                    recentMessages: recentMessages
                },
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching dashboard stats:', errorMessage);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats',
            error: errorMessage
        });
    }
});
export default router;
//# sourceMappingURL=admin.js.map