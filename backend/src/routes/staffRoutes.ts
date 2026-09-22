import express from 'express';
import { inviteStaff, listStaff, removeStaff, acceptInvite } from '../controllers/staffController';
import { protect, authorize, requireStoreRole } from '../middleware/authMiddleware';
import rateLimit from 'express-rate-limit';

// Mounted at /api/stores/:storeId/staff (see server.ts) — mergeParams so
// req.params.storeId (from the parent mount) is visible in this router.
const router = express.Router({ mergeParams: true });

router.use(protect);
router.use(authorize('merchant'));
// Staff management is owner-only — a manager/staff member must never be
// able to invite/list/remove teammates, even though they can otherwise
// access this store. requireStoreRole resolves req.params.storeId itself
// (via resolveStore) and attaches req.store for the controllers below.
router.use(requireStoreRole(['owner']));

router.post('/invite', inviteStaff);
router.get('/', listStaff);
router.delete('/:staffId', removeStaff);

export default router;

// Separate, public router for accepting an invite (not store-scoped, no
// merchant JWT required — the invite token itself is the credential).
const acceptRouter = express.Router();
const acceptLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { message: 'Too many attempts, please try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// @ts-ignore
acceptRouter.post('/accept-invite', acceptLimiter, acceptInvite);
export { acceptRouter };
