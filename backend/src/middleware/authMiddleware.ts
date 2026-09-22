import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Session from '../models/Session';

interface DecodedToken {
    id: string;
    role: string;
    sid?: string;
    twoFactorChallenge?: boolean;
}

export interface AuthRequest extends Request {
    user?: any;
    subscription?: any;
    store?: any;
    sessionId?: string;
    // Set by resolveStore/requireOwnedStore/requireStoreRole whenever a store
    // was resolved: 'owner' for the direct Store.ownerId match, or the
    // matching StoreStaff.role ('manager' | 'staff') when access came from a
    // staff membership instead. Absent if no store was resolved.
    storeRole?: 'owner' | 'manager' | 'staff';
}

// Session.lastActiveAt is a nice-to-have for the Active Sessions UI, not a
// security control — writing it on literally every authenticated request
// would double this middleware's DB traffic for no real benefit, so it's
// only refreshed at most once per this window.
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000;

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;

            // A 2FA challenge token (issued after the password check but
            // before the 2FA code is verified — see authController.loginUser)
            // must never work as a real access token, or 2FA would be
            // trivially bypassable by just not submitting the code.
            if (decoded.twoFactorChallenge) {
                return res.status(401).json({ message: 'Two-factor verification required' });
            }

            req.user = await User.findById(decoded.id).select('-passwordHash');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Older tokens (issued before session tracking existed) carry no
            // `sid` — let them through unchanged until they naturally expire.
            // Anything issued going forward always has one, so this branch
            // is what actually makes a session revocable.
            if (decoded.sid) {
                const session = await Session.findById(decoded.sid);
                if (!session || session.revokedAt) {
                    return res.status(401).json({ message: 'Session has been signed out. Please log in again.' });
                }
                req.sessionId = decoded.sid;

                if (Date.now() - session.lastActiveAt.getTime() > LAST_ACTIVE_THROTTLE_MS) {
                    session.lastActiveAt = new Date();
                    session.save().catch((err) => console.error('[AuthMiddleware] Failed to refresh session lastActiveAt:', err));
                }
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
import StoreStaff from '../models/StoreStaff';
import mongoose from 'mongoose';

/**
 * Core access decision for "can this user touch this store, and as what
 * role?" — the ONE place that answers that question. Everything else
 * (resolveStore, requireOwnedStore, requireStoreRole, and any controller
 * that wants staff-awareness without going through the header/query/body
 * lookup resolveStore does) should call this rather than re-deriving the
 * ownerId-or-staff logic itself.
 *
 * Returns null if the user has no access at all. Otherwise the resolved
 * store plus 'owner' (direct Store.ownerId match) or the StoreStaff role
 * ('manager' | 'staff') for an active staff membership.
 */
export const findAccessibleStore = async (
    userId: any,
    storeId: any
): Promise<{ store: any; role: 'owner' | 'manager' | 'staff' } | null> => {
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId as string)) return null;

    const owned = await Store.findOne({ _id: storeId, ownerId: userId });
    if (owned) return { store: owned, role: 'owner' };

    const staff = await StoreStaff.findOne({ storeId, userId, status: 'active' });
    if (!staff) return null;

    const staffStore = await Store.findById(storeId);
    if (!staffStore) return null;

    return { store: staffStore, role: staff.role };
};

/**
 * Resolves the active store context from headers, queries, bodies, or parameters.
 * Asserts access by matching against the logged-in merchant — either as the
 * direct owner, or (see findAccessibleStore above) as an active staff member
 * of that store. Also sets `req.storeRole` to whichever it resolved to, so
 * callers that need to gate specific actions (billing, staff management,
 * analytics, ...) beyond "some access" can check it.
 */
export const resolveStore = async (req: AuthRequest): Promise<any> => {
    if (!req.user) return null;

    // req.body can be `undefined` (not `{}`) for a GET request with no
    // body/content-type — guard it before reading .storeId off it, rather
    // than crashing every no-explicit-storeId GET route with a TypeError.
    const storeId = req.headers['x-store-id'] || req.query.storeId || req.body?.storeId || req.params.storeId;

    let access: { store: any; role: 'owner' | 'manager' | 'staff' } | null = null;
    if (storeId && mongoose.Types.ObjectId.isValid(storeId as string)) {
        access = await findAccessibleStore(req.user._id, storeId as string);
    }

    if (!access) {
        // Backward-compatible fallback for single-store accounts
        const ownedStore = await Store.findOne({ ownerId: req.user._id });
        if (ownedStore) {
            access = { store: ownedStore, role: 'owner' };
        } else {
            // Same fallback, extended to a staff member who belongs to
            // exactly one store and didn't pass a storeId explicitly.
            const memberships = await StoreStaff.find({ userId: req.user._id, status: 'active' });
            if (memberships.length === 1) {
                const staffStore = await Store.findById(memberships[0].storeId);
                if (staffStore) access = { store: staffStore, role: memberships[0].role };
            }
        }
    }

    if (!access) return null;
    req.storeRole = access.role;
    return access.store;
};

/**
 * Express middleware form of `resolveStore`: resolves the store the same
 * way, attaches it as `req.store`, and rejects the request outright if no
 * accessible store could be resolved at all (no store id supplied/matched AND
 * no fallback single store for this account) — instead of leaving it to each
 * handler to remember to call `resolveStore` and check the result itself.
 *
 * Use this on any merchant-facing route that accepts a storeId (header,
 * query, body, or param) and must not trust it without an ownership/staff
 * check. It does not help with resources looked up by their OWN id (e.g. a
 * coupon or campaign id) rather than a storeId — those still need a
 * targeted "load the child, then check its storeId" check in the handler.
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

/**
 * Gate for the handful of actions staff (and sometimes managers) must NOT be
 * able to perform even though they can resolve the store — billing/plan
 * changes, store deletion, and staff management itself are 'owner'-only;
 * analytics/marketing are 'owner'/'manager' only. Resolves the store the
 * same way requireOwnedStore does (reusing req.store/req.storeRole if a
 * prior middleware already set them) and 403s if the resolved role isn't in
 * `roles`.
 */
export const requireStoreRole = (roles: Array<'owner' | 'manager' | 'staff'>) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const store = req.store && req.storeRole ? req.store : await resolveStore(req);
            if (!store) {
                return res.status(403).json({ message: 'Store not found or not accessible by this account.' });
            }
            req.store = store;
            const role = req.storeRole || 'owner';
            if (!roles.includes(role)) {
                return res.status(403).json({ message: `Your role on this store ('${role}') does not permit this action.` });
            }
            next();
        } catch (error) {
            console.error('[AuthMiddleware] requireStoreRole failed:', error);
            res.status(500).json({ message: 'Failed to resolve store context' });
        }
    };
};
