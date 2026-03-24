import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn 
      path="/sign-in" 
      routing="path" 
      signUpUrl="/sign-up"
      appearance={{
        elements: {
          formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-sm normal-case',
          card: 'shadow-xl border border-slate-100 rounded-2xl',
        }
      }}
    />
  );
}