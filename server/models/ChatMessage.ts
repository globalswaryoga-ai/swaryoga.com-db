import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  workshopId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  
  // Participants
  senderId: mongoose.Types.ObjectId;
  senderRole: 'student' | 'instructor' | 'admin';
  
  // Message Content
  message: string;
  attachments?: {
    url: string;
    type: 'image' | 'document' | 'video' | 'audio';
    fileName?: string;
  }[];
  
  // Message Status
  isRead: boolean;
  readAt?: Date;
  
  // Replies
  replyToMessageId?: mongoose.Types.ObjectId;
  
  // Reactions (emoji reactions)
  reactions?: {
    emoji: string;
    userId: mongoose.Types.ObjectId;
  }[];
  
  // Message Type
  messageType: 'text' | 'system' | 'poll' | 'announcement';
  
  // Metadata
  threadId?: string; // For threaded conversations
  isPinned: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    workshopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workshop',
      required: true,
      index: true
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true
    },
    
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      required: true
    },
    
    message: {
      type: String,
      required: true
    },
    attachments: [
      {
        url: String,
        type: {
          type: String,
          enum: ['image', 'document', 'video', 'audio']
        },
        fileName: String
      }
    ],
    
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: Date,
    
    replyToMessageId: mongoose.Schema.Types.ObjectId,
    
    reactions: [
      {
        emoji: String,
        userId: mongoose.Schema.Types.ObjectId
      }
    ],
    
    messageType: {
      type: String,
      enum: ['text', 'system', 'poll', 'announcement'],
      default: 'text'
    },
    
    threadId: String,
    isPinned: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Index for finding messages by workshop and enrollment
ChatMessageSchema.index({ workshopId: 1, enrollmentId: 1, createdAt: -1 });
ChatMessageSchema.index({ isRead: 1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
