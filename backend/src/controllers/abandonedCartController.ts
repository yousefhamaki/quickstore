import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
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

// @desc    Capture/update the shopper's in-progress cart as an abandoned-cart
//          record, keyed by the storefront's per-browser session id. This is
//          the ONLY place anywhere in the backend that ever creates an
//          AbandonedCart document — called from the storefront checkout page
//          once a shopper has typed a plausible email and has >=1 cart item
//          (see checkout/page.tsx). Upserts by {storeId, sessionId} rather
//          than always inserting, so repeated calls as the shopper keeps
//          editing their cart/info update the SAME record instead of
//          spawning duplicates.
// @route   POST /api/public/stores/:storeId/abandoned-cart
// @access  Public
export const captureAbandonedCart = async (req: Request, res: Response) => {
    try {
        const storeId = String(req.params.storeId);
        const { sessionId, customerEmail, customerName, customerPhone, items, totalAmount } = req.body;

        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ success: false, message: 'Invalid store ID' });
        }
        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({ success: false, message: 'sessionId is required' });
        }
        if (!customerEmail || typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
            return res.status(400).json({ success: false, message: 'A valid customerEmail is required' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one cart item is required' });
        }

        const oidStoreId = new mongoose.Types.ObjectId(storeId);
        const existing = await AbandonedCart.findOne({ storeId: oidStoreId, sessionId });

        let cart;
        if (existing) {
            // A cart that's already recovered/contacted stays as-is — this
            // session's browser cart is either the same order just placed
            // (nothing left to abandon) or, rarely, a brand new cart the
            // shopper started building right after checking out. Either
            // way, resurrecting a finished record back to 'pending' would
            // make it eligible for the recovery sweep again incorrectly.
            if (existing.status === 'pending') {
                // customerName/customerPhone fall back to whatever was
                // already saved rather than being clobbered to undefined —
                // e.g. the recovery flow's own re-capture (cart contents
                // change once the restored cart loads) knows the email but
                // not yet the name/phone fields, which the shopper hasn't
                // retyped, and mustn't erase what an earlier capture learned.
                existing.customerEmail = customerEmail;
                existing.customerName = customerName || existing.customerName;
                existing.customerPhone = customerPhone || existing.customerPhone;
                existing.items = items;
                existing.totalAmount = Number(totalAmount) || 0;
                cart = await existing.save();
            } else {
                cart = existing;
            }
        } else {
            const fields = {
                customerEmail,
                customerName: customerName || undefined,
                customerPhone: customerPhone || undefined,
                items,
                totalAmount: Number(totalAmount) || 0,
            };
            cart = await AbandonedCart.create({
                storeId: oidStoreId,
                sessionId,
                ...fields,
                status: 'pending',
                recoveryToken: crypto.randomBytes(24).toString('hex'),
            });
        }

        res.status(200).json({ success: true, cartId: cart._id });
    } catch (error) {
        console.error('[AbandonedCartController] Failed to capture abandoned cart:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Look up an abandoned cart's saved items by its recovery token, so
//          the checkout page can restore a cart the shopper's own browser
//          localStorage may no longer have (e.g. they clicked a recovery
//          email days later on a different device/browser). Deliberately
//          returns only what the checkout page needs to repopulate the cart
//          — never the full document (no sessionId, no recoveryToken echo).
// @route   GET /api/public/stores/:storeId/abandoned-cart/:token
// @access  Public
export const getAbandonedCartByToken = async (req: Request, res: Response) => {
    try {
        const storeId = String(req.params.storeId);
        const token = String(req.params.token);
        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ success: false, message: 'Invalid store ID' });
        }
        if (!token) {
            return res.status(400).json({ success: false, message: 'Recovery token is required' });
        }

        const cart = await AbandonedCart.findOne({ storeId, recoveryToken: token });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'This recovery link is no longer valid.' });
        }

        res.json({
            success: true,
            items: cart.items,
            totalAmount: cart.totalAmount,
            customerEmail: cart.customerEmail,
            customerName: cart.customerName,
            customerPhone: cart.customerPhone,
        });
    } catch (error) {
        console.error('[AbandonedCartController] Failed to look up abandoned cart by token:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
