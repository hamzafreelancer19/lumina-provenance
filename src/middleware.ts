import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, readSession, safeNext } from '@/lib/auth';

const PUBLIC_FILES = new Set([
  '/favicon.ico',
  '/favicon.svg',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/opengraph-image',
  '/twitter-image',
]);

const OPEN_API = new Set(['/api/auth/login', '/api/auth/register', '/api/studio/status']);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/wasm') ||
    PUBLIC_FILES.has(pathname)
  ) {
    return NextResponse.next();
  }

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    OPEN_API.has(pathname);

  if (isAuthPage) {
    if (session && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL(session.role === 'admin' ? '/admin' : '/', request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const login = new URL('/login', request.url);
    login.searchParams.set('next', safeNext(`${pathname}${search}`));
    return NextResponse.redirect(login);
  }

  if (
    (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin')) &&
    session.role !== 'admin'
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
