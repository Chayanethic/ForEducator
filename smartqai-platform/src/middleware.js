import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the routes you want anyone to be able to see without logging in
const isPublicRoute = createRouteMatcher([
  '/',
  '/student(.*)', 
  '/admin(.*)',
  '/educator(.*)',
  '/api/(.*)'
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};