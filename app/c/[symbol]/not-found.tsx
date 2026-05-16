import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-[1680px] px-6 py-32 text-center">
        <div className="eyebrow text-[var(--bone-faint)]">404 · NO LISTING UNDER THAT TICKER</div>
        <h1 className="mt-4 font-display text-[clamp(56px,9vw,128px)] leading-[0.9] tracking-[-0.04em] text-[var(--bone)]">
          Not in the atlas.
        </h1>
        <p className="mt-6 text-[var(--bone-dim)] max-w-[42rem] mx-auto">
          BORSA covers public Israeli companies on TASE, NASDAQ and NYSE. The ticker you opened
          isn’t in our catalog — yet.
        </p>
        <Link href="/" className="inline-block mt-8 px-5 py-3 border border-[var(--amber)] text-[var(--bone)] tracking-[0.18em] uppercase text-[11px] font-mono hover:bg-[var(--amber)]/10 transition-colors">
          ← Back to the atlas
        </Link>
      </section>
      <Footer />
    </main>
  );
}
