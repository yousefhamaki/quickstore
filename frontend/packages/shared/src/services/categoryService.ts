import api from './api';

export interface Category {
    _id: string;
    storeId: string;
    name: string;
    slug: string;
    description?: string;
    image?: { url: string; publicId: string };
    isActive: boolean;
    sortOrder: number;
    productCount?: number;
    createdAt: string;
    updatedAt: string;
}

export const getCategories = async (storeId: string): Promise<Category[]> => {
    const response = await api.get(`/categories?storeId=${storeId}`);
    return response.data as Category[];
};

export const createCategory = async (storeId: string, data: Partial<Category>): Promise<Category> => {
    const response = await api.post('/categories', { ...data, storeId });
    return response.data as Category;
};

export const updateCategory = async (id: string, storeId: string, data: Partial<Category>): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, { ...data, storeId });
    return response.data as Category;
};

export const deleteCategory = async (id: string, storeId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/categories/${id}`, { data: { storeId } } as any);
    return response.data as { message: string };
};
