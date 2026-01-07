import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Allow the request to proceed if authenticated
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/billing/:path*',
    '/settings/:path*',
    '/api/projects/:path*',
    '/api/ai/:path*',
    '/api/usage/:path*',
    '/api/subscription/:path*',
  ],
};
