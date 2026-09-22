import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { IStore, IEmailBlock } from '../models/Store';
import { interpolateTokens } from '../utils/emailTokens';
import {
    renderBlocksToHtml,
    normalizeEmailTemplate,
    buildDefaultTemplateBlocks,
    getDefaultTemplateSubject,
    StoreEmailTemplateType
} from './emailBlockRenderer';
import { sendStoreEmail } from './mailer/storeMailer';
import { generateMarketingUnsubscribeToken } from '../utils/marketingUnsubscribeToken';

let resendInstance: Resend | null = null;
const getResendClient = () => {
    if (!resendInstance) {
        const apiKey = process.env.RESEND_API_KEY;
        resendInstance = new Resend(apiKey || 'placeholder');
    }
    return resendInstance;
};

const DEFAULT_FROM = 'Buildora <no-reply@quickstore.live>';

// Register Handlebars helper functions
Handlebars.registerHelper('concat', (...args: any[]) => {
    return args.slice(0, -1).join('');
});

Handlebars.registerHelper('formatCurrency', (amount: number, currency: string) => {
    const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : amount;
    return `${formattedAmount} ${currency || 'EGP'}`;
});

Handlebars.registerHelper('formatDate', (dateString: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return dateString;
    }
});

/**
 * Bulletproof template directory path resolution for dev (TSX) and prod (dist/JS)
 */
const getTemplatesDir = (): string => {
    const pathsToSearch = [
        path.join(process.cwd(), 'src/templates/emails'),
        path.join(__dirname, '../templates/emails'),
        path.join(__dirname, '../../src/templates/emails'),
        path.join(__dirname, '../../../src/templates/emails')
    ];

    for (const searchPath of pathsToSearch) {
        if (fs.existsSync(searchPath)) {
            return searchPath;
        }
    }
    
    console.error('[EmailService] templates directory not found. Searched paths:', pathsToSearch);
    return path.join(process.cwd(), 'src/templates/emails');
};

const templatesDir = getTemplatesDir();

/**
 * Renders an HTML template dynamically using Handlebars with layout partial support
 */
export const renderTemplate = (templateName: string, variables: any): string => {
    const layoutPath = path.join(templatesDir, 'layout.html');
    const templatePath = path.join(templatesDir, templateName);

    if (!fs.existsSync(layoutPath)) {
        throw new Error(`[EmailService] Layout file not found at: ${layoutPath}`);
    }
    if (!fs.existsSync(templatePath)) {
        throw new Error(`[EmailService] Template file not found at: ${templatePath}`);
    }

    const layoutSource = fs.readFileSync(layoutPath, 'utf8');
    Handlebars.registerPartial('layout', layoutSource);

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(templateSource);
    return compiled(variables);
};

/**
 * Sends a verification email to a storefront buyer to verify their account.
 */
export const sendBuyerVerificationEmail = async (
    buyerEmail: string,
    storeName: string,
    verificationLink: string,
    merchantEmail?: string
) => {
    try {
        console.log(`[EmailService] Sending buyer verification email to ${buyerEmail} for store: ${storeName}`);
        
        const html = renderTemplate('buyer_verification.html', {
            storeName,
            verificationLink
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: buyerEmail,
            subject: `Verify your account - ${storeName}`,
            replyTo: merchantEmail,
            html
        });
        return response;
    } catch (error) {
        console.error('[EmailService] Error sending buyer verification email:', error);
        throw error;
    }
};

/**
 * Sends a store-staff invite email — the same raw-token-in-URL pattern as
 * sendBuyerVerificationEmail, used by staffController.inviteStaff.
 */
