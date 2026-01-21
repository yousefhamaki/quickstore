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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyStore = exports.submitSubscription = exports.setupStore = void 0;
const Store_1 = __importDefault(require("../models/Store"));
const User_1 = __importDefault(require("../models/User"));
const PaymentReceipt_1 = __importDefault(require("../models/PaymentReceipt"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
// @desc    Create/Setup store (DEPRECATED - use /api/stores instead)
// @route   POST /api/merchants/store
// @access  Private (Merchant)
const setupStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description } = req.body;
    try {
        // Generate slug from name
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
        const store = yield Store_1.default.create({
            name,
            slug: uniqueSlug,
            description,
            ownerId: req.user._id,
            domain: {
                type: 'subdomain',
                subdomain: uniqueSlug,
                isVerified: true
            },
            status: 'draft',
            isPublished: false
        });
        // Add store to user's stores array
        yield User_1.default.findByIdAndUpdate(req.user._id, {
            $push: { stores: store._id }
        });
        res.status(201).json(store);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
});
exports.setupStore = setupStore;
// @desc    Upload payment receipt
// @route   POST /api/merchants/subscribe
// @access  Private (Merchant)
const submitSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { planId, paymentMethod } = req.body;
    const receiptImage = (_a = req.file) === null || _a === void 0 ? void 0 : _a.path;
    if (!receiptImage) {
        return res.status(400).json({ message: 'Please upload a payment receipt' });
    }
    try {
        const plan = yield SubscriptionPlan_1.default.findById(planId);
        if (!plan) {
            return res.status(404).json({ message: 'Subscription plan not found' });
        }
        const receipt = yield PaymentReceipt_1.default.create({
            merchantId: req.user._id,
            planId,
            receiptImage,
            paymentMethod,
            status: 'pending',
        });
        // Update user subscription status to pending
        yield User_1.default.findByIdAndUpdate(req.user._id, {
            subscriptionStatus: 'pending',
            subscriptionPlan: planId
        });
        res.status(201).json(receipt);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
});
exports.submitSubscription = submitSubscription;
// @desc    Get merchant's stores (DEPRECATED - use /api/stores instead)
// @route   GET /api/merchants/store
// @access  Private (Merchant)
const getMyStore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stores = yield Store_1.default.find({ ownerId: req.user._id });
        if (!stores || stores.length === 0) {
            return res.status(404).json({ message: 'No stores found' });
        }
        // Return first store for backward compatibility
        res.json(stores[0]);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
});
exports.getMyStore = getMyStore;
