import mongoose, { Schema, Document } from 'mongoose';

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'logged_out';

export interface IWhatsAppConnection extends Document {
    storeId: mongoose.Types.ObjectId;
    provider: 'baileys' | 'meta_cloud';
    status: WhatsAppConnectionStatus;
    phoneNumber?: string;
    displayName?: string;
    // Transient — only meaningful while status:'connecting'. Cleared once connected.
    qrCode?: string;
    lastConnectedAt?: Date;
    lastDisconnectedAt?: Date;
    disconnectCount: number;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * One per store — tracks the live WhatsApp connection/session status. The
 * actual auth-state (encryption keys Baileys needs to resume a session
 * without re-scanning a QR) lives in WhatsAppAuthKey, not here — that's a
 * many-small-documents store mirroring Baileys' own multi-file auth state
 * convention (see services/whatsapp/dbAuthState.ts), not a single blob.
 */
const WhatsAppConnectionSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
        provider: { type: String, enum: ['baileys', 'meta_cloud'], default: 'baileys' },
        status: { type: String, enum: ['disconnected', 'connecting', 'connected', 'logged_out'], default: 'disconnected' },
        phoneNumber: { type: String },
        displayName: { type: String },
        qrCode: { type: String },
        lastConnectedAt: { type: Date },
        lastDisconnectedAt: { type: Date },
        disconnectCount: { type: Number, default: 0 }
    },
    { timestamps: true }
);

WhatsAppConnectionSchema.index({ storeId: 1 }, { unique: true });

export default mongoose.model<IWhatsAppConnection>('WhatsAppConnection', WhatsAppConnectionSchema);
