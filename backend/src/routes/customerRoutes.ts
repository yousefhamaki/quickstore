import express from 'express';
import { getCustomers, getCustomerById } from '../controllers/customerController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));

router.get('/', getCustomers);
router.get('/:id', getCustomerById);

export default router;
