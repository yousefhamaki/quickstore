import { Request, Response } from 'express';
import Product from '../models/Product';
import Store from '../models/Store';
import User from '../models/User';
import Category from '../models/Category';
import { AuthRequest, resolveStore } from '../middleware/authMiddleware';
import { redisClient } from '../config/redis';
import { withStockVirtuals, withStockVirtualsMany } from '../utils/productStock';

// Merchant-defined spec table (Product.features) — light abuse-prevention
// limits only, not a hard product requirement: a reasonable cap on how many
// rows and how long each label/value can be.
const MAX_FEATURES = 30;
const MAX_FEATURE_LABEL_LENGTH = 100;
const MAX_FEATURE_VALUE_LENGTH = 300;

/**
 * Validates/sanitizes the `features` spec-table array from a create/update
 * request body. Returns `undefined` when the input isn't an array (so
 * callers can distinguish "not provided" from "explicitly empty"), or throws
 * a plain Error with a user-facing message when it fails validation.
 */
function sanitizeFeatures(features: unknown): { label: string; value: string }[] | undefined {
    if (features === undefined) return undefined;
    if (!Array.isArray(features)) {
        throw new Error('features must be an array of { label, value } pairs');
    }
    if (features.length > MAX_FEATURES) {
        throw new Error(`features cannot have more than ${MAX_FEATURES} entries`);
    }
    return features
        .map((f: any) => ({
            label: typeof f?.label === 'string' ? f.label.trim() : '',
            value: typeof f?.value === 'string' ? f.value.trim() : ''
        }))
        .filter(f => f.label !== '' || f.value !== '')
        .map(f => {
            if (f.label.length > MAX_FEATURE_LABEL_LENGTH) {
                throw new Error(`feature label cannot exceed ${MAX_FEATURE_LABEL_LENGTH} characters`);
            }
            if (f.value.length > MAX_FEATURE_VALUE_LENGTH) {
                throw new Error(`feature value cannot exceed ${MAX_FEATURE_VALUE_LENGTH} characters`);
            }
            return f;
        });
}

// Optional paid add-ons (Product.extras) — same abuse-prevention approach as
// features: a reasonable cap on count and string length, plus a sane check
// that price is an actual non-negative number (these are charged amounts,
// unlike features' free-form label/value strings).
const MAX_EXTRAS = 20;
const MAX_EXTRA_NAME_LENGTH = 100;
const MAX_EXTRA_DESCRIPTION_LENGTH = 300;

/**
 * Validates/sanitizes the `extras` add-on array from a create/update request
 * body. Same `undefined` vs. "explicitly empty" contract as sanitizeFeatures.
 */
function sanitizeExtras(extras: unknown): { name: string; description?: string; price: number }[] | undefined {
    if (extras === undefined) return undefined;
    if (!Array.isArray(extras)) {
        throw new Error('extras must be an array of { name, description, price } add-ons');
    }
    if (extras.length > MAX_EXTRAS) {
        throw new Error(`extras cannot have more than ${MAX_EXTRAS} entries`);
    }
    return extras
        .map((e: any) => ({
            name: typeof e?.name === 'string' ? e.name.trim() : '',
            description: typeof e?.description === 'string' ? e.description.trim() : '',
            price: e?.price
        }))
        .filter(e => e.name !== '' || e.description !== '' || e.price !== undefined)
        .map(e => {
            if (e.name === '') {
                throw new Error('every extra requires a name');
            }
            if (e.name.length > MAX_EXTRA_NAME_LENGTH) {
                throw new Error(`extra name cannot exceed ${MAX_EXTRA_NAME_LENGTH} characters`);
            }
            if (e.description.length > MAX_EXTRA_DESCRIPTION_LENGTH) {
                throw new Error(`extra description cannot exceed ${MAX_EXTRA_DESCRIPTION_LENGTH} characters`);
            }
            const price = Number(e.price);
            if (!Number.isFinite(price) || price < 0) {
                throw new Error(`extra "${e.name}" needs a valid non-negative price`);
            }
            return { name: e.name, description: e.description || undefined, price };
        });
}

