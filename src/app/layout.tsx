import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/auth/SessionProvider';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI App Builder - Build Apps with Natural Language',
  description: 'Describe your app in plain English and get real, working code. Iterate through conversation, preview results, and export your projects.',
  keywords: ['AI', 'app builder', 'code generation', 'no-code', 'low-code'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-900 text-gray-100`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
