import { PageSkeleton } from "@shared/components/Skeleton";

// Covers every top-level marketing/informational page (home, about,
// features, pricing, contact, support, terms, privacy) via Next.js's
// loading.tsx inheritance. The storefront (store/[subdomain]) already
// builds its own tailored Suspense fallback directly into its page.tsx,
// so this is effectively a no-op there — harmless either way.
export default function Loading() {
    return <PageSkeleton />;
}
