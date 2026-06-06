import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    orderId: string;
    amount: number;
    method: 'card' | 'wallet' | 'fawry';
    status: 'pending' | 'success' | 'failed';
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['card', 'wallet', 'fawry'], required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
