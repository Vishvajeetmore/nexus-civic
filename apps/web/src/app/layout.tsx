import type { Metadata } from 'next';
import { Space_Mono, Outfit } from 'next/font/google';
import './globals.css';

const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-space-mono' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Nexus Civic',
  description: 'Unified Intelligence Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${spaceMono.variable} font-sans bg-[#0D021F] text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
