import { Request, Response } from 'express';
import Article from '../models/Article';
import { buildArticleRegexOr } from '../utils/articleSearch';

// @desc    Get active articles — paginated, searchable, optionally filtered
//          by category. Powers the public Help Center (/support).
// @route   GET /api/articles?page=&limit=&search=&category=
// @access  Public
export const getActiveArticles = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const skip = (page - 1) * limit;

        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

        const filter: any = { isActive: true };
        if (category) filter.category = category;

        // Substring/typo-tolerant matching across EN+AR title/summary/content
        // and tags — chosen over the model's $text index (used by the
        // chatbot for single-best-match) because a FAQ search box needs to
        // show every partial match as the merchant types, not just the one
        // top hit, and $text's whole-word/stemmed matching doesn't do that
        // well for short, partial queries.
        if (search) {
            filter.$or = buildArticleRegexOr(search);
        }

        const [articles, total, categories] = await Promise.all([
            Article.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit),
            Article.countDocuments(filter),
            // Always the full active category list (unfiltered by the current
            // search/category) so the filter pills don't shrink to just
            // whatever matched the last query.
            Article.distinct('category', { isActive: true }),
        ]);

        res.status(200).json({
            articles,
            categories: categories.filter(Boolean).sort(),
            pagination: {
                page,
                limit,
                total,
                pages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ message: 'Error fetching articles', error });
    }
};

// @desc    Get a single active article by id — used by the /support?id=
//          deep link, which can't assume the article is in the current
//          (paginated/filtered) list already on the page.
// @route   GET /api/articles/:id
// @access  Public
export const getArticleById = async (req: Request, res: Response) => {
    try {
        const article = await Article.findOne({ _id: req.params.id, isActive: true });
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.status(200).json(article);
    } catch (error) {
        console.error('Error fetching article:', error);
        res.status(500).json({ message: 'Error fetching article', error });
    }
};

// @desc    Record that an article was actually opened/read (fired when the
//          accordion expands, or on the /support?id= deep-link view) — not
//          on every list render, so this reflects genuine reads.
// @route   POST /api/articles/:id/view
// @access  Public
export const trackArticleView = async (req: Request, res: Response) => {
    try {
        await Article.updateOne({ _id: req.params.id, isActive: true }, { $inc: { viewCount: 1 } });
        res.status(204).send();
    } catch (error) {
        // Never let view tracking fail the page — swallow and no-op.
        res.status(204).send();
    }
};

// @desc    Record "was this helpful?" feedback on an article.
// @route   POST /api/articles/:id/feedback
// @access  Public
export const submitArticleFeedback = async (req: Request, res: Response) => {
    try {
        const { helpful } = req.body;
        if (typeof helpful !== 'boolean') {
            return res.status(400).json({ message: 'helpful (boolean) is required' });
        }
        await Article.updateOne(
            { _id: req.params.id, isActive: true },
            { $inc: helpful ? { helpfulCount: 1 } : { notHelpfulCount: 1 } }
        );
        res.status(204).send();
    } catch (error) {
        console.error('Error recording article feedback:', error);
        res.status(500).json({ message: 'Error recording feedback' });
    }
};

// @desc    Get all articles (Admin)
// @route   GET /api/admin/articles
// @access  Private/Admin
export const getAllArticles = async (req: Request, res: Response) => {
    try {
        const articles = await Article.find({}).sort({ category: 1, order: 1, createdAt: -1 });
        res.status(200).json(articles);
    } catch (error) {
        console.error('Error fetching all articles:', error);
        res.status(500).json({ message: 'Error fetching articles', error });
    }
};

// @desc    Create an article
// @route   POST /api/admin/articles
// @access  Private/Admin
export const createArticle = async (req: Request, res: Response) => {
    try {
        const { title, content, tags, isActive, titleAr, contentAr, summary, summaryAr, steps, stepsAr, category, order } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }
        const article = await Article.create({
            title, content, tags: tags || [], isActive,
            titleAr, contentAr, summary, summaryAr,
            steps: steps || [], stepsAr: stepsAr || [],
            category, order,
        });
        res.status(201).json(article);
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({ message: 'Error creating article', error });
    }
};

// @desc    Update an article
// @route   PUT /api/admin/articles/:id
// @access  Private/Admin
export const updateArticle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const article = await Article.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.status(200).json(article);
    } catch (error) {
        console.error('Error updating article:', error);
        res.status(500).json({ message: 'Error updating article', error });
    }
};

// @desc    Delete an article
// @route   DELETE /api/admin/articles/:id
// @access  Private/Admin
export const deleteArticle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const article = await Article.findByIdAndDelete(id);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.status(200).json({ message: 'Article deleted perfectly' });
    } catch (error) {
        console.error('Error deleting article:', error);
        res.status(500).json({ message: 'Error deleting article', error });
    }
};
