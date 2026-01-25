import express from 'express';
import SubscriptionPlan from '../models/SubscriptionPlan';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
