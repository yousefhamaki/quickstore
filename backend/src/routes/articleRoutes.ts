import express from 'express';
import { getActiveArticles, getAllArticles, createArticle, updateArticle, deleteArticle } from '../controllers/articleController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getActiveArticles);

// Admin routes (requires authentication and admin privileges)
router.get('/admin', protect, authorize('admin'), getAllArticles);
router.post('/admin', protect, authorize('admin'), createArticle);
router.put('/admin/:id', protect, authorize('admin'), updateArticle);
router.delete('/admin/:id', protect, authorize('admin'), deleteArticle);

export default router;
