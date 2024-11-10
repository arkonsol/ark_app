// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the route starts with /chat
  if (request.nextUrl.pathname.startsWith('/chat')) {
    // Add your additional protection logic here if needed
    // For now, we'll let the client-side AuthWrapper handle the protection
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/chat/:path*',
};