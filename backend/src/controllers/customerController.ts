import { Response } from 'express';
import Customer from '../models/Customer';
import Store from '../models/Store';
import { AuthRequest, findAccessibleStore } from '../middleware/authMiddleware';

// @desc    Get all customers for a store
// @route   GET /api/customers
// @access  Private/Merchant
export const getCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const { storeId, search, pageNumber, consentStatus } = req.query;

        let query: any = {};

        if (storeId) {
            // Customers are accessible to any active store member (owner,
            // manager, or staff) — day-to-day customer support/lookup.
            const access = await findAccessibleStore(userId, storeId as string);
            if (!access) {
                return res.status(404).json({ message: 'Store not found or unauthorized' });
            }
            query.storeId = storeId;
        } else {
            // Get all stores owned by merchant
            const stores = await Store.find({ ownerId: userId });
            const storeIds = stores.map(store => store._id);
            query.storeId = { $in: storeIds };
        }

        if (consentStatus) {
            query.consentStatus = consentStatus;
        }

        const pageSize = 20;
        const page = Number(pageNumber) || 1;

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const [count, customers] = await Promise.all([
            Customer.countDocuments(query),
            Customer.find(query)
                .populate('storeId', 'name')
                .sort({ createdAt: -1 })
                .limit(pageSize)
                .skip(pageSize * (page - 1))
                .lean()
        ]);

        res.json({ customers, page, pages: Math.ceil(count / pageSize), total: count });
    } catch (error) {
        console.error('Get Customers Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get customer by ID
// @route   GET /api/customers/:id
// @access  Private/Merchant
export const getCustomerById = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const customer = await Customer.findById(req.params.id).populate('storeId', 'name ownerId');

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // Verify store belongs to merchant, or the user is an active staff
        // member of it (customers are accessible to any store role).
        if (!customer.storeId) {
            return res.status(403).json({ message: 'Unauthorized access to customer data' });
        }
        const access = await findAccessibleStore(userId, (customer.storeId as any)._id || customer.storeId);
        if (!access) {
            return res.status(403).json({ message: 'Unauthorized access to customer data' });
        }

        res.json(customer);
    } catch (error) {
        console.error('Get Customer By ID Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};
