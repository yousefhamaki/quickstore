"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnboardingChecklist = exports.checkSubdomainAvailability = exports.generatePreviewToken = exports.resumeStore = exports.pauseStore = exports.unpublishStore = exports.publishStore = exports.deleteStore = exports.updateStore = exports.createStore = exports.getStore = exports.getStores = void 0;
const Store_1 = __importDefault(require("../models/Store"));
const User_1 = __importDefault(require("../models/User"));
const Product_1 = __importDefault(require("../models/Product"));
const crypto_1 = __importDefault(require("crypto"));
// @desc    Get all stores for logged-in merchant
// @route   GET /api/stores
// @access  Private/Merchant
const getStores = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stores = yield Store_1.default.find({ ownerId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(stores);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getStores = getStores;
// @desc    Get single store
// @route   GET /api/stores/:id
// @access  Private/Merchant
const getStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        res.json(store);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getStore = getStore;
// @desc    Create new store
// @route   POST /api/stores
// @access  Private/Merchant
const createStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.default.findById(req.user._id).populate('subscriptionPlan');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check subscription status
        if (user.subscriptionStatus !== 'active') {
            return res.status(403).json({
                message: 'Active subscription required to create stores. Please subscribe first.'
            });
        }
        // Check store limit
        const plan = user.subscriptionPlan;
        if (plan && user.stores.length >= plan.maxStores) {
            return res.status(403).json({
                message: `Store limit reached for your ${plan.name}. You can create maximum ${plan.maxStores} stores. Upgrade to create more.`
            });
        }
        const { name, description, contact, branding } = req.body;
        // Generate unique slug from name
        let slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
        // Ensure slug uniqueness
        let uniqueSlug = slug;
        let counter = 1;
        while (yield Store_1.default.findOne({ slug: uniqueSlug })) {
            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }
        // Generate unique subdomain
        let subdomain = slug;
        let subdomainCounter = 1;
        while (yield Store_1.default.findOne({ 'domain.subdomain': subdomain })) {
            subdomain = `${slug}-${subdomainCounter}`;
            subdomainCounter++;
        }
        const store = yield Store_1.default.create({
            ownerId: user._id,
            name,
            slug: uniqueSlug,
            description,
            contact: contact || {},
            branding: branding || {},
            domain: {
                type: 'subdomain',
                subdomain,
                isVerified: true
            },
            status: 'draft',
            isPublished: false
        });
        // Add store to user's stores array
        user.stores.push(store._id);
        yield user.save();
        res.status(201).json(store);
    }
    catch (error) {
        console.error('Create Store Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.createStore = createStore;
// @desc    Update store
// @route   PUT /api/stores/:id
// @access  Private/Merchant
const updateStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Don't allow changing slug or ownerId
        const _a = req.body, { slug, ownerId } = _a, updateData = __rest(_a, ["slug", "ownerId"]);
        const updatedStore = yield Store_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updatedStore);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.updateStore = updateStore;
// @desc    Delete store
// @route   DELETE /api/stores/:id
// @access  Private/Merchant
const deleteStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Check if store has products or orders
        const productCount = yield Product_1.default.countDocuments({ storeId: store._id });
        if (productCount > 0) {
            return res.status(400).json({
                message: 'Cannot delete store with existing products. Please delete all products first.'
            });
        }
        // Remove store from user's stores array
        yield User_1.default.findByIdAndUpdate(req.user._id, {
            $pull: { stores: store._id }
        });
        yield store.deleteOne();
        res.json({ message: 'Store deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.deleteStore = deleteStore;
// @desc    Publish store (draft → live)
// @route   POST /api/stores/:id/publish
// @access  Private/Merchant
const publishStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        if (store.isPublished) {
            return res.status(400).json({ message: 'Store is already published' });
        }
        // Pre-launch validation
        const productCount = yield Product_1.default.countDocuments({ storeId: store._id, status: 'active' });
        const validationErrors = [];
        if (productCount === 0) {
            validationErrors.push('Add at least 1 active product');
        }
        if (!store.settings.payment.methods || store.settings.payment.methods.length === 0) {
            validationErrors.push('Configure at least one payment method');
        }
        if (!store.contact.email && !store.contact.phone) {
            validationErrors.push('Add contact email or phone number');
        }
        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: 'Cannot publish store. Please complete the following:',
                errors: validationErrors
            });
        }
        store.status = 'live';
        store.isPublished = true;
        store.publishedAt = new Date();
        yield store.save();
        res.json({
            message: 'Store published successfully!',
            store,
            storeUrl: `https://${store.domain.subdomain}.quickstore.com`
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.publishStore = publishStore;
// @desc    Unpublish store (live → draft)
// @route   POST /api/stores/:id/unpublish
// @access  Private/Merchant
const unpublishStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        store.status = 'draft';
        store.isPublished = false;
        yield store.save();
        res.json({ message: 'Store unpublished successfully', store });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.unpublishStore = unpublishStore;
// @desc    Pause store temporarily
// @route   POST /api/stores/:id/pause
// @access  Private/Merchant
const pauseStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        store.status = 'paused';
        yield store.save();
        res.json({ message: 'Store paused successfully', store });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.pauseStore = pauseStore;
// @desc    Resume paused store
// @route   POST /api/stores/:id/resume
// @access  Private/Merchant
const resumeStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        if (store.status !== 'paused') {
            return res.status(400).json({ message: 'Store is not paused' });
        }
        store.status = 'live';
        yield store.save();
        res.json({ message: 'Store resumed successfully', store });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.resumeStore = resumeStore;
// @desc    Generate preview token for draft store
// @route   POST /api/stores/:id/preview-token
// @access  Private/Merchant
const generatePreviewToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Generate a secure token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // In production, store this in Redis or a PreviewToken model
        // For now, we'll use a simple approach with JWT or similar
        res.json({
            token,
            expiresAt,
            previewUrl: `/preview/${store._id}?token=${token}`
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.generatePreviewToken = generatePreviewToken;
// @desc    Check subdomain availability
// @route   GET /api/stores/check-subdomain/:subdomain
// @access  Private/Merchant
const checkSubdomainAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subdomain = req.params.subdomain;
        // Validate subdomain format
        const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
        if (!subdomainRegex.test(subdomain)) {
            return res.json({
                available: false,
                message: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
            });
        }
        const existingStore = yield Store_1.default.findOne({ 'domain.subdomain': subdomain });
        res.json({
            available: !existingStore,
            message: existingStore ? 'Subdomain already taken' : 'Subdomain available'
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.checkSubdomainAvailability = checkSubdomainAvailability;
// @desc    Get store onboarding checklist
// @route   GET /api/stores/:id/checklist
// @access  Private/Merchant
const getOnboardingChecklist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({
            _id: req.params.id,
            ownerId: req.user._id
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const productCount = yield Product_1.default.countDocuments({ storeId: store._id, status: 'active' });
        const checklist = {
            storeInfo: {
                completed: !!(store.name && store.description),
                label: 'Store information completed'
            },
            branding: {
                completed: !!(store.logo && store.branding.primaryColor),
                label: 'Logo and branding set'
            },
            products: {
                completed: productCount >= 5,
                label: 'Add at least 5 products',
                current: productCount,
                target: 5
            },
            payment: {
                completed: store.settings.payment.methods.length > 0,
                label: 'Configure payment methods'
            },
            shipping: {
                completed: store.settings.shipping.enabled && store.settings.shipping.zones.length > 0,
                label: 'Set up shipping zones'
            },
            policies: {
                completed: !!(store.settings.policies.returnPolicy || store.settings.policies.privacyPolicy),
                label: 'Add store policies'
            }
        };
        const completedCount = Object.values(checklist).filter(item => item.completed).length;
        const totalCount = Object.keys(checklist).length;
        res.json({
            checklist,
            progress: {
                completed: completedCount,
                total: totalCount,
                percentage: Math.round((completedCount / totalCount) * 100)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getOnboardingChecklist = getOnboardingChecklist;
