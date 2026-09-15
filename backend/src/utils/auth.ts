import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// `sid` binds this JWT to a Session document (see models/Session.ts) so it
// can be revoked before its natural expiry — a bare stateless JWT cannot be
// invalidated early at all. Optional so any other/older caller of this
// function keeps working unchanged; `protect` (authMiddleware.ts) only
// enforces the session-lookup when a token actually carries one.
export const generateToken = (id: string, role: string, isVerified: boolean, authProvider: string, email: string, sid?: string) => {
    return jwt.sign({ id, role, isVerified, authProvider, email, sid }, process.env.JWT_SECRET as string, {
        expiresIn: '1d',
    });
};

export const generateRefreshToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET as string, {
        expiresIn: '7d',
    });
};