export const sendStaffInviteEmail = async (
    inviteeEmail: string,
    storeName: string,
    inviterName: string,
    role: string,
    acceptUrl: string
) => {
    try {
        console.log(`[EmailService] Sending staff invite email to ${inviteeEmail} for store: ${storeName}`);

        const html = renderTemplate('staff_invite.html', {
            storeName,
            inviterName,
            role,
            acceptUrl
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: inviteeEmail,
            subject: `You've been invited to join ${storeName} on Buildora`,
            html
        });
        return response;
    } catch (error) {
        console.error('[EmailService] Error sending staff invite email:', error);
        throw error;
    }
};

/**
 * Sends a welcome email to a new merchant signing up to Buildora SaaS.
 */
export const sendMerchantWelcomeEmail = async (
    merchantEmail: string,
    merchantName: string,
    dashboardLink: string = 'https://www.quickstore.live/auth/login'
) => {
    try {
        console.log(`[EmailService] Sending merchant welcome email to ${merchantEmail}`);
        
        const html = renderTemplate('merchant_welcome.html', {
            merchantName,
            dashboardLink
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: 'Welcome to Buildora!',
            html
        });
        return response;
    } catch (error) {
        console.error('[EmailService] Error sending merchant welcome email:', error);
        throw error;
    }
};

export interface InvoiceItem {
    name: string;
    quantity: number;
    price: number;
}

export interface InvoiceDetails {
    invoiceNumber: string;
    buyerName: string;
    amount: number;
    currency?: string;
    date: string;
    paymentMethod: string;
    items: InvoiceItem[];
}

/**
 * Sends a transactional receipt invoice to a storefront buyer.
 */
export const sendInvoiceEmail = async (
    buyerEmail: string,
    storeName: string,
    invoiceDetails: InvoiceDetails,
    merchantEmail?: string
) => {
    try {
        console.log(`[EmailService] Sending invoice email to ${buyerEmail} for store: ${storeName}`);
        
        const html = renderTemplate('invoice.html', {
            storeName,
            invoiceNumber: invoiceDetails.invoiceNumber,
            buyerName: invoiceDetails.buyerName,
            amount: invoiceDetails.amount,
            currency: invoiceDetails.currency || 'EGP',
            date: invoiceDetails.date,
            paymentMethod: invoiceDetails.paymentMethod,
            items: invoiceDetails.items
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: buyerEmail,
            subject: `Invoice for your order at ${storeName}`,
            replyTo: merchantEmail,
            html
        });
        return response;
    } catch (error) {
        console.error('[EmailService] Error sending invoice email:', error);
        throw error;
    }
};

/**
 * Sends a subscription expiry warning email to a merchant.
 */
export const sendSubscriptionExpiryWarning = async (
    merchantEmail: string,
    merchantName: string,
    expiryDate: string,
    renewLink: string = 'https://www.quickstore.live/merchant/plans'
) => {
    try {
        console.log(`[EmailService] Sending subscription expiry warning to ${merchantEmail}`);
        
        const html = renderTemplate('subscription_expiry.html', {
            merchantName,
            expiryDate,
            renewLink
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: 'Action Required: Your Buildora subscription is expiring soon',
            html
        });
        return response;
    } catch (error) {
        console.error('[EmailService] Error sending subscription expiry warning:', error);
        throw error;
    }
};

/**
 * Sends a general password recovery email. This is the STOREFRONT
 * CUSTOMER's forgot-password flow (customerAuthController.ts) — despite
 * living among the account-security functions below, it's genuinely
 * store-to-customer, so it's routed through the store's own sender when
 * one is configured.
 */
export const sendPasswordResetEmail = async (
    store: Pick<IStore, 'name' | 'settings'>,
    email: string,
    resetLink: string
) => {
    try {
        console.log(`[EmailService] Sending password reset email to ${email}`);

        const html = renderTemplate('password_reset.html', {
            resetLink
        });

        const result = await sendStoreEmail(store, {
            to: email,
            subject: 'Reset your password',
            html
        });
        if (!result.ok) throw new Error(result.error || 'Failed to send password reset email');
        return result;
    } catch (error) {
        console.error('[EmailService] Error sending password reset email:', error);
        throw error;
    }
};

