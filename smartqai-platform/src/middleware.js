import { authMiddleware } from "@clerk/nextjs/server";

// This uses the older, more stable 'authMiddleware' 
// which is less likely to crash on version mismatches.
export default authMiddleware({
  publicRoutes: ["/", "/api/(.*)", "/student(.*)", "/admin(.*)", "/educator(.*)", "/sign-in(.*)", "/sign-up(.*)"],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}; 