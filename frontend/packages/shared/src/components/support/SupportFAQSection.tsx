'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Input } from '@shared/components/ui/input';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { cn } from '@shared/lib/utils';
import { getArticles, getArticleById, trackArticleView, sendArticleFeedback, Article, ArticlesPage } from '@shared/services/articleService';

const PAGE_SIZE = 8;
const DEBOUNCE_MS = 350;

function localized(article: Article, locale: string, field: 'title' | 'content'): string {
    if (locale !== 'ar') return article[field];
    const arField = (field + 'Ar') as 'titleAr' | 'contentAr';
    return article[arField] || article[field];
}

function localizedSteps(article: Article, locale: string): string[] {
    const steps = locale === 'ar' && article.stepsAr && article.stepsAr.length > 0 ? article.stepsAr : article.steps;
    return steps || [];
}

/** Numbered step cards when the article has steps; plain paragraphs otherwise. */
function AnswerBody({ article, locale }: { article: Article; locale: string }) {
    const steps = localizedSteps(article, locale);
    if (steps.length > 0) {
        return (
            <ol className="space-y-4">
                {steps.map((step, i) => (
                    <li key={i} className="flex gap-4 rtl:flex-row-reverse">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm">
                            {i + 1}
                        </span>
                        <p className="text-gray-600 font-medium leading-relaxed pt-1">{step}</p>
                    </li>
                ))}
            </ol>
        );
    }
    return (
        <div className="space-y-3 text-gray-600 font-medium leading-relaxed">
            {localized(article, locale, 'content').split('\n').filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
            ))}
        </div>
    );
}

