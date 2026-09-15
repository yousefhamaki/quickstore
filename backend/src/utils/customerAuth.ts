import jwt from 'jsonwebtoken';

/**
 * Customer session tokens are deliberately a separate JWT "namespace" from
 * the merchant/admin tokens issued by utils/auth.ts:
 *  - `role: 'customer'` so a merchant/admin token can never satisfy
 *    protectCustomer (and vice versa) even though both are signed with the
 *    same JWT_SECRET.
 *  - `storeId` is embedded and re-checked against the store the request is
 *    actually for on every request (see customerAuthMiddleware) — a
 *    customer account is scoped to ONE store (Customer has a unique
 *    (storeId, email) index, matching "sign up separately per shop"), so a
 *    token minted for Store A must never authenticate a request for Store B
 *    even if the same person also has an account there.
 */
export const generateCustomerToken = (customerId: string, storeId: string) => {
    return jwt.sign(
        { id: customerId, storeId, role: 'customer' },
        process.env.JWT_SECRET as string,
        { expiresIn: '30d' }
    );
};
