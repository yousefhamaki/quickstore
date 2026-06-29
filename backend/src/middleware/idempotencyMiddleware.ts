import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { redisClient } from '../config/redis';

export const checkIdempotency = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;
    if (!key) {
        return next();
    }

    const redisKey = `idempotency:${key}`;
    try {
        const cached = await redisClient.get(redisKey);
        if (cached) {
            if (cached === 'processing') {
                return res.status(409).json({ message: 'Request is currently being processed. Please retry shortly.' });
            }
            const { statusCode, body } = JSON.parse(cached);
            return res.status(statusCode).json(body);
        }

        // Set processing lock (expires in 30s to prevent deadlocks)
        await redisClient.setex(redisKey, 30, 'processing');

        // Override res.json to capture response
        const originalJson = res.json.bind(res);
        res.json = (body: any) => {
            res.json = originalJson;
            
            if (res.statusCode >= 200 && res.statusCode < 500) {
                redisClient.setex(redisKey, 86400, JSON.stringify({
                    statusCode: res.statusCode,
                    body
                })).catch(err => console.error('[Idempotency] Failed to cache response:', err));
            } else {
                redisClient.del(redisKey).catch(err => console.error('[Idempotency] Failed to clear lock on server error:', err));
            }

            return originalJson(body);
        };

        next();
    } catch (error) {
        console.error('[Idempotency Middleware] Redis error:', error);
        next(); // Fail open if Redis is down (resiliency fallback)
    }
};
