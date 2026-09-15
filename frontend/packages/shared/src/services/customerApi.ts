import axios from 'axios';

/**
 * A deliberately separate axios instance from services/api.ts.
 *
 * That shared client's request interceptor unconditionally overwrites the
 * Authorization header with whatever the merchant/admin 'token' cookie
 * holds — fine for the dashboards, but wrong here: a shopper's customer
 * session token must never be clobbered by (or leak into requests
 * alongside) a merchant/admin session that happens to exist in the same
 * browser (very possible in local dev, where every app shares the
 * "localhost" cookie domain regardless of port). Customer-auth calls
 * therefore carry their own Authorization header explicitly per request
 * (see customerAuthService.ts) instead of relying on any interceptor.
 */
const customerApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default customerApi;
