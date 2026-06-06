import mongoose, { Schema, Document } from 'mongoose';

export interface IChatLog extends Document {
  sessionId: string;
  message: string;
  articleId?: mongoose.Types.ObjectId;
  locale: 'en' | 'ar';
  feedback?: 'helpful' | 'partial' | 'not_helpful';
  ticketCreated: boolean;
  status: 'answered' | 'fallback' | 'repeated';
  responseTimeMs?: number;
  createdAt: Date;
}

const ChatLogSchema: Schema = new Schema({
  sessionId: { type: String, required: true },
  message: { type: String, required: true },
  articleId: { type: Schema.Types.ObjectId, ref: 'Article' },
  locale: { type: String, enum: ['en', 'ar'], default: 'en' },
  feedback: { type: String, enum: ['helpful', 'partial', 'not_helpful'] },
  ticketCreated: { type: Boolean, default: false },
  status: { type: String, enum: ['answered', 'fallback', 'repeated'], default: 'answered' },
  responseTimeMs: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

// Index for session-based analysis
ChatLogSchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.model<IChatLog>('ChatLog', ChatLogSchema);