/**
 * Notifies a customer that their order has shipped, with the carrier,
 * tracking number, and a link to track it (either the carrier's own
 * tracking page when one is known, or this store's own track-order page
 * otherwise).
 */
export const sendOrderShippedEmail = async (
    store: Pick<IStore, 'name' | 'settings'>,
    email: string,
    orderNumber: string,
    carrierName: string,
    trackingNumber: string,
    trackUrl: string
) => {
    try {
        const html = renderTemplate('order_shipped.html', {
            storeName: store.name,
            orderNumber,
            carrierName,
            trackingNumber,
            trackUrl,
        });
        const result = await sendStoreEmail(store, {
            to: email,
            subject: `Your ${store.name} order #${orderNumber} has shipped`,
            html
        });
        if (!result.ok) throw new Error(result.error || 'Failed to send order shipped email');
        return result;
    } catch (error) {
        console.error('[EmailService] Error sending order shipped email:', error);
        throw error;
    }
};

export interface AbandonedCartRecoveryItem {
    name: string;
    quantity: number;
    price: number;
    image?: string;
}

/**
 * Sends the abandoned-cart recovery reminder — fired once by the recovery
 * sweep (see services/AbandonedCartRecoveryService.ts) for a cart that's sat
 * `pending` past the sweep's age window. Routed through the store's own
 * sender when configured, like the other store-to-customer transactional
 * emails above (order shipped, password reset), since this is a
 * customer-facing nudge from the store, not Buildora itself.
 */
export const sendAbandonedCartRecoveryEmail = async (
    store: Pick<IStore, 'name' | 'settings'>,
    email: string,
    recoveryUrl: string,
    items: AbandonedCartRecoveryItem[],
    totalAmount: number,
    currency: string = 'EGP'
) => {
    try {
        const html = renderTemplate('abandoned_cart_recovery.html', {
            storeName: store.name,
            recoveryUrl,
            items,
            totalAmount: typeof totalAmount === 'number' ? totalAmount.toFixed(2) : totalAmount,
            currency,
        });
        const result = await sendStoreEmail(store, {
            to: email,
            subject: `You left something behind at ${store.name}`,
            html
        });
        if (!result.ok) throw new Error(result.error || 'Failed to send abandoned cart recovery email');
        return result;
    } catch (error) {
        console.error('[EmailService] Error sending abandoned cart recovery email:', error);
        throw error;
    }
};

/**
 * Sends the automatically-issued post-purchase personal voucher — fired
 * once by orderController.updateOrderStatus the first time an order
 * reaches 'delivered' (see Store.settings.postPurchaseVoucher). Routed
 * through the store's own sender when configured, like the other
 * store-to-customer transactional emails above (order shipped, password
 * reset), since this is a customer-facing email from the store, not
 * Buildora itself.
 */
export const sendPostPurchaseVoucherEmail = async (
    store: Pick<IStore, 'name' | 'settings'>,
    customerEmail: string,
    voucher: {
        code: string;
        type: 'percentage' | 'fixed';
        value: number;
        expiresAt: Date;
        orderNumber: string;
    }
) => {
    try {
        const valueLabel = voucher.type === 'percentage' ? `${voucher.value}%` : `EGP ${voucher.value}`;
        const html = renderTemplate('post_purchase_voucher.html', {
            storeName: store.name,
            orderNumber: voucher.orderNumber,
            code: voucher.code,
            valueLabel,
            expiresAt: voucher.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        });
        const result = await sendStoreEmail(store, {
            to: customerEmail,
            subject: `A little thank-you from ${store.name} — here's ${valueLabel} off your next order`,
            html
        });
        if (!result.ok) throw new Error(result.error || 'Failed to send post-purchase voucher email');
        return result;
    } catch (error) {
        console.error('[EmailService] Error sending post-purchase voucher email:', error);
        throw error;
    }
};

