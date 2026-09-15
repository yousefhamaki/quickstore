import mongoose from 'mongoose';
import { BufferJSON, initAuthCreds, proto } from 'baileys';
import type { AuthenticationState } from 'baileys';
import WhatsAppAuthKey from '../../models/WhatsAppAuthKey';
import { encrypt, decrypt } from '../../utils/crypto';

/**
 * A Mongo-backed replacement for Baileys' own `useMultiFileAuthState`
 * (see node_modules/baileys/lib/Utils/use-multi-file-auth-state.js, which
 * this deliberately mirrors line-for-line in structure) — one encrypted
 * document per (storeId, keyId) pair instead of one file per key on disk,
 * so a store's session survives across server restarts/redeploys without
 * depending on local filesystem state (which wouldn't survive a redeploy
 * or work across multiple app instances anyway).
 *
 * Every value is AES-256-GCM encrypted at rest via utils/crypto.ts before
 * being written — this is the one place a store's WhatsApp session
 * secrets (Signal protocol keys, essentially equivalent to a password)
 * live; WhatsAppConnection only tracks connection status, never secrets.
 */
export async function useDbAuthState(storeId: string | mongoose.Types.ObjectId): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}> {
    const readKey = async (keyId: string): Promise<any | null> => {
        const doc = await WhatsAppAuthKey.findOne({ storeId, keyId });
        if (!doc) return null;
        try {
            const json = decrypt(doc.dataEncrypted);
            return JSON.parse(json, BufferJSON.reviver);
        } catch (err) {
            console.error(`[whatsapp/dbAuthState] Failed to decrypt/parse key ${keyId} for store ${storeId}:`, err);
            return null;
        }
    };

    const writeKey = async (keyId: string, value: any): Promise<void> => {
        const json = JSON.stringify(value, BufferJSON.replacer);
        const dataEncrypted = encrypt(json);
        await WhatsAppAuthKey.findOneAndUpdate(
            { storeId, keyId },
            { $set: { dataEncrypted } },
            { upsert: true }
        );
    };

    const removeKey = async (keyId: string): Promise<void> => {
        await WhatsAppAuthKey.deleteOne({ storeId, keyId });
    };

    const creds = (await readKey('creds')) || initAuthCreds();

    const state: AuthenticationState = {
        creds,
        keys: {
            get: async (type, ids) => {
                const data: Record<string, any> = {};
                await Promise.all(
                    ids.map(async (id) => {
                        let value = await readKey(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    })
                );
                return data;
            },
            set: async (data) => {
                const tasks: Promise<void>[] = [];
                for (const category in data) {
                    for (const id in (data as any)[category]) {
                        const value = (data as any)[category][id];
                        const keyId = `${category}-${id}`;
                        tasks.push(value ? writeKey(keyId, value) : removeKey(keyId));
                    }
                }
                await Promise.all(tasks);
            }
        }
    };

    return {
        state,
        saveCreds: async () => {
            await writeKey('creds', state.creds);
        }
    };
}

/** Deletes every persisted auth key for a store — called on merchant-initiated disconnect/logout so a stale session can never be resumed. */
export async function clearDbAuthState(storeId: string | mongoose.Types.ObjectId): Promise<void> {
    await WhatsAppAuthKey.deleteMany({ storeId });
}
