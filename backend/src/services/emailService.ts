import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

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
const renderTemplate = (templateName: string, variables: any): string => {
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
 * Sends a general password recovery email.
 */
export const sendPasswordResetEmail = async (
    email: string,
    resetLink: string
) => {
    try {
        console.log(`[EmailService] Sending password reset email to ${email}`);
        
        const html = renderTemplate('password_reset.html', {
            resetLink
        });

        const response = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject: 'Reset your Buildora password',
            html
        });
        return response;
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
    email: string,
    storeName: string,
    orderNumber: string,
    carrierName: string,
    trackingNumber: string,
    trackUrl: string
) => {
    try {
        const html = renderTemplate('order_shipped.html', {
            storeName,
            orderNumber,
            carrierName,
            trackingNumber,
            trackUrl,
        });
        return await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject: `Your ${storeName} order #${orderNumber} has shipped`,
            html
        });
    } catch (error) {
        console.error('[EmailService] Error sending order shipped email:', error);
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
