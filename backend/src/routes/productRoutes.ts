import express from 'express';
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    uploadProductImages,
    deleteProductImage,
    getCategories,
    bulkUpdateStatus,
    exportProducts,
    importProducts,
} from '../controllers/productController';
import { protect, authorize } from '../middleware/authMiddleware';
import { upload } from '../config/cloudinary';
import { csvUpload } from '../config/csvUpload';
import { billingContext, protectProductLimit } from '../middleware/billingMiddleware';

const router = express.Router();

router
    .route('/')
    .get(protect, authorize('merchant'), getProducts)
    .post(protect, authorize('merchant'), billingContext, protectProductLimit, createProduct);

router.post(
    '/upload',
    protect,
    authorize('merchant'),
    upload.array('images', 10),
    uploadProductImages
);

router.get('/categories', protect, authorize('merchant'), getCategories);
router.post('/bulk-update', protect, authorize('merchant'), bulkUpdateStatus);
router.get('/export', protect, authorize('merchant'), exportProducts);
router.post('/import', protect, authorize('merchant'), csvUpload.single('file'), importProducts);

router
    .route('/:id')
    .get(getProductById)
    .put(protect, authorize('merchant'), updateProduct)
    .delete(protect, authorize('merchant'), deleteProduct);

router.delete('/:id/images/:imageId', protect, authorize('merchant'), deleteProductImage);

export default router;
