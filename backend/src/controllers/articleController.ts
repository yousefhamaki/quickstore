import { Request, Response } from 'express';
import Article from '../models/Article';

// @desc    Get all active articles
// @route   GET /api/articles
// @access  Public
export const getActiveArticles = async (req: Request, res: Response) => {
    try {
        const articles = await Article.find({ isActive: true }).sort({ createdAt: -1 });
        res.status(200).json(articles);
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ message: 'Error fetching articles', error });
    }
};

// @desc    Get all articles (Admin)
// @route   GET /api/admin/articles
// @access  Private/Admin
export const getAllArticles = async (req: Request, res: Response) => {
    try {
        const articles = await Article.find({}).sort({ createdAt: -1 });
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
        const { title, content, tags, isActive } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required' });
        }
        const article = await Article.create({ title, content, tags: tags || [], isActive });
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
        const article = await Article.findByIdAndUpdate(id, req.body, { new: true });
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
