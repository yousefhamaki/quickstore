'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    Trash2,
    ArrowUp,
    ArrowDown,
    Loader2,
    Heading1,
    Type,
    Image as ImageIcon,
    MousePointerClick,
    Minus,
    MoveVertical,
    AlignLeft,
    AlignCenter,
    AlignRight,
} from 'lucide-react';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { Label } from '@shared/components/ui/label';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';
import { uploadEmailBlockImage } from '@shared/lib/api/stores';
import { renderBlocksToHtml, createDefaultBlock, PREVIEW_SAMPLE_VARS } from '@shared/lib/emailBlockRenderer';
import type { EmailBlock, EmailBlockAlign } from '@shared/types/store';

interface EmailBlockEditorProps {
    value: EmailBlock[];
    onChange: (blocks: EmailBlock[]) => void;
    storeId: string;
}

const ADDABLE_TYPES: { type: EmailBlock['type']; label: string; icon: any }[] = [
    { type: 'heading', label: 'Heading', icon: Heading1 },
    { type: 'text', label: 'Text', icon: Type },
    { type: 'image', label: 'Image', icon: ImageIcon },
    { type: 'button', label: 'Button', icon: MousePointerClick },
    { type: 'divider', label: 'Divider', icon: Minus },
    { type: 'spacer', label: 'Spacer', icon: MoveVertical },
];

const ALIGN_OPTIONS: { value: EmailBlockAlign; icon: any }[] = [
    { value: 'left', icon: AlignLeft },
    { value: 'center', icon: AlignCenter },
    { value: 'right', icon: AlignRight },
];

/**
 * No-code visual email builder — an ordered list of blocks (heading, text,
 * image, button, divider, spacer) a merchant can add/edit/reorder/remove
 * without writing HTML, plus a live preview. Used by both the transactional
 * Emails settings page and the Campaigns composer, so they share one
 * design experience.
 *
 * Reorder is plain up/down buttons (no drag-and-drop dependency), matching
 * this codebase's existing HeroSliderEditor.tsx convention. Color fields
 * reuse the paired native <input type="color"> + <input type="text">
 * pattern from the theme settings page — no ColorPicker component exists
 * in the shared UI kit.
 *
 * The live preview renders via renderBlocksToHtml (lib/emailBlockRenderer.ts),
 * a hand-written client-side mirror of the backend's real renderer — kept
 * in sync by hand, see that file's doc comment. The actual sent email
 * always goes through the backend copy.
 */
