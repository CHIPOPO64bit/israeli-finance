import { getTaseUniverse, onlyStocks } from '../lib/tase';

async function main() {
  const u = await getTaseUniverse();
  const stocks = onlyStocks(u);

  const wanted = [
    // Round 3: deeper search
    'plus5', 'tech car', 'avg', 'avogad', 'abogad', 'avg adva',
    'isras', 'glob', 'glb', 'k\'tav', 'kfir', 'osem', 'leumi card',
    'hilan', 'rad', 'rada', 'ituran',
  ];

  for (const w of wanted) {
    const matches = stocks.filter(s =>
      s.name.toLowerCase().includes(w) ||
      s.symbol.toLowerCase().includes(w.replace(/\s/g, ''))
    );
    if (matches.length) {
      console.log(`\n=== "${w}" ===`);
      for (const m of matches.slice(0, 8)) {
        console.log(`  ${m.symbol.padEnd(12)} ${m.name.padEnd(45)} sector=${m.sectorTV} cap=${m.marketCap}`);
      }
    } else {
      console.log(`-- no match for "${w}" --`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
