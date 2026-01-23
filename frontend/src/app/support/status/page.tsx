'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Search, Loader2, Ticket, Clock, CheckCircle2, AlertCircle, Calendar, Mail, User } from 'lucide-react';
import { getSupportTicketStatus } from '@/lib/api/support';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function TicketStatusContent() {
    const searchParams = useSearchParams();
    const initialId = searchParams.get('id');

    const [ticketId, setTicketId] = useState(initialId || '');
    const [loading, setLoading] = useState(false);
    const [ticket, setTicket] = useState<any>(null);

    const fetchTicket = async (id: string) => {
        setLoading(true);
        setTicket(null);
        try {
            const data = await getSupportTicketStatus(id);
            setTicket(data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ticket not found. Please check the ID.');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (initialId) {
            fetchTicket(initialId);
        }
    }, [initialId]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketId.trim()) return;
        fetchTicket(ticketId);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'in_progress': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'resolved': return 'bg-green-50 text-green-600 border-green-100';
            case 'closed': return 'bg-gray-50 text-gray-600 border-gray-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <Clock className="h-5 w-5" />;
            case 'in_progress': return <AlertCircle className="h-5 w-5" />;
            case 'resolved': return <CheckCircle2 className="h-5 w-5" />;
            case 'closed': return <CheckCircle2 className="h-5 w-5" />;
            default: return <Clock className="h-5 w-5" />;
        }
    };

    return (
        <main className="flex-grow pt-32 pb-20">
            <div className="max-w-3xl mx-auto px-4">
                <div className="text-center mb-12">
                    <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
                        TICKET TRACKER
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                        Check your <span className="text-blue-600">ticket status</span>
                    </h1>
                    <p className="text-lg text-gray-500 font-medium max-w-xl mx-auto">
                        Enter your ticket ID (e.g., QS-123456) to see the latest updates on your support request.
                    </p>
                </div>

                <form onSubmit={handleSearch} className="relative mb-12">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                            placeholder="Enter Ticket ID (e.g. QS-480418)"
                            className="h-20 pl-16 pr-40 rounded-3xl border-2 border-gray-100 bg-gray-50 text-xl font-bold focus:bg-white transition-all shadow-sm focus:shadow-xl focus:border-blue-500"
                            value={ticketId}
                            onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                            required
                        />
                        <Button
                            type="submit"
                            disabled={loading}
                            className="absolute right-3 top-3 bottom-3 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-200 transition-transform active:scale-95"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Track Status'}
                        </Button>
                    </div>
                </form>

                {ticket ? (
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-blue-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 md:p-12">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                                        <Ticket className="h-7 w-7 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Ticket ID</p>
                                        <h2 className="text-2xl font-black text-gray-900">{ticket.ticketId}</h2>
                                    </div>
                                </div>
                                <Badge className={`px-6 py-3 rounded-2xl text-base font-black border-2 flex items-center gap-2 ${getStatusColor(ticket.status)}`}>
                                    {getStatusIcon(ticket.status)}
                                    {ticket.status.toUpperCase().replace('_', ' ')}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Requester</p>
                                            <p className="font-bold text-gray-900">{ticket.firstName} {ticket.lastName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                                            <p className="font-bold text-gray-900">{ticket.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                            <Calendar className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Created At</p>
                                            <p className="font-bold text-gray-900">{new Date(ticket.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                            <AlertCircle className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Priority</p>
                                            <Badge className="bg-gray-100 text-gray-700 border-none font-black text-xs">
                                                {ticket.priority.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Original Message</p>
                                <p className="text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                                    {ticket.message}
                                </p>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-12 py-8 border-t border-gray-100 flex justify-center">
                            <p className="text-sm text-gray-500 font-medium text-center">
                                If you have more information to add, please reply to the confirmation email sent to <span className="text-gray-900 font-bold">{ticket.email}</span>.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                        <Ticket className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-black">No ticket selected</p>
                        <p className="text-gray-300 text-sm font-medium mt-1">Enter a ticket ID above to see its details</p>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function TicketStatusPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <Suspense fallback={
                <div className="flex-grow pt-32 pb-20 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                </div>
            }>
                <TicketStatusContent />
            </Suspense>
            <Footer />
        </div>
    );
}
