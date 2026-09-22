import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import StoreStaff from '../models/StoreStaff';
import User from '../models/User';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/authMiddleware';
import { createSessionAndToken } from '../services/sessionService';
import { sendStaffInviteEmail } from '../services/emailService';

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function normalizeEmail(raw: string): string {
    return (raw || '').trim().toLowerCase();
}

// @desc    Invite a teammate to a store (owner-only). Creates or refreshes a
//          pending StoreStaff record and emails a one-time accept-invite link.
//          Mirrors authController.registerUser's verification-token pattern:
//          only the SHA-256 hash of the raw token is ever stored.
// @route   POST /api/stores/:storeId/staff/invite
// @access  Private/Merchant (owner only — see staffRoutes.ts)
export const inviteStaff = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId } = req.params;
        const email = normalizeEmail(req.body.email);
        const role = req.body.role;

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: 'A valid email is required.' });
        }
        if (role !== 'manager' && role !== 'staff') {
            return res.status(400).json({ message: "role must be 'manager' or 'staff'." });
        }

        const store = req.store; // resolved+ownership-checked by requireStoreRole(['owner']) in staffRoutes.ts
        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        const ownerUser = await User.findById(req.user._id);
        if (ownerUser && normalizeEmail(ownerUser.email) === email) {
            return res.status(400).json({ message: 'You already own this store.' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const inviteTokenExpiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

        // Upsert by {storeId, email} — re-inviting an existing pending
        // invite, or re-inviting someone previously removed, refreshes the
        // same document instead of hitting the unique index.
        let staff = await StoreStaff.findOne({ storeId, email });
        if (staff) {
            if (staff.status === 'active') {
                return res.status(400).json({ message: 'This person already has active access to this store.' });
            }
            staff.role = role;
            staff.status = 'pending';
            staff.invitedBy = req.user._id;
            staff.inviteTokenHash = inviteTokenHash;
            staff.inviteTokenExpiresAt = inviteTokenExpiresAt;
            staff.userId = undefined;
            staff.acceptedAt = undefined;
            await staff.save();
        } else {
            staff = await StoreStaff.create({
                storeId,
                email,
                role,
                status: 'pending',
                invitedBy: req.user._id,
                inviteTokenHash,
                inviteTokenExpiresAt,
            });
        }

        const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/staff/accept?token=${rawToken}&email=${encodeURIComponent(email)}`;
        sendStaffInviteEmail(email, store.name, ownerUser?.name || 'The store owner', role, acceptUrl).catch((err) => {
            console.error('[StaffController] Failed to send staff invite email:', err);
        });

        res.status(201).json({
            message: 'Invitation sent.',
            staff: {
                _id: staff._id,
                email: staff.email,
                role: staff.role,
                status: staff.status,
            },
        });
    } catch (error: any) {
        if (error?.code === 11000) {
            return res.status(400).json({ message: 'This person already has a pending invite or access to this store.' });
        }
        console.error('[StaffController] inviteStaff failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    List staff/pending invites for a store (owner-only)
// @route   GET /api/stores/:storeId/staff
// @access  Private/Merchant (owner only)
export const listStaff = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId } = req.params;
        const staff = await StoreStaff.find({ storeId, status: { $ne: 'removed' } })
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');

        res.json({
            staff: staff.map((s) => ({
                _id: s._id,
                email: s.email,
                role: s.role,
                status: s.status,
                invitedAt: s.createdAt,
                acceptedAt: s.acceptedAt,
                user: s.userId ? { _id: (s.userId as any)._id, name: (s.userId as any).name, email: (s.userId as any).email } : null,
            })),
        });
    } catch (error) {
        console.error('[StaffController] listStaff failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Remove a staff member (or revoke a pending invite). Soft-delete —
//          sets status to 'removed' rather than dropping the document, so
//          there's an audit trail of who used to have access.
// @route   DELETE /api/stores/:storeId/staff/:staffId
// @access  Private/Merchant (owner only)
export const removeStaff = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId, staffId } = req.params;
        const staff = await StoreStaff.findOne({ _id: staffId, storeId });
        if (!staff) {
            return res.status(404).json({ message: 'Staff record not found for this store.' });
        }

        staff.status = 'removed';
        staff.inviteTokenHash = undefined;
        staff.inviteTokenExpiresAt = undefined;
        await staff.save();

        res.json({ message: 'Staff member removed.' });
    } catch (error) {
        console.error('[StaffController] removeStaff failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Accept a staff invite. Verifies the token hash+expiry, then either
//          links an existing User account (by email) or creates a new one
//          right here with the password the invitee sets in this same
//          request — chosen over redirecting through the separate /register
//          flow because that flow sends its OWN email-verification link,
//          which would be redundant (the invite link itself already proves
//          the invitee controls that inbox) and would leave the new account
//          "unverified" until a second email is clicked. Accepting an invite
//          verifies the email implicitly, so the created account is marked
//          isVerified immediately and signed in right away — same shape of
//          response (token/refreshToken/user) as registerUser/verifyEmail.
//          If a User with that email already exists, `password` is ignored
//          and the invite is simply linked to that existing account (the
//          invitee logs in with their existing credentials afterward).
// @route   POST /api/staff/accept-invite
// @access  Public (authenticated by the invite token itself)
export const acceptInvite = async (req: Request, res: Response) => {
    try {
        const { token, name, password } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!token || !email) {
            return res.status(400).json({ message: 'token and email are required.' });
        }

        const inviteTokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const staff = await StoreStaff.findOne({
            email,
            inviteTokenHash,
            status: 'pending',
            inviteTokenExpiresAt: { $gt: new Date() },
        }).select('+inviteTokenHash');

        if (!staff) {
            return res.status(400).json({ message: 'Invalid or expired invite.' });
        }

        let user = await User.findOne({ email });
        if (!user) {
            if (!password || typeof password !== 'string' || password.length < 8) {
                return res.status(400).json({
                    message: 'No account exists for this email yet — set a password (at least 8 characters) to create one.',
                    requiresPassword: true,
                });
            }
            const passwordHash = await bcrypt.hash(password, 10);
            user = await User.create({
                name: (name && String(name).trim()) || email.split('@')[0],
                email,
                passwordHash,
                role: 'merchant',
                authProvider: 'local',
                isVerified: true, // the invite link itself proves inbox control
            });
        }

        staff.userId = user._id as mongoose.Types.ObjectId;
        staff.status = 'active';
        staff.acceptedAt = new Date();
        staff.inviteTokenHash = undefined;
        staff.inviteTokenExpiresAt = undefined;
        await staff.save();

        const store = await Store.findById(staff.storeId);

        const { token: sessionToken, refreshToken } = await createSessionAndToken(user, req as any);

        res.json({
            message: 'Invite accepted.',
            token: sessionToken,
            refreshToken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            store: store ? { _id: store._id, name: store.name } : null,
            storeRole: staff.role,
        });
    } catch (error) {
        console.error('[StaffController] acceptInvite failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
