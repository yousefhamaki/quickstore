import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Match /en, /en/, /en/something, /ar, /ar/, /ar/something
  const localePattern = /^\/(en|ar)(\/|$)/;

  if (localePattern.test(pathname)) {
    // Strip the locale prefix. Ensure it starts with a single slash.
    const cleanPath = pathname.replace(localePattern, '/');
    
    // Check if clean path is /auth/login
    if (cleanPath === '/auth/login' || cleanPath === '/auth/login/') {
      return NextResponse.redirect(new URL('/' + search, request.url));
    }
    
    // Redirect to the clean path with search params
    return NextResponse.redirect(new URL(cleanPath + search, request.url));
  }

  // Handle direct /auth/login without locale prefix
  if (pathname === '/auth/login' || pathname === '/auth/login/') {
    return NextResponse.redirect(new URL('/' + search, request.url));
  }

  // Handle /admin redirect to /
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/' + search, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
