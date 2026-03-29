/**
 * 🎧 Audiobook Monitor — Love Bites / Nir Ram
 * בודק אם הספרים פורסמו בפלטפורמות האודיובוק
 * מתווסף ל-QA Iguana Agent
 */

const https = require('https');
const http = require('http');

const PLATFORMS = [
  {
    name: 'Audible',
    emoji: '🎧',
    url: 'https://www.audible.com/search?keywords=Nir+Ram+Love+Bites',
    searchTerms: ['Nir Ram', 'Love Bites', '101 Dating'],
    directUrl: 'https://www.audible.com/search?keywords=Nir+Ram'
  },
  {
    name: 'Apple Books',
    emoji: '🍎',
    url: 'https://itunes.apple.com/search?term=Nir+Ram+Love+Bites&media=audiobook&limit=5',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://books.apple.com/search?q=Nir+Ram'
  },
  {
    name: 'Kobo',
    emoji: '📚',
    url: 'https://www.kobo.com/ww/en/search?query=Nir+Ram+Love+Bites&fcsearchfield=AudioBook',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://www.kobo.com/ww/en/search?query=Nir+Ram'
  },
  {
    name: 'Spotify',
    emoji: '🎵',
    url: 'https://open.spotify.com/search/Nir%20Ram%20Love%20Bites/audiobooks',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://open.spotify.com/search/Nir%20Ram/audiobooks'
  },
  {
    name: 'Google Play',
    emoji: '▶️',
    url: 'https://play.google.com/store/search?q=Nir+Ram+Love+Bites&c=books',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://play.google.com/store/search?q=Nir+Ram&c=books'
  },
  {
    name: 'Everand',
    emoji: '📖',
    url: 'https://www.everand.com/search?query=Nir+Ram+Love+Bites',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://www.everand.com/search?query=Nir+Ram'
  },
  {
    name: 'Storytel',
    emoji: '📻',
    url: 'https://www.storytel.com/api/search.action?q=Nir+Ram+Love+Bites&store=il',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://www.storytel.com/search?q=Nir+Ram'
  },
  {
    name: 'Chirp',
    emoji: '🐦',
    url: 'https://www.chirpbooks.com/search?query=Nir+Ram',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://www.chirpbooks.com/search?query=Nir+Ram'
  },
  {
    name: 'Bookmate',
    emoji: '📕',
    url: 'https://api.bookmate.com/api/v5/search?type=audiobooks&q=Nir+Ram',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://bookmate.com/search/nir%20ram'
  },
  {
    name: 'Nextory',
    emoji: '📗',
    url: 'https://www.nextory.com/search?q=Nir+Ram',
    searchTerms: ['Nir Ram', 'Love Bites'],
    directUrl: 'https://www.nextory.com/search?q=Nir+Ram'
  }
];

// שפות הספרים שמצפים להן
const EXPECTED_BOOKS = [
  { lang: 'EN', title: '101 Dating Disasters' },
  { lang: 'HE', title: '101 דייטים' },
  { lang: 'FR', title: '101 Désastres Amoureux' },
  { lang: 'DE', title: '101 Liebes-Desaster' },
  { lang: 'ES', title: '101 Citas Desastrosas' },
  { lang: 'PT', title: '101 Encontros Desastrosos' },
  { lang: 'IT', title: '101 Disastri d\'Amore' },
  { lang: 'RO', title: '101 Dezastre Amoroase' },
  { lang: 'RU', title: '101 Любовная Катастрофа' },
  { lang: 'NL', title: '101 Dates en Geen Beet' },
  { lang: 'JA', title: '101のデート大失敗' },
  { lang: 'HI', title: '101 Dating Disasters Hindi' },
  { lang: 'TR', title: '101 Romantik Fiyasko' },
];

