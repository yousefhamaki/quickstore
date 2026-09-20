import api from '../api';
import { Order, OrdersResponse } from '../types';

export interface OrderFilters {
  pageNumber?: number;
  status?: string;
  search?: string;
}

export async function getOrders(filters?: OrderFilters): Promise<OrdersResponse> {
  const params = new URLSearchParams();
  if (filters?.pageNumber) params.append('pageNumber', String(filters.pageNumber));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  const { data } = await api.get<OrdersResponse>(`/orders?${params.toString()}`);
  return data;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
}

export async function updateOrderStatus(id: string, status: string, reason?: string): Promise<Order> {
  const { data } = await api.put<Order>(`/orders/${id}/status`, { status, reason });
  return data;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
}

export async function getOrderStats(): Promise<OrderStats> {
  const { data } = await api.get<OrderStats>('/orders/stats');
  return data;
}
