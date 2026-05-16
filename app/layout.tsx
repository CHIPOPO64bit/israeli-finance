import type { Metadata } from 'next';
import { Fraunces, Geist, JetBrains_Mono, Frank_Ruhl_Libre } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-mono-jb',
  subsets: ['latin'],
  display: 'swap',
});

const frank = Frank_Ruhl_Libre({
  variable: '--font-heb',
  subsets: ['hebrew', 'latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BORSA — Israeli Public Company Atlas',
  description:
    'A working terminal for Israeli public companies: financials, leadership, filings and primary disclosures — not predictions, evidence.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${fraunces.variable} ${geist.variable} ${jetbrains.variable} ${frank.variable}`}
    >
      <body className="relative min-h-screen overflow-x-hidden">
        <div className="relative z-[1]">{children}</div>
      </body>
    </html>
  );
}
