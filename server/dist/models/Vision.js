import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
const visionSchema = new Schema({
    _id: { type: String, default: () => uuidv4() },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Active', 'Completed', 'On Hold', 'Not Started', 'In Progress'], default: 'Active' },
    visualImageUrl: { type: String, default: '' },
    visionStatement: { type: String, default: '' },
    affirmations: { type: [String], default: [] },
    category: { type: String, default: '' },
    timeFrame: { type: String, default: '' },
    timelineMonths: { type: Number, default: 12 },
    startDate: { type: String, default: '' },
    targetDate: { type: String, default: '' },
}, { _id: false, timestamps: true });
visionSchema.index({ userId: 1, createdAt: -1 });
export default mongoose.model('Vision', visionSchema);
//# sourceMappingURL=Vision.js.map