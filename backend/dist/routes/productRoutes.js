"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const cloudinary_1 = require("../config/cloudinary");
const router = express_1.default.Router();
router
    .route('/')
    .get(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), productController_1.getProducts)
    .post(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), productController_1.createProduct);
router.post('/upload', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), cloudinary_1.upload.array('images', 10), productController_1.uploadProductImages);
router.get('/categories', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), productController_1.getCategories);
router.post('/bulk-update', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), productController_1.bulkUpdateStatus);
router
    .route('/:id')
    .get(productController_1.getProductById)
    .put(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), productController_1.updateProduct)
    .delete(authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), productController_1.deleteProduct);
router.delete('/:id/images/:imageId', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), productController_1.deleteProductImage);
exports.default = router;
