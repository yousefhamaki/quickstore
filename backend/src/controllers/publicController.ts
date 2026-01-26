import { Request, Response } from 'express';
import Store from '../models/Store';
import Product from '../models/Product';

// @desc    Get store by subdomain
// @route   GET /api/public/stores/:subdomain
// @access  Public
export const getStoreBySubdomain = async (req: Request, res: Response) => {
    try {
        const { subdomain } = req.params;
        const store = await Store.findOne({ 'domain.subdomain': subdomain, status: 'live' });

        if (!store) {
            return res.status(404).json({ message: 'Store not found or not published' });
        }

        res.json(store);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Track store visit (Increment visitor count)
 * @route   POST /api/public/stores/:storeId/visit
 */
export const trackStoreVisit = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        await Store.findByIdAndUpdate(storeId, { $inc: { 'stats.totalVisitors': 1 } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Error tracking visit', error });
    }
};

// @desc    Get products for a store
// @route   GET /api/public/stores/:storeId/products
// @access  Public
export const getStoreProducts = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        const products = await Product.find({ storeId, status: 'active' })
            .sort({ createdAt: -1 });

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get single product details
// @route   GET /api/public/products/:productId
// @access  Public
export const getProductDetails = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const product = await Product.findOne({ _id: productId, status: 'active' });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
