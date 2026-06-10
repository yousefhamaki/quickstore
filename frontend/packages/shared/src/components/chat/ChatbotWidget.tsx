'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, User, Mail, ChevronRight, CheckCircle, HelpCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import api from '@shared/services/api';

type FeedbackType = 'helpful' | 'partial' | 'not_helpful';

type Message = {
    role: 'user' | 'bot';
    text: string;
    isFeedbackPrompt?: boolean;
    isTicketForm?: boolean;
    articleLink?: string;
    logId?: string;
};

// Simple UUID generator for sessionId
const generateSessionId = () => {
    return 'sess-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
};

export function ChatbotWidget() {
    const locale = useLocale();
    const pathname = usePathname();
    const t = useTranslations('chatbot');
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId] = useState(generateSessionId());
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const hostname = window.location.hostname;

        const mainDomains = [
            'localhost',
            '127.0.0.1',
            '[::1]',
            'quickstore.com',
            'quickstore.live',
            'quickstore.test',
            'www.quickstore.com',
            'www.quickstore.live',
            'www.quickstore.test',
            'buildora.live',
            'www.buildora.live',
        ];

        const isMainDomain = mainDomains.includes(hostname) || hostname.endsWith('.vercel.app');

        const segments = pathname ? pathname.split('/') : [];
        const isStorePath = segments.includes('store');

        if (isMainDomain && !isStorePath) {
            setShouldRender(true);
        } else {
            setShouldRender(false);
        }
    }, [pathname]);

    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', text: locale === 'ar' ? 'مرحباً! كيف يمكنني مساعدتك اليوم؟' : 'Hi there! How can I help you today?' }
    ]);
    const [inputText, setInputText] = useState('');
    const [lastQueries, setLastQueries] = useState<string[]>([]);

    // Feedback and Fallback States
    const [activeLogId, setActiveLogId] = useState<string | null>(null);
    const [isAwaitingFeedback, setIsAwaitingFeedback] = useState(false);
    const [isAwaitingTicketInfo, setIsAwaitingTicketInfo] = useState(false);
    const [fallbackMessage, setFallbackMessage] = useState('');

    // Form States
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [ticketMessage, setTicketMessage] = useState('');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

    // Pre-fill ticketMessage from fallbackMessage whenever the ticket form opens
    useEffect(() => {
        if (isAwaitingTicketInfo) {
            setTicketMessage(fallbackMessage);
        }
    }, [isAwaitingTicketInfo]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        };
    }, []);

    const trackEvent = (eventName: string, data?: any) => {
        console.log(`[Analytics] [${sessionId}] Event: ${eventName}`, data || {});
    };

    const handleSend = async (forcedMsg?: string) => {
        const queryText = forcedMsg || inputText.trim();
        if (!queryText) return;

        const normalizedQuery = queryText.toLowerCase().trim();
        setMessages((prev) => [...prev, { role: 'user', text: queryText }]);
        setInputText('');
        setIsAwaitingFeedback(false);

        // Smart Repetition Detection
        const isRepeated = lastQueries.some(q =>
            q === normalizedQuery ||
            (normalizedQuery.length > 10 && q.includes(normalizedQuery)) ||
            (q.length > 10 && normalizedQuery.includes(q))
        );

        const newQueries = [...lastQueries, normalizedQuery].slice(-3);
        setLastQueries(newQueries);

        try {
            if (isRepeated) {
                trackEvent('chatbot_repeated_query', { query: normalizedQuery });
                const { data } = await api.post<any>('/chat/ask', {
                    message: queryText,
                    locale,
                    sessionId,
                    status: 'repeated'
                });

                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'bot',
                        text: locale === 'ar' ?
                            "يبدو أنك سألت هذا من قبل ولم تكن الإجابة كافية. هل تود التحدث إلى فريق الدعم مباشرة؟" :
                            "It looks like you've asked this before and the answer wasn't enough. Would you like to talk to our support team directly?",
                        logId: data.logId
                    }
                ]);
                console.log(queryText)
                setFallbackMessage(queryText);
                setActiveLogId(data.logId);
                triggerFeedbackPrompt(data.logId);
                return;
            }

            const { data } = await api.post<any>('/chat/ask', { message: queryText, locale, sessionId });
            setActiveLogId(data.logId);

            if (data.answered && data.article) {
                trackEvent('chatbot_answered', { logId: data.logId, isConversational: data.isConversational });

                if (data.isConversational) {
                    setMessages((prev) => [...prev, { role: 'bot', text: data.article.content, logId: data.logId }]);
                } else {
                    const articleHeader = locale === 'ar' ? 'لقد وجدت مقالاً قد يساعدك:' : 'I found an article that might help:';
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'bot',
                            text: `${articleHeader} **${data.article.title}**\n\n${data.article.content.substring(0, 150)}...`,
                            articleLink: `/support?id=${data.article._id}`,
                            logId: data.logId
                        }
                    ]);
                }
                triggerFeedbackPrompt(data.logId);
            } else {
                trackEvent('chatbot_fallback', { logId: data.logId });
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'bot',
                        text: locale === 'ar' ?
                            "لم أجد إجابة دقيقة لسؤالك. هل تود فتح تذكرة دعم لمساعدتك؟" :
                            "I couldn't find an exact answer to your question. Would you like to open a support ticket?",
                        logId: data.logId
                    }
                ]);
                setFallbackMessage(queryText);
                triggerFeedbackPrompt(data.logId);
            }
        } catch (error) {
            setMessages((prev) => [...prev, {
                role: 'bot',
                text: locale === 'ar' ? 'عذراً، حدث خطأ أثناء المعالجة.' : 'Sorry, I encountered an error while processing.'
            }]);
        }
    };

    const triggerFeedbackPrompt = (logId: string) => {
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => {
            setIsAwaitingFeedback(true);
            scrollToBottom();
        }, 1500);
    };

    const handleFeedback = async (type: FeedbackType) => {
        if (!activeLogId) return;

        setIsAwaitingFeedback(false);
        trackEvent(`chatbot_feedback_${type}`, { logId: activeLogId });

        try {
            await api.post('/chat/feedback', { logId: activeLogId, feedback: type });

            if (type === 'helpful') {
                setMessages((prev) => [
                    ...prev,
                    { role: 'bot', text: locale === 'ar' ? "رائع! يسعدني أنني استطعت المساعدة." : "Great! I'm glad I could help." }
                ]);
            } else {
                // Transition to ticket form
                setIsAwaitingTicketInfo(true);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'bot',
                        text: locale === 'ar' ? "أنا آسف لأن الإجابة لم تكن كافية. يرجى تزويدنا بتفاصيلك لنقوم بمساعدتك بشكل أفضل." : "I'm sorry the answer wasn't sufficient. Please provide your details so we can assist you better.",
                        isTicketForm: true
                    }
                ]);
            }
        } catch (error) {
            console.error("Feedback error", error);
        }
    };

    const handleSubmitTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingTicket(true);
        trackEvent('chatbot_ticket_attempt', { logId: activeLogId });

        try {
            await api.post('/chat/submit-ticket', {
                message: ticketMessage,
                firstName,
                lastName,
                email,
                logId: activeLogId
            });

            trackEvent('chatbot_ticket_created', { logId: activeLogId });
            setIsAwaitingTicketInfo(false);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'bot',
                    text: locale === 'ar' ? 'تم إنشاء تذكرة الدعم بنجاح! سيتواصل معك فريقنا قريباً.' : 'Your support ticket has been created! Our team will reach out soon.'
                }
            ]);
            setFirstName(''); setLastName(''); setEmail(''); setFallbackMessage(''); setTicketMessage('');
        } catch (error) {
            setMessages((prev) => [...prev, {
                role: 'bot',
                text: locale === 'ar' ? 'فشل الإرسال. يرجى التأكد من البيانات والمحاولة مرة أخرى.' : 'Submission failed. Please check your info and try again.'
            }]);
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    if (!shouldRender) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end shrink-0">
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl w-[90vw] md:w-[400px] h-[80vh] md:h-[600px] max-h-[800px] mb-4 flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-4 relative shrink-0">
                    {/* Header */}
                    <div className="bg-blue-600 text-white p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <div className={locale === 'ar' ? 'text-right' : 'text-left'}>
                                <h3 className="font-bold text-lg">{locale === 'ar' ? 'دعم بيلدورا' : 'Buildora Support'}</h3>
                                <p className="text-xs text-blue-100">{locale === 'ar' ? 'يرد عادةً خلال ثوانٍ' : 'Usually responds in seconds'}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'} ${locale === 'ar' ? 'text-right' : 'text-left'}`}>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>

                                    {msg.articleLink && (
                                        <a href={msg.articleLink} className={`inline-flex items-center mt-3 text-blue-600 text-sm font-semibold hover:text-blue-800 ${locale === 'ar' ? 'flex-row-reverse' : ''}`}>
                                            {locale === 'ar' ? 'اقرأ المزيد' : 'Read More'} <ChevronRight className={`w-4 h-4 ${locale === 'ar' ? 'mr-1 rotate-180' : 'ml-1'}`} />
                                        </a>
                                    )}

                                    {msg.isTicketForm && isAwaitingTicketInfo && (
                                        <form onSubmit={handleSubmitTicket} className="mt-4 space-y-3">
                                            <div className="flex gap-2">
                                                <Input required placeholder={locale === 'ar' ? 'الاسم' : "First Name"} value={firstName} onChange={(e: any) => setFirstName(e.target.value)} className="bg-white text-sm h-9" />
                                                <Input required placeholder={locale === 'ar' ? 'العائلة' : "Last Name"} value={lastName} onChange={(e: any) => setLastName(e.target.value)} className="bg-white text-sm h-9" />
                                            </div>
                                            <Input required type="email" placeholder={locale === 'ar' ? 'البريد' : "Email"} value={email} onChange={(e: any) => setEmail(e.target.value)} className="bg-white text-sm h-9" />
                                            <Textarea
                                                required
                                                rows={3}
                                                placeholder={locale === 'ar' ? 'صف مشكلتك...' : 'Describe your issue...'}
                                                value={ticketMessage}
                                                onChange={(e: any) => setTicketMessage(e.target.value)}
                                                className="bg-white text-sm resize-none"
                                            />
                                            <Button size="sm" disabled={isSubmittingTicket} className="w-full bg-blue-600 text-white rounded-lg">
                                                {isSubmittingTicket ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (locale === 'ar' ? 'تأكيد التذكرة' : 'Confirm Ticket')}
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isAwaitingFeedback && (
                            <div className={`flex flex-col gap-2 mt-2 animate-in fade-in slide-in-from-bottom-2 ${locale === 'ar' ? 'items-end pr-4' : 'items-start pl-4'}`}>
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                    {locale === 'ar' ? 'هل كانت الإجابة مفيدة؟' : 'Was this helpful?'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" className="h-8 rounded-full text-[11px] border-green-200 bg-green-50/50 hover:bg-green-50 text-green-700" onClick={() => handleFeedback('helpful')}>
                                        <CheckCircle className="w-3 h-3 mr-1" /> {locale === 'ar' ? 'نعم، ساعدني' : 'Yes, helped'}
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 rounded-full text-[11px] border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-700" onClick={() => handleFeedback('partial')}>
                                        <HelpCircle className="w-3 h-3 mr-1" /> {locale === 'ar' ? 'جزئياً' : 'Partial'}
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 rounded-full text-[11px] border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700" onClick={() => handleFeedback('not_helpful')}>
                                        <AlertCircle className="w-3 h-3 mr-1" /> {locale === 'ar' ? 'أريد الدعم' : 'Need Support'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    {!isAwaitingTicketInfo && (
                        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                            <div className="flex gap-2">
                                <Input
                                    className="flex-1 rounded-full bg-gray-50 border-transparent focus:border-blue-500 focus:bg-white transition-colors"
                                    placeholder={locale === 'ar' ? 'اسأل سؤالاً...' : "Ask a question..."}
                                    value={inputText}
                                    onChange={(e: any) => setInputText(e.target.value)}
                                    onKeyDown={(e: any) => e.key === 'Enter' && handleSend()}
                                />
                                <Button
                                    onClick={() => handleSend()}
                                    className="rounded-full w-10 h-10 p-0 bg-blue-600 text-white flex-shrink-0"
                                >
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                >
                    <MessageCircle className="w-8 h-8" />
                </button>
            )}
        </div>
    );
}
