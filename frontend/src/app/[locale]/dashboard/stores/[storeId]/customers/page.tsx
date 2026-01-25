'use client';

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Search,
    Filter,
    Mail,
    UserPlus
} from "lucide-react";
import { useState } from "react";

export default function StoreCustomersPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-muted-foreground text-sm">View and manage your store customers.</p>
                </div>
                <Button className="rounded-xl shadow-lg shadow-primary/20">
                    <UserPlus className="w-4 h-4 mr-2" /> Add Customer
                </Button>
            </div>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search customers by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border-border bg-background focus:ring-2 focus:ring-primary/20 border transition-all text-sm outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="rounded-lg">
                                <Filter className="w-4 h-4 mr-2" /> Filters
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                            <Users className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold">No customers found</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                You don't have any customers yet. People who order from your store will be listed here.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
