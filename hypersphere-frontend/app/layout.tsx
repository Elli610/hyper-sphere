import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HyperSphere - HyperEVM Analytics',
  description: 'Real-time analytics dashboard for the HyperEVM ecosystem',
  keywords: ['HyperEVM', 'Hyperliquid', 'DeFi', 'Analytics', 'Blockchain'],
  authors: [{ name: 'HyperSphere Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <main>{children}</main>
      </body>
    </html>
  );
}