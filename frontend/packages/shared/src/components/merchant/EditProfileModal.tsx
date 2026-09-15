'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import api from '@shared/services/api';
import { useAuth } from '@shared/context/AuthContext';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@shared/components/ui/dialog';

export function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations('merchant.profile');
    const { user, updateUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [submitting, setSubmitting] = useState(false);

    // Re-seed the field with the current name each time the dialog opens
    // (not on every render) so a previous unsaved edit doesn't linger.
    React.useEffect(() => {
        if (open) setName(user?.name || '');
    }, [open, user?.name]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error(t('nameRequired'));
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.put('/auth/profile', { name: trimmed });
            updateUser({ name: (response.data as any).name });
            toast.success(t('success'));
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('error'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="profile-name">{t('nameLabel')}</Label>
                        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus required />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('emailLabel')}</Label>
                        <Input value={user?.email || ''} disabled className="bg-muted" />
                        <p className="text-xs text-muted-foreground">{t('emailNote')}</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
                        <Button type="submit" disabled={submitting}>{submitting ? t('saving') : t('save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
