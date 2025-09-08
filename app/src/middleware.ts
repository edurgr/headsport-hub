import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/profile',
  '/profile-management',
  '/athlete-management',
  '/invite-manager',
  '/content',
  '/orders',
  '/analytics',
  '/my-stats',
  '/admin',
];

// Routes that only administrators can access
const adminOnlyRoutes = ['/admin', '/invite-manager', '/signup'];

// Routes that only managers and administrators can access
// const managerRoutes = [
//   '/profile-management',
//   '/athlete-management'
// ]; // TODO: Implement manager-specific route protection

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir acceso a archivos estáticos y API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Public routes that don't require middleware
  const publicRoutes = [
    '/',
    '/login',
    '/login/',
    '/accept-invite',
    '/auth/callback',
    '/forgot-password',
  ];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Verificar si es una ruta protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // For protected routes, verify authentication strictly (no demo)
  const token =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('sb:token')?.value ||
    (() => {
      const raw = request.cookies.get('supabase-auth-token')?.value;
      try {
        if (!raw) return '';
        const arr = JSON.parse(decodeURIComponent(raw));
        return Array.isArray(arr) ? String(arr[0] || '') : '';
      } catch {
        return '';
      }
    })();

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // For routes that require specific roles, verify permissions
  // This is better done in the frontend with the ProtectedRoute component
  // but here we can do a basic verification

  if (adminOnlyRoutes.some(route => pathname.startsWith(route))) {
    // Verify if user is admin (this would require decoding the JWT)
    // For now, we allow access and verification is done in the frontend
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