/**
 * Sends a 6-digit code for email-based 2FA login challenges.
 */
export const sendTwoFactorCodeEmail = async (email: string, code: string) => {
    try {
        const html = renderTemplate('two_factor_code.html', { code });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject: `${code} is your Buildora verification code`,
            html
        });
    } catch (error) {
        console.error('[EmailService] Error sending 2FA code email:', error);
        throw error;
    }
};

/**
 * Alerts the account owner that a login just happened from a device/browser
 * we haven't seen before for this account.
 */
export const sendNewDeviceLoginEmail = async (email: string, deviceLabel: string, ip: string, time: string) => {
    try {
        const html = renderTemplate('new_device_login.html', { deviceLabel, ip: ip || 'Unknown', time });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject: 'New sign-in to your Buildora account',
            html
        });
    } catch (error) {
        console.error('[EmailService] Error sending new device login email:', error);
        throw error;
    }
};

/**
 * Confirms a password change and reminds the merchant their other sessions
 * were signed out as a result.
 */
export const sendPasswordChangedEmail = async (email: string) => {
    try {
        const html = renderTemplate('password_changed.html', {});
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject: 'Your Buildora password was changed',
            html
        });
    } catch (error) {
        console.error('[EmailService] Error sending password changed email:', error);
        throw error;
    }
};

// ============================================================================
// Store-customizable transactional emails (order confirmation / status
// changed / a reusable marketing template) — see models/Store.ts's
// IEmailNotificationSettings. Every store gets a sensible default; a
// merchant only needs to touch the Emails settings section to override
// pieces of it. Credit-gating (checking/debiting the store's email
// balance) lives in services/orderEmailService.ts, which calls
// sendStoreTemplatedEmail below only once it's confirmed there's balance.
// ============================================================================

export type { StoreEmailTemplateType };

interface StoreEmailTemplate {
    subject: string;
    blocks: IEmailBlock[];
}

/**
 * Resolves a store's saved template override (if any) over the store-aware
 * built-in default (see emailBlockRenderer.ts's buildDefaultTemplateBlocks
 * — includes the store's own logo when it has one) — a blank subject falls
 * back to the default individually; the blocks array is all-or-nothing (a
 * store that customized its blocks uses exactly those, not a field-by-field
 * merge, since blocks are a list, not a flat set of fields). Runs legacy
 * heading/body data (saved before the block editor existed) through
 * normalizeEmailTemplate first, so old stores never end up with a truly
 * empty email.
 */
function resolveStoreEmailTemplate(
    store: Pick<IStore, 'name' | 'logo'> & { settings?: { emailNotifications?: { templates?: Partial<Record<StoreEmailTemplateType, Partial<StoreEmailTemplate> & { heading?: string; body?: string }>> } } },
    type: StoreEmailTemplateType
): StoreEmailTemplate {
    const custom = normalizeEmailTemplate(store.settings?.emailNotifications?.templates?.[type]);
    return {
        subject: custom.subject?.trim() || getDefaultTemplateSubject(type),
        blocks: custom.blocks.length > 0 ? custom.blocks : buildDefaultTemplateBlocks(store, type),
    };
}

/**
 * Sends one of a store's (possibly merchant-customized) transactional
 * templates to a customer, routed through the store's own sender when
 * configured (see services/mailer/storeMailer.ts). Callers are
 * responsible for credit-gating BEFORE calling this — see
 * services/orderEmailService.ts.
 */
