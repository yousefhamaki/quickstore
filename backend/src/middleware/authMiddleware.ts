import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface DecodedToken {
    id: string;
    role: string;
}

export interface AuthRequest extends Request {
    user?: any;
    subscription?: any;
    store?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;

            req.user = await User.findById(decoded.id).select('-passwordHash');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            return next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            console.error('[AuthMiddleware] req.user is missing in authorize');
            return res.status(401).json({ message: 'Not authorized, session invalid' });
        }

        const userRole = req.user?.role;
        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({
                message: `User role ${userRole || 'unknown'} is not authorized to access this route`,
            });
        }
        next();
    };
};

import Store from '../models/Store';
import mongoose from 'mongoose';

/**
 * Resolves the active store context from headers, queries, bodies, or parameters.
 * Asserts ownership by matching against the logged-in merchant.
 */
export const resolveStore = async (req: AuthRequest): Promise<any> => {
    if (!req.user) return null;

    // req.body can be `undefined` (not `{}`) for a GET request with no
    // body/content-type — guard it before reading .storeId off it, rather
    // than crashing every no-explicit-storeId GET route with a TypeError.
    const storeId = req.headers['x-store-id'] || req.query.storeId || req.body?.storeId || req.params.storeId;

    let store = null;
    if (storeId && mongoose.Types.ObjectId.isValid(storeId as string)) {
        store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
    }

    // Backward-compatible fallback for single-store accounts
    if (!store) {
        store = await Store.findOne({ ownerId: req.user._id });
    }

    return store;
};

/**
 * Express middleware form of `resolveStore`: resolves the store the same
 * way, attaches it as `req.store`, and rejects the request outright if no
 * owned store could be resolved at all (no store id supplied/matched AND no
 * fallback single store for this account) — instead of leaving it to each
 * handler to remember to call `resolveStore` and check the result itself.
 *
 * Use this on any merchant-facing route that accepts a storeId (header,
 * query, body, or param) and must not trust it without an ownership check.
 * It does not help with resources looked up by their OWN id (e.g. a coupon
 * or campaign id) rather than a storeId — those still need a targeted
 * "load the child, then check its storeId" check in the handler.
 */
export const requireOwnedStore = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(403).json({ message: 'Store not found or not owned by this account.' });
        }
        req.store = store;
        next();
    } catch (error) {
        console.error('[AuthMiddleware] requireOwnedStore failed:', error);
        res.status(500).json({ message: 'Failed to resolve store context' });
    }
};
