import api from '../api';
import { Product, ProductsResponse, UploadedImage } from '../types';

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

export async function getProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
}

export type ProductInput = Partial<
  Pick<
    Product,
    | 'name'
    | 'description'
    | 'shortDescription'
    | 'price'
    | 'compareAtPrice'
    | 'costPerItem'
    | 'sku'
    | 'barcode'
    | 'trackInventory'
    | 'inventory'
    | 'images'
    | 'category'
    | 'categoryId'
    | 'tags'
    | 'status'
    | 'isActive'
  >
> & { storeId?: string };

// storeId is required in the body (not just resolvable via header) because
// protectProductLimit independently reads req.body.storeId/query.storeId to
// check the plan's product limit — see backend/src/middleware/billingMiddleware.ts.
export async function createProduct(storeId: string, payload: ProductInput): Promise<Product> {
  const { data } = await api.post<Product>('/products', { ...payload, storeId });
  return data;
}

export async function updateProduct(id: string, payload: ProductInput): Promise<Product> {
  const { data } = await api.put<Product>(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}`);
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  await api.delete(`/products/${productId}/images/${imageId}`);
}

export async function bulkUpdateProductStatus(productIds: string[], status: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/products/bulk-update', { productIds, status });
  return data;
}

export async function getProductCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>('/products/categories');
  return data;
}

// POST /api/products/upload — multipart, field name "images" (array, up to
// 10). Response is a plain array; the caller is responsible for attaching it
// to a product's `images` field on create/update and choosing one `isMain`.
export async function uploadProductImages(
  files: { uri: string; name: string; type: string }[]
): Promise<UploadedImage[]> {
  const form = new FormData();
  files.forEach((file) => {
    form.append('images', { uri: file.uri, name: file.name, type: file.type } as any);
  });
  const { data } = await api.post<UploadedImage[]>('/products/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
