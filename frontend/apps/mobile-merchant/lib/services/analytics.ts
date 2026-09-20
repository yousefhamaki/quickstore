import api from '../api';
import {
  AnalyticsOverview,
  AnalyticsPeriod,
  CustomersAnalytics,
  RecentOrderSummary,
  RevenuePoint,
  TopProduct,
} from '../types';

export async function getAnalyticsOverview(days = 30): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>(`/analytics/overview?days=${days}`);
  return data;
}

// GET /api/analytics/revenue?period=daily|weekly|monthly — a plain array of
// time-bucketed points; the lookback window is fixed server-side per period
// (daily -> 30d, weekly -> 90d, monthly -> 365d), not independently settable.
export async function getRevenueSeries(period: AnalyticsPeriod = 'daily'): Promise<RevenuePoint[]> {
  const { data } = await api.get<RevenuePoint[]>(`/analytics/revenue?period=${period}`);
  return data;
}

export async function getTopProducts(limit = 5): Promise<TopProduct[]> {
  const { data } = await api.get<TopProduct[]>(`/analytics/top-products?limit=${limit}`);
  return data;
}

export async function getRecentOrders(limit = 10): Promise<RecentOrderSummary[]> {
  const { data } = await api.get<RecentOrderSummary[]>(`/analytics/recent-orders?limit=${limit}`);
  return data;
}

export async function getCustomerAnalytics(): Promise<CustomersAnalytics> {
  const { data } = await api.get<CustomersAnalytics>('/analytics/customers');
  return data;
}
