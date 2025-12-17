import mongoose from 'mongoose';

export type CommunityDoc = {
  _id: mongoose.Types.ObjectId;
  name: string;
  members: string[];
  createdAt: Date;
};

const communitySchema = new mongoose.Schema<CommunityDoc>({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['Swar Yoga Sadhak', 'Swar Yoga New Sadhak'],
  },
  members: [{ type: String, default: [] }],
  createdAt: { type: Date, default: Date.now },
});

communitySchema.index({ name: 1 }, { unique: true });
communitySchema.index({ members: 1 });

export const Community = mongoose.models.Community || mongoose.model<CommunityDoc>('Community', communitySchema);
