import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 1. Define routes that do NOT require an OZONE account
const isPublicRoute = createRouteMatcher([
  '/', 
  '/sign-in(.*)', 
  '/sign-up(.*)', 
  '/embed/exam(.*)', // Allows students to take embedded exams without logging in
  '/student(.*)',    // ⚡ NEW: Allows guests to explore the student panel
  '/educator(.*)',   // ⚡ NEW: Allows guests to explore the educator panel
  '/api(.*)'         // Allows your APIs to work securely
]);

export default clerkMiddleware(async (auth, req) => {
  // 2. If the user is NOT on a public route, force them to log in
  if (!isPublicRoute(req)) {
    await auth.protect(); 
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};