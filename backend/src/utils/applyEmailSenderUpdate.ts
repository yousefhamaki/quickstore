import { encrypt } from './crypto';
import { IEmailSenderSettings } from '../models/Store';

/**
 * The one carve-out from updateStore's usual "wholesale replace whatever
 * settings the client sent" convention — a client-sent plaintext `password`
 * must never be stored as-is (it gets encrypted here) and must never be
 * trusted back INTO `passwordEncrypted` directly (that would let a client
 * replay whatever ciphertext a previous response echoed — except responses
 * never include it at all, see EmailSenderSchema's toJSON transform in
 * Store.ts — or simply corrupt the real secret with a bogus string).
 *
 * `verified`/`lastTestedAt`/`lastError` are NEVER trusted from the client
 * either — they're recomputed here so a merchant can't fake a "verified"
 * badge by just sending `{verified:true}`; they must actually pass the
 * POST /stores/:id/email-sender/test flow (see storeController.testEmailSender)
 * and only then re-save with the resulting flag.
 */
export function applyEmailSenderUpdate(
    existing: IEmailSenderSettings | undefined,
    incoming: any
): IEmailSenderSettings {
    const prevSmtp = existing?.smtp;
    const incomingSmtp = incoming?.smtp || {};
    const plaintextPassword: string | undefined = incomingSmtp.password;

    const configChanged =
        !prevSmtp ||
        prevSmtp.host !== incomingSmtp.host ||
        prevSmtp.port !== incomingSmtp.port ||
        !!prevSmtp.secure !== !!incomingSmtp.secure ||
        prevSmtp.username !== incomingSmtp.username ||
        !!plaintextPassword;

    const passwordEncrypted = plaintextPassword ? encrypt(plaintextPassword) : prevSmtp?.passwordEncrypted;

    return {
        mode: incoming?.mode === 'custom' ? 'custom' : 'buildora',
        fromName: incoming?.fromName,
        fromEmail: incoming?.fromEmail,
        smtp: {
            host: incomingSmtp.host,
            port: incomingSmtp.port,
            secure: !!incomingSmtp.secure,
            username: incomingSmtp.username,
            passwordEncrypted
        },
        // A config change invalidates any previous "verified" badge — the
        // merchant must re-test before it's trusted again for real sends
        // (see resolveStoreSender in services/mailer/storeMailer.ts, which
        // requires verified === true before ever using custom SMTP).
        verified: configChanged ? false : (existing?.verified ?? false),
        lastTestedAt: configChanged ? undefined : existing?.lastTestedAt,
        lastError: configChanged ? undefined : existing?.lastError
    };
}
