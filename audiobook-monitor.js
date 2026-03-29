/**
 * 🎧 Audiobook Monitor v2.0 — Love Bites / Nir Ram
 * חיפוש ישיר ב-API של כל פלטפורמה
 */

const https = require('https');

// ========================================
// פונקציית fetch בסיסית
// ========================================
function fetchUrl(url, options = {}, timeout = 10000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ status: 'timeout', body: '' }), timeout);
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...options.headers
      },
      ...options
    };
    try {
      const req = https.get(url, opts, (res) => {
        clearTimeout(timer);
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; if (body.length > 100000) res.destroy(); });
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
        res.on('error', () => resolve({ status: 'error', body: '' }));
      });
      req.on('error', () => { clearTimeout(timer); resolve({ status: 'error', body: '' }); });
    } catch(e) {
      clearTimeout(timer);
      resolve({ status: 'error', body: '' });
    }
  });
}

// ========================================
// בדיקות לפי פלטפורמה
// ========================================

async function checkAppleBooks() {
  // Apple Books - iTunes Search API (ציבורי, לא דורש מפתח)
  const url = 'https://itunes.apple.com/search?term=Nir+Ram+Love+Bites&media=audiobook&limit=10&country=us';
  const r = await fetchUrl(url);
  if (r.status !== 200) return { found: false, status: r.status, books: [] };
  try {
    const data = JSON.parse(r.body);
    const books = (data.results || []).filter(b =>
      (b.artistName || '').toLowerCase().includes('nir ram') ||
      (b.collectionName || '').toLowerCase().includes('love bites') ||
      (b.collectionName || '').toLowerCase().includes('dating disasters')
    );
    return {
      found: books.length > 0,
      status: 200,
      books: books.map(b => ({
        title: b.collectionName,
        url: b.collectionViewUrl,
        price: b.collectionPrice
      }))
    };
  } catch(e) { return { found: false, status: 'parse_error', books: [] }; }
}

async function checkAudible() {
  // Audible - חיפוש דרך עמוד HTML
  const url = 'https://www.audible.com/search?keywords=Nir+Ram+Love+Bites+Dating+Disasters&feature_six_browse-bin=18685580011';
  const r = await fetchUrl(url, {
    headers: { 'Accept-Language': 'en-US', 'Accept': 'text/html' }
  });
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || 
                (bodyLower.includes('love bites') && bodyLower.includes('dating'));
  const books = [];
  if (found) {
    // חפש כותרים
    const matches = r.body.match(/aria-label="([^"]*(?:love bites|nir ram|dating disasters)[^"]*)"/gi) || [];
    matches.forEach(m => {
      const title = m.replace(/aria-label="/i, '').replace(/"$/, '');
      if (title.length < 200) books.push({ title, url: 'https://www.audible.com/search?keywords=Nir+Ram' });
    });
    if (books.length === 0) books.push({ title: 'Love Bites - Nir Ram', url: 'https://www.audible.com/search?keywords=Nir+Ram' });
  }
  return { found, status: r.status, books };
}

async function checkKobo() {
  // Kobo - API חיפוש
  const url = 'https://www.kobo.com/ww/en/search?query=Nir+Ram+Love+Bites&fcsearchfield=AudioBook';
  const r = await fetchUrl(url);
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || bodyLower.includes('love bites');
  return {
    found,
    status: r.status,
    books: found ? [{ title: 'Love Bites - Nir Ram', url: 'https://www.kobo.com/ww/en/search?query=Nir+Ram' }] : []
  };
}

async function checkSpotify() {
  // Spotify - חיפוש אודיובוקים
  const url = 'https://open.spotify.com/search/Nir%20Ram%20Love%20Bites/audiobooks';
  const r = await fetchUrl(url);
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || bodyLower.includes('love bites');
  return { found, status: r.status, books: found ? [{ title: 'Love Bites - Nir Ram', url: 'https://open.spotify.com/search/Nir%20Ram/audiobooks' }] : [] };
}

async function checkGooglePlay() {
  const url = 'https://play.google.com/store/search?q=Nir+Ram+Love+Bites+audiobook&c=books&hl=en';
  const r = await fetchUrl(url);
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || (bodyLower.includes('love bites') && bodyLower.includes('dating'));
  return { found, status: r.status, books: found ? [{ title: 'Love Bites - Nir Ram', url: 'https://play.google.com/store/search?q=Nir+Ram&c=books' }] : [] };
}

async function checkEverand() {
  const url = 'https://www.everand.com/search?query=Nir+Ram+Love+Bites&content_type=audiobook';
  const r = await fetchUrl(url);
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || bodyLower.includes('love bites');
  return { found, status: r.status, books: found ? [{ title: 'Love Bites - Nir Ram', url: 'https://www.everand.com/search?query=Nir+Ram' }] : [] };
}

