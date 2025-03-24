// file: /middleware.ts
// feature: Auth - Route protection and authentication middleware with mode support

import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
} from "@convex-dev/auth/nextjs/server";
import { NextRequest } from "next/server";
import { debug } from "./lib/utils";

// Core system routes that should always be accessible
const isCoreRoute = createRouteMatcher([
  '/images/(.*)',
  '/audio/(.*)',
  '/icons/(.*)',
  '/api/manifest',
  '/favicon.ico',
  '/_next/(.*)',
  '/api/(.*)',
  '/api/meet/(.*)',
  '/api/meet/token/(.*)', // Add specific LiveKit token route
  '/api/livekit/(.*)',    // Add LiveKit webhook routes
  '/sw.js'
]);

// Authentication related routes
const isAuthRoute = createRouteMatcher([
  '/signin',
  '/register',
  '/forgot-password',
  '/auth/(.*)',
  '/api/auth/(.*)',
]);

// Public routes accessible in all modes
const isPublicRoute = createRouteMatcher([
  '/',
  '/onboarding',
  '/privacy-policy',
  '/terms-of-service',
  '/about',
  '/beta',  
  '/beta/(.*)',
  '/offline',
]);

// Protected application routes
const isProtectedRoute = createRouteMatcher([
  '/profile/(.*)',
  '/settings',
  '/administration',
  '/administration/(.*)',
  '/hookup',
  '/hookup/(.*)',
  '/hotornot',
  '/home',
  '/discover',
  '/contacts',
  '/contacts/(.*)',
  '/games/',
  '/games/(.*)',
  '/room',
]);

// Remove direct Convex client initialization in middleware
export default convexAuthNextjsMiddleware(
  async (request: NextRequest, { convexAuth }) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Always allow core system routes
    if (isCoreRoute(request)) {
      return null;
    }

    // Special handling for auth callback
    if (url.searchParams.has('code') && url.searchParams.has('state')) {
      return null;
    }

    try {
      const isAuthenticated = await convexAuth.isAuthenticated();

      debug('middleware', `Auth status for ${pathname}:`, {
        isAuthenticated,
        pathname
      });

      // Handle authenticated users
      if (isAuthenticated) {
        // Redirect from landing/signin to app
        if (pathname === '/' || pathname === '/signin') {
          return Response.redirect(new URL('/home', request.url));
        }
        return null;
      }

      // Handle public and auth routes
      if (isPublicRoute(request) || isAuthRoute(request)) {
        return null;
      }

      // Handle protected routes - redirect to signin
      if (isProtectedRoute(request)) {
        const redirectUrl = new URL('/signin', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return Response.redirect(redirectUrl);
      }

      // Default deny - redirect to landing
      return Response.redirect(new URL('/', request.url));

    } catch (error) {
      debug('middleware', 'Auth error:', error);
      // On error, allow the request to continue to public routes
      if (isPublicRoute(request) || isAuthRoute(request)) {
        return null;
      }
      // Otherwise redirect to signin
      return Response.redirect(new URL('/signin', request.url));
    }
  },
  {
    verbose: true,
    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json).*)',
    '/'
  ],
};