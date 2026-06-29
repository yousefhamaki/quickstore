'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@shared/services/api';
import AdminLayout from '../../components/AdminLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import { Loader2, Send, MessageSquare, Clock, Filter, CheckCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface TicketReply {
  _id?: string;
  sender: 'user' | 'admin';
  senderName: string;
  message: string;
  attachments?: string[];
  internalNote?: boolean;
  createdAt: string;
}

interface Ticket {
  _id: string;
  ticketId: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

export default function TicketsAdmin() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch tickets
  const { data: tickets, isLoading, error } = useQuery<Ticket[]>({
    queryKey: ['adminTickets'],
    queryFn: async () => {
      const response = await api.get('/admin/tickets');
      return response.data as Ticket[];
    },
  });

  // Ticket reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ id, message, internalNote }: { id: string; message: string; internalNote: boolean }) => {
      return api.post(`/admin/tickets/${id}/reply`, { message, internalNote });
    },
    onSuccess: (data: any) => {
      const updatedTicket = data.data as Ticket;
      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent to user');
      setReplyMessage('');
      setIsInternalNote(false);
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
      
      // Update selected ticket state on active panel
      setSelectedTicket(updatedTicket);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit response');
    }
  });

  // Ticket status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      return api.put(`/admin/tickets/${id}/status`, { status, reason });
    },
    onSuccess: (data: any) => {
      const updatedTicket = data.data as Ticket;
      toast.success(`Ticket status marked as ${updatedTicket.status}`);
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
      setSelectedTicket(updatedTicket);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update ticket status');
    }
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    replyMutation.mutate({
      id: selectedTicket._id,
      message: replyMessage,
      internalNote: isInternalNote
    });
  };

  const handleUpdateStatus = (status: 'resolved' | 'closed' | 'open') => {
    if (!selectedTicket) return;
    statusMutation.mutate({
      id: selectedTicket._id,
      status,
      reason: `Status modified to ${status} from admin console`
    });
  };

  // Filter list by selected state
  const filteredTickets = tickets?.filter(t => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  }) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Support Helpdesk</h2>
          <p className="text-sm text-slate-400 mt-1">Review merchant tickets, write client replies, or save internal notes.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-210px)] min-h-[500px]">
          {/* Left panel: tickets queue list */}
          <div className="lg:col-span-4 flex flex-col space-y-4 bg-slate-900/60 border border-white/5 rounded-2xl p-4 overflow-hidden h-full">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Queue List</span>
              <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                <Filter className="w-4 h-4 text-slate-500" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-none cursor-pointer text-slate-300 font-semibold"
                >
                  <option value="all">All States</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {isLoading ? (
                <div className="py-20 text-center text-slate-500 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500 mr-2" />
                  Loading inbox...
                </div>
              ) : error ? (
                <div className="py-20 text-center text-red-400 text-xs">
                  Failed to load support tickets.
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="py-20 text-center text-slate-600 text-xs">
                  No tickets found in this state.
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = selectedTicket?._id === ticket._id;
                  return (
                    <div 
                      key={ticket._id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 border-cyan-500/30 text-white shadow-lg' 
                          : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-cyan-400 font-mono">#{ticket.ticketId}</span>
                        <div className="flex gap-1">
                          <Badge className={`text-[8px] font-extrabold uppercase px-1 py-0 ${
                            ticket.priority === 'high' 
                              ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                              : ticket.priority === 'medium'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {ticket.priority}
                          </Badge>
                          <Badge className={`text-[8px] font-extrabold uppercase px-1 py-0 ${
                            ticket.status === 'open' 
                              ? 'bg-red-600/10 text-red-400 border-red-600/20' 
                              : ticket.status === 'in_progress'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              : 'bg-green-500/10 text-green-400 border-green-500/20'
                          }`}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-white mt-2 truncate">{ticket.firstName} {ticket.lastName}</h4>
                      <p className="text-xs text-slate-400 truncate mt-1">{ticket.message}</p>
                      
                      <div className="flex justify-between items-center text-[9px] text-slate-500 mt-3 font-semibold">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-600" /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <span>{ticket.replies?.length || 0} responses</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Active ticket chat thread */}
          <div className="lg:col-span-8 flex flex-col bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden h-full">
            {selectedTicket ? (
              <div className="flex flex-col h-full justify-between">
                {/* Panel Header */}
                <div className="p-4 border-b border-white/5 bg-slate-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-cyan-500" />
                      Ticket #{selectedTicket.ticketId}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Sender: <span className="font-semibold text-slate-300">{selectedTicket.firstName} {selectedTicket.lastName} ({selectedTicket.email})</span></p>
                  </div>

                  <div className="flex gap-2">
                    {selectedTicket.status !== 'resolved' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus('resolved')}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Resolve Ticket
                      </Button>
                    )}
                    {selectedTicket.status !== 'closed' && (
                      <Button 
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateStatus('closed')}
                        className="text-xs rounded-xl"
                      >
                        Close Ticket
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
                  {/* Original support inquiry card */}
                  <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <span>Store inquiry description</span>
                      <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-200 white-space-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                  </div>

                  {/* Replies history timeline */}
                  {selectedTicket.replies?.map((reply, index) => {
                    const isAdminSender = reply.sender === 'admin';
                    const isNote = reply.internalNote;
                    return (
                      <div 
                        key={index} 
                        className={`flex flex-col max-w-[85%] rounded-xl p-3.5 space-y-1.5 ${
                          isNote 
                            ? 'ml-auto bg-amber-500/10 border border-amber-500/20 text-amber-100 glow-indigo' 
                            : isAdminSender 
                            ? 'ml-auto bg-slate-800/80 border border-white/10 text-slate-100' 
                            : 'bg-slate-950/60 border border-white/5 text-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                          <span className={isNote ? 'text-amber-400' : isAdminSender ? 'text-cyan-400' : 'text-indigo-400'}>
                            {reply.senderName} {isNote ? '(Internal Note)' : ''}
                          </span>
                          <span className="text-slate-500">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm white-space-pre-wrap leading-relaxed">{reply.message}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Editor Form */}
                <form onSubmit={handleSendReply} className="p-4 border-t border-white/5 bg-slate-950/30 space-y-3">
                  <Textarea 
                    placeholder={isInternalNote ? "Write private administrative node (not shown to user)..." : "Write response message details to merchant..."}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white placeholder-slate-600 focus-visible:ring-cyan-500 h-20 rounded-xl resize-none"
                    disabled={replyMutation.isPending}
                  />

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="note-toggle" 
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                        disabled={replyMutation.isPending}
                      />
                      <Label htmlFor="note-toggle" className="text-xs text-slate-400 font-semibold cursor-pointer">
                        Mark as Private Internal Note
                      </Label>
                    </div>

                    <Button 
                      type="submit" 
                      className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl px-5"
                      disabled={replyMutation.isPending || !replyMessage.trim()}
                    >
                      {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1.5" />}
                      Send response
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                <MessageSquare className="w-16 h-16 text-slate-700 mb-3" />
                <p className="text-sm font-semibold">Select a support ticket from the sidebar queue to inspect discussion history.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
