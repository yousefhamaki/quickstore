import { Response } from 'express';
import Category from '../models/Category';
import Product from '../models/Product';
import { AuthRequest, resolveStore } from '../middleware/authMiddleware';
import { clearStoreProductCaches } from './productController';

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

// @desc    List categories for a store (merchant dashboard)
// @route   GET /api/categories
// @access  Private/Merchant
export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const categories = await Category.find({ storeId: store._id }).sort({ sortOrder: 1, name: 1 }).lean();

        // Product counts per category — cheap enough at typical catalog
        // sizes and saves the merchant dashboard a second round trip.
        const counts = await Product.aggregate([
            { $match: { storeId: store._id, categoryId: { $ne: null } } },
            { $group: { _id: '$categoryId', count: { $sum: 1 } } }
        ]);
        const countMap = new Map(counts.map((c: any) => [c._id.toString(), c.count]));

        res.json(categories.map(c => ({ ...c, productCount: countMap.get((c._id as any).toString()) || 0 })));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Merchant
export const createCategory = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { name, description, image, isActive, sortOrder } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ message: 'Category name is required' });
        }

        const baseSlug = slugify(name);
        let slug = baseSlug;
        let counter = 1;
        while (await Category.findOne({ storeId: store._id, slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const category = await Category.create({
            storeId: store._id,
            name: name.trim(),
            slug,
            description,
            image,
            isActive: isActive !== undefined ? isActive : true,
            sortOrder: sortOrder || 0
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Merchant
export const updateCategory = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const category = await Category.findOne({ _id: req.params.id, storeId: store._id });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const { name, description, image, isActive, sortOrder } = req.body;
        const nameChanged = name?.trim() && name.trim() !== category.name;

        if (nameChanged) {
            category.name = name.trim();
            // Products denormalize the category name for cheap display —
            // keep them in sync so a rename doesn't leave stale text behind.
            await Product.updateMany({ storeId: store._id, categoryId: category._id }, { $set: { category: category.name } });
        }
        if (description !== undefined) category.description = description;
        if (image !== undefined) category.image = image;
        if (isActive !== undefined) category.isActive = isActive;
        if (sortOrder !== undefined) category.sortOrder = sortOrder;

        await category.save();

        if (nameChanged) {
            await clearStoreProductCaches(store._id.toString());
        }

        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Merchant
export const deleteCategory = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const category = await Category.findOne({ _id: req.params.id, storeId: store._id });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const productCount = await Product.countDocuments({ storeId: store._id, categoryId: category._id });
        if (productCount > 0) {
            return res.status(400).json({
                message: `Cannot delete a category with ${productCount} product(s) assigned. Move them to another category first.`
            });
        }

        await category.deleteOne();
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
