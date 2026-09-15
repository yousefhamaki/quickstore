import express from 'express';
import { getActiveArticles, getArticleById, trackArticleView, submitArticleFeedback, getAllArticles, createArticle, updateArticle, deleteArticle } from '../controllers/articleController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getActiveArticles);
router.post('/:id/view', trackArticleView);
router.post('/:id/feedback', submitArticleFeedback);

// Admin routes (requires authentication and admin privileges) — MUST be
// registered before the "/:id" catch-all below, or a request to "/admin"
// would match "/:id" first (with id="admin") and hit the wrong, unprotected
// handler instead.
router.get('/admin', protect, authorize('super_admin', 'support_admin', 'read_only_admin', 'finance_admin'), getAllArticles);
router.post('/admin', protect, authorize('super_admin', 'support_admin', 'read_only_admin', 'finance_admin'), createArticle);
router.put('/admin/:id', protect, authorize('super_admin', 'support_admin', 'read_only_admin', 'finance_admin'), updateArticle);
router.delete('/admin/:id', protect, authorize('super_admin', 'support_admin', 'read_only_admin', 'finance_admin'), deleteArticle);

// Public — single article, e.g. the /support?id= deep link. Registered
// last so it never shadows "/admin" above.
router.get('/:id', getArticleById);

export default router;
