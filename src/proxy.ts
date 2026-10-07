import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

const PUBLIC_PREFIXES = ['/login', '/api/auth', '/api/calendar'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_PREFIXES.some(p => pathname.startsWith(p));

  // Public routes that never need the session lookup
  if (isPublicRoute && pathname !== '/login') return NextResponse.next();

  const session = await auth.api.getSession({ headers: request.headers });

  // Redirect unauthenticated users to login
  if (!session && !isPublicRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (session && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
