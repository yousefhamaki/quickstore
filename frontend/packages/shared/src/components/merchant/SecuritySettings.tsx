'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ShieldOff, Smartphone, Mail, Monitor, Copy, Check, AlertTriangle } from 'lucide-react';
import api from '@shared/services/api';
import { Button } from '@shared/components/ui/button';
import { PasswordInput } from '@shared/components/ui/password-input';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@shared/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@shared/components/ui/table';
import {
    changePassword,
    getActiveSessions, revokeSession, revokeAllOtherSessions, ActiveSession,
    getLoginHistory, LoginHistoryEntry,
    setupTotp, verifyTotpSetup, enableEmailTwoFactor, disableTwoFactor, regenerateBackupCodes,
} from '@shared/services/securityService';

interface Profile {
    twoFactorEnabled: boolean;
    twoFactorMethod?: 'totp' | 'email';
    authProvider: string;
}

export function SecuritySettings() {
    const t = useTranslations('merchant.security');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const loadProfile = async () => {
        try {
            const res = await api.get('/auth/profile');
            setProfile(res.data as Profile);
        } catch {
            toast.error(t('errors.loadFailed'));
        } finally {
            setLoadingProfile(false);
        }
    };

    useEffect(() => { loadProfile(); }, []);

    if (loadingProfile) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <ChangePasswordCard t={t} canChangePassword={profile?.authProvider === 'local'} />
            <TwoFactorCard t={t} profile={profile} onChange={loadProfile} />
            <ActiveSessionsCard t={t} />
            <LoginHistoryCard t={t} />
        </div>
    );
}

// ============================================================================
// Change Password
// ============================================================================

