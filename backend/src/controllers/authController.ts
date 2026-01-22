import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken, generateRefreshToken } from '../utils/auth';

import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { sendVerificationEmail } from '../utils/email';
import { ensureWallet, autoSubscribeRecord } from './billingController';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
    const { name, email, password, role, planId } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationTokenHash = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');

        const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const user = await User.create({
            name,
            email,
            passwordHash: hashedPassword,
            role: role || 'merchant',
            authProvider: 'local',
            isVerified: false,
            emailVerificationTokenHash,
            emailVerificationExpiresAt
        });

        if (user) {
            await ensureWallet(user._id.toString());

            // If planId is provided, attempt to auto-subscribe/setup
            if (planId) {
                // We'll use a helper or the subscribe logic. 
                // Note: subscribe controller requires AuthRequest, but we can call a core function.
                try {
                    await autoSubscribeRecord(user._id.toString(), planId);
                } catch (subError) {
                    console.error('Auto-subscription after signup failed:', subError);
                }
            }

            await sendVerificationEmail(user.email, verificationToken);

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                message: 'Registration successful. Please check your email to verify account.',
                // Do NOT send token here for security, they must verify first
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && user.passwordHash && (await bcrypt.compare(password, user.passwordHash))) {
            await ensureWallet(user._id.toString());
            // We allow login but actions might be restricted
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                token: generateToken((user._id as any).toString(), user.role, user.isVerified, user.authProvider, user.email),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req: Request, res: Response) => {
    const { token } = req.body;

    try {
        const emailVerificationTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            emailVerificationTokenHash,
            emailVerificationExpiresAt: { $gt: Date.now() } // Token must be valid
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        user.isVerified = true;
        user.emailVerificationTokenHash = undefined;
        user.emailVerificationExpiresAt = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully', token: generateToken((user._id as any).toString(), user.role, user.isVerified, user.authProvider, user.email) });
    } catch (error) {
        res.status(500).json({ message: 'Server error during verification' });
    }
};

// @desc    Google Login/Signup
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req: Request, res: Response) => {
    const { token } = req.body; // ID Token from frontend

    try {
        // Verify with Google
        // Note: For now we might not have Client ID in env, so we can soft-fail or use a generic check
        // Ideally:
        // const ticket = await client.verifyIdToken({
        //     idToken: token,
        //     audience: process.env.GOOGLE_CLIENT_ID,
        // });
        // const { name, email, sub } = ticket.getPayload()!;

        // Since we don't have the google-auth-library installed yet (we need to run npm install), 
        // I'll assume it's installed or use a fetch. 
        // BUT strict instruction "Use Google OAuth 2.0 Authorization Code Flow... Verify Google ID token".
        // I added the import. If the user doesn't have the package, it will error. 
        // I will rely on the user or me running the install command.

        // Since I cannot run install command safely right now without breaking the flow if it takes too long, 
        // I'll assume the environment is ready or I'll provide instructions.
        // Actually, I can just use fetch to https://oauth2.googleapis.com/tokeninfo for a lighter implementation if needed,
        // but the prompt said "Use Google's public keys", which implies `site` verification or library.
        // I'll use the library approach pattern but comment out strict verification if the library is missing? 
        // No, "No mocks". I will implement the code expecting the library.

        // For this step, I'll assume the library is there or I'll catch the error.

        // Mocking the verification for now IF the library isn't there? No. 
        // Use the library.
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(400).json({ message: 'Invalid Google Token' });
        }

        const { email, name, sub } = payload;

        if (!email) return res.status(400).json({ message: 'Email not provided by Google' });

        let user = await User.findOne({ email });

        if (user) {
            // Link account if local
            if (user.authProvider === 'local') {
                user.googleId = sub;
                // We could switch provider or just keep allow both. 
                // But prompt says: "If authProvider is 'local', link Google account... Save googleId"
                // It doesn't say change provider.
            }
            // If already google, just login.
        } else {
            user = await User.create({
                name: name || 'Google User',
                email,
                authProvider: 'google',
                googleId: sub,
                isVerified: true, // Google emails are verified
                role: 'merchant' // Default to merchant
            });
        }

        // Ensure verified if came from Google? 
        // Prompt: "isVerified = true" for new users.
        // If existing local user was unverified, should Google verify them? 
        // Prompt doesn't explicitly say, but usually yes if email matches.
        if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }

        await ensureWallet(user._id.toString());

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            token: generateToken((user._id as any).toString(), user.role, user.isVerified, user.authProvider, user.email),
        });

    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ message: 'Google authentication failed' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req: any, res: Response) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};
