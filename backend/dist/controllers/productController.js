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
const Product_1 = __importDefault(require("../models/Product"));
const Store_1 = __importDefault(require("../models/Store"));
const User_1 = __importDefault(require("../models/User"));
// @desc    Get all products for a store with pagination and filters
// @route   GET /api/products?page=1&limit=20&status=active&category=Clothing&search=shirt&stockLevel=low
// @access  Private/Merchant
const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
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
        const products = yield Product_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = yield Product_1.default.countDocuments(filter);
        res.json({
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
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
        // Check subscription status on User
        const user = yield User_1.default.findById(req.user._id).populate('subscriptionPlan');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.subscriptionStatus !== 'active') {
            return res.status(403).json({ message: 'Subscription not active. Please upgrade to add products.' });
        }
        // Check product limits
        const currentProductCount = yield Product_1.default.countDocuments({ storeId: store._id });
        const plan = user.subscriptionPlan;
        if (plan && plan.productLimit !== -1 && currentProductCount >= plan.productLimit) {
            return res.status(403).json({
                message: `Product limit reached for your ${plan.name} plan. Please upgrade to add more products.`
            });
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
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const product = yield Product_1.default.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const updatedProduct = yield Product_1.default.findByIdAndUpdate(req.params.id, Object.assign(Object.assign({}, req.body), { slug: undefined }), // Prevent slug update for now to avoid URL breaking, or handle carefully
        { new: true });
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
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const product = yield Product_1.default.findOne({ _id: req.params.id, storeId: store._id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        yield product.deleteOne();
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
        const product = yield Product_1.default.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
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
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
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
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
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
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
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
        res.json({ message: `${productIds.length} products updated successfully` });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.bulkUpdateStatus = bulkUpdateStatus;
