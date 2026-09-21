import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Session from '../models/Session';
import LoginHistory from '../models/LoginHistory';
import { AuthRequest } from '../middleware/authMiddleware';
import { createSessionAndToken } from '../services/sessionService';
import { getDeviceLabel, getClientIp } from '../utils/deviceInfo';
import { encrypt, decrypt } from '../utils/crypto';
import {
    generateTotpSecret,
    generateTotpQrCode,
    verifyTotpCode,
    generateBackupCodes,
    consumeBackupCode,
    generateEmailOtp,
} from '../utils/twoFactor';
import { sendTwoFactorCodeEmail, sendNewDeviceLoginEmail, sendPasswordChangedEmail } from '../services/emailService';

const TWO_FA_MAX_ATTEMPTS = 5;
const TWO_FA_LOCKOUT_MS = 15 * 60 * 1000;
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;

// ============================================================================
// Password
// ============================================================================

// @desc    Change the logged-in user's password
// @route   PUT /api/security/change-password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    try {
        const user = await User.findById(req.user._id).select('+passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.authProvider !== 'local' || !user.passwordHash) {
            return res.status(400).json({ message: 'This account signs in with Google and has no password to change.' });
        }

        const matches = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!matches) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Standard security practice: a password change signs out every
        // OTHER active session (this one — the one making the change —
        // is left alone so the merchant isn't logged out mid-action).
        await Session.updateMany(
            { userId: user._id, revokedAt: null, _id: { $ne: req.sessionId } },
            { $set: { revokedAt: new Date() }, $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 } }
        );

        sendPasswordChangedEmail(user.email).catch((err) =>
            console.error('[SecurityController] Failed to send password-changed email:', err)
        );

        res.json({ message: 'Password changed successfully. You have been signed out of your other devices.' });
    } catch (error) {
        console.error('[SecurityController] changePassword failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ============================================================================
// Active Sessions
// ============================================================================

// @desc    List this user's active (non-revoked) sessions
// @route   GET /api/security/sessions
// @access  Private
export const getActiveSessions = async (req: AuthRequest, res: Response) => {
    try {
        const sessions = await Session.find({ userId: req.user._id, revokedAt: null })
            .sort({ lastActiveAt: -1 })
            .lean();

        res.json(
            sessions.map((s) => ({
                _id: s._id,
                deviceLabel: s.deviceLabel,
                ip: s.ip,
                createdAt: s.createdAt,
                lastActiveAt: s.lastActiveAt,
                isCurrent: String(s._id) === req.sessionId,
            }))
        );
    } catch (error) {
        console.error('[SecurityController] getActiveSessions failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Revoke the session making this request — the server-side half of "log out".
//          Without this, a token copied before logout stays valid until its
//          natural 1-day expiry even though the user believes they signed out.
// @route   POST /api/security/logout
// @access  Private
export const logout = async (req: AuthRequest, res: Response) => {
    try {
        if (req.sessionId) {
            // Clearing refreshTokenHash (not just setting revokedAt) means a
            // copied refresh token can't even be looked up any more — belt
            // and suspenders alongside POST /api/auth/refresh's own
            // revokedAt check.
            await Session.findByIdAndUpdate(req.sessionId, { $set: { revokedAt: new Date() }, $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 } });
        }
        res.json({ message: 'Logged out.' });
    } catch (error) {
        console.error('[SecurityController] logout failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Revoke one specific session (must belong to this user)
// @route   DELETE /api/security/sessions/:id
// @access  Private
export const revokeSession = async (req: AuthRequest, res: Response) => {
    try {
        const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }
        session.revokedAt = new Date();
        session.refreshTokenHash = undefined;
        session.refreshTokenExpiresAt = undefined;
        await session.save();
        res.json({ message: 'Session signed out.' });
    } catch (error) {
        console.error('[SecurityController] revokeSession failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Revoke every session except the one making this request
// @route   POST /api/security/sessions/revoke-others
// @access  Private
export const revokeAllOtherSessions = async (req: AuthRequest, res: Response) => {
    try {
        const result = await Session.updateMany(
            { userId: req.user._id, revokedAt: null, _id: { $ne: req.sessionId } },
            { $set: { revokedAt: new Date() }, $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 } }
        );
        res.json({ message: 'All other sessions have been signed out.', count: result.modifiedCount });
    } catch (error) {
        console.error('[SecurityController] revokeAllOtherSessions failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ============================================================================
// Login History
// ============================================================================

// @desc    Paginated login history for this user
// @route   GET /api/security/login-history?page=1&limit=20
// @access  Private
export const getLoginHistory = async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

        const [entries, total] = await Promise.all([
            LoginHistory.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            LoginHistory.countDocuments({ userId: req.user._id }),
        ]);

        res.json({ entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error('[SecurityController] getLoginHistory failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ============================================================================
// Two-Factor Authentication — setup / management (all require a live session)
// ============================================================================

// @desc    Start TOTP setup — generates a pending secret + QR code, not yet enabled
// @route   POST /api/security/2fa/totp/setup
// @access  Private
export const setupTotp = async (req: AuthRequest, res: Response) => {
    try {
        const secret = generateTotpSecret();
        const { qrCodeDataUrl } = await generateTotpQrCode(secret, req.user.email);

        await User.findByIdAndUpdate(req.user._id, {
            twoFactorPendingSecretEncrypted: encrypt(secret),
        });

        res.json({ qrCodeDataUrl, manualEntryKey: secret });
    } catch (error) {
        console.error('[SecurityController] setupTotp failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Confirm TOTP setup with a code from the authenticator app — enables 2FA
// @route   POST /api/security/2fa/totp/verify-setup
// @access  Private
export const verifyTotpSetup = async (req: AuthRequest, res: Response) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Verification code is required.' });

    try {
        const user = await User.findById(req.user._id).select('+twoFactorPendingSecretEncrypted');
        if (!user?.twoFactorPendingSecretEncrypted) {
            return res.status(400).json({ message: 'No 2FA setup in progress. Start setup again.' });
        }

        const secret = decrypt(user.twoFactorPendingSecretEncrypted);
        const valid = await verifyTotpCode(secret, code);
        if (!valid) {
            return res.status(400).json({ message: 'Invalid code. Check your authenticator app and try again.' });
        }

        const { plaintextCodes, hashes } = await generateBackupCodes();

        user.totpSecretEncrypted = encrypt(secret);
        user.twoFactorPendingSecretEncrypted = undefined;
        user.twoFactorEnabled = true;
        user.twoFactorMethod = 'totp';
        user.backupCodeHashes = hashes;
        await user.save();

        res.json({ message: 'Two-factor authentication enabled.', backupCodes: plaintextCodes });
    } catch (error) {
        console.error('[SecurityController] verifyTotpSetup failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Enable email-code 2FA (no setup dance needed — the email is already verified)
// @route   POST /api/security/2fa/email/enable
// @access  Private
export const enableEmailTwoFactor = async (req: AuthRequest, res: Response) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password confirmation is required.' });

    try {
        const user = await User.findById(req.user._id).select('+passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.authProvider === 'local') {
            if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
                return res.status(401).json({ message: 'Password is incorrect.' });
            }
        }

        const { plaintextCodes, hashes } = await generateBackupCodes();

        user.twoFactorEnabled = true;
        user.twoFactorMethod = 'email';
        user.backupCodeHashes = hashes;
        await user.save();

        res.json({ message: 'Two-factor authentication enabled.', backupCodes: plaintextCodes });
    } catch (error) {
        console.error('[SecurityController] enableEmailTwoFactor failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Disable 2FA entirely (requires password re-confirmation)
// @route   POST /api/security/2fa/disable
// @access  Private
export const disableTwoFactor = async (req: AuthRequest, res: Response) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password confirmation is required.' });

    try {
        const user = await User.findById(req.user._id).select('+passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.authProvider === 'local') {
            if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
                return res.status(401).json({ message: 'Password is incorrect.' });
            }
        }

        user.twoFactorEnabled = false;
        user.twoFactorMethod = undefined;
        user.totpSecretEncrypted = undefined;
        user.twoFactorPendingSecretEncrypted = undefined;
        user.backupCodeHashes = undefined as any;
        await user.save();

        res.json({ message: 'Two-factor authentication disabled.' });
    } catch (error) {
        console.error('[SecurityController] disableTwoFactor failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Regenerate backup codes (invalidates the old set)
// @route   POST /api/security/2fa/backup-codes/regenerate
// @access  Private
export const regenerateBackupCodes = async (req: AuthRequest, res: Response) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password confirmation is required.' });

    try {
        const user = await User.findById(req.user._id).select('+passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: 'Two-factor authentication is not enabled.' });
        }

        if (user.authProvider === 'local') {
            if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
                return res.status(401).json({ message: 'Password is incorrect.' });
            }
        }

        const { plaintextCodes, hashes } = await generateBackupCodes();
        user.backupCodeHashes = hashes;
        await user.save();

        res.json({ backupCodes: plaintextCodes });
    } catch (error) {
        console.error('[SecurityController] regenerateBackupCodes failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ============================================================================
// Two-Factor Authentication — the login-time challenge (no live session yet)
// ============================================================================

interface ChallengePayload {
    id: string;
    twoFactorChallenge: true;
}

function verifyChallengeToken(token: string): ChallengePayload | null {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as ChallengePayload;
        return decoded.twoFactorChallenge ? decoded : null;
    } catch {
        return null;
    }
}

async function recordLoginHistory(userId: string, success: boolean, req: Request, reason?: string) {
    const userAgent = (req.headers['user-agent'] as string) || '';
    try {
        await LoginHistory.create({
            userId,
            success,
            reason,
            ip: getClientIp(req),
            userAgent,
            deviceLabel: getDeviceLabel(userAgent),
        });
    } catch (err) {
        console.error('[SecurityController] Failed to record login history:', err);
    }
}

/**
 * Sends the "new device" alert email if this User-Agent has never
 * completed a login for this account before. Best-effort — never throws.
 */
async function checkAndAlertNewDevice(userId: string, email: string, req: Request) {
    try {
        const userAgent = (req.headers['user-agent'] as string) || '';
        const priorSession = await Session.findOne({ userId, userAgent }).lean();
        if (priorSession) return; // already a known device, nothing to do

        const deviceLabel = getDeviceLabel(userAgent);
        const ip = getClientIp(req);
        await sendNewDeviceLoginEmail(email, deviceLabel, ip, new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }));
    } catch (err) {
        console.error('[SecurityController] New-device alert failed:', err);
    }
}

// @desc    Resend the email OTP for an in-flight 2FA login challenge
// @route   POST /api/security/2fa/resend-email-code
// @access  Public (requires a valid challenge token)
export const resendTwoFactorEmailCode = async (req: Request, res: Response) => {
    const { challengeToken } = req.body;
    const challenge = challengeToken && verifyChallengeToken(challengeToken);
    if (!challenge) return res.status(401).json({ message: 'Invalid or expired challenge. Please log in again.' });

    try {
        const user = await User.findById(challenge.id);
        if (!user || !user.twoFactorEnabled || user.twoFactorMethod !== 'email') {
            return res.status(400).json({ message: 'Email code is not applicable for this account.' });
        }

        const code = generateEmailOtp();
        user.twoFactorLoginCodeHash = await bcrypt.hash(code, 10);
        user.twoFactorLoginCodeExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
        await user.save();

        await sendTwoFactorCodeEmail(user.email, code);
        res.json({ message: 'A new code has been sent to your email.' });
    } catch (error) {
        console.error('[SecurityController] resendTwoFactorEmailCode failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Completes login by verifying the 2FA code (TOTP, email OTP, or a backup code)
// @route   POST /api/security/2fa/verify-login
// @access  Public (requires a valid challenge token)
export const verifyTwoFactorLogin = async (req: Request, res: Response) => {
    const { challengeToken, code, backupCode } = req.body;
    const challenge = challengeToken && verifyChallengeToken(challengeToken);
    if (!challenge) return res.status(401).json({ message: 'Invalid or expired challenge. Please log in again.' });

    try {
        const user = await User.findById(challenge.id).select(
            '+totpSecretEncrypted +backupCodeHashes +twoFactorLoginCodeHash +twoFactorLoginCodeExpiresAt'
        );
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ message: 'Two-factor authentication is not enabled for this account.' });
        }

        if (user.twoFactorLockedUntil && user.twoFactorLockedUntil.getTime() > Date.now()) {
            const minutesLeft = Math.ceil((user.twoFactorLockedUntil.getTime() - Date.now()) / 60000);
            return res.status(429).json({ message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).` });
        }

        let valid = false;
        let usedBackupCode = false;

        if (backupCode && user.backupCodeHashes?.length) {
            const remaining = await consumeBackupCode(backupCode, user.backupCodeHashes);
            if (remaining) {
                valid = true;
                usedBackupCode = true;
                user.backupCodeHashes = remaining;
            }
        } else if (code && user.twoFactorMethod === 'totp' && user.totpSecretEncrypted) {
            valid = await verifyTotpCode(decrypt(user.totpSecretEncrypted), code);
        } else if (code && user.twoFactorMethod === 'email') {
            if (user.twoFactorLoginCodeHash && user.twoFactorLoginCodeExpiresAt && user.twoFactorLoginCodeExpiresAt.getTime() > Date.now()) {
                valid = await bcrypt.compare(code.trim(), user.twoFactorLoginCodeHash);
            }
        }

        if (!valid) {
            user.twoFactorFailedAttempts = (user.twoFactorFailedAttempts || 0) + 1;
            if (user.twoFactorFailedAttempts >= TWO_FA_MAX_ATTEMPTS) {
                user.twoFactorLockedUntil = new Date(Date.now() + TWO_FA_LOCKOUT_MS);
                user.twoFactorFailedAttempts = 0;
            }
            await user.save();
            await recordLoginHistory((user._id as any).toString(), false, req, '2fa_failed');
            return res.status(401).json({ message: 'Invalid verification code.' });
        }

        // Success — clear the challenge state and issue a real session.
        user.twoFactorFailedAttempts = 0;
        user.twoFactorLockedUntil = undefined;
        user.twoFactorLoginCodeHash = undefined;
        user.twoFactorLoginCodeExpiresAt = undefined;
        await user.save();

        const { token, refreshToken } = await createSessionAndToken(user, req);
        await recordLoginHistory((user._id as any).toString(), true, req);
        checkAndAlertNewDevice((user._id as any).toString(), user.email, req).catch(() => {});

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            token,
            refreshToken,
            ...(usedBackupCode ? { usedBackupCode: true, backupCodesRemaining: user.backupCodeHashes?.length || 0 } : {}),
        });
    } catch (error) {
        console.error('[SecurityController] verifyTwoFactorLogin failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export { recordLoginHistory, checkAndAlertNewDevice };