export function EmailBlockEditor({ value, onChange, storeId }: EmailBlockEditorProps) {
    const blocks = value || [];
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const updateBlock = (id: string, patch: Record<string, any>) => {
        onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b)));
    };
    const removeBlock = (id: string) => onChange(blocks.filter((b) => b.id !== id));
    const moveBlock = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= blocks.length) return;
        const next = [...blocks];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };
    const addBlock = (type: EmailBlock['type']) => onChange([...blocks, createDefaultBlock(type)]);

    const handleImageUpload = async (id: string, file: File) => {
        setUploadingId(id);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const uploaded = await uploadEmailBlockImage(storeId, formData);
            updateBlock(id, { imageUrl: uploaded.url, imagePublicId: uploaded.publicId });
        } catch {
            toast.error('Image upload failed');
        } finally {
            setUploadingId(null);
        }
    };

    const previewHtml = useMemo(() => {
        const bodyHtml = renderBlocksToHtml(blocks, PREVIEW_SAMPLE_VARS);
        return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin:0; padding:24px 16px; background:#f7fafc; }
            .card { max-width:480px; margin:0 auto; background:#fff; border-radius:16px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.08); }
            .footer { text-align:center; color:#a0aec0; font-size:11px; margin-top:24px; }
            img { max-width:100%; }
        </style></head><body>
            <div class="card">${bodyHtml || '<p style="color:#a0aec0;text-align:center;">Add a block to see a preview…</p>'}</div>
            <p class="footer">Powered by Buildora</p>
        </body></html>`;
    }, [blocks]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-3">
                {blocks.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                        No blocks yet — add your first one below.
                    </div>
                )}

                {blocks.map((block, index) => (
                    <div key={block.id} className="rounded-xl border bg-background p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {block.type}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => moveBlock(index, -1)}>
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)}>
                                    <ArrowDown className="w-3.5 h-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeBlock(block.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>

                        {(block.type === 'heading' || block.type === 'text') && (
                            <div className="space-y-2">
                                <Textarea
                                    value={block.text}
                                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                    rows={block.type === 'heading' ? 1 : 3}
                                    placeholder={block.type === 'heading' ? 'Your heading…' : 'Write your message here… ({{customerName}}, {{orderNumber}}, {{total}}, {{status}}, {{storeName}})'}
                                    className="rounded-xl"
                                />
                                <div className="flex items-center gap-3 flex-wrap">
                                    <AlignToggle value={block.align} onChange={(align) => updateBlock(block.id, { align })} />
                                    {block.type === 'heading' && (
                                        <div className="flex gap-1">
                                            {(['h1', 'h2'] as const).map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => updateBlock(block.id, { level })}
                                                    className={cn(
                                                        'px-2.5 py-1 text-xs font-bold rounded-lg border-2 transition-colors',
                                                        block.level === level ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/40 hover:bg-muted'
                                                    )}
                                                >
                                                    {level === 'h1' ? 'Large' : 'Medium'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <ColorField value={block.color} onChange={(color) => updateBlock(block.id, { color })} />
                                </div>
                            </div>
                        )}

                        {block.type === 'image' && (
                            <div className="space-y-2">
                                <label
                                    className={cn(
                                        'flex items-center justify-center h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden relative',
                                        block.imageUrl ? 'border-primary' : 'border-muted-foreground/30 hover:border-primary/50'
                                    )}
                                >
                                    {uploadingId === block.id ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    ) : block.imageUrl ? (
                                        <img src={block.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Click to upload an image</span>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingId === block.id}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(block.id, file);
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                                <Input
                                    value={block.altText || ''}
                                    onChange={(e) => updateBlock(block.id, { altText: e.target.value })}
                                    placeholder="Alt text (optional)"
                                    className="rounded-xl"
                                />
                                <Input
                                    value={block.link || ''}
                                    onChange={(e) => updateBlock(block.id, { link: e.target.value })}
                                    placeholder="Link this image to a URL (optional)"
                                    className="rounded-xl"
                                />
                            </div>
                        )}

                        {block.type === 'button' && (
                            <div className="space-y-2">
                                <Input
                                    value={block.text}
                                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                    placeholder="Button text"
                                    className="rounded-xl"
                                />
                                <Input
                                    value={block.url}
                                    onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                                    placeholder="https://…"
                                    className="rounded-xl"
                                />
                                <div className="flex items-center gap-4 flex-wrap">
                                    <AlignToggle value={block.align} onChange={(align) => updateBlock(block.id, { align })} />
                                    <ColorField label="Background" value={block.backgroundColor} onChange={(backgroundColor) => updateBlock(block.id, { backgroundColor })} />
                                    <ColorField label="Text" value={block.textColor} onChange={(textColor) => updateBlock(block.id, { textColor })} />
                                </div>
                            </div>
                        )}

                        {block.type === 'divider' && (
                            <ColorField label="Line color" value={block.color} onChange={(color) => updateBlock(block.id, { color })} />
                        )}

                        {block.type === 'spacer' && (
                            <div className="flex items-center gap-2">
                                <Label className="shrink-0">Height (px)</Label>
                                <Input
                                    type="number"
                                    min={4}
                                    max={96}
                                    value={block.height}
                                    onChange={(e) => updateBlock(block.id, { height: Number(e.target.value) })}
                                    className="rounded-xl w-24"
                                />
                            </div>
                        )}
                    </div>
                ))}

                <div className="grid grid-cols-3 gap-2 pt-1">
                    {ADDABLE_TYPES.map(({ type, label, icon: Icon }) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => addBlock(type)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                        >
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-medium">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="sticky top-6 rounded-2xl border-2 overflow-hidden shadow-sm">
                    <div className="bg-muted/30 border-b px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Live preview
                    </div>
                    {/* eslint-disable-next-line react/iframe-missing-sandbox */}
                    <iframe title="Email preview" srcDoc={previewHtml} className="w-full h-[520px] bg-white" sandbox="" />
                </div>
            </div>
        </div>
    );
}

function AlignToggle({ value, onChange }: { value: EmailBlockAlign; onChange: (align: EmailBlockAlign) => void }) {
    return (
        <div className="flex gap-1">
            {ALIGN_OPTIONS.map(({ value: v, icon: Icon }) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => onChange(v)}
                    className={cn(
                        'p-1.5 rounded-lg border-2 transition-colors',
                        value === v ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/40 hover:bg-muted'
                    )}
                >
                    <Icon className="w-3.5 h-3.5" />
                </button>
            ))}
        </div>
    );
}

function ColorField({ label, value, onChange }: { label?: string; value?: string; onChange: (color: string) => void }) {
    return (
        <div className="flex items-center gap-2">
            {label && <span className="text-xs text-muted-foreground">{label}</span>}
            <div className="w-7 h-7 rounded-lg border-2 border-muted overflow-hidden shrink-0">
                <input
                    type="color"
                    value={value || '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-full scale-150 cursor-pointer"
                />
            </div>
        </div>
    );
}
