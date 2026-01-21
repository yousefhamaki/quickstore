import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;

    // Skip middleware for Next.js internal requests and static assets
    const shouldSkip =
        pathname.startsWith('/_next') ||           // Next.js internals
        pathname.startsWith('/api') ||             // API routes
        pathname.includes('.') ||                  // Static files (favicon.ico, images, etc.)
        searchParams.has('_rsc');                  // React Server Component requests

    if (shouldSkip) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;

    // --- Subdomain / Custom Domain Handling ---
    const hostname = request.headers.get('host') || '';

    // Define main domains to exclude from subdomain routing
    const mainDomains = [
        'localhost:3000',
        'quickstore.com',
        'www.quickstore.com',
        'api.quickstore.com'
    ];

    // Check if current hostname is a storefront subdomain
    const isMainDomain = mainDomains.includes(hostname);

    if (!isMainDomain && !pathname.startsWith('/api')) {
        // Extract subdomain (e.g., 'yousef' from 'yousef.quickstore.com:3000')
        // This regex handles both production and localhost subdomains
        const subdomain = hostname.split('.')[0];

        if (subdomain && subdomain !== 'www') {
            // Rewrite the request to the dynamic storefront route
            // The path becomes /store/[subdomain]/current/path
            return NextResponse.rewrite(
                new URL(`/store/${subdomain}${pathname === '/' ? '' : pathname}`, request.url)
            );
        }
    }

    // --- Auth Redirects (Main Domain Only) ---
    // Paths that require authentication
    const isMerchantPath = pathname.startsWith('/merchant');
    const isDashboardPath = pathname.startsWith('/dashboard');
    const isAdminPath = pathname.startsWith('/admin');

    // Redirect unauthenticated users trying to access protected routes
    if (isMerchantPath || isDashboardPath || isAdminPath) {
        if (!token) {
            return NextResponse.redirect(new URL('/auth/login', request.url));
        }
    }

    // Redirect authenticated users away from auth pages
    if (token && (pathname === '/auth/login' || pathname === '/auth/register')) {
        return NextResponse.redirect(new URL('/merchant', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
