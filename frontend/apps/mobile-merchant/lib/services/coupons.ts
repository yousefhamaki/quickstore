import api from '../api';
import { Coupon, CouponListResponse, CouponResponse, CouponType } from '../types';

// GET /api/coupons?storeId=... — storeId is a required query param (unlike
// products/orders, which resolve the store implicitly). Response is wrapped
// in { success, coupons } rather than raw, unlike most other list endpoints.
export async function getCoupons(storeId: string): Promise<Coupon[]> {
  const { data } = await api.get<CouponListResponse>(`/coupons?storeId=${storeId}`);
  return data.coupons;
}

export interface CouponInput {
  storeId: string;
  code: string;
  type: CouponType;
  value: number;
  maxUsage?: number; // -1 = unlimited (backend default)
  minOrderAmount?: number;
  expiresAt?: string;
  isActive?: boolean;
  autoApply?: boolean;
}

export async function createCoupon(payload: CouponInput): Promise<Coupon> {
  const { data } = await api.post<CouponResponse>('/coupons', payload);
  return data.coupon;
}

export async function updateCoupon(id: string, payload: Partial<CouponInput>): Promise<Coupon> {
  const { data } = await api.put<CouponResponse>(`/coupons/${id}`, payload);
  return data.coupon;
}

export async function deleteCoupon(id: string): Promise<void> {
  await api.delete(`/coupons/${id}`);
}
