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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const mongoose_1 = __importDefault(require("mongoose"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const merchantRoutes_1 = __importDefault(require("./routes/merchantRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const planRoutes_1 = __importDefault(require("./routes/planRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const storeRoutes_1 = __importDefault(require("./routes/storeRoutes"));
const billingRoutes_1 = __importDefault(require("./routes/billingRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const supportRoutes_1 = __importDefault(require("./routes/supportRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const couponRoutes_1 = __importDefault(require("./routes/couponRoutes"));
const marketingRoutes_1 = __importDefault(require("./routes/marketingRoutes"));
const abandonedCartRoutes_1 = __importDefault(require("./routes/abandonedCartRoutes"));
const aiMarketingRoutes_1 = __importDefault(require("./routes/aiMarketingRoutes"));
const seo_1 = __importDefault(require("./routes/seo"));
const articleRoutes_1 = __importDefault(require("./routes/articleRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, compression_1.default)({ level: 6 }));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', authRoutes_1.default);
app.use('/api/merchants', merchantRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/plans', planRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/analytics', analyticsRoutes_1.default);
app.use('/api/stores', storeRoutes_1.default);
app.use('/api/billing', billingRoutes_1.default);
app.use('/api/public', publicRoutes_1.default);
app.use('/api/support', supportRoutes_1.default);
app.use('/api/customers', customerRoutes_1.default);
app.use('/api/coupons', couponRoutes_1.default);
app.use('/api/marketing', marketingRoutes_1.default);
app.use('/api/abandoned-carts', abandonedCartRoutes_1.default);
app.use('/api/ai-marketing', aiMarketingRoutes_1.default);
app.use('/api', seo_1.default);
app.use('/api/articles', articleRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Buildora API is running...');
});
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conn = yield mongoose_1.default.connect(process.env.MONGODB_URI, {
            maxPoolSize: 100,
            socketTimeoutMS: 45000,
            family: 4
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
});
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
