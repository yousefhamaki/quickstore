import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppAuthKey extends Document {
    storeId: mongoose.Types.ObjectId;
    /** e.g. "creds", or "<signal-key-type>-<id>" (mirrors Baileys' own multi-file auth state's "<type>-<id>.json" naming — see useMultiFileAuthState in node_modules/baileys). */
    keyId: string;
    /** AES-256-GCM ciphertext (utils/crypto.ts) of `JSON.stringify(value, BufferJSON.replacer)` — never stored/returned in plaintext. */
    dataEncrypted: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Backs services/whatsapp/dbAuthState.ts's DB-backed replacement for
 * Baileys' filesystem-based useMultiFileAuthState — one document per
 * (storeId, keyId) pair, exactly mirroring the "one file per key" shape
 * Baileys itself uses, just in Mongo instead of the filesystem and
 * encrypted at rest. This is the ONLY place a store's WhatsApp session
 * secrets live; WhatsAppConnection only tracks connection status.
 */
const WhatsAppAuthKeySchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        keyId: { type: String, required: true },
        dataEncrypted: { type: String, required: true }
    },
    { timestamps: true }
);

WhatsAppAuthKeySchema.index({ storeId: 1, keyId: 1 }, { unique: true });

export default mongoose.model<IWhatsAppAuthKey>('WhatsAppAuthKey', WhatsAppAuthKeySchema);
