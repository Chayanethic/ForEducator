import { authMiddleware } from "@clerk/nextjs/server";

export default authMiddleware({
  // These routes are accessible to EVERYONE (logged in or not)
  publicRoutes: [
    "/", 
    "/sign-in(.*)", 
    "/sign-up(.*)", 
    "/api/(.*)",
    "/student(.*)", // Temporary: allow access to test the UI
    "/admin(.*)",
    "/educator(.*)"
  ],
});

export const config = {
  // This regex matches all routes except static files (images, etc.)
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};