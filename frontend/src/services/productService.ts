import api from './api';

export interface ProductFilters {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    stockLevel?: 'low' | 'out';
    storeId?: string;
}

export const getProducts = async (filters?: ProductFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.stockLevel) params.append('stockLevel', filters.stockLevel);
    if (filters?.storeId) params.append('storeId', filters.storeId);

    const response = await api.get(`/products?${params.toString()}`);
    return response.data;
};

export const getProductById = async (id: string) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
};

export const createProduct = async (productData: any) => {
    const response = await api.post('/products', productData);
    return response.data;
};

export const updateProduct = async (id: string, productData: any) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
};

export const deleteProduct = async (id: string) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
};

export const uploadImages = async (formData: FormData) => {
    const response = await api.post('/products/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const deleteProductImage = async (productId: string, imageId: string) => {
    const response = await api.delete(`/products/${productId}/images/${imageId}`);
    return response.data;
};

export const getCategories = async () => {
    const response = await api.get('/products/categories');
    return response.data;
};

export const bulkUpdateStatus = async (productIds: string[], status: string) => {
    const response = await api.post('/products/bulk-update', { productIds, status });
    return response.data;
};
