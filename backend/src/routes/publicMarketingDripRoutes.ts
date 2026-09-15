import express from 'express';
import { unsubscribeFromMarketingDrip } from '../controllers/marketingDripController';

// Public/unauthenticated — reached directly from a link in a drip email
// footer (see services/marketing/MerchantDripService.ts). Kept as its own
// route file rather than added to routes/publicRoutes.ts to keep this
// feature's footprint isolated and easy to merge alongside the other
// features being built in parallel off the same base commit.
const router = express.Router();

router.get('/unsubscribe', unsubscribeFromMarketingDrip);

export default router;
