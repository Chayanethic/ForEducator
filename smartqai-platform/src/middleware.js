import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Define your public routes
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/(.*)'
]);

export default clerkMiddleware(async (auth, request) => {
  // 2. Check if the route is NOT public
  if (!isPublicRoute(request)) {
    // 3. AWAIT the auth object before calling protect()
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};