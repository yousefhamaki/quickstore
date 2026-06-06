import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

interface Props {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'privacy' });

    return {
        title: `${t('hero.title')} | Buildora`,
        description: t('hero.badge'),
        openGraph: {
            title: t('hero.title'),
            description: t('hero.badge'),
            type: 'website',
        }
    };
}

export default function PrivacyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
