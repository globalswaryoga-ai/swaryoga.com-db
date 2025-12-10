import express from 'express';
import Contact from '../models/Contact.js';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();
router.get('/messages', async (req, res) => {
    try {
        const { status, priority, sortBy = '-submittedAt', limit = 100, skip = 0 } = req.query;
        let query = {};
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        const messages = await Contact.find(query)
            .sort(sortBy)
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .lean();
        const total = await Contact.countDocuments(query);
        res.json({
            success: true,
            data: messages,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                remaining: total - (parseInt(skip) + parseInt(limit))
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching contact messages:', errorMessage);
        res.status(500).json({ success: false, message: 'Error fetching messages', error: errorMessage });
    }
});
router.get('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Contact.findOne({ $or: [{ contactId: id }, { _id: id }] });
        if (!message) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }
        res.json({ success: true, data: message });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching message:', errorMessage);
        res.status(500).json({ success: false, message: 'Error fetching message', error: errorMessage });
    }
});
router.post('/messages', async (req, res) => {
    try {
        const { name, email, countryCode, whatsapp, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            res.status(400).json({ success: false, message: 'Name, email, subject, and message are required' });
            return;
        }
        const normalizedEmail = email.toLowerCase();
        const contactId = uuidv4();
        const recentMessage = await Contact.findOne({
            email: normalizedEmail,
            subject: subject.trim(),
            submittedAt: { $gte: new Date(Date.now() - 60000) }
        });
        if (recentMessage) {
            res.status(400).json({ success: false, message: 'Similar message already submitted recently' });
            return;
        }
        const newContact = new Contact({
            contactId,
            name,
            email: normalizedEmail,
            countryCode,
            whatsapp,
            subject: subject.trim(),
            message: message.trim(),
            status: 'unread',
            priority: 'medium'
        });
        await newContact.save();
        console.log(`✅ Contact message saved: ${contactId}`);
        res.status(201).json({ success: true, data: newContact, message: 'Message sent successfully' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating contact message:', errorMessage);
        res.status(500).json({ success: false, message: 'Error sending message', error: errorMessage });
    }
});
router.put('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, response, assignedTo } = req.body;
        const message = await Contact.findOneAndUpdate({ $or: [{ contactId: id }, { _id: id }] }, {
            ...(status && { status }),
            ...(priority && { priority }),
            ...(response && { response, respondedAt: new Date(), status: 'replied' }),
            ...(assignedTo && { assignedTo })
        }, { new: true });
        if (!message) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }
        console.log(`✅ Contact message updated: ${id}`);
        res.json({ success: true, data: message, message: 'Message updated successfully' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating message:', errorMessage);
        res.status(500).json({ success: false, message: 'Error updating message', error: errorMessage });
    }
});
router.delete('/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Contact.findOneAndDelete({
            $or: [{ contactId: id }, { _id: id }]
        });
        if (!message) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }
        console.log(`✅ Contact message deleted: ${id}`);
        res.json({ success: true, message: 'Message deleted successfully' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error deleting message:', errorMessage);
        res.status(500).json({ success: false, message: 'Error deleting message', error: errorMessage });
    }
});
export default router;
//# sourceMappingURL=contact.js.map