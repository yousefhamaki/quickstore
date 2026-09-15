'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import api from '@shared/services/api';
import { Button } from '@shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import { Plus, Edit, Trash2 } from 'lucide-react';

const CATEGORIES = [
    'getting-started', 'products', 'orders', 'payments', 'shipping',
    'domains-theme', 'marketing', 'analytics', 'account-support',
];

interface Article {
    _id: string;
    title: string;
    content: string;
    titleAr?: string;
    contentAr?: string;
    steps?: string[];
    stepsAr?: string[];
    category?: string;
    isActive: boolean;
    createdAt: string;
}

export default function AdminArticles() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [titleAr, setTitleAr] = useState('');
    const [contentAr, setContentAr] = useState('');
    // One step per line — converted to/from the steps[] array on save/load.
    const [stepsText, setStepsText] = useState('');
    const [stepsArText, setStepsArText] = useState('');
    const [category, setCategory] = useState('');
    const [isActive, setIsActive] = useState(true);

    const { user } = useAuth();

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const response = await api.get('/articles/admin');
            setArticles(response.data as Article[]);
        } catch (err) {
            console.error('Failed to fetch articles', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (article?: Article) => {
        if (article) {
            setEditingId(article._id);
            setTitle(article.title);
            setContent(article.content);
            setTitleAr(article.titleAr || '');
            setContentAr(article.contentAr || '');
            setStepsText((article.steps || []).join('\n'));
            setStepsArText((article.stepsAr || []).join('\n'));
            setCategory(article.category || '');
            setIsActive(article.isActive);
        } else {
            setEditingId(null);
            setTitle('');
            setContent('');
            setTitleAr('');
            setContentAr('');
            setStepsText('');
            setStepsArText('');
            setCategory('');
            setIsActive(true);
        }
        setIsDialogOpen(true);
    };

    const linesToSteps = (text: string) => text.split('\n').map(s => s.trim()).filter(Boolean);

    const handleSave = async () => {
        try {
            const payload = {
                title, content, isActive,
                titleAr: titleAr || undefined,
                contentAr: contentAr || undefined,
                steps: linesToSteps(stepsText),
                stepsAr: linesToSteps(stepsArText),
                category: category || undefined,
            };
            if (editingId) {
                await api.put(`/articles/admin/${editingId}`, payload);
            } else {
                await api.post('/articles/admin', payload);
            }
            setIsDialogOpen(false);
            fetchArticles();
        } catch (err) {
            console.error('Failed to save article', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this article?')) return;
        try {
            await api.delete(`/articles/admin/${id}`);
            fetchArticles();
        } catch (err) {
            console.error('Failed to delete article', err);
        }
    };

    if (user?.role !== 'super_admin') {
        return <div className="p-8 text-center">Unauthorized access. Super Admin only.</div>;
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Knowledge Base Admin</h1>
                <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" /> Add Article
                </Button>
            </div>

            <Card className="border-0 shadow-xl overflow-hidden glass">
                <CardHeader className="bg-white/50 border-b">
                    <CardTitle>Manage FAQs & Articles</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                            ) : articles.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-10 text-gray-500">No articles found</TableCell></TableRow>
                            ) : (
                                articles.map((article) => (
                                    <TableRow key={article._id} className="hover:bg-blue-50/30 transition-colors">
                                        <TableCell className="font-medium max-w-[300px] truncate">{article.title}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${article.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {article.isActive ? 'Active' : 'Draft'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{new Date(article.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleOpenDialog(article)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(article._id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{editingId ? 'Edit Article' : 'New Article'}</DialogTitle>
                        <DialogDescription>
                            Create or modify articles for the SaaS Chatbot and Help Center.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-sm font-semibold">Category</Label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">— None —</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-sm font-semibold">Article Title / Question (English)</Label>
                            <Input
                                id="title"
                                placeholder="e.g. How do I reset my password?"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content" className="text-sm font-semibold">Article Content / Answer (English)</Label>
                            <Textarea
                                id="content"
                                rows={5}
                                placeholder="Write the answer here — used as a fallback when there are no steps below."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="steps" className="text-sm font-semibold">
                                Steps (English) — one per line, shown as a numbered how-to instead of the content above when present
                            </Label>
                            <Textarea
                                id="steps"
                                rows={4}
                                placeholder={"Go to Settings > Payments\nEnable Manual Payment\nAdd your wallet number"}
                                value={stepsText}
                                onChange={(e) => setStepsText(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="titleAr" className="text-sm font-semibold">Title (Arabic)</Label>
                            <Input
                                id="titleAr"
                                dir="rtl"
                                placeholder="مثال: كيف أعيد ضبط كلمة المرور؟"
                                value={titleAr}
                                onChange={(e) => setTitleAr(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contentAr" className="text-sm font-semibold">Content (Arabic)</Label>
                            <Textarea
                                id="contentAr"
                                dir="rtl"
                                rows={5}
                                placeholder="اكتب الإجابة هنا..."
                                value={contentAr}
                                onChange={(e) => setContentAr(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="stepsAr" className="text-sm font-semibold">Steps (Arabic) — one per line</Label>
                            <Textarea
                                id="stepsAr"
                                dir="rtl"
                                rows={4}
                                value={stepsArText}
                                onChange={(e) => setStepsArText(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <input 
                                type="checkbox" 
                                id="isActive" 
                                checked={isActive} 
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="isActive" className="text-sm font-semibold cursor-pointer">Publish Article (Active)</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-full px-6">Cancel</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 text-white"
                            onClick={handleSave}
                            disabled={!title || !content}
                        >
                            {editingId ? 'Save Changes' : 'Create Article'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
