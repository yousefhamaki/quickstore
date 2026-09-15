import { FormSkeleton } from "@shared/components/Skeleton";

// Also covers the nested /edit sub-route via inheritance.
export default function Loading() {
    return <FormSkeleton />;
}
