"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateStatus = exports.getCategories = exports.deleteProductImage = exports.uploadProductImages = exports.getProductById = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProducts = void 0;
exports.clearStoreProductCaches = clearStoreProductCaches;
const Product_1 = __importDefault(require("../models/Product"));
const Store_1 = __importDefault(require("../models/Store"));
const redis_1 = require("../config/redis");
// @desc    Get all products for a store with pagination and filters
// @route   GET /api/products?page=1&limit=20&status=active&category=Clothing&search=shirt&stockLevel=low
// @access  Private/Merchant
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let store;
        // If storeId is provided in query, use it (Multi-store support)
        if (req.query.storeId) {
            store = yield Store_1.default.findOne({ _id: req.query.storeId, ownerId: req.user._id });
        }
        else {
            // Fallback to legacy behavior (finding first store of user)
            store = yield Store_1.default.findOne({ ownerId: req.user._id });
        }
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Build filter query
        const filter = { storeId: store._id };
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
        }
        else if (req.query.stockLevel === 'out') {
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
            cachedData = yield redis_1.redisClient.get(cacheKey);
        }
        catch (redisErr) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`, redisErr);
        }
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }
        const products = yield Product_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const total = yield Product_1.default.countDocuments(filter);
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
            yield redis_1.redisClient.setex(cacheKey, 1800, JSON.stringify(responseData));
        }
        catch (redisErr) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`, redisErr);
        }
        res.json(responseData);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getProducts = getProducts;
// @desc    Create a product
// @route   POST /api/products
// @access  Private/Merchant
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const { name, description, shortDescription, price, compareAtPrice, costPerItem, sku, barcode, trackInventory, inventory, images, options, variants, category, tags, status, seo, isActive } = req.body;
        // Generate slug from name
        let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        // Ensure slug uniqueness within the store
        let uniqueSlug = slug;
        let counter = 1;
        while (yield Product_1.default.findOne({ storeId: store._id, slug: uniqueSlug })) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }
        const product = yield Product_1.default.create({
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
        yield clearStoreProductCaches(store._id.toString());
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Create Product Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.createProduct = createProduct;
// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Merchant
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const product = yield Product_1.default.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const updatedProduct = yield Product_1.default.findByIdAndUpdate(req.params.id, Object.assign(Object.assign({}, req.body), { slug: undefined }), // Prevent slug update for now to avoid URL breaking, or handle carefully
        { new: true, lean: true } // Inject lean on return and new payload
        );
        // Invalidate specific product and store-level list caches
        try {
            yield redis_1.redisClient.del(`product:${req.params.id}`);
        }
        catch (err) {
            console.warn(`[Redis Fallback] DEL failed`, err);
        }
        yield clearStoreProductCaches(store._id.toString());
        res.json(updatedProduct);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.updateProduct = updateProduct;
// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Merchant
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const product = yield Product_1.default.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        yield product.deleteOne();
        // Invalidate specific product and store-level list caches
        try {
            yield redis_1.redisClient.del(`product:${req.params.id}`);
        }
        catch (err) {
            console.warn(`[Redis Fallback] DEL failed`, err);
        }
        yield clearStoreProductCaches(store._id.toString());
        res.json({ message: 'Product removed' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.deleteProduct = deleteProduct;
// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = `product:${req.params.id}`;
        let cachedProduct = null;
        try {
            cachedProduct = yield redis_1.redisClient.get(cacheKey);
        }
        catch (err) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`);
        }
        if (cachedProduct) {
            return res.json(JSON.parse(cachedProduct));
        }
        const product = yield Product_1.default.findById(req.params.id).lean(); // Bypass hydration
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Cache product individually for 1 hour
        try {
            yield redis_1.redisClient.setex(cacheKey, 3600, JSON.stringify(product));
        }
        catch (err) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`);
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getProductById = getProductById;
// @desc    Upload product images
// @route   POST /api/products/upload
// @access  Private/Merchant
const uploadProductImages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        const files = req.files;
        const images = files.map((file) => ({
            url: file.path,
            publicId: file.filename,
            isMain: false
        }));
        res.json(images);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.uploadProductImages = uploadProductImages;
// @desc    Delete product image
// @route   DELETE /api/products/:id/images/:imageId
// @access  Private/Merchant
const deleteProductImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const product = yield Product_1.default.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const { imageId } = req.params;
        const imageIndex = product.images.findIndex(img => img.publicId === imageId);
        if (imageIndex === -1) {
            return res.status(404).json({ message: 'Image not found' });
        }
        // Delete from Cloudinary
        const { cloudinary } = yield Promise.resolve().then(() => __importStar(require('../config/cloudinary')));
        yield cloudinary.uploader.destroy(imageId);
        // Remove from product
        product.images.splice(imageIndex, 1);
        yield product.save();
        res.json({ message: 'Image deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.deleteProductImage = deleteProductImage;
// @desc    Get all categories for a store
// @route   GET /api/products/categories
// @access  Private/Merchant
const getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const categories = yield Product_1.default.distinct('category', { storeId: store._id });
        res.json(categories.filter(cat => cat)); // Filter out empty/null categories
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getCategories = getCategories;
// @desc    Bulk update product status
// @route   POST /api/products/bulk-update
// @access  Private/Merchant
const bulkUpdateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
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
        yield Product_1.default.updateMany({ _id: { $in: productIds }, storeId: store._id }, { $set: { status } });
        // Invalidate individual modified products and the master store cache
        try {
            const pipeline = redis_1.redisClient.pipeline();
            productIds.forEach((id) => pipeline.del(`product:${id}`));
            productIds.forEach((id) => pipeline.unlink(`product:${id}`));
            yield pipeline.exec();
        }
        catch (err) {
            console.warn(`[Redis Fallback] Pipeline EXEC failed`, err);
        }
        yield clearStoreProductCaches(store._id.toString());
        res.json({ message: `${productIds.length} products updated successfully` });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.bulkUpdateStatus = bulkUpdateStatus;
// Internal Utility to obliterate store-level product list caches upon mutation
function clearStoreProductCaches(storeId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Find all cached cursor keys associated strictly with this store pagination
            let cursor = '0';
            do {
                const [nextCursor, keys] = yield redis_1.redisClient.scan(cursor, 'MATCH', `products:store:${storeId}:*`, 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                    yield redis_1.redisClient.unlink(...keys); // Using non-blocking UNLINK
                }
            } while (cursor !== '0');
        }
        catch (err) {
            console.error('Failed to invalidate store product caches:', err);
        }
    });
}