async function checkStorytell() {
  // Storytel - API ציבורי
  const url = 'https://www.storytel.com/api/search.action?q=Nir+Ram+Love+Bites&store=il&type=audiobook';
  const r = await fetchUrl(url, { headers: { 'Accept': 'application/json' } });
  if (r.status !== 200) return { found: false, status: r.status, books: [] };
  try {
    const data = JSON.parse(r.body);
    const items = data.books || data.results || data.audiobooks || [];
    const found = items.some(b =>
      (b.title || '').toLowerCase().includes('love bites') ||
      (b.authors || []).some(a => (a.name || '').toLowerCase().includes('nir ram'))
    );
    return { found, status: 200, books: found ? items.filter(b => b.title?.toLowerCase().includes('love bites')).map(b => ({ title: b.title, url: `https://www.storytel.com/il/${b.id}` })) : [] };
  } catch(e) {
    // נסה HTML
    const bodyLower = r.body.toLowerCase();
    const found = bodyLower.includes('nir ram') || bodyLower.includes('love bites');
    return { found, status: r.status, books: [] };
  }
}

async function checkChirp() {
  const url = 'https://www.chirpbooks.com/audiobooks?search=Nir+Ram+Love+Bites';
  const r = await fetchUrl(url);
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || bodyLower.includes('love bites');
  return { found, status: r.status, books: found ? [{ title: 'Love Bites - Nir Ram', url: 'https://www.chirpbooks.com/audiobooks?search=Nir+Ram' }] : [] };
}

async function checkBookmate() {
  const url = 'https://bookmate.com/search?query=nir+ram+love+bites&type=audiobooks';
  const r = await fetchUrl(url);
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || bodyLower.includes('love bites');
  return { found, status: r.status, books: found ? [{ title: 'Love Bites - Nir Ram', url: 'https://bookmate.com/search?query=nir+ram' }] : [] };
}

async function checkNextory() {
  const url = 'https://www.nextory.com/en/search/?q=Nir+Ram+Love+Bites';
  const r = await fetchUrl(url);
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || bodyLower.includes('love bites');
  return { found, status: r.status, books: found ? [{ title: 'Love Bites - Nir Ram', url: 'https://www.nextory.com/en/search/?q=Nir+Ram' }] : [] };
}

async function checkAudiobooksCom() {
  const url = 'https://www.audiobooks.com/search?q=Nir+Ram+Love+Bites';
  const r = await fetchUrl(url);
  if (r.status === 'timeout' || r.status === 'error') return { found: false, status: r.status, books: [] };
  const bodyLower = r.body.toLowerCase();
  const found = bodyLower.includes('nir ram') || bodyLower.includes('love bites');
  return { found, status: r.status, books: found ? [{ title: 'Love Bites - Nir Ram', url: 'https://www.audiobooks.com/search?q=Nir+Ram' }] : [] };
}

async function checkOverdrive() {
  // OverDrive - API ציבורי
  const url = 'https://thunder.api.overdrive.com/v2/media?q=nir+ram+love+bites&mediaType=audiobook&limit=10';
  const r = await fetchUrl(url, { headers: { 'Accept': 'application/json' } });
  if (r.status !== 200) return { found: false, status: r.status, books: [] };
  try {
    const data = JSON.parse(r.body);
    const items = data.items || [];
    const found = items.some(b =>
      (b.title || '').toLowerCase().includes('love bites') ||
      (b.creators || []).some(c => (c.name || '').toLowerCase().includes('nir ram'))
    );
    return { found, status: 200, books: found ? items.map(b => ({ title: b.title, url: `https://www.overdrive.com/media/${b.id}` })) : [] };
  } catch(e) { return { found: false, status: 'parse_error', books: [] }; }
}

