import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: 'SmartQAI Platform',
  description: 'AI-Powered Exam Preparation & Analytics',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider 
      allowedRedirectOrigins={[
        'http://localhost:3000', 
        'https://smartqai2.vercel.app'
      ]}
    >
      <html lang="en">
        <body className="bg-slate-50 text-slate-800 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}