export const sendStoreTemplatedEmail = async (
    email: string,
    store: Pick<IStore, 'name' | 'settings' | 'logo'>,
    type: StoreEmailTemplateType,
    vars: Record<string, string>
) => {
    const template = resolveStoreEmailTemplate(store, type);
    const allVars = { storeName: store.name, ...vars };

    const subject = interpolateTokens(template.subject, allVars);
    const bodyHtml = renderBlocksToHtml(template.blocks, allVars);

    try {
        const html = renderTemplate('store_generic.html', { storeName: store.name, subject, bodyHtml });
        const result = await sendStoreEmail(store, { to: email, subject, html });
        if (!result.ok) throw new Error(result.error || 'Failed to send store templated email');
        return result;
    } catch (error) {
        console.error(`[EmailService] Error sending store templated email (${type}):`, error);
        throw error;
    }
};

/**
 * Alerts the merchant that their store's email credit balance is running
 * low (crossed below 10) — sent once per crossing, not on every send while
 * still under the threshold. See CampaignQuotaService.debitTransactional.
 */
export const sendLowEmailBalanceAlert = async (merchantEmail: string, storeName: string, remaining: number) => {
    try {
        const bodyHtml = renderBlocksToHtml(
            [
                { id: 'alert-heading', type: 'heading', text: 'Your email credits are running low', level: 'h1', align: 'center' },
                { id: 'alert-body', type: 'text', text: `Your store "${storeName}" has ${remaining} email credit${remaining === 1 ? '' : 's'} left. Once it reaches 0, order confirmation and status update emails will stop going out to your customers automatically — top up or upgrade your plan to keep them running.`, align: 'center' },
            ],
            {}
        );
        const html = renderTemplate('store_generic.html', {
            storeName: 'Buildora',
            subject: `Low email credits on ${storeName}`,
            bodyHtml,
        });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: `Low email credits on ${storeName}`,
            html,
        });
    } catch (error) {
        console.error('[EmailService] Error sending low-balance alert:', error);
        throw error;
    }
};

/**
 * Tells the merchant a specific customer email was skipped because the
 * store's email credit balance is at 0 — fires per incident (once per
 * failed send) so the merchant knows exactly which customer/order didn't
 * get notified and can follow up manually if needed.
 */
export const sendZeroBalanceSkippedEmailAlert = async (
    merchantEmail: string,
    storeName: string,
    context: string
) => {
    try {
        const bodyHtml = renderBlocksToHtml(
            [
                { id: 'alert-heading', type: 'heading', text: "A customer email couldn't be sent", level: 'h1', align: 'center' },
                { id: 'alert-body', type: 'text', text: `Your store "${storeName}" is out of email credits (0 remaining), so we could NOT send this to your customer:\n\n${context}\n\nYour customer was not notified. Top up your email credits to resume automatic order confirmation and status update emails.`, align: 'center' },
            ],
            {}
        );
        const html = renderTemplate('store_generic.html', {
            storeName: 'Buildora',
            subject: `Action needed: customer email not sent (${storeName})`,
            bodyHtml,
        });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: `Action needed: customer email not sent (${storeName})`,
            html,
        });
    } catch (error) {
        console.error('[EmailService] Error sending zero-balance alert:', error);
        throw error;
    }
};

/**
 * WhatsApp's equivalent of sendZeroBalanceSkippedEmailAlert — tells the
 * merchant a customer WhatsApp message was skipped because the store's
 * WhatsApp credit balance is at 0. Always sent via Buildora's own email
 * sender (this is Buildora-to-merchant, not store-to-customer), same as
 * every other merchant-facing alert.
 */
export const sendWhatsAppZeroBalanceAlert = async (
    merchantEmail: string,
    storeName: string,
    context: string
) => {
    try {
        const bodyHtml = renderBlocksToHtml(
            [
                { id: 'alert-heading', type: 'heading', text: "A customer WhatsApp message couldn't be sent", level: 'h1', align: 'center' },
                { id: 'alert-body', type: 'text', text: `Your store "${storeName}" is out of WhatsApp credits (0 remaining), so we could NOT send this to your customer:\n\n${context}\n\nYour customer was not notified. Top up your WhatsApp credits to resume automatic order confirmation and status update messages.`, align: 'center' },
            ],
            {}
        );
        const html = renderTemplate('store_generic.html', {
            storeName: 'Buildora',
            subject: `Action needed: customer WhatsApp message not sent (${storeName})`,
            bodyHtml,
        });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: `Action needed: customer WhatsApp message not sent (${storeName})`,
            html,
        });
    } catch (error) {
        console.error('[EmailService] Error sending WhatsApp zero-balance alert:', error);
        throw error;
    }
};