/** "Was this helpful?" — records a real signal per article, not just UI decoration. */
function FeedbackWidget({ articleId, locale }: { articleId: string; locale: string }) {
    const isAr = locale === 'ar';
    const [voted, setVoted] = useState<'helpful' | 'not_helpful' | null>(null);

    const vote = (helpful: boolean) => {
        setVoted(helpful ? 'helpful' : 'not_helpful');
        sendArticleFeedback(articleId, helpful).catch(() => {});
    };

    if (voted) {
        return (
            <div className="mt-6 pt-6 border-t border-gray-100 text-sm font-bold text-gray-500">
                {voted === 'helpful' ? (
                    isAr ? 'شكراً على ملاحظاتك!' : 'Thanks for your feedback!'
                ) : (
                    <span>
                        {isAr ? 'شكراً — ' : "Thanks — "}
                        <Link href="/contact" className="text-blue-600 hover:underline">
                            {isAr ? 'تواصل مع فريق الدعم لمزيد من المساعدة' : 'contact our support team for more help'}
                        </Link>
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-gray-100">
            <span className="text-sm font-bold text-gray-500">{isAr ? 'هل كانت هذه الإجابة مفيدة؟' : 'Was this answer helpful?'}</span>
            <Button type="button" size="sm" variant="outline" className="rounded-full h-8" onClick={() => vote(true)}>
                <ThumbsUp className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" /> {isAr ? 'نعم' : 'Yes'}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-full h-8" onClick={() => vote(false)}>
                <ThumbsDown className="w-3.5 h-3.5 mr-1.5 rtl:ml-1.5 rtl:mr-0" /> {isAr ? 'لا' : 'No'}
            </Button>
        </div>
    );
}

/** Same-category articles, fetched on demand only when this article is opened. */
function RelatedArticles({ article, locale }: { article: Article; locale: string }) {
    const isAr = locale === 'ar';
    const [related, setRelated] = useState<Article[] | null>(null);

    useEffect(() => {
        if (!article.category) {
            setRelated([]);
            return;
        }
        let cancelled = false;
        getArticles({ category: article.category, limit: 4 })
            .then((res) => {
                if (!cancelled) setRelated(res.articles.filter((a) => a._id !== article._id).slice(0, 3));
            })
            .catch(() => {
                if (!cancelled) setRelated([]);
            });
        return () => {
            cancelled = true;
        };
    }, [article._id, article.category]);

    if (!related || related.length === 0) return null;

    return (
        <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                {isAr ? 'مقالات ذات صلة' : 'Related articles'}
            </p>
            <div className="flex flex-wrap gap-2">
                {related.map((r) => (
                    <Link
                        key={r._id}
                        href={`/support?id=${r._id}`}
                        className="text-sm font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-full"
                    >
                        {localized(r, locale, 'title')}
                    </Link>
                ))}
            </div>
        </div>
    );
}

function FAQAccordionItem({ article, locale, isOpen, onToggle }: { article: Article; locale: string; isOpen: boolean; onToggle: () => void }) {
    useEffect(() => {
        if (isOpen) trackArticleView(article._id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, article._id]);

    return (
        <div className="rounded-3xl bg-white border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-4 p-6 md:p-8 text-left rtl:text-right"
            >
                <h3 className="text-lg md:text-xl font-black text-gray-900">{localized(article, locale, 'title')}</h3>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
                <div className="px-6 md:px-8 pb-8 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AnswerBody article={article} locale={locale} />
                    <FeedbackWidget articleId={article._id} locale={locale} />
                    <RelatedArticles article={article} locale={locale} />
                </div>
            )}
        </div>
    );
}

export function SupportFAQSection() {
    const t = useTranslations('support');
    const locale = useLocale();
    const isAr = locale === 'ar';
    const searchParams = useSearchParams();
    const deepLinkId = searchParams.get('id');

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<ArticlesPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState<string | null>(null);

    const [focusedArticle, setFocusedArticle] = useState<Article | null>(null);
    const [focusedLoading, setFocusedLoading] = useState(false);
    const [focusedError, setFocusedError] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce free-text search input before it becomes a real query —
    // verified against the backend's actual regex search over EN+AR
    // title/summary/content/tags (backend/src/controllers/articleController.ts).
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, DEBOUNCE_MS);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchInput]);

    useEffect(() => {
        if (deepLinkId) return; // the deep-link view below takes over instead
        let cancelled = false;
        setLoading(true);
        getArticles({ page, limit: PAGE_SIZE, search: search || undefined, category: category || undefined })
            .then((result) => {
                if (!cancelled) setData(result);
            })
            .catch(() => {
                if (!cancelled) setData(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [page, search, category, deepLinkId]);

    useEffect(() => {
        if (!deepLinkId) {
            setFocusedArticle(null);
            setFocusedError(false);
            return;
        }
        let cancelled = false;
        setFocusedLoading(true);
        setFocusedError(false);
        getArticleById(deepLinkId)
            .then((article) => {
                if (!cancelled) {
                    setFocusedArticle(article);
                    trackArticleView(article._id);
                }
            })
            .catch(() => {
                if (!cancelled) setFocusedError(true);
            })
            .finally(() => {
                if (!cancelled) setFocusedLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [deepLinkId]);

    // --- Deep-linked single article (e.g. from the chatbot's best-match link) ---
    if (deepLinkId) {
        if (focusedLoading) {
            return <div className="text-center text-gray-500 py-16 font-medium">{t('search.loading')}</div>;
        }
        if (focusedError || !focusedArticle) {
            return (
                <div className="text-center py-16 space-y-6">
                    <p className="text-gray-500 font-medium">{t('search.notFound')}</p>
                    <Link href="/support">
                        <Button variant="outline" className="rounded-full px-8 h-12 font-bold">
                            {isAr ? '← عرض كل المقالات' : '← View All Articles'}
                        </Button>
                    </Link>
                </div>
            );
        }
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-10 md:p-14 rounded-[40px] bg-white border-2 border-blue-50 shadow-2xl shadow-blue-100">
                    <Badge className="mb-6 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                        {isAr ? 'المقال المختار' : 'Selected Article'}
                    </Badge>
                    <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-8 leading-tight">
                        {localized(focusedArticle, locale, 'title')}
                    </h3>
                    <AnswerBody article={focusedArticle} locale={locale} />
                    <FeedbackWidget articleId={focusedArticle._id} locale={locale} />
                    <RelatedArticles article={focusedArticle} locale={locale} />
                    <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-4">
                        <Link href="/support">
                            <Button variant="outline" className="rounded-full px-8 h-12 font-bold hover:bg-gray-50 border-gray-200">
                                {isAr ? '← عرض كل المقالات' : '← View All Articles'}
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button className="rounded-full px-8 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-100">
                                {isAr ? 'ما زلت بحاجة للمساعدة؟ اتصل بنا' : 'Still need help? Contact Us'}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // --- Normal browse: search + category filter + paginated accordion ---
    return (
        <div className="space-y-8">
            <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-5 rtl:left-auto rtl:right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t('search.placeholder')}
                    className="h-14 rounded-full pl-14 rtl:pl-4 rtl:pr-14 text-base border-gray-200 shadow-sm"
                />
            </div>

            {data && data.categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setCategory(null);
                            setPage(1);
                        }}
                        className={cn(
                            'px-4 py-2 rounded-full text-sm font-bold transition-colors',
                            !category ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        )}
                    >
                        {t('categories.all')}
                    </button>
                    {data.categories.map((c) => (
                        <button
                            type="button"
                            key={c}
                            onClick={() => {
                                setCategory(c);
                                setPage(1);
                            }}
                            className={cn(
                                'px-4 py-2 rounded-full text-sm font-bold transition-colors',
                                category === c ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            )}
                        >
                            {t(`categories.${c}` as any)}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                </div>
            ) : data && data.articles.length > 0 ? (
                <>
                    <div className="space-y-4">
                        {data.articles.map((article) => (
                            <FAQAccordionItem
                                key={article._id}
                                article={article}
                                locale={locale}
                                isOpen={openId === article._id}
                                onToggle={() => setOpenId(openId === article._id ? null : article._id)}
                            />
                        ))}
                    </div>

                    {data.pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="rounded-full"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className={cn('h-4 w-4', isAr && 'rotate-180')} />
                            </Button>
                            <span className="text-sm font-bold text-gray-600 px-2">
                                {t('pagination.pageOf', { page: data.pagination.page, pages: data.pagination.pages })}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="rounded-full"
                                disabled={page >= data.pagination.pages}
                                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                            >
                                <ChevronRight className={cn('h-4 w-4', isAr && 'rotate-180')} />
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16 text-gray-500 font-medium">
                    {search || category ? t('search.noResults') : t('search.empty')}
                </div>
            )}
        </div>
    );
}
