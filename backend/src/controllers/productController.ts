import { Request, Response } from 'express';
import Product from '../models/Product';
import Store from '../models/Store';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { redisClient } from '../config/redis';

// @desc    Get all products for a store with pagination and filters
// @route   GET /api/products?page=1&limit=20&status=active&category=Clothing&search=shirt&stockLevel=low
// @access  Private/Merchant
export const getProducts = async (req: AuthRequest, res: Response) => {
    try {
        let store;

        // If storeId is provided in query, use it (Multi-store support)
        if (req.query.storeId) {
            store = await Store.findOne({ _id: req.query.storeId, ownerId: req.user._id });
        } else {
            // Fallback to legacy behavior (finding first store of user)
            store = await Store.findOne({ ownerId: req.user._id });
        }

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Build filter query
        const filter: any = { storeId: store._id };

        // Status filter
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Category filter
        if (req.query.category) {
            filter.category = req.query.category;
        }

        // Stock level filter
        if (req.query.stockLevel === 'low') {
            filter['inventory.quantity'] = { $lte: 5 };
        } else if (req.query.stockLevel === 'out') {
            filter['inventory.quantity'] = 0;
        }

        // Search by name or SKU
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { sku: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Redis Caching Logic
        const cacheKey = `products:store:${store._id}:page:${page}:limit:${limit}:filter:${JSON.stringify(filter)}`;
        let cachedData = null;
        try {
            cachedData = await redisClient.get(cacheKey);
        } catch (redisErr) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`, redisErr);
        }
        
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Product.countDocuments(filter);
        
        const responseData = {
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };

        // Cache the parsed response for 30 minutes
        try {
            await redisClient.setex(cacheKey, 1800, JSON.stringify(responseData));
        } catch (redisErr) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`, redisErr);
        }

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Merchant
export const createProduct = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const {
            name,
            description,
            shortDescription,
            price,
            compareAtPrice,
            costPerItem,
            sku,
            barcode,
            trackInventory,
            inventory,
            images,
            options,
            variants,
            category,
            tags,
            status,
            seo,
            isActive
        } = req.body;

        // Generate slug from name
        let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // Ensure slug uniqueness within the store
        let uniqueSlug = slug;
        let counter = 1;
        while (await Product.findOne({ storeId: store._id, slug: uniqueSlug })) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }

        const product = await Product.create({
            storeId: store._id,
            name,
            slug: uniqueSlug,
            description,
            shortDescription,
            price,
            compareAtPrice,
            costPerItem,
            sku,
            barcode,
            trackInventory,
            inventory: inventory || { quantity: 0, lowStockThreshold: 5 },
            images,
            options,
            variants,
            category,
            tags,
            status: status || 'active',
            seo,
            isActive: isActive !== undefined ? isActive : true,
        });

        // Invalidate store product caches due to new insertion
        await clearStoreProductCaches(store._id.toString());

        res.status(201).json(product);
    } catch (error) {
        console.error('Create Product Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Merchant
export const updateProduct = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { ...req.body, slug: undefined }, // Prevent slug update for now to avoid URL breaking, or handle carefully
            { new: true, lean: true } // Inject lean on return and new payload
        );

        // Invalidate specific product and store-level list caches
        try {
            await redisClient.del(`product:${req.params.id}`);
        } catch (err) {
            console.warn(`[Redis Fallback] DEL failed`, err);
        }
        await clearStoreProductCaches(store._id.toString());

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Merchant
export const deleteProduct = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.deleteOne();

        // Invalidate specific product and store-level list caches
        try {
            await redisClient.del(`product:${req.params.id}`);
        } catch (err) {
            console.warn(`[Redis Fallback] DEL failed`, err);
        }
        await clearStoreProductCaches(store._id.toString());

        res.json({ message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req: Request, res: Response) => {
    try {
        const cacheKey = `product:${req.params.id}`;
        let cachedProduct = null;
        try {
            cachedProduct = await redisClient.get(cacheKey);
        } catch (err) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`);
        }

        if (cachedProduct) {
            return res.json(JSON.parse(cachedProduct));
        }

        const product = await Product.findById(req.params.id).lean(); // Bypass hydration
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Cache product individually for 1 hour
        try {
            await redisClient.setex(cacheKey, 3600, JSON.stringify(product));
        } catch (err) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`);
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Upload product images
// @route   POST /api/products/upload
// @access  Private/Merchant
export const uploadProductImages = async (req: Request, res: Response) => {
    try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const files = req.files as any[];
        const images = files.map((file) => ({
            url: file.path,
            publicId: file.filename,
            isMain: false
        }));

        res.json(images);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete product image
// @route   DELETE /api/products/:id/images/:imageId
// @access  Private/Merchant
export const deleteProductImage = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const { imageId } = req.params;
        const imageIndex = product.images.findIndex(img => img.publicId === imageId);

        if (imageIndex === -1) {
            return res.status(404).json({ message: 'Image not found' });
        }

        // Delete from Cloudinary
        const { cloudinary } = await import('../config/cloudinary');
        await cloudinary.uploader.destroy(imageId as string);

        // Remove from product
        product.images.splice(imageIndex, 1);
        await product.save();

        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get all categories for a store
// @route   GET /api/products/categories
// @access  Private/Merchant
export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const categories = await Product.distinct('category', { storeId: store._id });
        res.json(categories.filter(cat => cat)); // Filter out empty/null categories
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Bulk update product status
// @route   POST /api/products/bulk-update
// @access  Private/Merchant
export const bulkUpdateStatus = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { productIds, status } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: 'Product IDs are required' });
        }

        if (!['active', 'draft', 'archived'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        await Product.updateMany(
            { _id: { $in: productIds }, storeId: store._id },
            { $set: { status } }
        );

        // Invalidate individual modified products and the master store cache
        try {
            const pipeline = redisClient.pipeline();
            productIds.forEach((id: string) => pipeline.del(`product:${id}`));
            productIds.forEach((id: string) => pipeline.unlink(`product:${id}`));
            await pipeline.exec();
        } catch (err) {
            console.warn(`[Redis Fallback] Pipeline EXEC failed`, err);
        }
        await clearStoreProductCaches(store._id.toString());

        res.json({ message: `${productIds.length} products updated successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// Internal Utility to obliterate store-level product list caches upon mutation
export async function clearStoreProductCaches(storeId: string) {
    try {
        // Find all cached cursor keys associated strictly with this store pagination
        let cursor = '0';
        do {
            const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `products:store:${storeId}:*`, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redisClient.unlink(...keys); // Using non-blocking UNLINK
            }
        } while (cursor !== '0');
    } catch (err) {
        console.error('Failed to invalidate store product caches:', err);
    }
}
