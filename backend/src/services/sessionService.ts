import crypto from 'crypto';
import { Request } from 'express';
import Session from '../models/Session';
import { IUser } from '../models/User';
import { generateToken } from '../utils/auth';
import { getDeviceLabel, getClientIp } from '../utils/deviceInfo';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matches the old (dead) generateRefreshToken's expiresIn

function hashRefreshToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Issues a fresh opaque refresh token for an existing session, storing only
 * its hash (see Session.refreshTokenHash). Overwrites whatever refresh
 * token hash was there before, which is what makes rotation single-use: an
 * old refresh token, once replaced, no longer matches anything.
 */
export async function issueRefreshToken(sessionId: string): Promise<string> {
    const raw = crypto.randomBytes(40).toString('hex');
    await Session.findByIdAndUpdate(sessionId, {
        $set: {
            refreshTokenHash: hashRefreshToken(raw),
            refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            lastActiveAt: new Date(),
        },
    });
    return raw;
}

export { hashRefreshToken };

/**
 * Creates the Session document a new login is bound to, then signs a JWT
 * carrying that session's id (`sid`), plus a rotating refresh token. Every
 * successful login (password, Google, or a completed 2FA challenge) should
 * go through this instead of calling generateToken directly, so the
 * resulting token is always revocable and shows up in "Active Sessions".
 *
 * `refreshToken` is additive — existing (web) callers that only destructure
 * `token` keep working completely unchanged.
 */
export async function createSessionAndToken(user: IUser, req: Request): Promise<{ token: string; sessionId: string; refreshToken: string }> {
    const userAgent = (req.headers['user-agent'] as string) || '';
    const session = await Session.create({
        userId: user._id,
        userAgent,
        deviceLabel: getDeviceLabel(userAgent),
        ip: getClientIp(req),
    });

    const sessionId = (session._id as any).toString();

    const token = generateToken(
        (user._id as any).toString(),
        user.role,
        user.isVerified,
        user.authProvider,
        user.email,
        sessionId
    );

    const refreshToken = await issueRefreshToken(sessionId);

    return { token, sessionId, refreshToken };
}
