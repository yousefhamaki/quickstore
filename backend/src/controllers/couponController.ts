import { Response } from 'express';
import Coupon from '../models/Coupon';
import { AuthRequest, findAccessibleStore } from '../middleware/authMiddleware';

// Coupons are a manager-level "everyday operation" — same access as the
// owner, but NOT a plain 'staff' member (see StoreStaff's role doc-comment).
function canManageCoupons(role: 'owner' | 'manager' | 'staff'): boolean {
    return role === 'owner' || role === 'manager';
}

// @desc    Get all coupons for a store
// @route   GET /api/coupons?storeId=...
// @access  Private/Merchant
export const getCoupons = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId } = req.query;
        if (!storeId) {
            return res.status(400).json({ success: false, message: 'storeId is required' });
        }

        const access = await findAccessibleStore(req.user._id, storeId as string);
        if (!access || !canManageCoupons(access.role)) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized' });
        }

        const coupons = await Coupon.find({ storeId }).sort({ createdAt: -1 });
        res.json({ success: true, coupons });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Merchant
export const createCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId, code, type, value, maxUsage, expiresAt, minOrderAmount, autoApply } = req.body;

        const access = await findAccessibleStore(req.user._id, storeId);
        if (!access || !canManageCoupons(access.role)) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized' });
        }

        const coupon = await Coupon.create({
            storeId,
            code: code.toUpperCase(),
            type,
            value,
            maxUsage,
            expiresAt,
            minOrderAmount,
            // restrictedToCustomerEmail is intentionally NOT accepted here —
            // that field is only ever set by the system itself when issuing a
            // post-purchase personal voucher (see orderController's
            // updateOrderStatus), never by a merchant through this form.
            autoApply: !!autoApply,
            isActive: true
        });

        res.status(201).json({ success: true, coupon });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Coupon code already exists for this store' });
        }
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// @desc    Update a coupon
// @route   PUT /api/coupons/:id
// @access  Private/Merchant
export const updateCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        const access = await findAccessibleStore(req.user._id, coupon.storeId as any);
        if (!access || !canManageCoupons(access.role)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                storeId: undefined,
                code: req.body.code?.toUpperCase(),
                // restrictedToCustomerEmail is system-only (post-purchase
                // voucher issuance) — never editable through this merchant
                // endpoint, even though the rest of the body is otherwise
                // trusted/spread as-is.
                restrictedToCustomerEmail: coupon.restrictedToCustomerEmail
            },
            { new: true }
        );

        res.json({ success: true, coupon: updatedCoupon });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Merchant
export const deleteCoupon = async (req: AuthRequest, res: Response) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        const access = await findAccessibleStore(req.user._id, coupon.storeId as any);
        if (!access || !canManageCoupons(access.role)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        await coupon.deleteOne();
        res.json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};
