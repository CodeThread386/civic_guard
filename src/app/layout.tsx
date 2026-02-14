import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });
const googleClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
const hasValidGoogleClient = googleClientId.length > 20 && googleClientId.includes('.apps.googleusercontent.com');

export const metadata: Metadata = {
  title: 'CivicGuard - Crisis Identity Verification',
  description: 'Rapidly deploy secure, offline-first identity verification for disaster relief zones',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = <AuthProvider>{children}</AuthProvider>;
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
      </head>
      <body className="min-h-screen bg-background-dark text-slate-200 antialiased font-display" suppressHydrationWarning>
        {hasValidGoogleClient ? (
          <GoogleOAuthProvider clientId={googleClientId}>
            {content}
          </GoogleOAuthProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
