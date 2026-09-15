import { Request, Response } from 'express';
import Article from '../models/Article';
import SupportTicket from '../models/SupportTicket';
import ChatLog from '../models/ChatLog';
import { sendSupportTicketEmail } from '../services/emailService';
import { buildArticleRegexOr, fuzzyMatchArticles } from '../utils/articleSearch';

/**
 * Below this, a MongoDB $text score is noise, not a real match — e.g.
 * searching "domain" scores the real match ~19 and two barely-related
 * articles ~0.5 each purely from incidental word overlap. Calibrated
 * empirically against this corpus (see the PR/commit introducing this).
 */
const MIN_TEXT_SCORE = 1.0;

/**
 * How much the top score has to beat the runner-up by by to count as a
 * confident single answer rather than a set of comparably-relevant
 * candidates. e.g. "shipping" alone scores its 3 shipping articles within
 * ~15% of each other — none of them is "the" answer, so all three should be
 * offered rather than the bot picking one arbitrarily.
 */
const CONFIDENCE_RATIO = 1.8;

interface ScoredArticle {
    _id: any;
    title: string;
    titleAr?: string;
    content: string;
    contentAr?: string;
    summary?: string;
    summaryAr?: string;
    score?: number;
}

function localizeArticle(article: ScoredArticle, isAr: boolean) {
    return {
        _id: article._id,
        title: isAr ? (article.titleAr || article.title) : article.title,
        content: isAr
            ? (article.summaryAr || article.contentAr || article.summary || article.content)
            : (article.summary || article.content),
    };
}

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

        // 3. Search Knowledge Base — MongoDB $text first (fast, ranked,
        //    handles stemming), falling back to a typo-tolerant substring
        //    match (same one /support's search box uses) only when $text
        //    finds literally nothing, since a single misspelled/transposed
        //    word is a total miss for $text but still matches here.
        const isAr = locale === 'ar';
        let matchMethod: 'text' | 'regex_fallback' | 'fuzzy_fallback' = 'text';
        let candidates: ScoredArticle[] = await Article.find(
            { $text: { $search: message }, isActive: true },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(3)
            .lean();

        // Drop low-relevance noise (incidental word overlap, not a real match).
        candidates = candidates.filter((a) => (a.score ?? 0) >= MIN_TEXT_SCORE);

        if (candidates.length === 0) {
            matchMethod = 'regex_fallback';
            candidates = await Article.find({ $or: buildArticleRegexOr(message), isActive: true })
                .limit(3)
                .lean();
        }

        if (candidates.length === 0) {
            // Last resort: genuine misspellings (transposed/wrong letters)
            // that aren't a substring of the correct word either — cheap to
            // do client-side since this corpus is small, see fuzzyMatchArticles.
            matchMethod = 'fuzzy_fallback';
            const allActive = await Article.find({ isActive: true }, { title: 1, titleAr: 1, tags: 1, content: 1, contentAr: 1, summary: 1, summaryAr: 1 }).lean();
            candidates = fuzzyMatchArticles(message, allActive, 3);
        }

        if (candidates.length === 1) {
            const article = candidates[0];
            const log = await ChatLog.create({
                sessionId, message: query, articleId: article._id, locale,
                status: initialStatus, matchMethod, responseTimeMs: Date.now() - startTime
            });
            return res.status(200).json({
                answered: true,
                isConversational: false,
                logId: log._id,
                article: localizeArticle(article, isAr),
            });
        }

        if (candidates.length > 1) {
            const [top, second] = candidates;
            const isConfident = matchMethod === 'text' && (top.score ?? 0) >= (second.score ?? 0) * CONFIDENCE_RATIO;

            if (isConfident) {
                const log = await ChatLog.create({
                    sessionId, message: query, articleId: top._id, locale,
                    status: initialStatus, matchMethod, responseTimeMs: Date.now() - startTime
                });
                return res.status(200).json({
                    answered: true,
                    isConversational: false,
                    logId: log._id,
                    article: localizeArticle(top, isAr),
                });
            }

            // Several comparably-relevant matches — offer a short list
            // instead of the bot arbitrarily picking one for the user.
            const log = await ChatLog.create({
                sessionId, message: query, locale,
                status: 'suggested', matchMethod, responseTimeMs: Date.now() - startTime
            });
            return res.status(200).json({
                answered: true,
                isConversational: false,
                isSuggestionList: true,
                logId: log._id,
                suggestions: candidates.map((a) => ({
                    _id: a._id,
                    title: isAr ? (a.titleAr || a.title) : a.title,
                })),
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

/**
 * Whole-word membership, not substring — `"shipping".includes("hi")` is
 * true (it's literally the 2nd-3rd letters of "sHIpping"), which used to
 * make the bot greet people back instead of answering real questions about
 * shipping, help, this, which, history, etc. Arabic keywords keep using
 * includes() since Arabic doesn't tokenize cleanly on \s+ + punctuation
 * stripping the same way and its keyword list is multi-character phrases
 * unlikely to collide the same way single English words do.
 */
function hasWord(message: string, word: string): boolean {
    const words = message.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    return words.includes(word);
}

const checkConversationalIntents = (message: string, locale: string): string | null => {
    const isAr = locale === 'ar';
    const msg = message.toLowerCase();
    const wordCount = message.trim().split(/\s+/).filter(Boolean).length;

    const greetings = isAr ? ['مرحبا', 'اهلا', 'سلام', 'هاي'] : ['hi', 'hello', 'hey', 'greetings'];
    const isGreeting = isAr ? greetings.some(g => msg.includes(g)) : greetings.some(g => hasWord(msg, g));
    if (isGreeting) {
        return isAr ? "مرحباً! أنا مساعد Buildora الذكي. كيف يمكنني مساعدتك اليوم؟" : "Hello! I am Buildora's AI assistant. How can I help you today?";
    }

    const identity = isAr ? ['من انت', 'ماذا تفعل', 'اسمك'] : ['who are you', 'what are you', 'your name'];
    if (identity.some(i => msg.includes(i))) {
        return isAr ?
            "أنا المساعد الذكي لمنصة Buildora. يمكنني مساعدتك في إعداد متجرك، وإدارة المنتجات، وفهم طرق الدفع." :
            "I am the Buildora AI Assistant. I can help you set up your store, manage products, and understand payment methods.";
    }

    // Only short, generic messages ("help", "I need support") count as this
    // intent — a longer real question that happens to contain the word
    // "help"/"problem" (e.g. "I need help understanding Instapay
    // verification") should search the knowledge base instead of being
    // hijacked into a canned "contact support" reply.
    const help = isAr ? ['مساعدة', 'دعم', 'تواصل', 'مشكلة', 'بشر'] : ['help', 'support', 'contact', 'problem', 'agent', 'human'];
    const isGenericHelpRequest = wordCount <= 5 && (isAr ? help.some(h => msg.includes(h)) : help.some(h => hasWord(msg, h)));
    if (isGenericHelpRequest) {
        // NOTE: no WhatsApp floating button exists in this product — an
        // earlier version of this message claimed one did. Don't
        // reintroduce a channel here without confirming it's real first.
        return isAr ?
            "يمكنك التواصل مع فريق الدعم لدينا عبر فتح تذكرة دعم مباشرة من هنا، أو مراسلتنا عبر البريد الإلكتروني support@buildora.com." :
            "You can contact our support team by opening a ticket right here, or emailing us at support@buildora.com.";
    }

    return null;
};
