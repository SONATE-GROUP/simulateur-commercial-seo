import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    if (token?.disabled) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'disabled');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  },
  { pages: { signIn: '/login' } }
);

export const config = {
  matcher: [
    '/((?!login|register|invite|reset-password|api/auth|api/register|api/invitations|_next|favicon.ico|logo-sonate.png).*)',
  ],
};