// ============================================================================
// Signup-gift wallet credit email (services/platformConfigService.ts calls
// this once, only on an actual grant — see grantSignupGiftAndNotify). Kept
// as its own self-contained block so it merges cleanly alongside other
// concurrent additions to this file.
// ============================================================================

/**
 * Sends the "you just got X EGP" welcome-gift email when a new/newly
 * verified user is credited the signup gift wallet balance. The amount is
 * always the live, admin-configured value (see PlatformConfig / superadmin
 * settings), never hardcoded.
 */
export const sendSignupGiftEmail = async (
    merchantEmail: string,
    merchantName: string,
    amount: number,
    dashboardLink: string = 'https://www.quickstore.live/merchant/billing',
    currency: string = 'EGP'
) => {
    try {
        console.log(`[EmailService] Sending signup gift email to ${merchantEmail} for ${amount} ${currency}`);

        const html = renderTemplate('signup_gift.html', {
            merchantName: merchantName || 'there',
            amount,
            currency,
            dashboardLink
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: `You just got ${amount} ${currency} on Buildora!`,
            html
        });
        return response;
    } catch (error) {
        console.error('[EmailService] Error sending signup gift email:', error);
        throw error;
    }
};

// ============================================================================
// End signup-gift wallet credit email block
// ============================================================================

/**
 * Sends a support ticket receipt notification email.
 */
export const sendSupportTicketEmail = async (
    email: string,
    firstName: string,
    ticketId: string
) => {
    try {
        console.log(`[EmailService] Sending support ticket email to ${email} for ticket: ${ticketId}`);

        const html = renderTemplate('support_ticket.html', {
            firstName,
            ticketId
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject: `Support Ticket Received: ${ticketId}`,
            html
        });
        return response;
    } catch (error) {
        console.error('[EmailService] Error sending support ticket email:', error);
        throw error;
    }
};

// ============================================================================
// New-order owner alert email (storefront checkout -> merchant's own inbox).
// This is a FREE, UNGATED platform email — it must NEVER be routed through
// CampaignQuotaService / sendGatedCustomerEmail's credit debit, unlike the
// customer-facing order confirmation email. It's the operational, "your
// dashboard bell isn't enough" alert so a merchant who isn't watching the
// dashboard still finds out about a new order immediately. Sent straight to
// the merchant's own account email (User.email), same treatment as
// sendLowEmailBalanceAlert / sendZeroBalanceSkippedEmailAlert above.
// ============================================================================

export interface NewOrderOwnerItem {
    name: string;
    quantity: number;
}

export const sendNewOrderOwnerEmail = async (params: {
    ownerEmail: string;
    ownerName?: string;
    storeName: string;
    orderNumber: string;
    orderTotal: number;
    currency?: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    items: NewOrderOwnerItem[];
    orderLink: string;
}) => {
    const {
        ownerEmail,
        ownerName,
        storeName,
        orderNumber,
        orderTotal,
        currency,
        customerName,
        customerPhone,
        customerEmail,
        items,
        orderLink,
    } = params;

    try {
        const html = renderTemplate('new_order_owner.html', {
            ownerName: ownerName || '',
            storeName,
            orderNumber,
            orderTotal,
            currency: currency || 'EGP',
            customerName,
            customerPhone: customerPhone || '',
            customerEmail: customerEmail || '',
            items,
            orderLink,
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: ownerEmail,
            subject: `New order #${orderNumber} on ${storeName}`,
            html,
        });
        return response;
    } catch (error) {
        console.error('[EmailService] Error sending new-order owner alert email:', error);
        throw error;
    }
};

