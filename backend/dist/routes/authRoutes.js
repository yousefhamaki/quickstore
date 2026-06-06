"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// @ts-ignore
router.post('/register', authController_1.registerUser);
router.post('/login', authController_1.loginUser);
// @ts-ignore
router.post('/verify-email', authController_1.verifyEmail);
// @ts-ignore
router.post('/google', authController_1.googleLogin);
router.get('/profile', authMiddleware_1.protect, authController_1.getUserProfile);
exports.default = router;
