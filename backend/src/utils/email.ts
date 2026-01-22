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
        subject: 'Verify your QuickStore Email',
        html: `
            <h1>Welcome to QuickStore!</h1>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
            <p>This link expires in 24 hours.</p>
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
            <p>Thank you for choosing QuickStore!</p>
        `,
    };

    try {
        if (process.env.NODE_ENV === 'test' || !process.env.EMAIL_USER) {
            console.log(`Mock Support Email Sent to ${email} for ticket ${ticketId}`);
            return;
        }
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending support email:', error);
    }
};