// @desc    Get all products for a store with pagination and filters
// @route   GET /api/products?page=1&limit=20&status=active&category=Clothing&search=shirt&stockLevel=low
// @access  Private/Merchant
export const getProducts = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);

        if (!store) {
            return res.status(404).json({ message: 'Store not found or unauthorized' });
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

        // Category filter — prefer the real taxonomy reference; the
        // freeform string filter is kept for old callers/links.
        if (req.query.categoryId) {
            filter.categoryId = req.query.categoryId;
        } else if (req.query.category) {
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

        const rawProducts = await Product.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        // lean() drops the totalStock/totalReserved/totalAvailable virtuals
        // (see Product.ts's toJSON/toObject config) — recomputed manually
        // since mongoose-lean-virtuals isn't installed.
        const products = withStockVirtualsMany(rawProducts);

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
        const store = await resolveStore(req);
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
            features,
            extras,
            category,
            categoryId,
            tags,
            status,
            seo,
            isActive
        } = req.body;

        let sanitizedFeatures;
        let sanitizedExtras;
        try {
            sanitizedFeatures = sanitizeFeatures(features);
            sanitizedExtras = sanitizeExtras(extras);
        } catch (validationError: any) {
            return res.status(400).json({ message: validationError.message });
        }

        // Generate slug from name
        let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // Ensure slug uniqueness within the store
        let uniqueSlug = slug;
        let counter = 1;
        while (await Product.findOne({ storeId: store._id, slug: uniqueSlug })) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }

        // categoryId is the real taxonomy reference; `category` is kept only
        // as a denormalized display string synced from it, so the many
        // existing readers of the plain string (storefront cards, offer
        // condition matching, etc.) keep working without needing a populate.
        let resolvedCategoryName = category;
        if (categoryId) {
            const categoryDoc = await Category.findOne({ _id: categoryId, storeId: store._id });
            if (!categoryDoc) {
                return res.status(400).json({ message: 'Category not found or does not belong to this store' });
            }
            resolvedCategoryName = categoryDoc.name;
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
            features: sanitizedFeatures,
            extras: sanitizedExtras,
            category: resolvedCategoryName,
            categoryId: categoryId || undefined,
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
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const product = await Product.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Prevent mass assignment of storeId, slug, and id
        const { storeId, slug, _id, ...allowedBody } = req.body;

        if (allowedBody.features !== undefined) {
            try {
                allowedBody.features = sanitizeFeatures(allowedBody.features);
            } catch (validationError: any) {
                return res.status(400).json({ message: validationError.message });
            }
        }

        if (allowedBody.extras !== undefined) {
            try {
                allowedBody.extras = sanitizeExtras(allowedBody.extras);
            } catch (validationError: any) {
                return res.status(400).json({ message: validationError.message });
            }
        }

        // Same categoryId -> denormalized category-name sync as createProduct.
        if (allowedBody.categoryId !== undefined) {
            if (allowedBody.categoryId === null || allowedBody.categoryId === '') {
                allowedBody.categoryId = null;
                allowedBody.category = undefined;
            } else {
                const categoryDoc = await Category.findOne({ _id: allowedBody.categoryId, storeId: store._id });
                if (!categoryDoc) {
                    return res.status(400).json({ message: 'Category not found or does not belong to this store' });
                }
                allowedBody.category = categoryDoc.name;
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            allowedBody,
            { new: true, lean: true, runValidators: true }
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
        const store = await resolveStore(req);
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

        const rawProduct = await Product.findById(req.params.id).lean(); // Bypass hydration

        if (!rawProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const product = withStockVirtuals(rawProduct); // lean() drops the stock virtuals — recompute them manually

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
        const store = await resolveStore(req);
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
        const store = await resolveStore(req);
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
        const store = await resolveStore(req);
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
