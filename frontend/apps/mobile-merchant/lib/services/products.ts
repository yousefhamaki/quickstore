import api from '../api';
import { ProductsResponse } from '../types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  stockLevel?: 'low' | 'out';
}

export async function getProducts(filters?: ProductFilters): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.stockLevel) params.append('stockLevel', filters.stockLevel);
  const { data } = await api.get<ProductsResponse>(`/products?${params.toString()}`);
  return data;
}
