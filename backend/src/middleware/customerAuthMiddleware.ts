import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Customer from '../models/Customer';

interface DecodedCustomerToken {
    id: string;
    storeId: string;
    role: string;
}

export interface CustomerAuthRequest extends Request {
    customer?: any;
}

/**
 * Verifies a customer session token and binds it to the store the request
 * is actually for (req.params.storeId — every account/* route is nested
 * under /:storeId). This is the key isolation boundary: without it, a
 * customer token minted for Store A's checkout could be replayed against
 * Store B's /account/me or /account/orders just by changing the URL, since
 * both stores share the same JWT_SECRET.
 */
export const protectCustomer = async (req: CustomerAuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedCustomerToken;

        if (decoded.role !== 'customer') {
            return res.status(401).json({ message: 'Not authorized, wrong token type' });
        }

        const requestStoreId = req.params.storeId;
        if (!requestStoreId || decoded.storeId !== requestStoreId) {
            return res.status(401).json({ message: 'Not authorized for this store' });
        }

        const customer = await Customer.findById(decoded.id).select('-password');
        if (!customer || customer.storeId.toString() !== requestStoreId) {
            return res.status(401).json({ message: 'Not authorized, account not found' });
        }

        req.customer = customer;
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