function ChangePasswordCard({ t, canChangePassword }: { t: any; canChangePassword: boolean }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error(t('password.mismatch'));
            return;
        }
        if (newPassword.length < 8) {
            toast.error(t('password.tooShort'));
            return;
        }

        setSubmitting(true);
        try {
            await changePassword(currentPassword, newPassword);
            toast.success(t('password.success'));
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('errors.generic'));
        } finally {
            setSubmitting(false);
        }
    };

    if (!canChangePassword) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('password.title')}</CardTitle>
                    <CardDescription>{t('password.googleAccount')}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('password.title')}</CardTitle>
                <CardDescription>{t('password.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">{t('password.current')}</Label>
                        <PasswordInput id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">{t('password.new')}</Label>
                        <PasswordInput id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('password.confirm')}</Label>
                        <PasswordInput id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
                    </div>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? t('password.saving') : t('password.save')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Two-Factor Authentication
// ============================================================================

function TwoFactorCard({ t, profile, onChange }: { t: any; profile: Profile | null; onChange: () => void }) {
    const [showTotpSetup, setShowTotpSetup] = useState(false);
    const [showEmailEnable, setShowEmailEnable] = useState(false);
    const [showDisable, setShowDisable] = useState(false);
    const [showRegenerate, setShowRegenerate] = useState(false);
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

    if (!profile) return null;

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {profile.twoFactorEnabled ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
                        {t('twoFactor.title')}
                    </CardTitle>
                    <CardDescription>{t('twoFactor.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {profile.twoFactorEnabled ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                                {profile.twoFactorMethod === 'totp' ? <Smartphone className="h-5 w-5 text-green-700" /> : <Mail className="h-5 w-5 text-green-700" />}
                                <div>
                                    <p className="font-semibold text-green-900">
                                        {profile.twoFactorMethod === 'totp' ? t('twoFactor.methodTotp') : t('twoFactor.methodEmail')}
                                    </p>
                                    <p className="text-sm text-green-700">{t('twoFactor.enabledNote')}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="outline" onClick={() => setShowRegenerate(true)}>{t('twoFactor.regenerateBackupCodes')}</Button>
                                <Button variant="destructive" onClick={() => setShowDisable(true)}>{t('twoFactor.disable')}</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setShowTotpSetup(true)}
                                className="flex flex-col items-start gap-2 p-5 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-left"
                            >
                                <Smartphone className="h-6 w-6 text-blue-600" />
                                <p className="font-bold">{t('twoFactor.setupTotp')}</p>
                                <p className="text-sm text-muted-foreground">{t('twoFactor.setupTotpDescription')}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowEmailEnable(true)}
                                className="flex flex-col items-start gap-2 p-5 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-left"
                            >
                                <Mail className="h-6 w-6 text-blue-600" />
                                <p className="font-bold">{t('twoFactor.setupEmail')}</p>
                                <p className="text-sm text-muted-foreground">{t('twoFactor.setupEmailDescription')}</p>
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {showTotpSetup && (
                <TotpSetupDialog
                    t={t}
                    onClose={() => setShowTotpSetup(false)}
                    onEnabled={(codes) => { setShowTotpSetup(false); setBackupCodes(codes); onChange(); }}
                />
            )}
            {showEmailEnable && (
                <PasswordConfirmDialog
                    t={t}
                    title={t('twoFactor.setupEmail')}
                    description={t('twoFactor.confirmPasswordDescription')}
                    confirmLabel={t('twoFactor.enable')}
                    onClose={() => setShowEmailEnable(false)}
                    onConfirm={async (password) => {
                        const result = await enableEmailTwoFactor(password);
                        setShowEmailEnable(false);
                        setBackupCodes(result.backupCodes);
                        onChange();
                    }}
                />
            )}
            {showDisable && (
                <PasswordConfirmDialog
                    t={t}
                    title={t('twoFactor.disable')}
                    description={t('twoFactor.confirmDisableDescription')}
                    confirmLabel={t('twoFactor.disable')}
                    destructive
                    onClose={() => setShowDisable(false)}
                    onConfirm={async (password) => {
                        await disableTwoFactor(password);
                        setShowDisable(false);
                        toast.success(t('twoFactor.disabledSuccess'));
                        onChange();
                    }}
                />
            )}
            {showRegenerate && (
                <PasswordConfirmDialog
                    t={t}
                    title={t('twoFactor.regenerateBackupCodes')}
                    description={t('twoFactor.confirmRegenerateDescription')}
                    confirmLabel={t('twoFactor.regenerate')}
                    onClose={() => setShowRegenerate(false)}
                    onConfirm={async (password) => {
                        const result = await regenerateBackupCodes(password);
                        setShowRegenerate(false);
                        setBackupCodes(result.backupCodes);
                    }}
                />
            )}
            {backupCodes && (
                <BackupCodesDialog t={t} codes={backupCodes} onClose={() => setBackupCodes(null)} />
            )}
        </>
    );
}

function TotpSetupDialog({ t, onClose, onEnabled }: { t: any; onClose: () => void; onEnabled: (codes: string[]) => void }) {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [manualEntryKey, setManualEntryKey] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setupTotp()
            .then((res) => { setQrCodeDataUrl(res.qrCodeDataUrl); setManualEntryKey(res.manualEntryKey); })
            .catch(() => setError(t('errors.generic')))
            .finally(() => setLoading(false));
    }, []);

    const handleVerify = async () => {
        setVerifying(true);
        setError('');
        try {
            const result = await verifyTotpSetup(code);
            onEnabled(result.backupCodes);
        } catch (err: any) {
            setError(err.response?.data?.message || t('twoFactor.invalidCode'));
        } finally {
            setVerifying(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('twoFactor.setupTotp')}</DialogTitle>
                    <DialogDescription>{t('twoFactor.scanQrDescription')}</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        {qrCodeDataUrl && (
                            <div className="flex justify-center">
                                <img src={qrCodeDataUrl} alt="QR code" className="w-48 h-48 border rounded-lg p-2" />
                            </div>
                        )}
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">{t('twoFactor.manualEntry')}</p>
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded break-all">{manualEntryKey}</code>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="totp-code">{t('twoFactor.enterCodeToConfirm')}</Label>
                            <Input id="totp-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} className="text-center tracking-widest text-lg" />
                        </div>
                        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('twoFactor.cancel')}</Button>
                    <Button onClick={handleVerify} disabled={loading || verifying || code.length < 6}>
                        {verifying ? t('twoFactor.verifying') : t('twoFactor.enable')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PasswordConfirmDialog({
    t, title, description, confirmLabel, destructive, onClose, onConfirm,
}: {
    t: any; title: string; description: string; confirmLabel: string; destructive?: boolean;
    onClose: () => void; onConfirm: (password: string) => Promise<void>;
}) {
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleConfirm = async () => {
        setSubmitting(true);
        setError('');
        try {
            await onConfirm(password);
        } catch (err: any) {
            setError(err.response?.data?.message || t('errors.generic'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t('twoFactor.confirmPasswordLabel')}</Label>
                    <PasswordInput id="confirm-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('twoFactor.cancel')}</Button>
                    <Button variant={destructive ? 'destructive' : 'default'} onClick={handleConfirm} disabled={submitting || !password}>
                        {submitting ? t('twoFactor.verifying') : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BackupCodesDialog({ t, codes, onClose }: { t: any; codes: string[]; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(codes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && acknowledged && onClose()}>
            <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />{t('twoFactor.backupCodesTitle')}</DialogTitle>
                    <DialogDescription>{t('twoFactor.backupCodesDescription')}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg font-mono text-sm">
                    {codes.map((c) => <div key={c} className="text-center">{c}</div>)}
                </div>
                <Button variant="outline" onClick={handleCopy} className="w-full">
                    {copied ? <><Check className="h-4 w-4 mr-2" />{t('twoFactor.copied')}</> : <><Copy className="h-4 w-4 mr-2" />{t('twoFactor.copyCodes')}</>}
                </Button>
                <label className="flex items-center gap-2 text-sm mt-2">
                    <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                    {t('twoFactor.savedCodesConfirm')}
                </label>
                <DialogFooter>
                    <Button onClick={onClose} disabled={!acknowledged}>{t('twoFactor.done')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// Active Sessions
// ============================================================================

function ActiveSessionsCard({ t }: { t: any }) {
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const load = async () => {
        try {
            setSessions(await getActiveSessions());
        } catch {
            toast.error(t('errors.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleRevoke = async (id: string) => {
        setRevokingId(id);
        try {
            await revokeSession(id);
            setSessions((prev) => prev.filter((s) => s._id !== id));
            toast.success(t('sessions.revoked'));
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('errors.generic'));
        } finally {
            setRevokingId(null);
        }
    };

    const handleRevokeAllOthers = async () => {
        try {
            await revokeAllOtherSessions();
            setSessions((prev) => prev.filter((s) => s.isCurrent));
            toast.success(t('sessions.allOthersRevoked'));
        } catch (err: any) {
            toast.error(err.response?.data?.message || t('errors.generic'));
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle>{t('sessions.title')}</CardTitle>
                    <CardDescription>{t('sessions.description')}</CardDescription>
                </div>
                {sessions.length > 1 && (
                    <Button variant="outline" size="sm" onClick={handleRevokeAllOthers}>{t('sessions.revokeAllOthers')}</Button>
                )}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('sessions.device')}</TableHead>
                                    <TableHead>{t('sessions.ip')}</TableHead>
                                    <TableHead>{t('sessions.lastActive')}</TableHead>
                                    <TableHead className="text-right">{t('sessions.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((s) => (
                                    <TableRow key={s._id}>
                                        <TableCell className="flex items-center gap-2">
                                            <Monitor className="h-4 w-4 text-muted-foreground" />
                                            {s.deviceLabel}
                                            {s.isCurrent && <Badge variant="secondary">{t('sessions.thisDevice')}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{s.ip || '—'}</TableCell>
                                        <TableCell className="text-muted-foreground">{new Date(s.lastActiveAt).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            {!s.isCurrent && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700"
                                                    onClick={() => handleRevoke(s._id)}
                                                    disabled={revokingId === s._id}
                                                >
                                                    {revokingId === s._id ? <Loader2 className="h-4 w-4 animate-spin" /> : t('sessions.revoke')}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Login History
// ============================================================================

function LoginHistoryCard({ t }: { t: any }) {
    const [entries, setEntries] = useState<LoginHistoryEntry[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getLoginHistory(page, 10)
            .then((res) => { setEntries(res.entries); setPages(res.pagination.pages || 1); })
            .catch(() => toast.error(t('errors.loadFailed')))
            .finally(() => setLoading(false));
    }, [page]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('history.title')}</CardTitle>
                <CardDescription>{t('history.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div>
                ) : entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">{t('history.empty')}</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('history.status')}</TableHead>
                                        <TableHead>{t('sessions.device')}</TableHead>
                                        <TableHead>{t('sessions.ip')}</TableHead>
                                        <TableHead>{t('history.time')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.map((e) => (
                                        <TableRow key={e._id}>
                                            <TableCell>
                                                <Badge variant={e.success ? 'secondary' : 'destructive'}>
                                                    {e.success ? t('history.success') : t('history.failed')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{e.deviceLabel}</TableCell>
                                            <TableCell className="text-muted-foreground">{e.ip || '—'}</TableCell>
                                            <TableCell className="text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {pages > 1 && (
                            <div className="flex justify-between items-center mt-4">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('history.previous')}</Button>
                                <span className="text-sm text-muted-foreground">{t('history.pageOf', { page, pages })}</span>
                                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t('history.next')}</Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
