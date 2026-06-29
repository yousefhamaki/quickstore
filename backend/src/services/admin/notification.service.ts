import { Resend } from 'resend';

let resendInstance: Resend | null = null;
const getResendClient = () => {
    if (!resendInstance) {
        const apiKey = process.env.RESEND_API_KEY;
        resendInstance = new Resend(apiKey || 'placeholder');
    }
    return resendInstance;
};

const DEFAULT_FROM = 'Buildora <no-reply@quickstore.live>';

export const sendWalletUpdateNotification = async (
    email: string,
    merchantName: string,
    type: 'credit' | 'debit',
    amount: number,
    reason: string,
    balanceAfter: number
) => {
    try {
        const subject = `Wallet Transaction Alert: Account ${type === 'credit' ? 'Credited' : 'Debited'}`;
        const html = `
            <h2>Hello ${merchantName},</h2>
            <p>Your wallet has been updated by an administrator.</p>
            <table border="1" cellpadding="8" style="border-collapse: collapse; border-color: #ddd;">
                <tr><td><strong>Transaction Type:</strong></td><td style="text-transform: capitalize;">${type}</td></tr>
                <tr><td><strong>Amount:</strong></td><td>${amount.toFixed(2)} EGP</td></tr>
                <tr><td><strong>Reason:</strong></td><td>${reason}</td></tr>
                <tr><td><strong>New Wallet Balance:</strong></td><td>${balanceAfter.toFixed(2)} EGP</td></tr>
            </table>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br/>Buildora Team</p>
        `;

        await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject,
            html
        });
        console.log(`[NotificationService] Wallet update email sent to ${email}`);
    } catch (error) {
        console.error('[NotificationService] Error sending wallet update notification:', error);
    }
};

export const sendMerchantBlockedNotification = async (email: string, merchantName: string, reason?: string) => {
    try {
        const subject = 'Account Suspension Notice';
        const html = `
            <h2>Hello ${merchantName},</h2>
            <p>We regret to inform you that your merchant account has been suspended by the platform administrator.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>If you believe this is a mistake or wish to appeal, please contact platform support.</p>
            <p>Best regards,<br/>Platform Admin</p>
        `;

        await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject,
            html
        });
        console.log(`[NotificationService] Ban notice email sent to ${email}`);
    } catch (error) {
        console.error('[NotificationService] Error sending ban notice email:', error);
    }
};

export const sendSupportReplyNotification = async (email: string, firstName: string, ticketId: string, replyMessage: string) => {
    try {
        const subject = `New Support Response: Ticket #${ticketId}`;
        const html = `
            <h2>Hello ${firstName},</h2>
            <p>An administrator has replied to your support ticket <strong>#${ticketId}</strong>.</p>
            <div style="padding: 12px; background-color: #f5f5f5; border-left: 4px solid #0056b3; margin: 16px 0;">
                <p style="margin: 0; white-space: pre-wrap;">${replyMessage}</p>
            </div>
            <p>You can check the ticket status on the platform helpdesk.</p>
            <p>Best regards,<br/>QuickStore Support</p>
        `;

        await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: email,
            subject,
            html
        });
        console.log(`[NotificationService] Support reply email sent to ${email}`);
    } catch (error) {
        console.error('[NotificationService] Error sending support reply email:', error);
    }
};
