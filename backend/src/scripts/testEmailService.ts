import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { 
    sendBuyerVerificationEmail, 
    sendMerchantWelcomeEmail, 
    sendInvoiceEmail, 
    sendSubscriptionExpiryWarning, 
    sendPasswordResetEmail,
    sendSupportTicketEmail 
} from '../services/emailService';

dotenv.config();

const templatesDir = path.join(__dirname, '../templates/emails');

function checkTemplates() {
    console.log('\n--- 📂 VERIFYING LOCAL HTML TEMPLATE & LAYOUT FILES ---');
    const requiredTemplates = [
        { name: 'layout.html', vars: ['{{title}}', '{{logoUrl}}', '{{accentColor}}', '{{> @partial-block }}', '{{footerText}}'] },
        { name: 'buyer_verification.html', vars: ['{{storeName}}', '{{verificationLink}}'] },
        { name: 'merchant_welcome.html', vars: ['{{merchantName}}', '{{dashboardLink}}'] },
        { name: 'invoice.html', vars: ['{{storeName}}', '{{invoiceNumber}}', '{{buyerName}}', '{{formatDate date}}', '{{paymentMethod}}', '{{formatCurrency amount currency}}', '{{#each items}}'] },
        { name: 'subscription_expiry.html', vars: ['{{merchantName}}', '{{formatDate expiryDate}}', '{{renewLink}}'] },
        { name: 'password_reset.html', vars: ['{{resetLink}}'] }
    ];

    let allExist = true;
    for (const template of requiredTemplates) {
        // Find in dev path
        let filePath = path.join(process.cwd(), 'src/templates/emails', template.name);
        if (!fs.existsSync(filePath)) {
            // Find in build path fallback
            filePath = path.join(__dirname, '../templates/emails', template.name);
        }

        if (fs.existsSync(filePath)) {
            console.log(`✅ File exists: ${template.name}`);
            const content = fs.readFileSync(filePath, 'utf-8');
            const missingVars = template.vars.filter(v => !content.includes(v));
            if (missingVars.length === 0) {
                console.log(`   ✨ All required variables found in ${template.name}`);
            } else {
                console.warn(`   ⚠️ Warning: Missing placeholder variables: ${missingVars.join(', ')}`);
            }
        } else {
            console.error(`❌ Missing file: ${template.name} at ${filePath}`);
            allExist = false;
        }
    }
    return allExist;
}

async function testSends() {
    console.log('\n--- ✉️ TESTING LOCAL COMPILATION & EMAIL SENDING ---');
    
    if (!process.env.RESEND_API_KEY) {
        console.error('❌ Error: RESEND_API_KEY environment variable is not defined in .env');
        return;
    }

    const testEmail = 'test@example.com';
    const merchantEmail = 'merchant@example.com';

    // 1. Test Buyer Verification
    try {
        console.log('\n[1/5] Calling sendBuyerVerificationEmail...');
        const res = await sendBuyerVerificationEmail(
            testEmail,
            'My Awesome Store',
            'https://myawesomestore.quickstore.live/verify?token=123',
            merchantEmail
        );
        console.log('Result:', JSON.stringify(res));
    } catch (err: any) {
        console.error('Failed call:', err.message || err);
    }

    // 2. Test Merchant Welcome
    try {
        console.log('\n[2/5] Calling sendMerchantWelcomeEmail...');
        const res = await sendMerchantWelcomeEmail(
            testEmail,
            'Yousef Hamaki'
        );
        console.log('Result:', JSON.stringify(res));
    } catch (err: any) {
        console.error('Failed call:', err.message || err);
    }

    // 3. Test Invoice Email
    try {
        console.log('\n[3/5] Calling sendInvoiceEmail...');
        const res = await sendInvoiceEmail(
            testEmail,
            'My Awesome Store',
            {
                invoiceNumber: 'INV-2026-001',
                buyerName: 'Jane Doe',
                amount: 350,
                currency: 'EGP',
                date: new Date().toISOString(),
                paymentMethod: 'Vodafone Cash',
                items: [
                    { name: 'Premium Wireless Headset', quantity: 1, price: 250 },
                    { name: 'USB-C Charging Cable', quantity: 2, price: 50 }
                ]
            },
            merchantEmail
        );
        console.log('Result:', JSON.stringify(res));
    } catch (err: any) {
        console.error('Failed call:', err.message || err);
    }

    // 4. Test Subscription Expiry Warning
    try {
        console.log('\n[4/5] Calling sendSubscriptionExpiryWarning...');
        const res = await sendSubscriptionExpiryWarning(
            testEmail,
            'Yousef Hamaki',
            new Date().toISOString()
        );
        console.log('Result:', JSON.stringify(res));
    } catch (err: any) {
        console.error('Failed call:', err.message || err);
    }

    // 5. Test Password Reset Email
    try {
        console.log('\n[5/6] Calling sendPasswordResetEmail...');
        const res = await sendPasswordResetEmail(
            testEmail,
            'https://www.quickstore.live/auth/reset-password?token=abc'
        );
        console.log('Result:', JSON.stringify(res));
    } catch (err: any) {
        console.error('Failed call:', err.message || err);
    }

    // 6. Test Support Ticket Email
    try {
        console.log('\n[6/6] Calling sendSupportTicketEmail...');
        const res = await sendSupportTicketEmail(
            testEmail,
            'Yousef',
            'QS-987654'
        );
        console.log('Result:', JSON.stringify(res));
    } catch (err: any) {
        console.error('Failed call:', err.message || err);
    }
}

async function run() {
    const templatesOk = checkTemplates();
    if (templatesOk) {
        await testSends();
    }
}

run();
