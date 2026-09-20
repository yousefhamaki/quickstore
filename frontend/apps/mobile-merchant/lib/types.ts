export interface LoginSuccess {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  subscriptionPlan?: { name: string };
  token: string;
  refreshToken: string;
}

export interface Requires2FA {
  requires2FA: true;
  method: 'totp' | 'email';
  challengeToken: string;
}

export type LoginResponse = LoginSuccess | Requires2FA;

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface OrderCustomer {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  storeId: string | { _id: string; name: string };
  customerId: OrderCustomer | string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;
  customerNote?: string;
  merchantNote?: string;
  timeline: { status: string; timestamp: string; note?: string }[];
  createdAt: string;
}

export interface OrdersResponse {
  orders: Order[];
  page: number;
  pages: number;
}

export interface AnalyticsOverview {
  totalOrders: number;
  recentOrders: number;
  totalRevenue: number;
  completedRevenue: number;
  pendingRevenue: number;
  recentRevenue: number;
  grossProfit: number;
  marginPercent: number;
  totalCustomers: number;
  recentCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  totalVisitors: number;
  conversion: number;
}

export interface BillingOverview {
  wallet: { balance: number; currency: string };
  plan: {
    name: string;
    type: 'free' | 'paid';
    monthlyPrice: number;
    features?: Record<string, unknown>;
  };
  subscription: {
    status: string;
    expiresAt?: string;
    billingCycle?: 'monthly' | 'yearly';
  };
  usage: {
    storesUsed: number;
    storeLimit: number;
    productsUsed: number;
    productLimit: number;
  };
  blockingReason: 'LOW_WALLET' | 'SUBSCRIPTION_EXPIRED' | null;
}

export type NotificationType =
  | 'order_created'
  | 'order_shipped'
  | 'refund_requested'
  | 'review_submitted'
  | 'subscription_renewed'
  | 'subscription_past_due'
  | 'subscription_expired'
  | 'signup_gift';

export interface NotificationEntry {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  entries: NotificationEntry[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface Product {
  _id: string;
  name: string;
  images?: { url: string; isMain?: boolean }[];
  price: number;
  stock?: number;
  status: string;
}

export interface ProductsResponse {
  products: Product[];
  page: number;
  pages: number;
}
