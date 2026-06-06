import express from 'express';
import SubscriptionPlan from '../models/SubscriptionPlan';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const cacheKey = 'plans:active';
        let cachedPlans = null;
        try {
            const { redisClient } = await import('../config/redis');
            cachedPlans = await redisClient.get(cacheKey);
        } catch (redisErr) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`);
        }

        if (cachedPlans) {
            return res.json(JSON.parse(cachedPlans));
        }

        const plans = await SubscriptionPlan.find({ isActive: true });

        try {
            const { redisClient } = await import('../config/redis');
            await redisClient.setex(cacheKey, 86400, JSON.stringify(plans)); // 24 hour cache
        } catch (redisErr) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`);
        }

        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
