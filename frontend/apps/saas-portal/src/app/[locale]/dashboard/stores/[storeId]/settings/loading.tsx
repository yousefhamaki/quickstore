import { FormSkeleton } from "@shared/components/Skeleton";

// Covers every settings/* sub-page (general, payments, shipping, policies,
// domain, theme) via Next.js's loading.tsx inheritance — none of them need
// their own file unless a specific one deserves a more tailored skeleton.
export default function Loading() {
    return <FormSkeleton />;
}
