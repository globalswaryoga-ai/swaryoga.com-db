import mongoose from 'mongoose';

export type CommunityPostComment = {
  userId: string;
  text: string;
  createdAt: Date;
};

export type CommunityPostDoc = {
  _id: mongoose.Types.ObjectId;
  communityId: string;
  userId: string;
  content: string;
  images: string[];
  likes: string[];
  comments: CommunityPostComment[];
  createdAt: Date;
};

const commentSchema = new mongoose.Schema<CommunityPostComment>(
  {
    userId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const communityPostSchema = new mongoose.Schema<CommunityPostDoc>({
  communityId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  images: [{ type: String }],
  likes: [{ type: String }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now, index: true },
});

communityPostSchema.index({ communityId: 1, createdAt: -1 });

export const CommunityPost =
  mongoose.models.CommunityPost || mongoose.model<CommunityPostDoc>('CommunityPost', communityPostSchema);
