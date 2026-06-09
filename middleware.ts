export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/((?!login|register|invite|api/auth|api/register|api/invitations|_next|favicon.ico|logo-sonate.png).*)',
  ],
};
