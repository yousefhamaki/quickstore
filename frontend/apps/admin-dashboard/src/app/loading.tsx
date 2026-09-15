import { TableSkeleton } from "@shared/components/Skeleton";

// Covers every admin route (merchants, plans, receipts, stores, tickets,
// transactions) via Next.js's loading.tsx inheritance — all list/table-like
// screens, so this is a reasonable default everywhere in this app.
export default function Loading() {
    return <TableSkeleton />;
}
