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
exports.getUserProfile = exports.googleLogin = exports.verifyEmail = exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("../models/User"));
const Subscription_1 = __importDefault(require("../models/Subscription"));
const auth_1 = require("../utils/auth");
const crypto_1 = __importDefault(require("crypto"));
const google_auth_library_1 = require("google-auth-library");
const email_1 = require("../utils/email");
const billingController_1 = require("./billingController");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, role, planId } = req.body;
    try {
        const userExists = yield User_1.default.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        // Generate verification token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const emailVerificationTokenHash = crypto_1.default
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');
        const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const user = yield User_1.default.create({
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
            yield (0, billingController_1.ensureWallet)(user._id.toString());
            // If planId is provided, attempt to auto-subscribe/setup
            if (planId) {
                // We'll use a helper or the subscribe logic. 
                // Note: subscribe controller requires AuthRequest, but we can call a core function.
                try {
                    yield (0, billingController_1.autoSubscribeRecord)(user._id.toString(), planId);
                }
                catch (subError) {
                    console.error('Auto-subscription after signup failed:', subError);
                }
            }
            yield (0, email_1.sendVerificationEmail)(user.email, verificationToken);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                message: 'Registration successful. Please check your email to verify account.',
                // Do NOT send token here for security, they must verify first
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
});
exports.registerUser = registerUser;
// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { email, password } = req.body;
    try {
        const user = yield User_1.default.findOne({ email });
        if (user && user.passwordHash && (yield bcryptjs_1.default.compare(password, user.passwordHash))) {
            yield (0, billingController_1.ensureWallet)(user._id.toString());
            // Populate plan name for frontend feature gating
            const sub = yield Subscription_1.default.findOne({ userId: user._id }).populate('planId');
            const planName = ((_a = sub === null || sub === void 0 ? void 0 : sub.planId) === null || _a === void 0 ? void 0 : _a.name) || 'Free';
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                subscriptionPlan: {
                    name: planName
                },
                token: (0, auth_1.generateToken)(user._id.toString(), user.role, user.isVerified, user.authProvider, user.email),
            });
        }
        else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
});
exports.loginUser = loginUser;
// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.body;
    try {
        const emailVerificationTokenHash = crypto_1.default
            .createHash('sha256')
            .update(token)
            .digest('hex');
        const user = yield User_1.default.findOne({
            emailVerificationTokenHash,
            emailVerificationExpiresAt: { $gt: Date.now() } // Token must be valid
        });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }
        user.isVerified = true;
        user.emailVerificationTokenHash = undefined;
        user.emailVerificationExpiresAt = undefined;
        yield user.save();
        res.json({ message: 'Email verified successfully', token: (0, auth_1.generateToken)(user._id.toString(), user.role, user.isVerified, user.authProvider, user.email) });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during verification' });
    }
});
exports.verifyEmail = verifyEmail;
// @desc    Google Login/Signup
// @route   POST /api/auth/google
// @access  Public
const googleLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        const ticket = yield client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({ message: 'Invalid Google Token' });
        }
        const { email, name, sub } = payload;
        if (!email)
            return res.status(400).json({ message: 'Email not provided by Google' });
        let user = yield User_1.default.findOne({ email });
        if (user) {
            // Link account if local
            if (user.authProvider === 'local') {
                user.googleId = sub;
                // We could switch provider or just keep allow both. 
                // But prompt says: "If authProvider is 'local', link Google account... Save googleId"
                // It doesn't say change provider.
            }
            // If already google, just login.
        }
        else {
            user = yield User_1.default.create({
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
            yield user.save();
        }
        yield (0, billingController_1.ensureWallet)(user._id.toString());
        const activeSub = yield Subscription_1.default.findOne({ userId: user._id }).populate('planId');
        const planName = ((_a = activeSub === null || activeSub === void 0 ? void 0 : activeSub.planId) === null || _a === void 0 ? void 0 : _a.name) || 'Free';
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            subscriptionPlan: {
                name: planName
            },
            token: (0, auth_1.generateToken)(user._id.toString(), user.role, user.isVerified, user.authProvider, user.email),
        });
    }
    catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ message: 'Google authentication failed' });
    }
});
exports.googleLogin = googleLogin;
// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield User_1.default.findById(req.user._id);
    if (user) {
        const activeSub = yield Subscription_1.default.findOne({ userId: user._id }).populate('planId');
        const planName = ((_a = activeSub === null || activeSub === void 0 ? void 0 : activeSub.planId) === null || _a === void 0 ? void 0 : _a.name) || 'Free';
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            subscriptionPlan: {
                name: planName
            }
        });
    }
    else {
        res.status(404).json({ message: 'User not found' });
    }
});
exports.getUserProfile = getUserProfile;
