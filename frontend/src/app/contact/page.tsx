'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Mail, MessageSquare, Phone, MapPin, Loader2, CheckCircle2, Copy } from 'lucide-react';
import { createSupportTicket } from '@/lib/api/support';
import { toast } from 'sonner';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [ticketId, setTicketId] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        // In this case, we don't have IDs on the elements so we'll use names or just pass the id manually
        // Let's add IDs/names to the inputs first.
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await createSupportTicket(formData) as any;
            setTicketId(response.ticketId);
            setSubmitted(true);
            toast.success('Message sent successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send message');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex flex-col min-h-screen bg-white">
                <Navbar />
                <main className="flex-grow pt-32 pb-20 flex items-center justify-center">
                    <div className="max-w-md w-full px-4 text-center space-y-6">
                        <div className="flex justify-center">
                            <CheckCircle2 className="h-20 w-20 text-green-500" />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900">Message Received!</h1>
                        <p className="text-xl text-gray-500 font-medium">
                            Thank you for reaching out. We have created a support ticket for you.
                        </p>
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center">
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Your Ticket ID</p>
                            <div className="flex items-center gap-2">
                                <p className="text-2xl font-black text-blue-600">{ticketId}</p>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(ticketId);
                                        toast.success('Ticket ID copied!');
                                    }}
                                    className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-blue-100 group"
                                    title="Copy Ticket ID"
                                >
                                    <Copy className="h-5 w-5 text-blue-400 group-hover:text-blue-600 transition-colors" />
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-400 font-medium">
                            A confirmation email has been sent to <span className="text-gray-900">{formData.email}</span>.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            <Button
                                onClick={() => setSubmitted(false)}
                                className="h-14 px-10 rounded-xl bg-gray-100 text-gray-900 border-none hover:bg-gray-200 font-black text-lg"
                            >
                                Send another
                            </Button>
                            <a
                                href={`/support/status?id=${ticketId}`}
                                className="h-14 px-10 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                            >
                                Check Status
                            </a>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />

            <main className="flex-grow pt-32 pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
                    <Badge className="mb-4 bg-blue-50 text-blue-600 border-blue-100 px-4 py-1.5 rounded-full text-sm font-black">
                        CONTACT US
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6">
                        We'd love to hear<br />
                        <span className="text-blue-600">from you.</span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                        Have questions about Buildora? Our team is here to help you get started.
                    </p>
                </div>

                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-20">
                    {/* Contact Info */}
                    <div className="space-y-12">
                        <div className="flex items-start space-x-6">
                            <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Mail className="text-blue-600 h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Email</h3>
                                <p className="text-gray-500 font-medium">support@quickstore.eg</p>
                                <p className="text-gray-500 font-medium">sales@quickstore.eg</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-6">
                            <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Phone className="text-green-600 h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Phone</h3>
                                <p className="text-gray-500 font-medium">+20 (0) 123 456 7890</p>
                                <p className="text-gray-500 font-medium">Mon-Fri from 9am to 6pm</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-6">
                            <div className="h-14 w-14 bg-purple-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <MapPin className="text-purple-600 h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Office</h3>
                                <p className="text-gray-500 font-medium">Maadi Tech Hub, Building 4</p>
                                <p className="text-gray-500 font-medium">Cairo, Egypt</p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-6">
                            <div className="h-14 w-14 bg-yellow-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <MessageSquare className="text-yellow-600 h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 mb-2">Live Chat</h3>
                                <p className="text-gray-500 font-medium">Available in your merchant dashboard</p>
                                <p className="text-gray-500 font-medium">Average response time: 5 mins</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-gray-50/50 p-12 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-900 uppercase tracking-widest">First Name</label>
                                    <Input
                                        placeholder="John"
                                        className="h-14 rounded-xl border-gray-200 bg-white"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-900 uppercase tracking-widest">Last Name</label>
                                    <Input
                                        placeholder="Doe"
                                        className="h-14 rounded-xl border-gray-200 bg-white"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-900 uppercase tracking-widest">Email Address</label>
                                <Input
                                    placeholder="john@example.com"
                                    type="email"
                                    className="h-14 rounded-xl border-gray-200 bg-white"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-900 uppercase tracking-widest">Message</label>
                                <Textarea
                                    className="min-h-[150px] rounded-xl border-gray-200 bg-white font-medium focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="How can we help you?"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 rounded-xl bg-blue-600 hover:bg-blue-700 text-lg font-black shadow-lg shadow-blue-200"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Send Message'}
                            </Button>
                        </form>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
