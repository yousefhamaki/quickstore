import { z } from 'zod';

export const storeBrandingSchema = z.object({
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
    secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
    fontFamily: z.string().min(1, 'Font family is required'),
});

export const storeContactSchema = z.object({
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    whatsapp: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
    facebook: z.string().url('Invalid URL').optional().or(z.literal('')),
    instagram: z.string().optional().or(z.literal('')),
});

export const createStoreSchema = z.object({
    name: z.string().min(3, 'Store name must be at least 3 characters'),
    description: z.string().max(500, 'Description too long').optional(),
    category: z.string().min(1, 'Please select a category'),
    branding: storeBrandingSchema,
    contact: storeContactSchema,
    domain: z.object({
        subdomain: z.string()
            .min(3, 'Subdomain must be at least 3 characters')
            .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
    }),
});

export const updateStoreSchema = z.object({
    name: z.string().min(3, 'Store name must be at least 3 characters').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    category: z.string().optional(),
    branding: storeBrandingSchema.partial().optional(),
    contact: storeContactSchema.partial().optional(),
});
