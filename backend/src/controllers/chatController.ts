import { Request, Response } from 'express';
import Article from '../models/Article';
import SupportTicket from '../models/SupportTicket';
import ChatLog from '../models/ChatLog';
import { sendSupportTicketEmail } from '../services/emailService';

// @desc    Ask a question to the bot
// @route   POST /api/chat/ask
// @access  Public
export const askQuestion = async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
        const { message, locale = 'en', sessionId, status: initialStatus = 'answered' } = req.body;

        if (!message || !sessionId) {
            return res.status(400).json({ error: "Message and SessionID are required" });
        }

        // 1. Basic Normalization
        const query = message.trim().toLowerCase();
        console.log(`[Chatbot] [${sessionId}] Query: "${query}" | Locale: ${locale}`);

        // 2. Handling Conversational Intents (Greetings, Identity, etc.)
        const conversationalResponse = checkConversationalIntents(query, locale);
        if (conversationalResponse) {
            const log = await ChatLog.create({
                sessionId,
                message: query,
                locale,
                status: initialStatus,
                responseTimeMs: Date.now() - startTime
            });

            return res.json({
                answered: true,
                isConversational: true,
                logId: log._id,
                article: {
                    content: conversationalResponse
                }
            });
        }

        // 3. Search Knowledge Base using MongoDB Text Index
        const articles = await Article.find(
            { $text: { $search: message }, isActive: true },
            { score: { $meta: 'textScore' } }
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(1);

        if (articles.length > 0) {
            const article = articles[0];
            const isAr = locale === 'ar';

            const log = await ChatLog.create({
                sessionId,
                message: query,
                articleId: article._id,
                locale,
                status: initialStatus,
                responseTimeMs: Date.now() - startTime
            });

            return res.status(200).json({
                answered: true,
                isConversational: false,
                logId: log._id,
                article: {
                    _id: article._id,
                    title: isAr ? (article.titleAr || article.title) : article.title,
                    content: isAr ? 
                        (article.summaryAr || article.contentAr || article.summary || article.content) : 
                        (article.summary || article.content)
                }
            });
        }

        // 4. Default Fallback
        console.log(`[Chatbot] No answer found for: "${query}"`);
        const fallbackLog = await ChatLog.create({
            sessionId,
            message: query,
            locale,
            status: 'fallback',
            responseTimeMs: Date.now() - startTime
        });

        return res.status(200).json({ 
            answered: false,
            logId: fallbackLog._id
        });

    } catch (error) {
        console.error('Chat ask error:', error);
        res.status(500).json({ message: 'Error processing question', error });
    }
};

// @desc    Log user feedback for a specific interaction
// @route   POST /api/chat/feedback
export const logFeedback = async (req: Request, res: Response) => {
    try {
        const { logId, feedback } = req.body;

        if (!logId || !feedback) {
            return res.status(400).json({ message: "logId and feedback type are required" });
        }

        const log = await ChatLog.findByIdAndUpdate(
            logId,
            { feedback },
            { new: true }
        );

        if (!log) {
            return res.status(404).json({ message: "Chat interaction log not found" });
        }

        res.status(200).json({ message: "Feedback recorded successfully", log });
    } catch (error) {
        console.error('Feedback log error:', error);
        res.status(500).json({ message: 'Error recording feedback', error });
    }
};

// @desc    Fallback to submit a ticket if article wasn't found
// @route   POST /api/chat/submit-ticket
export const submitTicket = async (req: Request, res: Response) => {
    try {
        const { message, firstName, lastName, email, logId } = req.body;

        if (!message || !firstName || !lastName || !email) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const ticketId = `QS-${Math.floor(100000 + Math.random() * 900000)}`;

        const ticket = await SupportTicket.create({
            ticketId,
            firstName,
            lastName,
            email,
            message: `[Chatbot Interaction] ${message}`,
            status: 'open',
            priority: 'medium'
        });

        // 5. Link to log if provided
        if (logId) {
            await ChatLog.findByIdAndUpdate(logId, { ticketCreated: true });
        }

        await sendSupportTicketEmail(email, firstName, ticketId);

        res.status(201).json({
            message: 'Support ticket created successfully. Our team will contact you soon.',
            ticketId: ticket.ticketId
        });
    } catch (error) {
        console.error('Chat submit ticket error:', error);
        res.status(500).json({ message: 'Error creating ticket from chat', error });
    }
};

const checkConversationalIntents = (message: string, locale: string): string | null => {
    const isAr = locale === 'ar';
    const msg = message.toLowerCase();

    const greetings = isAr ? ['مرحبا', 'اهلا', 'سلام', 'هاي'] : ['hi', 'hello', 'hey', 'greetings'];
    if (greetings.some(g => msg.includes(g))) {
        return isAr ? "مرحباً! أنا مساعد Buildora الذكي. كيف يمكنني مساعدتك اليوم؟" : "Hello! I am Buildora's AI assistant. How can I help you today?";
    }

    const identity = isAr ? ['من انت', 'ماذا تفعل', 'اسمك'] : ['who are you', 'what are you', 'your name'];
    if (identity.some(i => msg.includes(i))) {
        return isAr ? 
            "أنا المساعد الذكي لمنصة Buildora. يمكنني مساعدتك في إعداد متجرك، وإدارة المنتجات، وفهم طرق الدفع." : 
            "I am the Buildora AI Assistant. I can help you set up your store, manage products, and understand payment methods.";
    }

    const help = isAr ? ['مساعدة', 'دعم', 'تواصل', 'مشكلة', 'بشر'] : ['help', 'support', 'contact', 'problem', 'agent', 'human'];
    if (help.some(h => msg.includes(h))) {
        return isAr ? 
            "يمكنك التواصل مع فريق الدعم لدينا عبر فتح تذكرة دعم مباشرة من هنا، أو مراسلتنا عبر الريد الإلكتروني support@buildora.com. كما يمكنك استخدام زر الواتساب العائم في متجرك." : 
            "You can contact our support team by opening a ticket right here, emailing us at support@buildora.com, or using the WhatsApp floating button on your dashboard.";
    }

    return null;
};
