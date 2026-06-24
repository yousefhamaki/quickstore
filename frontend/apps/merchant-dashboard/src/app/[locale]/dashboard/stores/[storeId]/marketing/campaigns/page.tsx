'use client';

import { use, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import { Progress } from "@shared/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@shared/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@shared/components/ui/dialog";
import {
    Mail,
    Plus,
    Coins,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Trash2,
    History,
    Send,
    Loader2,
    FileText,
    ExternalLink,
    Sparkles,
    ShoppingBag
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    getCampaigns,
    getCampaign,
    createCampaign,
    deleteCampaign,
    sendCampaign,
    getEmailAccountBalance,
    buyEmailAddOn,
    Campaign as CampaignType,
    CampaignRun as CampaignRunType,
    EmailLedgerEntry as EmailLedgerEntryType
} from "@shared/services/marketingService";
import { toast } from "sonner";

export default function CampaignsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const router = useRouter();

    const [campaigns, setCampaigns] = useState<CampaignType[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [planBalance, setPlanBalance] = useState<number>(0);
    const [purchasedBalance, setPurchasedBalance] = useState<number>(0);
    const [reserved, setReserved] = useState<number>(0);
    const [ledger, setLedger] = useState<EmailLedgerEntryType[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [buying, setBuying] = useState(false);

    // Dialog state controllers
    const [createOpen, setCreateOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [buyOpen, setBuyOpen] = useState(false);

    // Create Campaign Form state
    const [campaignForm, setCampaignForm] = useState({
        name: "",
        subject: "",
        content: "",
        tags: ""
    });

    // View Details states
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignType | null>(null);
    const [selectedRuns, setSelectedRuns] = useState<CampaignRunType[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        loadData();
    }, [storeId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [campaignsData, balanceData] = await Promise.all([
                getCampaigns(storeId),
                getEmailAccountBalance(storeId)
            ]);
            setCampaigns(campaignsData.campaigns || []);
            setBalance(balanceData.balance);
            setPlanBalance((balanceData as any).planBalance || 0);
            setPurchasedBalance((balanceData as any).purchasedBalance || 0);
            setReserved(balanceData.reserved);
            setLedger(balanceData.ledgerHistory || []);
        } catch (error) {
            console.error("Failed to load campaigns data:", error);
            toast.error("Failed to fetch campaigns and email limits");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignForm.name || !campaignForm.subject || !campaignForm.content) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            setSubmitting(true);
            const tagsArray = campaignForm.tags
                ? campaignForm.tags.split(",").map(t => t.trim()).filter(Boolean)
                : [];

            await createCampaign({
                storeId,
                name: campaignForm.name,
                subject: campaignForm.subject,
                content: campaignForm.content,
                segmentFilters: {
                    consentStatus: "subscribed",
                    tags: tagsArray
                }
            });

            toast.success("Campaign template draft created successfully!");
            setCreateOpen(false);
            setCampaignForm({ name: "", subject: "", content: "", tags: "" });
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to create campaign draft");
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewDetails = async (campaign: CampaignType) => {
        setSelectedCampaign(campaign);
        setDetailOpen(true);
        try {
            setLoadingDetails(true);
            const data = await getCampaign(campaign._id);
            setSelectedRuns(data.runs || []);
        } catch (error) {
            console.error("Failed to fetch runs:", error);
            toast.error("Failed to fetch campaign execution history");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSendCampaign = async (campaignId: string) => {
        if (!confirm("Are you sure you want to trigger this email campaign dispatch now?")) {
            return;
        }

        try {
            setSubmitting(true);
            const res = await sendCampaign(campaignId);
            toast.success(`Success! Campaign queued for ${res.totalRecipients} subscribers.`);
            setDetailOpen(false);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Send execution failed. Verify your credit limits.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        if (!confirm("Delete this campaign draft permanently? Sent campaigns cannot be deleted.")) {
            return;
        }

        try {
            setSubmitting(true);
            await deleteCampaign(campaignId);
            toast.success("Campaign draft deleted");
            setDetailOpen(false);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete campaign");
        } finally {
            setSubmitting(false);
        }
    };

    const handleBuyCredits = async (emailCount: number) => {
        try {
            setBuying(true);
            const res = await buyEmailAddOn(storeId, emailCount);
            toast.success(res.message || `Successfully purchased ${emailCount} emails!`);
            setBuyOpen(false);
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Insufficient wallet balance. Recharge your wallet first.");
        } finally {
            setBuying(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "draft":
                return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 rounded-full font-bold uppercase text-[9px] tracking-widest px-2.5">Draft</Badge>;
            case "scheduled":
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 rounded-full font-bold uppercase text-[9px] tracking-widest px-2.5">Scheduled</Badge>;
            case "sent":
                return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 rounded-full font-bold uppercase text-[9px] tracking-widest px-2.5">Sent</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 rounded-full font-bold uppercase text-[9px] tracking-widest px-2.5">{status}</Badge>;
        }
    };

    const getRunStatusBadge = (status: string) => {
        switch (status) {
            case "queued":
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 rounded-full font-black uppercase text-[8px] tracking-widest px-2">Queued</Badge>;
            case "sending":
                return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 rounded-full font-black uppercase text-[8px] tracking-widest px-2 animate-pulse">Sending</Badge>;
            case "completed":
                return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 rounded-full font-black uppercase text-[8px] tracking-widest px-2">Completed</Badge>;
            case "failed":
                return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 rounded-full font-black uppercase text-[8px] tracking-widest px-2">Failed</Badge>;
            default:
                return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 rounded-full font-black uppercase text-[8px] tracking-widest px-2">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-xs uppercase font-black tracking-widest text-muted-foreground animate-pulse">Loading Campaigns workspace...</p>
            </div>
        );
    }

    // Capacity math logic:
    // Let's assume standard monthly paid plans maximum limit is plan allowance, default gauge max is 1500
    const maxGaugeVal = Math.max(1500, planBalance);
    const progressPercent = Math.max(0, Math.min(100, (balance / maxGaugeVal) * 100));

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic text-primary flex items-center gap-3">
                        <Mail className="w-8 h-8 not-italic text-indigo-600" /> Email Campaigns
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Create targeted campaigns, monitor delivery logs, and audit limits.</p>
                </div>
                <Button 
                    onClick={() => setCreateOpen(true)} 
                    className="rounded-2xl font-black uppercase tracking-widest text-xs h-12 shadow-xl shadow-primary/10 gap-2"
                >
                    <Plus className="w-4 h-4 stroke-[3px]" /> New Campaign
                </Button>
            </div>

            {/* Quota Indicator Banner Card */}
            <Card className="border-2 shadow-sm rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-50/50 via-background to-background relative group">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-indigo-50/20 blur-3xl pointer-events-none rounded-full" />
                <CardContent className="p-6 md:p-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-8">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <Coins className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tight text-sm">Monthly Quota Limits</h3>
                                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Email credit balances (consumed plan first, purchased second)</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-black uppercase tracking-wider">
                                <span>{balance} Total Credits Available</span>
                                <span className="text-indigo-600 font-black">{Math.round(progressPercent)}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-3 rounded-full bg-slate-100" />
                        </div>
                    </div>

                    {/* Detailed Split Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:border-l lg:pl-8 min-w-[300px]">
                        <div className="bg-white/40 backdrop-blur-sm border rounded-2xl p-3 text-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Plan Balance</span>
                            <span className="text-lg font-black tracking-tight text-slate-800">{planBalance}</span>
                            <span className="text-[8px] text-muted-foreground font-bold tracking-widest block uppercase">Monthly Quota</span>
                        </div>
                        <div className="bg-white/40 backdrop-blur-sm border rounded-2xl p-3 text-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Add-on Balance</span>
                            <span className="text-lg font-black tracking-tight text-indigo-600">{purchasedBalance}</span>
                            <span className="text-[8px] text-indigo-500 font-bold tracking-widest block uppercase">1 Year Expiry</span>
                        </div>
                        <div className="bg-white/40 backdrop-blur-sm border rounded-2xl p-3 text-center col-span-2 md:col-span-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block mb-0.5">Held / Reserved</span>
                            <span className="text-lg font-black tracking-tight text-amber-600">{reserved}</span>
                            <span className="text-[8px] text-amber-500 font-bold tracking-widest block uppercase">Active Runs</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-start lg:justify-end min-w-[120px]">
                        <Button 
                            variant="outline" 
                            className="rounded-2xl h-11 w-full font-black uppercase tracking-widest text-[9px] gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/30 hover:bg-indigo-50"
                            onClick={() => setBuyOpen(true)}
                        >
                            Buy Credits <Plus className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Main Tabs Workspace */}
            <Tabs defaultValue="campaigns" className="space-y-6">
                <TabsList className="bg-muted/50 rounded-2xl p-1.5 border gap-2">
                    <TabsTrigger value="campaigns" className="rounded-xl font-bold uppercase tracking-wider text-[10px] px-6 h-10">
                        Campaign Templates
                    </TabsTrigger>
                    <TabsTrigger value="ledger" className="rounded-xl font-bold uppercase tracking-wider text-[10px] px-6 h-10 gap-2">
                        <History className="w-3.5 h-3.5" /> Billing Audit Ledger
                    </TabsTrigger>
                </TabsList>

                {/* Campaigns List Tab */}
                <TabsContent value="campaigns" className="space-y-6">
                    {campaigns.length === 0 ? (
                        <div className="p-12 border-2 border-dashed rounded-[32px] text-center space-y-4 max-w-lg mx-auto bg-muted/20">
                            <Mail className="w-12 h-12 text-muted-foreground/60 mx-auto" />
                            <div className="space-y-1">
                                <h3 className="font-black uppercase tracking-tight text-md">No Campaigns Created Yet</h3>
                                <p className="text-xs text-muted-foreground font-medium">Create your first newsletter or promotional email template to grow your sales.</p>
                            </div>
                            <Button onClick={() => setCreateOpen(true)} className="rounded-xl font-bold uppercase tracking-wider text-[10px] h-10">
                                Create Draft Template
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map((camp) => (
                                <Card key={camp._id} className="border-2 shadow-sm rounded-3xl overflow-hidden hover:border-primary transition-all duration-300 flex flex-col">
                                    <CardHeader className="bg-muted/20 border-b p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            {getStatusBadge(camp.status)}
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(camp.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <CardTitle className="text-md font-black uppercase tracking-tight truncate">{camp.name}</CardTitle>
                                            <CardDescription className="text-xs truncate font-medium">Subj: {camp.subject}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                        <div className="text-[10px] space-y-1.5 font-bold uppercase tracking-wider text-muted-foreground">
                                            <div className="flex justify-between">
                                                <span>Consent Filter:</span>
                                                <span className="text-slate-800">{camp.segmentFilters.consentStatus || "subscribed"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Target Tags:</span>
                                                <span className="text-slate-800 truncate max-w-[150px]">
                                                    {camp.segmentFilters.tags && camp.segmentFilters.tags.length > 0 
                                                        ? camp.segmentFilters.tags.join(", ") 
                                                        : "All Subscribers"}
                                                </span>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            className="w-full rounded-2xl h-11 font-black uppercase tracking-widest text-[9px]"
                                            onClick={() => handleViewDetails(camp)}
                                        >
                                            View Details & Send
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Ledger Audit History Tab */}
                <TabsContent value="ledger" className="space-y-6">
                    <Card className="border-2 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/20 border-b p-6">
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Ledger Audit History</CardTitle>
                            <CardDescription className="font-medium text-xs">Immutable billing transactions for full financial audit compliance.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {ledger.length === 0 ? (
                                <div className="p-12 text-center text-xs text-muted-foreground uppercase font-black tracking-widest">
                                    No billing transactions recorded
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50 border-b">
                                        <TableRow>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-wider py-4">Transaction Type</TableHead>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-wider py-4">Amount</TableHead>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-wider py-4">Description</TableHead>
                                            <TableHead className="font-bold uppercase text-[9px] tracking-wider py-4">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledger.map((item) => (
                                            <TableRow key={item._id} className="hover:bg-muted/30">
                                                <TableCell className="py-4">
                                                    <Badge variant="outline" className="font-black uppercase text-[8px] px-2 py-0.5 rounded-full">
                                                        {item.type.replace("_", " ")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={`py-4 font-black text-xs ${item.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                                    {item.amount > 0 ? `+${item.amount}` : item.amount} credits
                                                </TableCell>
                                                <TableCell className="py-4 text-xs font-medium text-slate-700">{item.description}</TableCell>
                                                <TableCell className="py-4 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Campaign Modal */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="rounded-3xl max-w-xl border-2">
                    <form onSubmit={handleCreateCampaign}>
                        <DialogHeader className="space-y-2">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight">Create Campaign Template</DialogTitle>
                            <DialogDescription className="font-medium text-xs">Define a reusable email newsletter body and configure target segment rules.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 my-6">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs font-black uppercase tracking-wider">Campaign Name (Internal)</Label>
                                <Input 
                                    id="name" 
                                    placeholder="e.g. Summer Clearance Newsletter 2026" 
                                    className="rounded-xl h-11"
                                    value={campaignForm.name}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="subject" className="text-xs font-black uppercase tracking-wider">Email Subject</Label>
                                <Input 
                                    id="subject" 
                                    placeholder="e.g. Get 20% off all summer collection items!" 
                                    className="rounded-xl h-11"
                                    value={campaignForm.subject}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="tags" className="text-xs font-black uppercase tracking-wider">Target segment tags (Optional, comma separated)</Label>
                                <Input 
                                    id="tags" 
                                    placeholder="e.g. VIP, active-buyer, summer" 
                                    className="rounded-xl h-11"
                                    value={campaignForm.tags}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, tags: e.target.value })}
                                />
                                <p className="text-[10px] text-muted-foreground font-semibold">Leave empty to target all subscribed contacts.</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="content" className="text-xs font-black uppercase tracking-wider">Email Content (HTML body markup)</Label>
                                <Textarea 
                                    id="content" 
                                    placeholder="<h1>Summer is here!</h1><p>Enjoy our summer specials...</p>" 
                                    rows={8}
                                    className="rounded-xl font-mono text-xs"
                                    value={campaignForm.content}
                                    onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-xl font-bold uppercase tracking-wider text-[10px]">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="rounded-xl font-black uppercase tracking-widest text-[10px] px-6 h-11">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Template"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Campaign Details & Run History Modal */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="rounded-3xl max-w-2xl border-2">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight truncate">{selectedCampaign?.name}</DialogTitle>
                            {selectedCampaign && getStatusBadge(selectedCampaign.status)}
                        </div>
                        <DialogDescription className="font-medium text-xs">Subject: {selectedCampaign?.subject}</DialogDescription>
                    </DialogHeader>

                    {/* Content Section */}
                    <Tabs defaultValue="overview" className="my-6">
                        <TabsList className="bg-muted/50 rounded-xl p-1 border">
                            <TabsTrigger value="overview" className="rounded-lg text-[9px] font-bold uppercase tracking-wider">Overview</TabsTrigger>
                            <TabsTrigger value="history" className="rounded-lg text-[9px] font-bold uppercase tracking-wider">Execution History</TabsTrigger>
                        </TabsList>

                        {/* Campaign Template Overview */}
                        <TabsContent value="overview" className="space-y-4 mt-4">
                            <div className="bg-muted/30 border rounded-2xl p-4 space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Template HTML Body Preview</h4>
                                <div className="max-h-[160px] overflow-y-auto p-3 border rounded-xl bg-white text-slate-700 font-mono text-[10px] whitespace-pre-wrap">
                                    {selectedCampaign?.content}
                                </div>
                            </div>

                            {selectedCampaign?.status === "draft" && (
                                <div className="flex items-center justify-between border-2 border-dashed p-4 rounded-2xl bg-indigo-50/20">
                                    <div className="space-y-0.5">
                                        <h4 className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                                            <Send className="w-3.5 h-3.5 text-indigo-600" /> Dispatch Campaign
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground font-semibold">Checks quota availability, snapshots current subscribers, and sends emails.</p>
                                    </div>
                                    <Button 
                                        onClick={() => handleSendCampaign(selectedCampaign._id)} 
                                        disabled={submitting}
                                        className="rounded-xl font-black uppercase tracking-widest text-[9px] px-5 h-10 shadow-lg shadow-primary/10 gap-2 bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send Now
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        {/* Execution History of Runs */}
                        <TabsContent value="history" className="space-y-4 mt-4">
                            {loadingDetails ? (
                                <div className="py-8 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : selectedRuns.length === 0 ? (
                                <div className="py-8 border-2 border-dashed rounded-2xl text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    No execution runs triggered for this template
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                                    {selectedRuns.map((run) => (
                                        <div key={run._id} className="border rounded-2xl p-4 bg-muted/20 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    {getRunStatusBadge(run.status)}
                                                    <span className="text-[10px] font-bold text-slate-800">Run ID: {run._id.slice(-6)}</span>
                                                </div>
                                                <span className="text-[9px] font-semibold text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</span>
                                            </div>

                                            <div className="grid grid-cols-4 gap-4 text-center">
                                                <div className="bg-white border rounded-xl p-2">
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground block">Recipients</span>
                                                    <span className="text-sm font-black tracking-tight">{run.totalRecipients}</span>
                                                </div>
                                                <div className="bg-white border rounded-xl p-2">
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground block">Dispatched</span>
                                                    <span className="text-sm font-black tracking-tight text-indigo-600">{run.emailsDispatched}</span>
                                                </div>
                                                <div className="bg-white border rounded-xl p-2">
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground block">Delivered</span>
                                                    <span className="text-sm font-black tracking-tight text-emerald-600">{run.emailsDelivered}</span>
                                                </div>
                                                <div className="bg-white border rounded-xl p-2">
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground block">Bounced</span>
                                                    <span className="text-sm font-black tracking-tight text-rose-600">{run.emailsBounced}</span>
                                                </div>
                                            </div>

                                            {run.errorMessage && (
                                                <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-[10px] text-rose-800 font-bold uppercase tracking-wide">
                                                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                                    <span>Error: {run.errorMessage}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="justify-between items-center border-t pt-4">
                        {selectedCampaign?.status === "draft" ? (
                            <Button 
                                type="button" 
                                variant="destructive" 
                                disabled={submitting}
                                onClick={() => handleDeleteCampaign(selectedCampaign._id)}
                                className="rounded-xl font-bold uppercase tracking-wider text-[9px] gap-2 h-10"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Draft
                            </Button>
                        ) : (
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Locked Template (Sent)
                            </div>
                        )}
                        <Button type="button" variant="ghost" onClick={() => setDetailOpen(false)} className="rounded-xl font-bold uppercase tracking-wider text-[9px] h-10">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Buy Credits Add-on Dialog */}
            <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
                <DialogContent className="rounded-3xl max-w-lg border-2">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                            <ShoppingBag className="w-5.5 h-5.5 text-indigo-600" /> Buy Email Credits
                        </DialogTitle>
                        <DialogDescription className="font-medium text-xs">
                            Purchase extra email credit bundles. Add-on credits are valid for **1 year** and used after monthly allowances exhaust.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Pricing packages cards */}
                    <div className="grid grid-cols-2 gap-4 my-6">
                        {[
                            { count: 50, price: 70, tag: "Starter Pack" },
                            { count: 100, price: 120, tag: "Standard Pack" },
                            { count: 250, price: 250, tag: "Best Value" },
                            { count: 500, price: 400, tag: "Bulk Pack" }
                        ].map((pkg) => (
                            <Card key={pkg.count} className="border-2 rounded-2xl p-4 hover:border-primary transition-all duration-300 flex flex-col justify-between items-stretch bg-muted/10 relative overflow-hidden group">
                                {pkg.count === 250 && (
                                    <span className="absolute top-0 right-0 bg-indigo-600 text-white font-black text-[7px] uppercase tracking-widest py-0.5 px-3 rounded-bl-lg">
                                        Popular
                                    </span>
                                )}
                                <div className="space-y-1 mb-4">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block">
                                        {pkg.tag}
                                    </span>
                                    <span className="text-2xl font-black tracking-tighter text-slate-800 block">
                                        {pkg.count} <span className="text-[10px] font-semibold text-muted-foreground tracking-normal uppercase">Emails</span>
                                    </span>
                                    <span className="text-xs font-black text-indigo-600">
                                        {pkg.price} EGP
                                    </span>
                                </div>
                                <Button 
                                    size="sm" 
                                    className="rounded-xl font-bold uppercase tracking-wider text-[8px] h-9 w-full bg-indigo-600 hover:bg-indigo-700"
                                    onClick={() => handleBuyCredits(pkg.count)}
                                    disabled={buying}
                                >
                                    {buying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Purchase"}
                                </Button>
                            </Card>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setBuyOpen(false)} className="rounded-xl font-bold uppercase tracking-wider text-[9px] h-10 w-full md:w-auto">
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
