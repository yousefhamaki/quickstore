import api from './api';

export interface Article {
    _id: string;
    title: string;
    content: string;
    summary?: string;
    titleAr?: string;
    contentAr?: string;
    summaryAr?: string;
    steps?: string[];
    stepsAr?: string[];
    category?: string;
    tags: string[];
    isActive: boolean;
    viewCount?: number;
    helpfulCount?: number;
    notHelpfulCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface ArticlesPage {
    articles: Article[];
    categories: string[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface GetArticlesParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
}

export const getArticles = async (params?: GetArticlesParams): Promise<ArticlesPage> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);

    const { data } = await api.get<ArticlesPage>(`/articles?${query.toString()}`);
    return data;
};

export const getArticleById = async (id: string): Promise<Article> => {
    const { data } = await api.get<Article>(`/articles/${id}`);
    return data;
};

/** Fire-and-forget — never blocks or breaks the page if it fails. */
export const trackArticleView = (id: string): void => {
    api.post(`/articles/${id}/view`).catch(() => {});
};

export const sendArticleFeedback = async (id: string, helpful: boolean): Promise<void> => {
    await api.post(`/articles/${id}/feedback`, { helpful });
};
