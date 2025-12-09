import mongoose, { Schema, Document } from 'mongoose';

export interface IPageState extends Document {
  userId: string;
  pageName: string;
  pageData?: Record<string, any>;
  lastVisited: Date;
  timestamp: Date;
}

const PageStateSchema = new Schema<IPageState>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pageName: {
      type: String,
      default: '/',
    },
    pageData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastVisited: {
      type: Date,
      default: Date.now,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPageState>('PageState', PageStateSchema);
