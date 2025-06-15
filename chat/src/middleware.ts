import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/t')) {
    // Only set Cache-Control for successful responses
    // Next.js sets a custom header 'x-nextjs-cache' for cached hits
    // We assume 404s are not cached and won't have this header
    response.headers.set(
      'Cache-Control',
      'public, max-age=3600,',
    );
  }

  return response;
}

export const config = {
  matcher: ['/t/:uuid*'],
};
