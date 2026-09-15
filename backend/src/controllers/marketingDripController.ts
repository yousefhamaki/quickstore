import { Request, Response } from 'express';
import User from '../models/User';
import { verifyMarketingUnsubscribeToken } from '../utils/marketingUnsubscribeToken';

/**
 * Public (unauthenticated) unsubscribe link target for the merchant
 * onboarding/activation drip (see services/marketing/MerchantDripService.ts
 * and emailService.ts's buildMarketingUnsubscribeLink). A merchant clicking
 * the link in any drip email lands here directly — no login required — and
 * gets a plain confirmation page. Flips `marketingOptOut` on their User
 * document; the drip sweep checks that flag before ever sending again.
 *
 * Unrelated to the storefront-shopper newsletter unsubscribe (Customer.
 * consentHistory / publicController.ts) — this is Buildora's own merchant
 * audience.
 */
const renderUnsubscribeResultPage = (res: Response, status: 'ok' | 'invalid', title: string, message: string) => {
    res.status(status === 'ok' ? 200 : 400).send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; color: #2d3748; margin: 0; padding: 0; }
  .wrap { max-width: 480px; margin: 80px auto; padding: 20px; text-align: center; }
  .card { background: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 2px solid #edf2f7; }
  h1 { font-size: 22px; color: #1a202c; margin-top: 0; }
  p { font-size: 15px; color: #4a5568; line-height: 1.5; }
</style>
</head>
<body>
  <div class="wrap"><div class="card"><h1>${title}</h1><p>${message}</p></div></div>
</body>
</html>`);
};

export const unsubscribeFromMarketingDrip = async (req: Request, res: Response) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const userId = token ? verifyMarketingUnsubscribeToken(token) : null;

    if (!userId) {
        return renderUnsubscribeResultPage(
            res,
            'invalid',
            'Link expired or invalid',
            'This unsubscribe link is no longer valid. If you still wish to stop receiving these emails, please contact support.'
        );
    }

    await User.updateOne({ _id: userId }, { $set: { marketingOptOut: true } });

    return renderUnsubscribeResultPage(
        res,
        'ok',
        "You've been unsubscribed",
        "You won't receive any more onboarding tips or activation emails from Buildora. This does not affect billing, security, or order-related emails."
    );
};
