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
exports.reviewReceipt = exports.getPendingReceipts = void 0;
const PaymentReceipt_1 = __importDefault(require("../models/PaymentReceipt"));
const Store_1 = __importDefault(require("../models/Store"));
const SubscriptionPlan_1 = __importDefault(require("../models/SubscriptionPlan"));
// @desc    Get all pending receipts
// @route   GET /api/admin/receipts/pending
// @access  Private (Super Admin)
const getPendingReceipts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const receipts = yield PaymentReceipt_1.default.find({ status: 'pending' })
            .populate('merchantId', 'name email')
            .populate('planId')
            .populate('storeId', 'name');
        res.json(receipts);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
});
exports.getPendingReceipts = getPendingReceipts;
// @desc    Approve or reject receipt
// @route   PUT /api/admin/receipts/:id
// @access  Private (Super Admin)
const reviewReceipt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, rejectionReason } = req.body;
    const receiptId = req.params.id;
    try {
        const receipt = yield PaymentReceipt_1.default.findById(receiptId);
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
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
            }
        }
        else {
            yield Store_1.default.findByIdAndUpdate(receipt.storeId, {
                subscriptionStatus: 'none',
            });
        }
        res.json(receipt);
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
});
exports.reviewReceipt = reviewReceipt;
