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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const SubscriptionPlan_1 = __importDefault(require("./models/SubscriptionPlan"));
dotenv_1.default.config();
const plans = [
    {
        name: 'Basic Plan',
        price: 299,
        features: ['1 store', '100 products per store', 'Basic analytics'],
        duration: 30,
        maxStores: 1,
        productLimit: 100,
    },
    {
        name: 'Pro Plan',
        price: 599,
        features: ['3 stores', '1000 products per store', 'Advanced analytics', 'Custom domain'],
        duration: 30,
        maxStores: 3,
        productLimit: 1000,
    },
    {
        name: 'Enterprise Plan',
        price: 999,
        features: ['10 stores', 'Unlimited products', 'Priority support', 'API access'],
        duration: 30,
        maxStores: 10,
        productLimit: 999999,
    },
];
const seedPlans = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(process.env.MONGODB_URI);
        yield SubscriptionPlan_1.default.deleteMany();
        yield SubscriptionPlan_1.default.insertMany(plans);
        console.log('Subscription plans seeded successfully');
        process.exit();
    }
    catch (error) {
        console.error('Error seeding plans:', error);
        process.exit(1);
    }
});
seedPlans();
