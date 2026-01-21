import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
}

export interface ICustomer extends Document {
    storeId: mongoose.Types.ObjectId;
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    phone?: string;
    addresses: IAddress[];
    orders: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        password: { type: String },
        phone: { type: String },
        addresses: [
            {
                fullName: { type: String },
                phone: { type: String },
                address: { type: String },
                city: { type: String },
                state: { type: String },
                postalCode: { type: String },
                country: { type: String },
                isDefault: { type: Boolean, default: false },
            },
        ],
        orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    },
    { timestamps: true }
);

// Customer is unique per store
CustomerSchema.index({ storeId: 1, email: 1 }, { unique: true });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
