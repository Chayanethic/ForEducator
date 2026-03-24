import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: 'SmartQAI Platform',
  description: 'AI-Powered Exam Preparation & Analytics',
}

export default function RootLayout({ children }) {
  return (
    // Wrap the HTML with ClerkProvider
    <ClerkProvider>
      <html lang="en">
        <body className="bg-slate-50 text-slate-800 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}