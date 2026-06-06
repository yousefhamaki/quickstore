import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', // Need to set this in env
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export const sendVerificationEmail = async (email: string, token: string) => {
    // In production, use the real frontend URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@quickstore.com',
        to: email,
        subject: 'Verify your Buildora Email',
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; direction: ltr; text-align: left;">
                <h1 style="color: #2563eb; margin-bottom: 20px; font-size: 24px;">Welcome to Buildora! / مرحباً بك في بيلدورا!</h1>
                
                <!-- English Section -->
                <div style="margin-bottom: 25px;">
                    <p style="font-size: 16px; line-height: 1.5; color: #334155;">
                        Thank you for choosing Buildora to launch your online store! As a special welcome, we have added a <strong>500 EGP gift</strong> directly to your wallet to support your business. This will cover your usage for 2 months or up to 50 orders!
                    </p>
                    <p style="font-size: 16px; line-height: 1.5; color: #334155;">
                        Please click the button below to verify your email address and activate your account:
                    </p>
                </div>

                <!-- Arabic Section -->
                <div style="direction: rtl; text-align: right; border-top: 1px dashed #e2e8f0; padding-top: 20px; margin-bottom: 25px;">
                    <p style="font-size: 16px; line-height: 1.5; color: #334155; font-family: 'Cairo', sans-serif;">
                        شكراً لاختيارك بيلدورا لإطلاق متجرك الإلكتروني! كهدية ترحيبية خاصة، قمنا بإضافة <strong>500 جنيه مصري</strong> مباشرة إلى محفظتك لدعم مشروعك. هذا المبلغ يغطي استخدامك لمدة شهرين أو حتى 50 طلباً!
                    </p>
                    <p style="font-size: 16px; line-height: 1.5; color: #334155; font-family: 'Cairo', sans-serif;">
                        يرجى الضغط على الزر أدناه لتأكيد بريدك الإلكتروني وتنشيط حسابك:
                    </p>
                </div>

                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                        Verify Email / تأكيد البريد الإلكتروني
                    </a>
                </div>

                <!-- Footer details -->
                <div style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                    <p style="margin: 5px 0;">
                        <strong>Link / الرابط:</strong> <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
                    </p>
                    <p style="margin: 15px 0 5px 0; font-size: 11px; color: #94a3b8; text-align: center;">
                        Buildora Engine &bull; Egypt's Localized E-commerce Platform &bull; محرك بيلدورا للتجارة الإلكترونية
                    </p>
                </div>
            </div>
        `,
    };

    try {
        if (process.env.NODE_ENV === 'test' || !process.env.EMAIL_USER) {
            console.log('Mock Email Sent:', verifyUrl);
            return;
        }
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

export const sendSupportTicketEmail = async (email: string, firstName: string, ticketId: string) => {
    const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@quickstore.com',
        to: email,
        subject: `Support Ticket Received: ${ticketId}`,
        html: `
            <h1>Hello ${firstName},</h1>
            <p>We've received your message and created a support ticket for you.</p>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p>Our team is currently reviewing your request and will get back to you shortly.</p>
            <p>Thank you for choosing Buildora!</p>
        `,
    };

    try {
        if (process.env.NODE_ENV === 'test' || !process.env.EMAIL_USER) {
            console.log(`Mock Support Email Sent to ${email} for ticket ${ticketId}`);
            // Also notify team mock
            const teamEmail = process.env.SUPPORT_EMAIL || 'support@quickstore.com';
            console.log(`Mock Team Notification Sent to ${teamEmail} for ticket ${ticketId}`);
            return;
        }
        await transporter.sendMail(mailOptions);
        
        // Notify the support team
        const teamEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'support@quickstore.com';
        const teamMailOptions = {
            from: process.env.EMAIL_USER || 'noreply@quickstore.com',
            to: teamEmail,
            subject: `[New Ticket] ${ticketId} from ${firstName}`,
            html: `
                <h1>New Support Ticket</h1>
                <p><strong>Ticket ID:</strong> ${ticketId}</p>
                <p><strong>User:</strong> ${firstName} (${email})</p>
                <p>Please log in to the dashboard to view and reply.</p>
            `,
        };
        await transporter.sendMail(teamMailOptions);
    } catch (error) {
        console.error('Error sending support email:', error);
    }
};
