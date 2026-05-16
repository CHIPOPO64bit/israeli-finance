import { Header } from '@/components/Header';

export default function Loading() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-[1680px] px-6 pt-16 pb-32">
        <div className="eyebrow text-[var(--bone-faint)]">LOADING SNAPSHOT</div>
        <div className="mt-4 font-display text-[80px] leading-none tracking-[-0.04em] text-[var(--ink-3)] shimmer max-w-[600px]">
          Fetching the books…
        </div>
        <div className="mt-12 grid grid-cols-12 gap-6">
          <div className="col-span-8 h-[320px] card shimmer" />
          <div className="col-span-4 h-[320px] card shimmer" />
          <div className="col-span-12 h-[400px] card shimmer" />
        </div>
      </section>
    </main>
  );
}
