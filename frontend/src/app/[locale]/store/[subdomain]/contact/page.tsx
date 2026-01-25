'use client';

import { useParams } from "next/navigation";
import { usePublicStore } from "@/lib/hooks/usePublicStore";
import { Mail, Phone, MessageSquare, Instagram, MapPin, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

export default function ContactPage() {
    const params = useParams();
    const subdomain = params.subdomain as string;
    const { data: storeData, isLoading } = usePublicStore(subdomain);
    const store = storeData as any;

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
    );

    if (!store) return <div className="p-20 text-center">Store not found</div>;

    const primaryColor = store.branding?.primaryColor || "#3B82F6";
    const contact = store.contact || {};

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate form submission
        setTimeout(() => {
            toast.success("Message sent! We'll get back to you soon.");
            setIsSubmitting(false);
            (e.target as HTMLFormElement).reset();
        }, 1500);
    };

    return (
        <div className="container mx-auto px-4 py-20 max-w-6xl space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Get in Touch</h1>
                <p className="text-gray-500 text-lg font-medium">
                    Have a question or need assistance? Our team is here to help you.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                {/* Contact Information */}
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contact.email && (
                            <Card className="rounded-[32px] border-2 border-transparent bg-gray-50 hover:bg-white hover:border-blue-50 transition-all duration-300 shadow-sm hover:shadow-xl group">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Us</p>
                                        <p className="font-bold truncate">{contact.email}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {contact.phone && (
                            <Card className="rounded-[32px] border-2 border-transparent bg-gray-50 hover:bg-white hover:border-blue-50 transition-all duration-300 shadow-sm hover:shadow-xl group">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Call Us</p>
                                        <p className="font-bold">{contact.phone}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {contact.whatsapp && (
                            <Card className="rounded-[32px] border-2 border-transparent bg-gray-50 hover:bg-white hover:border-green-50 transition-all duration-300 shadow-sm hover:shadow-xl group">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">WhatsApp</p>
                                        <p className="font-bold">{contact.whatsapp}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {contact.instagram && (
                            <Card className="rounded-[32px] border-2 border-transparent bg-gray-50 hover:bg-white hover:border-pink-50 transition-all duration-300 shadow-sm hover:shadow-xl group">
                                <CardContent className="p-8 space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                        <Instagram className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Instagram</p>
                                        <p className="font-bold cursor-pointer" onClick={() => window.open(`https://instagram.com/${contact.instagram.replace('@', '')}`, '_blank')}>
                                            {contact.instagram}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="p-12 bg-black rounded-[40px] text-white space-y-6 relative overflow-hidden">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Business Hours</h3>
                        </div>
                        <div className="space-y-3 opacity-80 text-sm font-medium">
                            <div className="flex justify-between">
                                <span>Monday - Friday</span>
                                <span>9:00 AM - 6:00 PM</span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-3">
                                <span>Saturday</span>
                                <span>10:00 AM - 4:00 PM</span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-3 opacity-50">
                                <span>Sunday</span>
                                <span>Closed</span>
                            </div>
                        </div>
                        {/* Decorative element */}
                        <div className="absolute -bottom-[40%] -right-[20%] w-[60%] aspect-square rounded-full opacity-20 blur-[80px]" style={{ backgroundColor: primaryColor }} />
                    </div>
                </div>

                {/* Contact Form */}
                <Card className="rounded-[40px] border-2 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-10 duration-700">
                    <CardContent className="p-8 md:p-12 space-y-8">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black">Send a Message</h2>
                            <p className="text-gray-400 font-medium">We'll respond to your inquiry within 24 hours.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1">Your Name</label>
                                    <Input required placeholder="E.g. John Doe" className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2" style={{ borderColor: primaryColor + '20' }} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest ml-1">Email Address</label>
                                    <Input required type="email" placeholder="E.g. john@example.com" className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2" style={{ borderColor: primaryColor + '20' }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1">Subject</label>
                                <Input required placeholder="How can we help?" className="h-14 rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2" style={{ borderColor: primaryColor + '20' }} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest ml-1">Message</label>
                                <Textarea required rows={5} placeholder="Write your message here..." className="rounded-2xl border-2 focus-visible:ring-offset-0 focus-visible:ring-2 resize-none" style={{ borderColor: primaryColor + '20' }} />
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Message</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