// ============================================================================
// Merchant onboarding/activation drip (marketing) — see
// services/marketing/MerchantDripService.ts for the sweep that decides
// *when* each of these fires (state-gated, not a flat calendar blast) and
// models/MarketingEmailLog.ts for the send-once bookkeeping. This is
// Buildora-to-merchant nurture email, NOT the storefront Campaign/
// CampaignRecipient broadcast tool (that's merchant-to-shopper, unrelated).
// Every email here carries a one-click unsubscribe link (signed via
// utils/marketingUnsubscribeToken.ts) so opting out never requires a login.
// ============================================================================

const getBackendBaseUrl = (): string =>
    process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

/** Builds the one-click unsubscribe link embedded in every drip email footer. */
const buildMarketingUnsubscribeLink = (userId: string): string => {
    const token = generateMarketingUnsubscribeToken(userId);
    return `${getBackendBaseUrl()}/api/public/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
};

/**
 * Day-1 nudge: sent ~24h after registration if the merchant still hasn't
 * created a store at all.
 */
export const sendMerchantDripCreateStoreEmail = async (
    merchantEmail: string,
    merchantName: string,
    userId: string,
    dashboardLink: string = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`
) => {
    try {
        const html = renderTemplate('marketing_drip_create_store.html', {
            merchantName,
            dashboardLink,
            unsubscribeLink: buildMarketingUnsubscribeLink(userId),
        });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: "Let's get your store live on Buildora",
            html
        });
    } catch (error) {
        console.error('[EmailService] Error sending marketing drip (create store) email:', error);
        throw error;
    }
};

/**
 * Sent once a merchant has a store but still has zero products in it a few
 * days after signing up.
 */
export const sendMerchantDripAddFirstProductEmail = async (
    merchantEmail: string,
    merchantName: string,
    userId: string,
    dashboardLink: string = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`
) => {
    try {
        const html = renderTemplate('marketing_drip_add_first_product.html', {
            merchantName,
            dashboardLink,
            unsubscribeLink: buildMarketingUnsubscribeLink(userId),
        });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: 'Add your first product and start selling',
            html
        });
    } catch (error) {
        console.error('[EmailService] Error sending marketing drip (add first product) email:', error);
        throw error;
    }
};

/**
 * Sent once a merchant has added at least one product but their store is
 * still unpublished (status 'draft').
 */
export const sendMerchantDripPublishStoreEmail = async (
    merchantEmail: string,
    merchantName: string,
    storeName: string,
    userId: string,
    dashboardLink: string = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`
) => {
    try {
        const html = renderTemplate('marketing_drip_publish_store.html', {
            merchantName,
            storeName,
            dashboardLink,
            unsubscribeLink: buildMarketingUnsubscribeLink(userId),
        });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: `${storeName} is ready — go live today`,
            html
        });
    } catch (error) {
        console.error('[EmailService] Error sending marketing drip (publish store) email:', error);
        throw error;
    }
};

/**
 * Sent once a merchant's store has been live for about a week and they're
 * still on the free plan — a feature-highlight/upgrade nudge.
 */
export const sendMerchantDripUpgradePlanEmail = async (
    merchantEmail: string,
    merchantName: string,
    storeName: string,
    userId: string,
    plansLink: string = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/plans`
) => {
    try {
        const html = renderTemplate('marketing_drip_upgrade_plan.html', {
            merchantName,
            storeName,
            plansLink,
            unsubscribeLink: buildMarketingUnsubscribeLink(userId),
        });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: merchantEmail,
            subject: `${storeName} is live! See what Pro unlocks`,
            html
        });
    } catch (error) {
        console.error('[EmailService] Error sending marketing drip (upgrade plan) email:', error);
        throw error;
    }
};
