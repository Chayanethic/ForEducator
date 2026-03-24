import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define which routes require the user to be logged in
const isProtectedRoute = createRouteMatcher([
  '/educator(.*)', // Protects /educator and anything inside it
  '/student(.*)',  // Protects /student and anything inside it
]);

export default clerkMiddleware((auth, req) => {
  // If the user tries to access a protected route, force them to sign in
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

// This config tells Next.js which files the middleware should run on.
// It skips static files (images, css) for performance.
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};