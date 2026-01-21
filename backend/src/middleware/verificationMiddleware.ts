import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const checkVerification = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.isVerified) {
        next();
    } else {
        res.status(403).json({ message: 'Please verify your email before creating a store.' });
    }
};
