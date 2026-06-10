import { NextResponse } from 'next/server';
import { getPublicStore } from '@shared/services/publicStoreService';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ locale: string; subdomain: string }> }
) {
    try {
        const { subdomain } = await params;
        const store = await getPublicStore(subdomain);
        
        if (!store) {
            return new NextResponse('Store not found', { status: 404 });
        }

        const manifest = {
            name: store.name,
            short_name: store.name,
            description: store.description || `Welcome to ${store.name}`,
            start_url: '/',
            display: 'standalone',
            background_color: store.branding?.primaryColor || '#ffffff',
            theme_color: store.branding?.primaryColor || '#ffffff',
            scope: '/',
            icons: [
                {
                    src: store.logo?.url || '/apple-touch-icon.png',
                    sizes: '180x180',
                    type: 'image/png',
                },
            ],
        };

        return NextResponse.json(manifest, {
            headers: {
                'Content-Type': 'application/manifest+json',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
        });
    } catch (error) {
        console.error('[Dynamic Manifest Error]:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