function fetchUrl(url, timeout = 8000) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const timer = setTimeout(() => resolve({ status: 'timeout', body: '' }), timeout);
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QABot/1.0)',
        'Accept': 'text/html,application/json,*/*'
      }
    };

    try {
      const req = protocol.get(url, options, (res) => {
        clearTimeout(timer);
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; if (body.length > 50000) res.destroy(); });
        res.on('end', () => resolve({ status: res.statusCode, body }));
        res.on('error', () => resolve({ status: 'error', body: '' }));
      });
      req.on('error', () => { clearTimeout(timer); resolve({ status: 'error', body: '' }); });
    } catch(e) {
      clearTimeout(timer);
      resolve({ status: 'error', body: '' });
    }
  });
}

async function checkPlatform(platform) {
  const result = {
    name: platform.name,
    emoji: platform.emoji,
    directUrl: platform.directUrl,
    found: false,
    booksFound: [],
    status: 'unknown',
    error: null
  };

  try {
    const response = await fetchUrl(platform.url);
    
    if (response.status === 'timeout') {
      result.status = 'timeout';
      return result;
    }
    if (response.status === 'error') {
      result.status = 'error';
      return result;
    }
    if (response.status === 200 || response.status === 301 || response.status === 302) {
      result.status = 'reachable';
      const bodyLower = response.body.toLowerCase();
      
      // בדוק אם נמצא "Nir Ram"
      if (bodyLower.includes('nir ram') || bodyLower.includes('nirram')) {
        result.found = true;
        // בדוק איזה ספרים
        EXPECTED_BOOKS.forEach(book => {
          if (bodyLower.includes(book.title.toLowerCase()) || 
              bodyLower.includes('love bites')) {
            result.booksFound.push(book.lang);
          }
        });
        if (result.booksFound.length === 0) result.booksFound = ['found'];
      }
    } else {
      result.status = `http_${response.status}`;
    }
  } catch (e) {
    result.status = 'error';
    result.error = e.message;
  }

  return result;
}

async function runAudiobookMonitor() {
  console.log('🎧 Audiobook Monitor — Love Bites / Nir Ram');
  console.log('='.repeat(50));
  console.log(`📅 ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`);
  console.log('');

  const results = [];
  
  for (const platform of PLATFORMS) {
    process.stdout.write(`  בודק ${platform.emoji} ${platform.name}...`);
    const result = await checkPlatform(platform);
    results.push(result);
    
    if (result.found) {
      console.log(` ✅ נמצא! (${result.booksFound.join(', ')})`);
    } else if (result.status === 'timeout') {
      console.log(` ⏱️ timeout`);
    } else if (result.status === 'reachable') {
      console.log(` ⏳ לא נמצא עדיין`);
    } else {
      console.log(` ❓ ${result.status}`);
    }
  }

  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found && r.status === 'reachable');
  const errors = results.filter(r => r.status === 'timeout' || r.status === 'error');

  console.log('');
  console.log('='.repeat(50));
  console.log(`✅ פורסם ב: ${found.length} פלטפורמות`);
  console.log(`⏳ לא נמצא ב: ${notFound.length} פלטפורמות`);
  console.log(`❓ לא נגיש: ${errors.length} פלטפורמות`);

  // שמור תוצאות לקובץ
  const fs = require('fs');
  const outputDir = './reports/output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: { found: found.length, notFound: notFound.length, errors: errors.length },
    platforms: results,
    foundPlatforms: found.map(r => ({ name: r.name, url: r.directUrl, books: r.booksFound })),
    notFoundPlatforms: notFound.map(r => ({ name: r.name, url: r.directUrl }))
  };
  
  fs.writeFileSync(`${outputDir}/audiobook-monitor.json`, JSON.stringify(reportData, null, 2));
  console.log(`📄 דוח נשמר: ${outputDir}/audiobook-monitor.json`);

  // החזר תוצאות למיזוג עם דוח הראשי
  return reportData;
}

module.exports = { runAudiobookMonitor, PLATFORMS, EXPECTED_BOOKS };

// הרץ ישיר
if (require.main === module) {
  runAudiobookMonitor().catch(console.error);
}