// ========================================
// ריצה ראשית
// ========================================
const PLATFORM_CHECKS = [
  { name: 'Apple Books',      emoji: '🍎', fn: checkAppleBooks,    directUrl: 'https://books.apple.com/search?q=Nir+Ram',          priority: 'A' },
  { name: 'Audible',          emoji: '🎧', fn: checkAudible,        directUrl: 'https://www.audible.com/search?keywords=Nir+Ram',   priority: 'A' },
  { name: 'Kobo',             emoji: '📚', fn: checkKobo,           directUrl: 'https://www.kobo.com/ww/en/search?query=Nir+Ram',   priority: 'A' },
  { name: 'Spotify',          emoji: '🎵', fn: checkSpotify,        directUrl: 'https://open.spotify.com/search/Nir%20Ram/audiobooks', priority: 'A' },
  { name: 'Google Play',      emoji: '▶️', fn: checkGooglePlay,     directUrl: 'https://play.google.com/store/search?q=Nir+Ram',   priority: 'A' },
  { name: 'Everand',          emoji: '📖', fn: checkEverand,        directUrl: 'https://www.everand.com/search?query=Nir+Ram',      priority: 'B' },
  { name: 'Storytel',         emoji: '📻', fn: checkStorytell,      directUrl: 'https://www.storytel.com/search?q=Nir+Ram',         priority: 'B' },
  { name: 'Chirp',            emoji: '🐦', fn: checkChirp,          directUrl: 'https://www.chirpbooks.com/audiobooks?search=Nir+Ram', priority: 'B' },
  { name: 'Bookmate',         emoji: '📕', fn: checkBookmate,       directUrl: 'https://bookmate.com/search?query=nir+ram',         priority: 'B' },
  { name: 'Nextory',          emoji: '📗', fn: checkNextory,        directUrl: 'https://www.nextory.com/en/search/?q=Nir+Ram',      priority: 'B' },
  { name: 'Audiobooks.com',   emoji: '🎙️', fn: checkAudiobooksCom, directUrl: 'https://www.audiobooks.com/search?q=Nir+Ram',      priority: 'B' },
  { name: 'OverDrive',        emoji: '🏛️', fn: checkOverdrive,     directUrl: 'https://www.overdrive.com/search?q=nir+ram',        priority: 'C' },
];

async function runAudiobookMonitor() {
  const startTime = new Date();
  console.log('\n🎧 ═══════════════════════════════════════════');
  console.log('   AUDIOBOOK MONITOR v2.0 — Love Bites / Nir Ram');
  console.log('═══════════════════════════════════════════════');
  console.log(`📅 ${startTime.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`);
  console.log('');

  const results = [];

  for (const platform of PLATFORM_CHECKS) {
    process.stdout.write(`  ${platform.emoji} ${platform.name.padEnd(18)}`);
    try {
      const result = await platform.fn();
      results.push({ ...platform, ...result, fn: undefined });
      if (result.found) {
        console.log(`✅ נמצא! ${result.books.length} ספר/ים`);
        result.books.forEach(b => console.log(`     📘 ${b.title}`));
      } else if (result.status === 'timeout') {
        console.log(`⏱️  timeout`);
      } else if (result.status === 'error') {
        console.log(`❌ שגיאת חיבור`);
      } else {
        console.log(`⏳ לא נמצא עדיין (HTTP ${result.status})`);
      }
    } catch(e) {
      console.log(`❌ ${e.message}`);
      results.push({ ...platform, found: false, status: 'exception', books: [], fn: undefined });
    }
  }

  // סיכום
  const found = results.filter(r => r.found);
  const notYet = results.filter(r => !r.found && (r.status === 200 || r.status === 301 || r.status === 302));
  const unreachable = results.filter(r => !r.found && r.status !== 200 && r.status !== 301 && r.status !== 302);

  console.log('\n═══════════════════════════════════════════════');
  console.log(`✅ פורסם ב-${found.length} פלטפורמות`);
  if (found.length > 0) {
    found.forEach(r => console.log(`   ${r.emoji} ${r.name}: ${r.directUrl}`));
  }
  console.log(`⏳ לא נמצא ב-${notYet.length} פלטפורמות (עדיין)`);
  console.log(`❓ לא נגיש: ${unreachable.length} פלטפורמות`);
  console.log('═══════════════════════════════════════════════\n');

  // שמור דוח
  const fs = require('fs');
  const outputDir = './reports/output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const reportData = {
    timestamp: new Date().toISOString(),
    checkDate: startTime.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
    summary: {
      total: results.length,
      found: found.length,
      notYet: notYet.length,
      unreachable: unreachable.length
    },
    foundPlatforms: found.map(r => ({
      name: r.name,
      url: r.directUrl,
      books: r.books
    })),
    notYetPlatforms: notYet.map(r => ({
      name: r.name,
      url: r.directUrl
    })),
    unreachablePlatforms: unreachable.map(r => ({
      name: r.name,
      status: r.status
    }))
  };

  fs.writeFileSync(`${outputDir}/audiobook-monitor.json`, JSON.stringify(reportData, null, 2));
  console.log(`📄 דוח נשמר: ${outputDir}/audiobook-monitor.json`);

  return reportData;
}

module.exports = { runAudiobookMonitor };

if (require.main === module) {
  runAudiobookMonitor().catch(console.error);
}
