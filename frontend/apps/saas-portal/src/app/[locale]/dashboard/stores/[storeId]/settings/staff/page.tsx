'use client';

import { use, useState } from "react";
import { useStore } from "@shared/lib/hooks/useStore";
import { useStoreStaff, useInviteStoreStaff, useRemoveStoreStaff } from "@shared/lib/hooks/useStaff";
import { StoreStaffRole } from "@shared/lib/api/staff";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Badge } from "@shared/components/ui/badge";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
} from "@shared/components/ui/table";
import { Loader2, UserPlus, Trash2, Users, ShieldAlert } from "lucide-react";

export default function StaffSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading: isStoreLoading } = useStore(storeId);
    const { data: staff, isLoading: isStaffLoading } = useStoreStaff(storeId);
    const inviteMutation = useInviteStoreStaff(storeId);
    const removeMutation = useRemoveStoreStaff(storeId);

    const [email, setEmail] = useState('');
    const [role, setRole] = useState<StoreStaffRole>('staff');

    const isOwner = !store || !store.currentUserRole || store.currentUserRole === 'owner';

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        await inviteMutation.mutateAsync({ email: email.trim(), role });
        setEmail('');
        setRole('staff');
    };

    if (isStoreLoading) {
        return null;
    }

    // Backend enforces this regardless (staff management is owner-only —
    // see requireStoreRole(['owner']) on the staff routes), this is just so
    // a manager/staff account doesn't see a form that will only 403.
    if (!isOwner) {
        return (
            <div className="p-6 max-w-3xl mx-auto">
                <Card className="border-dashed">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Only the store owner can manage team access.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Team
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Invite teammates to help run this store. Managers get the same day-to-day
                    access as you (minus billing and team management). Staff get products,
                    orders, and customers only.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Invite a teammate</CardTitle>
                    <CardDescription>They&apos;ll get an email with a link to accept.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <div className="flex-1 space-y-1.5">
                            <Label htmlFor="staff-email">Email</Label>
                            <Input
                                id="staff-email"
                                type="email"
                                placeholder="teammate@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="staff-role">Role</Label>
                            <select
                                id="staff-role"
                                value={role}
                                onChange={(e) => setRole(e.target.value as StoreStaffRole)}
                                className="h-9 w-full sm:w-40 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            >
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                            </select>
                        </div>
                        <Button type="submit" disabled={inviteMutation.isPending}>
                            {inviteMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <UserPlus className="w-4 h-4 mr-2" />
                            )}
                            Send Invite
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Current team</CardTitle>
                </CardHeader>
                <CardContent>
                    {isStaffLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : !staff || staff.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            No teammates yet — invite one above.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.map((member) => (
                                    <TableRow key={member._id}>
                                        <TableCell className="font-medium">{member.email}</TableCell>
                                        <TableCell className="capitalize">{member.role}</TableCell>
                                        <TableCell>
                                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                                {member.status === 'active' ? 'Active' : 'Pending'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                disabled={removeMutation.isPending}
                                                onClick={() => {
                                                    if (confirm(`Remove ${member.email} from this store?`)) {
                                                        removeMutation.mutate(member._id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
