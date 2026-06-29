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
exports.updateTicketStatusController = exports.addTicketReplyController = exports.getTicketsList = exports.deletePlanController = exports.updatePlanController = exports.createPlanController = exports.getPlansList = exports.reviewReceipt = exports.getPendingReceipts = exports.updateStoreStatus = exports.overrideStoreSubscription = exports.getStoresList = exports.adjustMerchantWallet = exports.updateMerchantStatus = exports.getMerchantsList = exports.getAnalytics = void 0;
const PaymentReceipt_1 = __importDefault(require("../models/PaymentReceipt"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
const Store_1 = __importDefault(require("../models/Store"));
const User_1 = __importDefault(require("../models/User"));
const analytics_service_1 = require("../services/admin/analytics.service");
const merchant_service_1 = require("../services/admin/merchant.service");
const wallet_service_1 = require("../services/admin/wallet.service");
const store_service_1 = require("../services/admin/store.service");
const plan_service_1 = require("../services/admin/plan.service");
const ticket_service_1 = require("../services/admin/ticket.service");
const audit_service_1 = require("../services/admin/audit.service");
const getIp = (req) => {
    return typeof req.ip === 'string' ? req.ip : undefined;
};
const getAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const period = req.query.period || 'daily';
        const snapshot = yield (0, analytics_service_1.getLatestSnapshot)(period);
        res.json(snapshot);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getAnalytics = getAnalytics;
const getMerchantsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const merchants = yield (0, merchant_service_1.getAllMerchants)();
        res.json(merchants);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getMerchantsList = getMerchantsList;
const updateMerchantStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isBlocked, reason } = req.body;
        if (isBlocked === undefined || !reason) {
            return res.status(400).json({ message: 'isBlocked and reason are required' });
        }
        const merchant = yield (0, merchant_service_1.toggleMerchantStatus)(req.params.id, isBlocked, req.user._id, reason, getIp(req));
        res.json(merchant);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.updateMerchantStatus = updateMerchantStatus;
const adjustMerchantWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, type, reason } = req.body;
        if (!amount || !type || !reason) {
            return res.status(400).json({ message: 'amount, type, and reason are required' });
        }
        if (amount <= 0) {
            return res.status(400).json({ message: 'amount must be positive' });
        }
        const result = yield (0, wallet_service_1.adjustBalance)(req.params.id, amount, type, req.user._id, reason, getIp(req));
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.adjustMerchantWallet = adjustMerchantWallet;
const getStoresList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stores = yield (0, store_service_1.getAllStores)();
        res.json(stores);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getStoresList = getStoresList;
const overrideStoreSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { planId, durationDays, reason } = req.body;
        if (!planId || !durationDays || !reason) {
            return res.status(400).json({ message: 'planId, durationDays, and reason are required' });
        }
        const store = yield (0, store_service_1.overrideSubscription)(req.params.id, planId, durationDays, req.user._id, reason, getIp(req));
        res.json(store);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.overrideStoreSubscription = overrideStoreSubscription;
const updateStoreStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, reason } = req.body;
        if (!status || !reason) {
            return res.status(400).json({ message: 'status and reason are required' });
        }
        const store = yield (0, store_service_1.toggleStoreStatus)(req.params.id, status, req.user._id, reason, getIp(req));
        res.json(store);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.updateStoreStatus = updateStoreStatus;
const getPendingReceipts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const receipts = yield PaymentReceipt_1.default.find({ status: 'pending' })
            .populate('merchantId', 'name email')
            .populate('planId')
            .populate('storeId', 'name');
        res.json(receipts);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getPendingReceipts = getPendingReceipts;
const reviewReceipt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, rejectionReason } = req.body;
    const receiptId = req.params.id;
    try {
        const receipt = yield PaymentReceipt_1.default.findById(receiptId);
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        const beforeState = { status: receipt.status };
        receipt.status = status;
        receipt.reviewedBy = req.user._id;
        receipt.reviewDate = new Date();
        if (status === 'rejected') {
            receipt.rejectionReason = rejectionReason;
        }
        yield receipt.save();
        if (status === 'approved') {
            const plan = yield SubscriptionPlan_1.default.findById(receipt.planId);
            if (plan) {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + plan.duration);
                yield Store_1.default.findByIdAndUpdate(receipt.storeId, {
                    subscriptionStatus: 'active',
                    subscriptionPlan: plan._id,
                    expiryDate: expiryDate,
                });
                yield User_1.default.findByIdAndUpdate(receipt.merchantId, {
                    subscriptionStatus: 'active',
                    subscriptionPlan: plan._id,
                    subscriptionExpiry: expiryDate,
                });
            }
        }
        else {
            yield Store_1.default.findByIdAndUpdate(receipt.storeId, {
                subscriptionStatus: 'none',
            });
            yield User_1.default.findByIdAndUpdate(receipt.merchantId, {
                subscriptionStatus: 'expired',
            });
        }
        yield (0, audit_service_1.logAdminAction)(req.user._id, 'receipt.review', 'PaymentReceipt', receiptId, beforeState, { status }, status === 'rejected' ? rejectionReason : 'Approved payment receipt', getIp(req));
        res.json(receipt);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.reviewReceipt = reviewReceipt;
const getPlansList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = yield (0, plan_service_1.getAllPlans)();
        res.json(plans);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getPlansList = getPlansList;
const createPlanController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plan = yield (0, plan_service_1.createPlan)(req.body, req.user._id, getIp(req));
        res.status(201).json(plan);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.createPlanController = createPlanController;
const updatePlanController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { reason } = _a, data = __rest(_a, ["reason"]);
        const plan = yield (0, plan_service_1.updatePlan)(req.params.id, data, req.user._id, reason || 'Modified plan limits', getIp(req));
        res.json(plan);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.updatePlanController = updatePlanController;
const deletePlanController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reason = req.query.reason || 'Archived plan';
        const plan = yield (0, plan_service_1.deletePlan)(req.params.id, req.user._id, reason, getIp(req));
        res.json(plan);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.deletePlanController = deletePlanController;
const getTicketsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tickets = yield (0, ticket_service_1.getAllTickets)(req.query);
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getTicketsList = getTicketsList;
const addTicketReplyController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, attachments, internalNote } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'message is required' });
        }
        const ticket = yield (0, ticket_service_1.addReply)(req.params.id, message, req.user.name, attachments, !!internalNote, req.user._id, getIp(req));
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.addTicketReplyController = addTicketReplyController;
const updateTicketStatusController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, reason } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'status is required' });
        }
        const ticket = yield (0, ticket_service_1.updateTicketStatus)(req.params.id, status, req.user._id, reason, getIp(req));
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.updateTicketStatusController = updateTicketStatusController;
