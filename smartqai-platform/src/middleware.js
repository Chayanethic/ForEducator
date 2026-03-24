import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // This ensures the middleware doesn't block these routes during the build/test phase
  publicRoutes: ["/", "/api/(.*)", "/sign-in(.*)", "/sign-up(.*)", "/student(.*)", "/admin(.*)", "/onboarding(.*)"],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};