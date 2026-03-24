import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp 
      path="/sign-up" 
      routing="path" 
      signInUrl="/sign-in"
      appearance={{
        elements: {
          formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-sm normal-case',
          card: 'shadow-xl border border-slate-100 rounded-2xl',
        }
      }}
    />
  );
}