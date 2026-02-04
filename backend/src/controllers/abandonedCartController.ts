import { Response } from 'express';
import AbandonedCart from '../models/AbandonedCart';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get all abandoned carts for a store
// @route   GET /api/abandoned-carts?storeId=...
// @access  Private/Merchant
export const getAbandonedCarts = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId } = req.query;
        if (!storeId) {
            return res.status(400).json({ success: false, message: 'storeId is required' });
        }

        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized' });
        }

        const carts = await AbandonedCart.find({ storeId, status: 'pending' })
            .sort({ createdAt: -1 });

        res.json({ success: true, carts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// @desc    Update abandoned cart status
// @route   PUT /api/abandoned-carts/:id
// @access  Private/Merchant
export const updateAbandonedCartStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        const cart = await AbandonedCart.findById(req.params.id);

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const store = await Store.findOne({ _id: cart.storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        cart.status = status;
        await cart.save();

        res.json({ success: true, cart });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};
