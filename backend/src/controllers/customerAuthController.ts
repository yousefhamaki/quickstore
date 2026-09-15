import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Customer from '../models/Customer';
import Store from '../models/Store';
import Order from '../models/Order';
import { generateCustomerToken } from '../utils/customerAuth';
import { CustomerAuthRequest } from '../middleware/customerAuthMiddleware';
import { sendPasswordResetEmail } from '../services/emailService';

const normalizeEmail = (raw: string) => (raw || '').trim().toLowerCase();

const sanitizeCustomer = (customer: any) => {
    const obj = customer.toObject ? customer.toObject() : customer;
    delete obj.password;
    return obj;
};

// @desc    Register (or "claim") a customer account for a store
// @route   POST /api/account/:storeId/register
// @access  Public
export const registerCustomer = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const storeId = req.params.storeId as string;
        const { firstName, lastName, password, phone } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ message: 'Invalid store' });
        }
        if (!email || !password || password.length < 6) {
            return res.status(400).json({ message: 'A valid email and a password of at least 6 characters are required.' });
        }

        const store = await Store.findOne({ _id: storeId, status: 'live' });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        let customer = await Customer.findOne({ storeId, email });

        // A Customer record can already exist from a guest checkout (see
        // publicOrderController's find-or-create-by-email) without ever
        // having a password. Registering with that same email "claims" the
        // existing record instead of failing or creating a duplicate — this
        // is what automatically links their past guest orders to the new
        // account (orders were already stored against this customerId).
        if (customer && customer.password) {
            return res.status(400).json({ message: 'An account with this email already exists. Please log in instead.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        if (customer) {
            customer.password = hashedPassword;
            if (firstName) customer.firstName = firstName;
            if (lastName) customer.lastName = lastName;
            if (phone) customer.phone = phone;
            await customer.save();
        } else {
            customer = await Customer.create({
                storeId,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                source: 'account_registration'
            });
        }

        const token = generateCustomerToken((customer._id as any).toString(), storeId);
        res.status(201).json({ token, customer: sanitizeCustomer(customer) });
    } catch (error: any) {
        if (error?.code === 11000) {
            return res.status(400).json({ message: 'An account with this email already exists. Please log in instead.' });
        }
        console.error('Customer Register Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Log in to a customer account
// @route   POST /api/account/:storeId/login
// @access  Public
export const loginCustomer = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const storeId = req.params.storeId as string;
        const { password } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ message: 'Invalid store' });
        }

        const customer = await Customer.findOne({ storeId, email });
        if (!customer || !customer.password || !(await bcrypt.compare(password, customer.password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = generateCustomerToken((customer._id as any).toString(), storeId);
        res.json({ token, customer: sanitizeCustomer(customer) });
    } catch (error) {
        console.error('Customer Login Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get the logged-in customer's own profile
// @route   GET /api/account/:storeId/me
// @access  Private/Customer
export const getMe = async (req: CustomerAuthRequest, res: Response) => {
    res.json(sanitizeCustomer(req.customer));
};

// @desc    Update the logged-in customer's own profile (name/phone only —
//          email changes are intentionally not supported here since email
//          is the (storeId, email) identity key used to link guest orders).
// @route   PUT /api/account/:storeId/me
// @access  Private/Customer
export const updateMe = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const { firstName, lastName, phone } = req.body;
        const customer = await Customer.findById(req.customer._id);
        if (!customer) return res.status(404).json({ message: 'Account not found' });

        if (firstName !== undefined) customer.firstName = firstName;
        if (lastName !== undefined) customer.lastName = lastName;
        if (phone !== undefined) customer.phone = phone;
        await customer.save();

        res.json(sanitizeCustomer(customer));
    } catch (error) {
        console.error('Customer Update Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Change the logged-in customer's password
// @route   PUT /api/account/:storeId/me/password
// @access  Private/Customer
export const changePassword = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        }

        const customer = await Customer.findById(req.customer._id);
        if (!customer || !customer.password || !(await bcrypt.compare(currentPassword || '', customer.password))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        customer.password = await bcrypt.hash(newPassword, 10);
        await customer.save();
        res.json({ message: 'Password updated' });
    } catch (error) {
        console.error('Customer Change Password Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Request a password reset email
// @route   POST /api/account/:storeId/forgot-password
// @access  Public
export const forgotPassword = async (req: CustomerAuthRequest, res: Response) => {
    // Always return the same generic message regardless of whether the
    // email matched an account — mirrors registerCustomer's duplicate-email
    // handling in spirit: don't let this endpoint be used to enumerate
    // which emails have accounts on this store.
    const genericResponse = { message: 'If an account exists with that email, a password reset link has been sent.' };
    try {
        const storeId = req.params.storeId as string;
        const email = (req.body.email || '').trim().toLowerCase();
        if (!mongoose.Types.ObjectId.isValid(storeId) || !email) {
            return res.json(genericResponse);
        }

        const customer = await Customer.findOne({ storeId, email });
        const store = customer && await Store.findById(storeId);
        if (customer && customer.password && store) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            customer.passwordResetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            customer.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            await customer.save();

            const storeDomainBase = process.env.STORE_DOMAIN_BASE || 'quickstore.live';
            const storeHost = (store.domain.customDomain && store.domain.isVerified)
                ? store.domain.customDomain
                : `${store.domain.subdomain}.${storeDomainBase}`;
            const protocol = storeHost.includes('localhost') ? 'http' : 'https';
            const resetLink = `${protocol}://${storeHost}/account/reset-password?token=${resetToken}`;

            try {
                await sendPasswordResetEmail(store, email, resetLink);
            } catch (emailErr) {
                console.error('Customer Forgot Password — email send failed:', emailErr);
                // Don't leak the failure to the client — same generic response either way.
            }
        }

        res.json(genericResponse);
    } catch (error) {
        console.error('Customer Forgot Password Error:', error);
        res.json(genericResponse);
    }
};

// @desc    Reset password using the token emailed by forgotPassword
// @route   POST /api/account/:storeId/reset-password
// @access  Public
export const resetPassword = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const storeId = req.params.storeId as string;
        const { token, newPassword } = req.body;

        if (!token || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'A reset token and a password of at least 6 characters are required.' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const customer = await Customer.findOne({
            storeId,
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: { $gt: new Date() }
        });

        if (!customer) {
            return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
        }

        customer.password = await bcrypt.hash(newPassword, 10);
        customer.passwordResetTokenHash = undefined;
        customer.passwordResetExpiresAt = undefined;
        await customer.save();

        const authToken = generateCustomerToken((customer._id as any).toString(), storeId);
        res.json({ message: 'Password reset successfully.', token: authToken, customer: sanitizeCustomer(customer) });
    } catch (error) {
        console.error('Customer Reset Password Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a saved address
// @route   POST /api/account/:storeId/addresses
// @access  Private/Customer
export const addAddress = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const customer = await Customer.findById(req.customer._id);
        if (!customer) return res.status(404).json({ message: 'Account not found' });

        const { fullName, phone, address, city, state, postalCode, country, isDefault } = req.body;
        if (!fullName || !phone || !address || !city) {
            return res.status(400).json({ message: 'Full name, phone, address and city are required.' });
        }

        if (isDefault || customer.addresses.length === 0) {
            customer.addresses.forEach((a: any) => { a.isDefault = false; });
        }

        customer.addresses.push({
            fullName, phone, address, city,
            state: state || city,
            postalCode: postalCode || '00000',
            country: country || 'Egypt',
            isDefault: isDefault || customer.addresses.length === 0
        } as any);

        await customer.save();
        res.status(201).json(sanitizeCustomer(customer));
    } catch (error) {
        console.error('Add Address Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a saved address
// @route   PUT /api/account/:storeId/addresses/:addressId
// @access  Private/Customer
export const updateAddress = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const customer = await Customer.findById(req.customer._id);
        if (!customer) return res.status(404).json({ message: 'Account not found' });

        const addr = (customer.addresses as any).id(req.params.addressId);
        if (!addr) return res.status(404).json({ message: 'Address not found' });

        const { fullName, phone, address, city, state, postalCode, country, isDefault } = req.body;
        if (fullName !== undefined) addr.fullName = fullName;
        if (phone !== undefined) addr.phone = phone;
        if (address !== undefined) addr.address = address;
        if (city !== undefined) addr.city = city;
        if (state !== undefined) addr.state = state;
        if (postalCode !== undefined) addr.postalCode = postalCode;
        if (country !== undefined) addr.country = country;

        if (isDefault) {
            customer.addresses.forEach((a: any) => { a.isDefault = false; });
            addr.isDefault = true;
        }

        await customer.save();
        res.json(sanitizeCustomer(customer));
    } catch (error) {
        console.error('Update Address Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a saved address
// @route   DELETE /api/account/:storeId/addresses/:addressId
// @access  Private/Customer
export const deleteAddress = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const customer = await Customer.findById(req.customer._id);
        if (!customer) return res.status(404).json({ message: 'Account not found' });

        const addr = (customer.addresses as any).id(req.params.addressId);
        if (!addr) return res.status(404).json({ message: 'Address not found' });

        const wasDefault = addr.isDefault;
        (addr as any).deleteOne();

        // Keep exactly one default around when one exists, so checkout
        // always has an unambiguous address to preselect.
        if (wasDefault && customer.addresses.length > 0) {
            customer.addresses[0].isDefault = true;
        }

        await customer.save();
        res.json(sanitizeCustomer(customer));
    } catch (error) {
        console.error('Delete Address Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    List the logged-in customer's own orders for this store
// @route   GET /api/account/:storeId/orders
// @access  Private/Customer
export const listMyOrders = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const { storeId } = req.params;
        const orders = await Order.find({ storeId, customerId: req.customer._id })
            .sort({ createdAt: -1 })
            .select('-billingAddress -merchantNote -timeline')
            .lean();

        res.json(orders);
    } catch (error) {
        console.error('List My Orders Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get one of the logged-in customer's own orders in full detail
// @route   GET /api/account/:storeId/orders/:orderId
// @access  Private/Customer
export const getMyOrderById = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const storeId = req.params.storeId as string;
        const orderId = req.params.orderId as string;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: 'Invalid order id' });
        }

        const order = await Order.findOne({ _id: orderId, storeId, customerId: req.customer._id })
            .select('-merchantNote')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get My Order Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
