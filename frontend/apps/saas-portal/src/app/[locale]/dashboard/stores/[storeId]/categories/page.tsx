'use client';

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Badge } from "@shared/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { Tags, Plus, Edit, Trash2, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    Category
} from "@shared/services/categoryService";

export default function CategoriesPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await getCategories(storeId);
            setCategories(data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [storeId]);

    const openCreate = () => {
        setEditingId(null);
        setName('');
        setDescription('');
        setDialogOpen(true);
    };

    const openEdit = (category: Category) => {
        setEditingId(category._id);
        setName(category.name);
        setDescription(category.description || '');
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Category name is required');
            return;
        }
        try {
            setSaving(true);
            if (editingId) {
                await updateCategory(editingId, storeId, { name, description });
                toast.success('Category updated');
            } else {
                await createCategory(storeId, { name, description });
                toast.success('Category created');
            }
            setDialogOpen(false);
            fetchCategories();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: Category) => {
        if (category.productCount && category.productCount > 0) {
            toast.error(`Move the ${category.productCount} product(s) in this category elsewhere first.`);
            return;
        }
        if (!confirm(`Delete category "${category.name}"?`)) return;
        try {
            await deleteCategory(category._id, storeId);
            toast.success('Category deleted');
            fetchCategories();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete category');
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Tags className="w-7 h-7 text-primary" /> Categories
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Organize your products into real categories your customers can browse — no more free-text typos.
                    </p>
                </div>
                <Button onClick={openCreate} className="rounded-xl shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" /> New Category
                </Button>
            </div>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                            <Tags className="w-10 h-10 text-muted-foreground mx-auto" />
                            <p className="font-bold">No categories yet</p>
                            <p className="text-sm text-muted-foreground">Create your first category to start organizing products.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {categories.map((category) => (
                                <div key={category._id} className="p-5 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold truncate">{category.name}</p>
                                            {!category.isActive && (
                                                <Badge variant="outline" className="text-muted-foreground">Hidden</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            /{category.slug} &middot; {category.productCount || 0} product(s)
                                        </p>
                                        {category.description && (
                                            <p className="text-sm text-muted-foreground mt-1 truncate">{category.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button asChild size="sm" variant="outline" className="rounded-xl">
                                            <Link href={`/dashboard/stores/${storeId}/products?categoryId=${category._id}`}>
                                                <Package className="w-3.5 h-3.5 mr-1.5" /> View Products
                                            </Link>
                                        </Button>
                                        <Button size="icon" variant="outline" className="rounded-xl" onClick={() => openEdit(category)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={() => handleDelete(category)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Category' : 'New Category'}</DialogTitle>
                        <DialogDescription>
                            {editingId ? 'Renaming updates this everywhere it\'s shown.' : 'Give it a clear name customers will recognize.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Men's Shoes" className="rounded-xl border-2" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl border-2" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button className="rounded-xl" onClick={handleSave} disabled={saving || !name.trim()}>
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {editingId ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
