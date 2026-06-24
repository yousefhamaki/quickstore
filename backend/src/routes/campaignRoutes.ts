import express from 'express';
import { 
    getCampaigns, 
    getCampaignById, 
    createCampaign, 
    updateCampaign, 
    deleteCampaign, 
    sendCampaign 
} from '../controllers/campaignController';
import { protect, authorize } from '../middleware/authMiddleware';
import { billingContext } from '../middleware/billingMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));
router.use(billingContext);

router.route('/')
    .get(getCampaigns)
    .post(createCampaign);

router.route('/:id')
    .get(getCampaignById)
    .put(updateCampaign)
    .delete(deleteCampaign);

router.post('/:id/send', sendCampaign);

export default router;
