import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    variantId?: mongoose.Types.ObjectId;
    name: string;
    variant?: string;
    quantity: number;
    price: number;
    image?: string;
}

export interface IOrderTimeline {
    status: string;
    timestamp: Date;
    note?: string;
}

export interface IOrderAddress {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

export interface IOrder extends Document {
    storeId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    orderNumber: string;
    items: IOrderItem[];
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentMethod: string;
    shippingAddress: IOrderAddress;
    billingAddress: IOrderAddress;
    customerNote?: string;
    merchantNote?: string;
    transactionFee: number;
    timeline: IOrderTimeline[];
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        orderNumber: { type: String, required: true },
        items: [
            {
                productId: { type: Schema.Types.ObjectId, ref: 'Product' },
                variantId: { type: Schema.Types.ObjectId },
                name: { type: String, required: true },
                variant: { type: String },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
                image: { type: String },
            },
        ],
        subtotal: { type: Number, required: true },
        shipping: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
            default: 'pending',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        paymentMethod: { type: String, required: true },
        shippingAddress: {
            fullName: { type: String },
            phone: { type: String },
            address: { type: String },
            city: { type: String },
            state: { type: String },
            postalCode: { type: String },
            country: { type: String },
        },
        billingAddress: {
            fullName: { type: String },
            phone: { type: String },
            address: { type: String },
            city: { type: String },
            state: { type: String },
            postalCode: { type: String },
            country: { type: String },
        },
        customerNote: { type: String },
        merchantNote: { type: String },
        transactionFee: { type: Number, default: 0 },
        timeline: [
            {
                status: { type: String },
                timestamp: { type: Date, default: Date.now },
                note: { type: String },
            },
        ],
    },
    { timestamps: true }
);

OrderSchema.index({ storeId: 1, customerId: 1 });
OrderSchema.index({ storeId: 1, status: 1, paymentStatus: 1 });
OrderSchema.index({ storeId: 1, createdAt: -1 });
OrderSchema.index({ storeId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model<IOrder>('Order', OrderSchema);
