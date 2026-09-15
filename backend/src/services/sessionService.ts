import { Request } from 'express';
import Session from '../models/Session';
import { IUser } from '../models/User';
import { generateToken } from '../utils/auth';
import { getDeviceLabel, getClientIp } from '../utils/deviceInfo';

/**
 * Creates the Session document a new login is bound to, then signs a JWT
 * carrying that session's id (`sid`). Every successful login (password,
 * Google, or a completed 2FA challenge) should go through this instead of
 * calling generateToken directly, so the resulting token is always
 * revocable and shows up in "Active Sessions".
 */
export async function createSessionAndToken(user: IUser, req: Request): Promise<{ token: string; sessionId: string }> {
    const userAgent = (req.headers['user-agent'] as string) || '';
    const session = await Session.create({
        userId: user._id,
        userAgent,
        deviceLabel: getDeviceLabel(userAgent),
        ip: getClientIp(req),
    });

    const token = generateToken(
        (user._id as any).toString(),
        user.role,
        user.isVerified,
        user.authProvider,
        user.email,
        (session._id as any).toString()
    );

    return { token, sessionId: (session._id as any).toString() };
}
