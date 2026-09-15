import * as otplib from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const TOTP_ISSUER = 'Buildora';
const BACKUP_CODE_COUNT = 10;

/** Generates a new base32 TOTP secret for a fresh setup attempt. */
export function generateTotpSecret(): string {
    return otplib.generateSecret();
}

/** otpauth:// URI + a QR code data URL an authenticator app can scan. */
export async function generateTotpQrCode(secret: string, email: string): Promise<{ otpauthUri: string; qrCodeDataUrl: string }> {
    const otpauthUri = otplib.generateURI({
        issuer: TOTP_ISSUER,
        label: email,
        secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);
    return { otpauthUri, qrCodeDataUrl };
}

/** Verifies a 6-digit code against a TOTP secret (allows the default ±1 time-step drift). */
export async function verifyTotpCode(secret: string, token: string): Promise<boolean> {
    try {
        const result = await otplib.verify({ secret, token: token.trim() });
        return result.valid;
    } catch {
        return false;
    }
}

/**
 * Generates a fresh batch of one-time recovery codes. Returns both the
 * plaintext codes (shown to the merchant exactly once, never stored) and
 * their bcrypt hashes (what actually gets persisted on the User document).
 */
export async function generateBackupCodes(): Promise<{ plaintextCodes: string[]; hashes: string[] }> {
    const plaintextCodes: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        // 10 hex chars, formatted like "a1b2c-d3e4f" for readability
        const raw = crypto.randomBytes(5).toString('hex');
        plaintextCodes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    }
    const hashes = await Promise.all(plaintextCodes.map((code) => bcrypt.hash(code, 10)));
    return { plaintextCodes, hashes };
}

/**
 * Checks a submitted backup code against the stored hashes and, if it
 * matches, returns the remaining hash list with that one consumed
 * (one-time use). Returns null if no match was found.
 */
export async function consumeBackupCode(submitted: string, hashes: string[]): Promise<string[] | null> {
    const normalized = submitted.trim().toLowerCase();
    for (let i = 0; i < hashes.length; i++) {
        if (await bcrypt.compare(normalized, hashes[i])) {
            return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
        }
    }
    return null;
}

/** Generates a 6-digit numeric code for email-based 2FA/login challenges. */
export function generateEmailOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
}
