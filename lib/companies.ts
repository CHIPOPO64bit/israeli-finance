import type { SectorKey } from './sectors';

export type Company = {
  symbol: string;           // primary Yahoo ticker (prefer most liquid listing)
  symbolTA?: string;        // TASE ticker if different (with .TA suffix)
  hebrewName: string;
  englishName: string;
  shortName: string;        // display short name
  sector: SectorKey;
  tagline?: string;
  founded?: number;
  hq?: string;              // city, country
  website?: string;
  ceo?: string;             // fallback if Yahoo gives no officers
  // Deep-link aids:
  mayaCompanyId?: string;   // for maya.tase.co.il/company/{id}
  taseSecurityNo?: string;  // for tase.co.il/he/market_data/security/{n}
};

/**
 * Curated catalog of major Israeli public companies.
 * Tickers prefer the most liquid listing (NASDAQ/NYSE for global tech, TASE for banks/utilities/realestate).
 * Hebrew names are official registered names where available.
 */
export const COMPANIES: Company[] = [
  // ── Software & Internet ───────────────────────────────────────────
  { symbol: 'WIX',       symbolTA: 'WIX.TA',     englishName: 'Wix.com',                    hebrewName: 'וויקס.קום',                   shortName: 'Wix',         sector: 'tech',       tagline: 'Cloud website-building platform',                 founded: 2006, hq: 'Tel Aviv',     website: 'wix.com' },
  { symbol: 'MNDY',                            englishName: 'monday.com',                 hebrewName: 'מאנדיי.קום',                 shortName: 'monday',      sector: 'tech',       tagline: 'Work-management OS',                              founded: 2012, hq: 'Tel Aviv',     website: 'monday.com' },
  { symbol: 'FROG',                            englishName: 'JFrog',                      hebrewName: "ג'יי-פרוג",                  shortName: 'JFrog',       sector: 'tech',       tagline: 'DevOps & software-supply-chain platform',         founded: 2008, hq: 'Netanya',      website: 'jfrog.com' },
  { symbol: 'GLBE',                            englishName: 'Global-E Online',            hebrewName: 'גלובל-אי אונליין',            shortName: 'Global-E',    sector: 'tech',       tagline: 'Cross-border e-commerce platform',                founded: 2013, hq: 'Petah Tikva',  website: 'global-e.com' },
  { symbol: 'FVRR',                            englishName: 'Fiverr International',       hebrewName: 'פייבר אינטרנשיונל',           shortName: 'Fiverr',      sector: 'tech',       tagline: 'Freelance services marketplace',                  founded: 2010, hq: 'Tel Aviv',     website: 'fiverr.com' },
  { symbol: 'SMWB',                            englishName: 'Similarweb',                 hebrewName: 'סימילרוויב',                  shortName: 'Similarweb',  sector: 'tech',       tagline: 'Digital intelligence platform',                   founded: 2007, hq: 'Givatayim',    website: 'similarweb.com' },
  { symbol: 'KRNT',                            englishName: 'Kornit Digital',             hebrewName: 'קורנית דיגיטל',               shortName: 'Kornit',      sector: 'tech',       tagline: 'Sustainable on-demand digital textile production',founded: 2002, hq: 'Rosh HaAyin',  website: 'kornit.com' },
  { symbol: 'NICE',      symbolTA: 'NICE.TA',  englishName: 'NICE Ltd.',                  hebrewName: 'נייס',                        shortName: 'NICE',        sector: 'tech',       tagline: 'AI-powered customer experience & compliance',     founded: 1986, hq: "Ra'anana",     website: 'nice.com' },
  { symbol: 'AUDC',                            englishName: 'AudioCodes',                 hebrewName: 'אודיוקודס',                   shortName: 'AudioCodes',  sector: 'tech',       tagline: 'Voice networking & VoIP for enterprises',         founded: 1992, hq: 'Lod',          website: 'audiocodes.com' },
  { symbol: 'PERI',                            englishName: 'Perion Network',             hebrewName: 'פריון נטוורק',                shortName: 'Perion',      sector: 'tech',       tagline: 'Digital advertising technology',                  founded: 1999, hq: 'Holon',        website: 'perion.com' },
  { symbol: 'TBLA',                            englishName: 'Taboola.com',                hebrewName: 'טאבולה.קום',                  shortName: 'Taboola',     sector: 'tech',       tagline: 'Content discovery & recommendations',             founded: 2007, hq: 'Tel Aviv',     website: 'taboola.com' },
  { symbol: 'OB',                              englishName: 'Outbrain',                   hebrewName: 'אאוטבריין',                   shortName: 'Outbrain',    sector: 'tech',       tagline: 'Recommendation engine for the open web',          founded: 2006, hq: 'Netanya',      website: 'outbrain.com' },
  { symbol: 'INMD',                            englishName: 'InMode',                     hebrewName: 'אין מוד',                     shortName: 'InMode',      sector: 'tech',       tagline: 'Minimally invasive medical aesthetics',           founded: 2008, hq: 'Yokneam',      website: 'inmodemd.com' },
  { symbol: 'MTRX.TA',                         englishName: 'Matrix IT',                  hebrewName: 'מטריקס I.T',                  shortName: 'Matrix',      sector: 'tech',       tagline: 'IT services & systems integration',               founded: 2001, hq: 'Herzliya',     website: 'matrix.co.il' },
  { symbol: 'ION.TA',                          englishName: 'Ion Software',               hebrewName: 'יון תוכנה',                   shortName: 'Ion',         sector: 'tech',       tagline: 'Enterprise software & integration',               hq: 'Tel Aviv' },
  { symbol: 'PLTK',                            englishName: 'Playtika Holding',           hebrewName: 'פלייטיקה',                    shortName: 'Playtika',    sector: 'tech',       tagline: 'Mobile gaming & social casino',                   founded: 2010, hq: 'Herzliya',     website: 'playtika.com' },
  { symbol: 'RSKD',                            englishName: 'Riskified',                  hebrewName: 'ריסקיפייד',                   shortName: 'Riskified',   sector: 'tech',       tagline: 'E-commerce fraud prevention',                     founded: 2013, hq: 'Tel Aviv',     website: 'riskified.com' },
  { symbol: 'PAY',                             englishName: 'Paymentus',                  hebrewName: 'פיימנטוס',                    shortName: 'Paymentus',   sector: 'tech',       tagline: 'Bill-payment cloud platform',                     hq: 'Israel' },

  // ── Cybersecurity ─────────────────────────────────────────────────
  { symbol: 'CHKP',                            englishName: 'Check Point Software',       hebrewName: 'צ׳ק פוינט תוכנה',             shortName: 'Check Point', sector: 'security',   tagline: 'Network & cloud security',                        founded: 1993, hq: 'Tel Aviv',     website: 'checkpoint.com' },
  { symbol: 'CYBR',                            englishName: 'CyberArk Software',          hebrewName: 'סייברארק',                    shortName: 'CyberArk',    sector: 'security',   tagline: 'Identity security & privileged access',           founded: 1999, hq: 'Petah Tikva',  website: 'cyberark.com' },
  { symbol: 'VRNS',                            englishName: 'Varonis Systems',            hebrewName: 'ורוניס סיסטמס',               shortName: 'Varonis',     sector: 'security',   tagline: 'Data security platform',                          founded: 2005, hq: 'New York / Herzliya', website: 'varonis.com' },
  { symbol: 'CGNT',                            englishName: 'Cognyte Software',           hebrewName: 'קוגניט סופטוור',              shortName: 'Cognyte',     sector: 'security',   tagline: 'Investigative analytics for security',            founded: 2021, hq: "Herzliya",      website: 'cognyte.com' },
  { symbol: 'ALLT',                            englishName: 'Allot Ltd.',                 hebrewName: 'אלוט',                        shortName: 'Allot',       sector: 'security',   tagline: 'Network intelligence & security',                 founded: 1996, hq: 'Hod HaSharon', website: 'allot.com' },
  { symbol: 'ZIM',                             englishName: 'ZIM Integrated Shipping',    hebrewName: 'צים שירותי ספנות',            shortName: 'ZIM',         sector: 'shipping',   tagline: 'Container shipping & logistics',                  founded: 1945, hq: 'Haifa',        website: 'zim.com' },
  { symbol: 'CLBT',                            englishName: 'Cellebrite DI Ltd.',         hebrewName: 'סלברייט',                    shortName: 'Cellebrite',  sector: 'security',   tagline: 'Mobile-device forensics & investigative tech',    founded: 1999, hq: 'Petah Tikva',  website: 'cellebrite.com' },
  { symbol: 'MBLY',                            englishName: 'Mobileye Global',            hebrewName: 'מובילאיי',                    shortName: 'Mobileye',    sector: 'semis',      tagline: 'Computer-vision chips & ADAS for autonomous driving', founded: 1999, hq: 'Jerusalem',    website: 'mobileye.com' },
  { symbol: 'HUBC',                            englishName: 'Hub Cyber Security',         hebrewName: 'האב סייבר סקיוריטי',          shortName: 'Hub Cyber',   sector: 'security',   tagline: 'Confidential-computing cyber platform',           founded: 2017, hq: 'Tel Aviv',     website: 'hubsecurity.com' },
  { symbol: 'ALAR',                            englishName: 'Alarum Technologies',        hebrewName: 'אלארום טכנולוגיות',          shortName: 'Alarum',      sector: 'security',   tagline: 'Privacy + cyber data-collection (NetNut)',        hq: 'Tel Aviv',     website: 'alarum.io' },
  { symbol: 'MGIC',                            englishName: 'Magic Software Enterprises', hebrewName: 'מג׳יק תוכנה',                shortName: 'Magic',       sector: 'tech',       tagline: 'Application integration platforms',               founded: 1983, hq: 'Or Yehuda',    website: 'magicsoftware.com' },

  // ── Semiconductors ────────────────────────────────────────────────
  { symbol: 'TSEM',      symbolTA: 'TSEM.TA',  englishName: 'Tower Semiconductor',        hebrewName: 'טאואר סמיקונדקטור',           shortName: 'Tower',       sector: 'semis',      tagline: 'Analog & specialty foundry',                      founded: 1993, hq: 'Migdal HaEmek',website: 'towersemi.com' },
  { symbol: 'NVMI',                            englishName: 'Nova Ltd.',                  hebrewName: 'נובה',                        shortName: 'Nova',        sector: 'semis',      tagline: 'Process control for semiconductor manufacturing', founded: 1993, hq: 'Rehovot',      website: 'novami.com' },
  { symbol: 'CAMT',                            englishName: 'Camtek',                     hebrewName: 'קמטק',                        shortName: 'Camtek',      sector: 'semis',      tagline: 'Inspection systems for advanced packaging',       founded: 1987, hq: 'Migdal HaEmek',website: 'camtek.com' },
  { symbol: 'CEVA',                            englishName: 'Ceva',                       hebrewName: 'סבע',                        shortName: 'Ceva',        sector: 'semis',      tagline: 'Wireless connectivity & smart sensing IP',        founded: 2002, hq: "Herzliya / Rockville", website: 'ceva-dsp.com' },
  { symbol: 'CRNT',                            englishName: 'Ceragon Networks',           hebrewName: 'סראגון נטוורקס',              shortName: 'Ceragon',     sector: 'semis',      tagline: 'Wireless transport & 5G backhaul',                founded: 1996, hq: 'Tel Aviv',     website: 'ceragon.com' },

  // ── Pharma & Biotech ──────────────────────────────────────────────
  { symbol: 'TEVA',      symbolTA: 'TEVA.TA',  englishName: 'Teva Pharmaceutical',        hebrewName: 'טבע תעשיות פרמצבטיות',        shortName: 'Teva',        sector: 'pharma',     tagline: 'World’s largest generic-drug maker',              founded: 1901, hq: 'Petah Tikva',  website: 'tevapharm.com' },
  { symbol: 'CGEN',                            englishName: 'Compugen',                   hebrewName: 'קומפיוג׳ן',                   shortName: 'Compugen',    sector: 'pharma',     tagline: 'Predictive immunology drug-discovery',            founded: 1993, hq: 'Holon',        website: 'cgen.com' },
  { symbol: 'BLRX',                            englishName: 'BioLineRx',                  hebrewName: 'ביולין אר אקס',               shortName: 'BioLineRx',   sector: 'pharma',     tagline: 'Late-stage clinical oncology',                    founded: 2003, hq: 'Modi’in',     website: 'biolinerx.com' },
  { symbol: 'KMDA',                            englishName: 'Kamada Ltd.',                hebrewName: 'קמהדע',                       shortName: 'Kamada',      sector: 'pharma',     tagline: 'Plasma-derived therapeutics',                     founded: 1990, hq: 'Rehovot',      website: 'kamadagroup.com' },
  { symbol: 'ENLV',                            englishName: 'Enlivex Therapeutics',       hebrewName: 'אנליבקס',                     shortName: 'Enlivex',     sector: 'pharma',     tagline: 'Macrophage-reprogramming immunotherapies',        founded: 2005, hq: 'Ness Ziona',   website: 'enlivextherapeutics.com' },
  { symbol: 'NRSN',                            englishName: 'NeuroSense Therapeutics',    hebrewName: 'נוירוסנס',                    shortName: 'NeuroSense',  sector: 'pharma',     tagline: 'Neurodegenerative-disease drug development',      founded: 2017, hq: "Herzliya",      website: 'neurosense-tx.com' },
  { symbol: 'PRTS.TA',                         englishName: 'Pluristem (Pluri)',          hebrewName: 'פלוריסטם',                    shortName: 'Pluri',       sector: 'pharma',     tagline: 'Cell-therapy & food-tech platform',               founded: 2001, hq: 'Haifa',        website: 'pluri-biotech.com' },

  // ── Defense & Aerospace ───────────────────────────────────────────
  { symbol: 'ESLT',      symbolTA: 'ESLT.TA',  englishName: 'Elbit Systems',              hebrewName: 'אלביט מערכות',                shortName: 'Elbit',       sector: 'defense',    tagline: 'Defense electronics & systems',                   founded: 1966, hq: 'Haifa',        website: 'elbitsystems.com' },
  { symbol: 'ARSP.TA',                         englishName: 'Aeronautics',                hebrewName: 'אירונאוטיקס',                 shortName: 'Aeronautics', sector: 'defense',    tagline: 'Unmanned aerial systems',                         founded: 1997, hq: 'Yavne' },
  { symbol: 'NXTG.TA',                         englishName: 'Next Gen Group',             hebrewName: 'נקסט-ג׳ן גרופ',               shortName: 'Next Gen',    sector: 'defense',    tagline: 'Defense electro-optics & cyber',                  hq: 'Israel' },

  // ── Energy & Materials ────────────────────────────────────────────
  { symbol: 'ICL',       symbolTA: 'ICL.TA',   englishName: 'ICL Group',                  hebrewName: 'כיל',                         shortName: 'ICL',         sector: 'energy',     tagline: 'Specialty minerals & agricultural inputs',        founded: 1968, hq: 'Tel Aviv',     website: 'icl-group.com' },
  { symbol: 'ORA',                             englishName: 'Ormat Technologies',         hebrewName: 'אורמת טכנולוגיות',            shortName: 'Ormat',       sector: 'energy',     tagline: 'Geothermal & renewable energy',                   founded: 1965, hq: 'Reno / Yavne', website: 'ormat.com' },
  { symbol: 'SEDG',                            englishName: 'SolarEdge Technologies',     hebrewName: 'סולאראדג׳',                   shortName: 'SolarEdge',   sector: 'energy',     tagline: 'Smart energy & solar inverters',                  founded: 2006, hq: 'Herzliya',     website: 'solaredge.com' },
  { symbol: 'DLEKG.TA',                        englishName: 'Delek Group',                hebrewName: 'דלק קבוצה',                   shortName: 'Delek',       sector: 'energy',     tagline: 'Energy & oil-gas exploration',                    founded: 1951, hq: 'Hod HaSharon', website: 'delek-group.com' },
  { symbol: 'ORL.TA',                          englishName: 'Bazan (Oil Refineries)',     hebrewName: 'בז״ן',                        shortName: 'Bazan',       sector: 'energy',     tagline: 'Refining & petrochemicals',                       founded: 1959, hq: 'Haifa',        website: 'bazan.co.il' },
  { symbol: 'PZOL.TA',                         englishName: 'Paz Oil Company',            hebrewName: 'פז נפט',                      shortName: 'Paz',         sector: 'energy',     tagline: 'Fuel retail & refining',                          founded: 1922, hq: 'Tel Aviv',     website: 'paz.co.il' },
  { symbol: 'NWMD.TA',                         englishName: 'NewMed Energy',              hebrewName: 'ניומד אנרגי',                 shortName: 'NewMed',      sector: 'energy',     tagline: 'East-Med gas exploration',                        founded: 1992, hq: 'Herzliya',     website: 'newmed-energy.com' },

  // ── Banking ───────────────────────────────────────────────────────
  { symbol: 'POLI.TA',                         englishName: 'Bank Hapoalim',              hebrewName: 'בנק הפועלים',                 shortName: 'Hapoalim',    sector: 'banking',    tagline: 'Israel’s largest commercial bank',                founded: 1921, hq: 'Tel Aviv',     website: 'bankhapoalim.com' },
  { symbol: 'LUMI.TA',                         englishName: 'Bank Leumi',                 hebrewName: 'בנק לאומי',                   shortName: 'Leumi',       sector: 'banking',    tagline: 'Universal commercial bank',                       founded: 1902, hq: 'Tel Aviv',     website: 'leumi.co.il' },
  { symbol: 'DSCT.TA',                         englishName: 'Israel Discount Bank',       hebrewName: 'בנק דיסקונט',                 shortName: 'Discount',    sector: 'banking',    tagline: 'Commercial & retail banking',                     founded: 1935, hq: 'Tel Aviv',     website: 'discountbank.co.il' },
  { symbol: 'MZTF.TA',                         englishName: 'Mizrahi-Tefahot Bank',       hebrewName: 'בנק מזרחי-טפחות',             shortName: 'Mizrahi',     sector: 'banking',    tagline: 'Mortgage & commercial banking',                   founded: 1923, hq: 'Tel Aviv',     website: 'mizrahi-tefahot.co.il' },
  { symbol: 'FIBI.TA',                         englishName: 'First International Bank',   hebrewName: 'הבנק הבינלאומי',              shortName: 'FIBI',        sector: 'banking',    tagline: 'Commercial banking',                              founded: 1972, hq: 'Tel Aviv',     website: 'fibi.co.il' },

  // ── Insurance ─────────────────────────────────────────────────────
  { symbol: 'HARL.TA',                         englishName: 'Harel Insurance & Finance',  hebrewName: 'הראל השקעות בביטוח',           shortName: 'Harel',       sector: 'insurance',  tagline: 'Insurance & long-term savings',                   founded: 1935, hq: 'Ramat Gan',    website: 'harel-group.co.il' },
  { symbol: 'MGDL.TA',                         englishName: 'Migdal Insurance & Finance', hebrewName: 'מגדל ביטוח',                  shortName: 'Migdal',      sector: 'insurance',  tagline: 'Life insurance & pensions',                       founded: 1934, hq: 'Petah Tikva',  website: 'migdal.co.il' },
  { symbol: 'MMHD.TA',                         englishName: 'Menora Mivtachim',           hebrewName: 'מנורה מבטחים',                shortName: 'Menora',      sector: 'insurance',  tagline: 'Insurance & pension funds',                       founded: 1935, hq: 'Tel Aviv',     website: 'menoramivt.co.il' },
  { symbol: 'PHOE.TA',                         englishName: 'Phoenix Holdings',           hebrewName: 'הפניקס אחזקות',               shortName: 'Phoenix',     sector: 'insurance',  tagline: 'Insurance & finance group',                       founded: 1949, hq: 'Givatayim',    website: 'fnx.co.il' },
  { symbol: 'CLIS.TA',                         englishName: 'Clal Insurance',             hebrewName: 'כלל ביטוח',                   shortName: 'Clal',        sector: 'insurance',  tagline: 'Insurance & financial services',                  founded: 1934, hq: 'Tel Aviv',     website: 'clal.co.il' },
  { symbol: 'LMND',                            englishName: 'Lemonade',                   hebrewName: 'למונייד',                     shortName: 'Lemonade',    sector: 'fintech',    tagline: 'AI-driven digital insurance',                     founded: 2015, hq: 'New York / Tel Aviv', website: 'lemonade.com' },

  // ── Real Estate ───────────────────────────────────────────────────
  { symbol: 'AZRG.TA',                         englishName: 'Azrieli Group',              hebrewName: 'עזריאלי קבוצה',               shortName: 'Azrieli',     sector: 'realestate', tagline: 'Income-producing real estate',                    founded: 1983, hq: 'Tel Aviv',     website: 'azrieli.com' },
  { symbol: 'MLSR.TA',                         englishName: 'Melisron',                   hebrewName: 'מליסרון',                     shortName: 'Melisron',    sector: 'realestate', tagline: 'Shopping centers & offices',                      founded: 1992, hq: 'Tel Aviv',     website: 'melisron.co.il' },
  { symbol: 'AMOT.TA',                         englishName: 'Amot Investments',           hebrewName: 'אמות השקעות',                 shortName: 'Amot',        sector: 'realestate', tagline: 'Income-producing real estate',                    founded: 1957, hq: 'Tel Aviv',     website: 'amot.co.il' },
  { symbol: 'BIG.TA',                          englishName: 'Big Shopping Centers',       hebrewName: 'ביג מרכזי קניות',             shortName: 'Big',         sector: 'realestate', tagline: 'Open-air shopping centers',                       founded: 1994, hq: 'Be’er Sheva',  website: 'big.co.il' },
  { symbol: 'GZT.TA',                          englishName: 'Gazit Globe',                hebrewName: 'גזית גלוב',                   shortName: 'Gazit',       sector: 'realestate', tagline: 'Global retail real estate',                       founded: 1982, hq: 'Tel Aviv',     website: 'gazitgroup.com' },
  { symbol: 'AFHL.TA',                         englishName: 'Africa Israel Residences',   hebrewName: 'אפריקה ישראל מגורים',         shortName: 'AFI Residences',sector: 'realestate', tagline: 'Residential development',                     founded: 1990, hq: 'Yehud' },

  // ── Telecom ───────────────────────────────────────────────────────
  { symbol: 'BCOM.TA',                         englishName: 'Bezeq The Israel Telecom',   hebrewName: 'בזק',                         shortName: 'Bezeq',       sector: 'telecom',    tagline: 'Israel’s largest telecom & infrastructure',       founded: 1984, hq: 'Tel Aviv',     website: 'bezeq.co.il' },
  { symbol: 'CEL.TA',                          englishName: 'Cellcom Israel',             hebrewName: 'סלקום ישראל',                 shortName: 'Cellcom',     sector: 'telecom',    tagline: 'Mobile, fixed & internet services',               founded: 1994, hq: 'Netanya',      website: 'cellcom.co.il' },
  { symbol: 'PTNR',                            englishName: 'Partner Communications',     hebrewName: 'פרטנר תקשורת',                shortName: 'Partner',     sector: 'telecom',    tagline: 'Mobile & landline carrier',                       founded: 1998, hq: 'Rosh HaAyin',  website: 'partner.co.il' },

  // ── Industrials ───────────────────────────────────────────────────
  { symbol: 'STRS.TA',                         englishName: 'Strauss Group',              hebrewName: 'שטראוס',                      shortName: 'Strauss',     sector: 'retail',     tagline: 'Food & beverage manufacturing',                   founded: 1936, hq: 'Petah Tikva',  website: 'strauss-group.com' },
  { symbol: 'OSEM.TA',                         englishName: 'Osem Investments',           hebrewName: 'אסם השקעות',                  shortName: 'Osem',        sector: 'retail',     tagline: 'Packaged foods & retail',                         founded: 1942, hq: 'Shoham' },
  { symbol: 'SAE.TA',                          englishName: 'Shufersal',                  hebrewName: 'שופרסל',                      shortName: 'Shufersal',   sector: 'retail',     tagline: 'Supermarket chain',                               founded: 1958, hq: 'Rishon LeZion', website: 'shufersal.co.il' },
  { symbol: 'RMLI.TA',                         englishName: 'Rami Levy Hashikma',         hebrewName: 'רמי לוי שיווק השקמה',          shortName: 'Rami Levy',   sector: 'retail',     tagline: 'Discount supermarket chain',                      founded: 1976, hq: 'Modi’in',      website: 'rami-levy.co.il' },
  { symbol: 'ELTR.TA',                         englishName: 'Electra Ltd.',               hebrewName: 'אלקטרה',                      shortName: 'Electra',     sector: 'industrial', tagline: 'Construction & infrastructure',                   founded: 1945, hq: 'Petah Tikva',  website: 'electra.co.il' },
  { symbol: 'NICE.TA',                         englishName: 'NICE Ltd. (TA)',             hebrewName: 'נייס (תל אביב)',              shortName: 'NICE-TA',     sector: 'tech',       tagline: 'AI-powered customer experience (TASE listing)',   hq: "Ra'anana" },

  // ── Fintech & Markets ─────────────────────────────────────────────
  { symbol: 'TASE.TA',                         englishName: 'Tel Aviv Stock Exchange',    hebrewName: 'הבורסה לניירות ערך',          shortName: 'TASE',        sector: 'fintech',    tagline: 'The Tel Aviv Stock Exchange itself',              founded: 1953, hq: 'Tel Aviv',     website: 'tase.co.il' },
  { symbol: 'PAGS.TA',                         englishName: 'Pagaya Technologies',        hebrewName: 'פאגאיה טכנולוגיות',           shortName: 'Pagaya',      sector: 'fintech',    tagline: 'AI-driven credit & consumer finance',             founded: 2016, hq: 'Tel Aviv',     website: 'pagaya.com' },
  { symbol: 'PGY',                             englishName: 'Pagaya (NASDAQ)',            hebrewName: 'פאגאיה',                      shortName: 'Pagaya-US',   sector: 'fintech',    tagline: 'AI-driven credit & consumer finance',             founded: 2016, hq: 'Tel Aviv',     website: 'pagaya.com' },
];

export const COMPANY_BY_SYMBOL: Record<string, Company> =
  Object.fromEntries(COMPANIES.map(c => [c.symbol.toUpperCase(), c]));

export function findCompany(symbol: string): Company | undefined {
  if (!symbol) return undefined;
  const key = symbol.toUpperCase();
  const direct = COMPANY_BY_SYMBOL[key];
  if (direct) return direct;
  return COMPANIES.find(
    c =>
      (c.symbolTA && c.symbolTA.toUpperCase() === key) ||
      c.shortName.toUpperCase() === key
  );
}

export function searchCompanies(query: string, sector?: string): Company[] {
  const q = query.trim().toLowerCase();
  return COMPANIES.filter(c => {
    if (sector && sector !== 'all' && c.sector !== sector) return false;
    if (!q) return true;
    return (
      c.symbol.toLowerCase().includes(q) ||
      (c.symbolTA?.toLowerCase().includes(q) ?? false) ||
      c.englishName.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.hebrewName.includes(query.trim())
    );
  });
}
