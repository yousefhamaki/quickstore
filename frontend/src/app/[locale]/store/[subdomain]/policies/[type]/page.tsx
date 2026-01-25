import { getPublicStore } from "@/services/publicStoreService";
import { notFound } from "next/navigation";
import { use } from "react";

export default async function PolicyPage({ params }: { params: Promise<{ subdomain: string, type: string }> }) {
    const { subdomain, type } = await params;
    const store = await getPublicStore(subdomain) as any;

    if (!store) notFound();

    const policies = store.settings?.policies || {};

    let content = "";
    let title = "";

    switch (type) {
        case "refund":
            content = policies.returnPolicy;
            title = "Refund & Return Policy";
            break;
        case "privacy":
            content = policies.privacyPolicy;
            title = "Privacy Policy";
            break;
        case "terms":
            content = policies.termsOfService;
            title = "Terms of Service";
            break;
        case "shipping":
            content = policies.shippingPolicy;
            title = "Shipping Policy";
            break;
        default:
            notFound();
    }

    if (!content) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-4xl font-black mb-4">{title}</h1>
                <p className="text-muted-foreground">This policy has not been defined yet.</p>
            </div>
        );
    }

    const primaryColor = store.branding?.primaryColor || "#3B82F6";

    return (
        <div className="container mx-auto px-4 py-20 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-black mb-12 border-b-4 pb-6" style={{ color: primaryColor }}>
                {title}
            </h1>
            <div className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed font-medium">
                {content}
            </div>
        </div>
    );
}
