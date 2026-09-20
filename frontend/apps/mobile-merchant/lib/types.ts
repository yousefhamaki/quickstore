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

export interface OrderRefund {
  amount: number;
  reason: string;
  refundedAt: string;
  refundedBy?: string;
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
  // 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' — kept
  // as `string` since the backend doesn't expose a stricter enum type.
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: OrderAddress;
  billingAddress: OrderAddress;
  customerNote?: string;
  merchantNote?: string;
  timeline: { status: string; timestamp: string; note?: string }[];
  refunds?: OrderRefund[];
  refundedAmount?: number;
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

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export interface RevenuePoint {
  _id: { year: number; month?: number; day?: number; week?: number };
  revenue: number;
  orders: number;
}

export interface TopProduct {
  _id: string;
  totalSold: number;
  revenue: number;
  cost: number;
  productName: string;
  productImage?: string;
  profit: number;
}

export interface RecentOrderSummary {
  _id: string;
  orderNumber: string;
  total: number;
  status: OrderStatus;
  paymentStatus: string;
  createdAt: string;
  customerId?: { _id: string; firstName?: string; lastName?: string; email?: string };
}

export interface CustomerGrowthPoint {
  _id: { year: number; month: number };
  count: number;
}

export interface CustomersAnalytics {
  totalCustomers: number;
  growth: CustomerGrowthPoint[];
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

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type ProductStatus = 'draft' | 'active' | 'archived';

export interface ProductImage {
  url: string;
  publicId: string;
  isMain?: boolean;
}

export interface ProductInventory {
  quantity: number;
  reserved?: number;
  lowStockThreshold?: number;
}

export interface ProductFeature {
  label: string;
  value: string;
}

export interface ProductExtra {
  _id?: string;
  name: string;
  description?: string;
  price: number;
}

export interface Product {
  _id: string;
  storeId: string;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  images: ProductImage[];
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;
  sku?: string;
  barcode?: string;
  trackInventory?: boolean;
  inventory: ProductInventory;
  category?: string;
  categoryId?: string;
  tags?: string[];
  features?: ProductFeature[];
  extras?: ProductExtra[];
  ratingAverage?: number;
  ratingCount?: number;
  status: ProductStatus;
  isActive?: boolean;
  totalStock?: number;
  totalReserved?: number;
  totalAvailable?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface UploadedImage {
  url: string;
  publicId: string;
  isMain: boolean;
}

// ---------------------------------------------------------------------------
// Store settings
// ---------------------------------------------------------------------------

export interface StoreBranding {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  bannerImage?: { url: string; publicId: string };
}

export interface StoreContact {
  email?: string;
  phone?: string;
  address?: string;
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
}

export interface ShippingZone {
  name: string;
  cities: string[];
  rate: number;
  freeShippingThreshold?: number;
}

export interface StoreShippingSettings {
  enabled: boolean;
  provider: 'local' | 'bosta' | 'aramex';
  zones: ShippingZone[];
}

export interface StoreSettings {
  currency: string;
  language: string;
  timezone: string;
  shipping: StoreShippingSettings;
  tax: { enabled: boolean; rate: number; includedInPrice: boolean };
}

export interface Store {
  _id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  logo?: { url: string; publicId: string };
  favicon?: { url: string; publicId: string };
  status: 'draft' | 'live' | 'paused';
  isPublished: boolean;
  branding: StoreBranding;
  contact: StoreContact;
  domain: { type: 'subdomain' | 'custom'; subdomain: string; customDomain?: string; isVerified: boolean };
  settings: StoreSettings;
  stats?: { totalProducts: number; totalOrders: number; totalRevenue: number; totalCustomers: number };
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export type CouponType = 'percentage' | 'fixed' | 'free_shipping';

export interface Coupon {
  _id: string;
  storeId: string;
  code: string;
  type: CouponType;
  value: number;
  maxUsage: number; // -1 = unlimited
  usageCount: number;
  minOrderAmount?: number;
  expiresAt?: string;
  isActive: boolean;
  autoApply?: boolean;
  createdAt: string;
}

export interface CouponListResponse {
  success: boolean;
  coupons: Coupon[];
}

export interface CouponResponse {
  success: boolean;
  coupon: Coupon;
}
