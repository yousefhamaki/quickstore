import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportTicket extends Document {
    ticketId: string;
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    userId?: mongoose.Types.ObjectId;
    replies: Array<{
        sender: 'user' | 'admin';
        senderName: string;
        message: string;
        attachments?: string[];
        internalNote?: boolean;
        editedAt?: Date;
        createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketSchema: Schema = new Schema({
    ticketId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    replies: [{
        sender: { type: String, enum: ['user', 'admin'], required: true },
        senderName: { type: String, required: true },
        message: { type: String, required: true },
        attachments: [{ type: String }],
        internalNote: { type: Boolean, default: false },
        editedAt: { type: Date },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
