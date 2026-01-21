import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const generateToken = (id: string, role: string, isVerified: boolean, authProvider: string, email: string) => {
    return jwt.sign({ id, role, isVerified, authProvider, email }, process.env.JWT_SECRET as string, {
        expiresIn: '1d',
    });
};

export const generateRefreshToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET as string, {
        expiresIn: '7d',
    });
};
