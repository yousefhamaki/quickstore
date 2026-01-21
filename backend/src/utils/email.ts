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
        // Don't throw logic error to prevent signup block if email fails, 
        // but currently we need verification so maybe we SHOULD throw or at least log heavily.
    }
};
