import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, readSession, safeNext } from '@/lib/auth';

const PUBLIC_FILES = new Set(['/favicon.ico', '/favicon.svg', '/robots.txt', '/sitemap.xml']);

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
  const isLogin = pathname === '/login' || pathname === '/api/auth/login';

  if (isLogin) {
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
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

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
