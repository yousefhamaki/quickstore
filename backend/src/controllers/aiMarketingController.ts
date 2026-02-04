import { Response } from 'express';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Generate AI marketing copy
// @route   POST /api/ai-marketing/generate
// @access  Private/Merchant (Enterprise only)
export const generateCopy = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId, prompt, type } = req.body;

        if (!storeId || !prompt) {
            return res.status(400).json({ success: false, message: 'storeId and prompt are required' });
        }

        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized' });
        }

        // Limit Check (Enterprise: 500 generations/month)
        const AI_LIMIT = 500;

        // Reset count if it's a new month (simplified check)
        const now = new Date();
        const lastReset = new Date(store.stats.aiUsage?.lastReset || 0);
        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
            store.stats.aiUsage = {
                count: 0,
                lastReset: now
            };
        }

        if (store.stats.aiUsage.count >= AI_LIMIT) {
            return res.status(429).json({
                success: false,
                message: 'Monthly AI generation limit reached. Please contact support to increase your quota.',
                usage: store.stats.aiUsage.count,
                limit: AI_LIMIT
            });
        }

        // In a real production app, we would call OpenAI/Gemini API here.
        // For now, we simulate the output.
        const generatedText = `[AI GENERATED ${type.toUpperCase()}]\n\nElevate your lifestyle with our latest collection! Use code SAVE20 for an exclusive discount. Ready to transform your day? Shop now at ${store.name}!\n\n(Prompt used: ${prompt})`;

        // Increment usage
        store.stats.aiUsage.count += 1;
        store.markModified('stats.aiUsage');
        await store.save();

        res.json({
            success: true,
            copy: generatedText,
            usage: store.stats.aiUsage.count,
            limit: AI_LIMIT
        });

    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// @desc    Get AI usage stats
// @route   GET /api/ai-marketing/usage?storeId=...
// @access  Private/Merchant
export const getAIUsage = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId } = req.query;
        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        res.json({
            success: true,
            usage: store.stats.aiUsage?.count || 0,
            limit: 500,
            lastReset: store.stats.aiUsage?.lastReset
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};
