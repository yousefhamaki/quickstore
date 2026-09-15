import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, type WASocket } from 'baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import mongoose from 'mongoose';
import WhatsAppConnection from '../../models/WhatsAppConnection';
import { useDbAuthState, clearDbAuthState } from './dbAuthState';

/**
 * The ONLY module in this codebase that imports `baileys` directly.
 * Everything else — order-confirmation triggers, the sending abstraction,
 * credit gating — talks to this manager (and, eventually, a parallel Meta
 * Cloud implementation) through plain functions, never to a raw socket.
 * That's deliberate: swapping providers later, or ripping this module out
 * entirely, never touches any other file.
 *
 * Holds one live Baileys socket per connected store in memory
 * (`sockets` below). Because `ts-node-dev --respawn` (this project's dev
 * script) fully restarts the Node process on every save, and any real
 * deploy restarts the process too, `reconnectAllOnBoot()` must run once at
 * server startup to resume every store that was `connected` before the
 * restart — see server.ts's app.listen callback, alongside the existing
 * CampaignQuotaService.startReconciliationInterval()/startAnalyticsCron()
 * calls.
 */

const sockets = new Map<string, WASocket>();

// A minimal logger structurally matching Baileys' internal ILogger shape
// (not imported directly — it isn't re-exported from the package's public
// entry point) — quiets its default (fairly chatty) internal pino logger
// down to just warnings/errors in our own server logs, without pulling in
// a pino dependency of our own.
interface QuietLogger {
    level: string;
    child(obj: Record<string, unknown>): QuietLogger;
    trace(obj: unknown, msg?: string): void;
    debug(obj: unknown, msg?: string): void;
    info(obj: unknown, msg?: string): void;
    warn(obj: unknown, msg?: string): void;
    error(obj: unknown, msg?: string): void;
}

function makeQuietLogger(prefix: string): QuietLogger {
    const noop = () => {};
    const logger: QuietLogger = {
        level: 'warn',
        child: () => makeQuietLogger(prefix),
        trace: noop,
        debug: noop,
        info: noop,
        warn: (obj: unknown, msg?: string) => console.warn(`[whatsapp:${prefix}]`, msg || '', obj),
        error: (obj: unknown, msg?: string) => console.error(`[whatsapp:${prefix}]`, msg || '', obj)
    };
    return logger;
}

function parsePhoneFromJid(jid?: string): string | undefined {
    if (!jid) return undefined;
    // e.g. "201234567890:12@s.whatsapp.net" -> "201234567890"
    return jid.split(':')[0].split('@')[0];
}

/**
 * Starts (or resumes) a store's WhatsApp connection. Safe to call again
 * while already connecting/connected — it's a no-op in that case rather
 * than opening a second socket for the same store.
 */
export async function startConnection(storeId: string | mongoose.Types.ObjectId): Promise<void> {
    const storeIdStr = storeId.toString();
    if (sockets.has(storeIdStr)) return; // already connecting/connected

    await WhatsAppConnection.findOneAndUpdate(
        { storeId },
        { $set: { status: 'connecting', qrCode: undefined }, $setOnInsert: { provider: 'baileys', disconnectCount: 0 } },
        { upsert: true }
    );

    const { state, saveCreds } = await useDbAuthState(storeId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version,
        logger: makeQuietLogger(storeIdStr),
        browser: ['Buildora', 'Chrome', '1.0.0']
    });

    sockets.set(storeIdStr, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            const qrDataUrl = await QRCode.toDataURL(qr);
            await WhatsAppConnection.updateOne({ storeId }, { $set: { qrCode: qrDataUrl, status: 'connecting' } });
        }

        if (connection === 'open') {
            const phoneNumber = parsePhoneFromJid(sock.user?.id);
            await WhatsAppConnection.updateOne(
                { storeId },
                {
                    $set: {
                        status: 'connected',
                        qrCode: undefined,
                        phoneNumber,
                        displayName: sock.user?.name,
                        lastConnectedAt: new Date()
                    }
                }
            );
            console.log(`[whatsapp] Store ${storeIdStr} connected as ${phoneNumber}`);
        }

        if (connection === 'close') {
            sockets.delete(storeIdStr);

            const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
            const loggedOut = statusCode === DisconnectReason.loggedOut;

            await WhatsAppConnection.updateOne(
                { storeId },
                {
                    $set: { status: loggedOut ? 'logged_out' : 'disconnected', lastDisconnectedAt: new Date() },
                    $inc: { disconnectCount: 1 }
                }
            );

            if (loggedOut) {
                // Merchant unlinked from their phone — the saved session is
                // dead, a fresh QR scan is required. Clear it so a stale
                // session is never mistakenly resumed.
                await clearDbAuthState(storeId);
                console.log(`[whatsapp] Store ${storeIdStr} logged out — fresh QR scan required.`);
            } else {
                // Transient disconnect (network blip, server restart, etc.)
                // — auto-reconnect using the saved session, no merchant
                // action needed.
                console.log(`[whatsapp] Store ${storeIdStr} disconnected (code ${statusCode}) — reconnecting...`);
                setTimeout(() => {
                    startConnection(storeId).catch((err) => console.error(`[whatsapp] Reconnect failed for store ${storeIdStr}:`, err));
                }, 3000);
            }
        }
    });
}

/** Merchant-initiated disconnect — logs out of WhatsApp entirely and clears the saved session (unlike a transient disconnect, this is permanent until the merchant re-links). */
export async function stopConnection(storeId: string | mongoose.Types.ObjectId): Promise<void> {
    const storeIdStr = storeId.toString();
    const sock = sockets.get(storeIdStr);
    if (sock) {
        try {
            await sock.logout();
        } catch (err) {
            console.error(`[whatsapp] Error logging out store ${storeIdStr}:`, err);
        }
        sockets.delete(storeIdStr);
    }
    await clearDbAuthState(storeId);
    await WhatsAppConnection.updateOne(
        { storeId },
        { $set: { status: 'disconnected', qrCode: undefined, phoneNumber: undefined, displayName: undefined } }
    );
}

/** Returns the live socket for a store, if connected — used by the sending layer. Never exported beyond services/whatsapp/*. */
export function getSocket(storeId: string | mongoose.Types.ObjectId): WASocket | undefined {
    return sockets.get(storeId.toString());
}

/**
 * Resumes every store that was 'connected' before the last restart. Must
 * be called once at server boot (see server.ts) — without this, a dev
 * save (ts-node-dev --respawn) or a production redeploy would silently
 * drop every merchant's WhatsApp connection until they noticed and
 * manually reconnected.
 */
export async function reconnectAllOnBoot(): Promise<void> {
    const toResume = await WhatsAppConnection.find({ status: 'connected' }).select('storeId');
    console.log(`[whatsapp] Resuming ${toResume.length} WhatsApp connection(s) after boot...`);
    for (const conn of toResume) {
        startConnection(conn.storeId).catch((err) => console.error(`[whatsapp] Failed to resume store ${conn.storeId}:`, err));
    }
}
