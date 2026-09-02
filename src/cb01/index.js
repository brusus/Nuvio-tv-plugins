const { formatStream } = require('../formatter.js');
const { resolveLiveDomain } = require('../domain_helper.js');
const { getQualityFromUrl } = require('../quality_helper.js');

const TMDB_API_KEY = '68e094699525b18a70bab2f86b1fa706';
let BASE_URL = 'https://cb01uno.baby';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_CANDIDATES = 5;

// CB01 exposes two link families. Only stayonline is usable here: uprot serves an
// interactive captcha that a sandboxed plugin has no way to solve.
const STAYONLINE_RE = /https?:\/\/stayonline\.pro\/l\/[A-Za-z0-9]+\/?/g;

// The page groups its links under "Streaming:" and "Streaming HD:" headings.
// That is the site's own classification, not a measured resolution, but it is
// the only quality signal available before resolving the link.
const SECTION_RE = /<strong>\s*Streaming(\s*HD)?\s*:?\s*<\/strong>/gi;

function timeoutSignal(ms) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  } catch (_) {
    return undefined;
  }
}

async function httpGet(url, extraHeaders) {
  try {
    const headers = Object.assign({
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9'
    }, extraHeaders || {});
    const res = await fetch(url, { headers, signal: timeoutSignal(REQUEST_TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.text();
  } catch (_) {
    return null;
  }
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: timeoutSignal(REQUEST_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#8217;|&#039;|&#39;/g, "'")
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeTitle(text) {
  return decodeEntities(text)
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')   // [HD], [SUB ITA]
    .replace(/\((\d{4})\)/g, ' ')  // trailing year
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// --- id resolution -------------------------------------------------------

async function resolveTmdbId(id, type, providerContext) {
  const ctxTmdb = providerContext && /^\d+$/.test(String(providerContext.tmdbId || ''))
    ? String(providerContext.tmdbId) : null;
  if (ctxTmdb) return ctxTmdb;

  const idStr = String(id || '').trim();
  if (/^tmdb:\d+$/i.test(idStr)) return idStr.split(':')[1];
  if (/^\d+$/.test(idStr)) return idStr;

  const ctxImdb = providerContext && /^tt\d+$/i.test(String(providerContext.imdbId || ''))
    ? String(providerContext.imdbId) : null;
  const imdbId = /^tt\d+$/i.test(idStr) ? idStr : ctxImdb;
  if (!imdbId) return null;

  const payload = await fetchJson(
    `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
  );
  if (!payload) return null;
  if (Array.isArray(payload.movie_results) && payload.movie_results[0] && payload.movie_results[0].id) {
    return String(payload.movie_results[0].id);
  }
  return null;
}

// Italian title is what CB01 indexes; the original one is kept as a fallback query.
// The imdb id is the reliable way to confirm we landed on the right page.
async function getMovieInfo(tmdbId, providerContext) {
  const payload = await fetchJson(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=it-IT&append_to_response=external_ids`
  );
  if (!payload) return null;

  const ctxImdb = providerContext && /^tt\d+$/i.test(String(providerContext.imdbId || ''))
    ? String(providerContext.imdbId) : null;

  return {
    title: payload.title || payload.original_title || null,
    originalTitle: payload.original_title || null,
    year: payload.release_date ? parseInt(String(payload.release_date).slice(0, 4), 10) : null,
    imdbId: (payload.external_ids && payload.external_ids.imdb_id) || ctxImdb || null
  };
}

// --- CB01 search ---------------------------------------------------------

function parseSearchResults(html) {
  const results = [];
  const re = /<h3 class="card-title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const raw = decodeEntities(m[2].replace(/<[^>]+>/g, '')).trim();
    const yearMatch = raw.match(/\((\d{4})\)/);
    results.push({
      url,
      rawTitle: raw,
      title: normalizeTitle(raw),
      year: yearMatch ? parseInt(yearMatch[1], 10) : null
    });
  }
  return results;
}

async function searchCb01(query) {
  const html = await httpGet(`${BASE_URL}/?s=${encodeURIComponent(query)}`);
  if (!html) return [];
  return parseSearchResults(html);
}

function scoreCandidate(candidate, wantedTitle, wantedYear) {
  let score = 0;
  if (candidate.title === wantedTitle) score += 10;
  else if (candidate.title.indexOf(wantedTitle) !== -1 || wantedTitle.indexOf(candidate.title) !== -1) score += 5;
  if (wantedYear && candidate.year === wantedYear) score += 4;
  else if (wantedYear && candidate.year && Math.abs(candidate.year - wantedYear) === 1) score += 1;
  return score;
}

// --- link resolution -----------------------------------------------------

// GET the stayonline page for its linkId, then ask the ajax endpoint for the
// real destination. Pure HTTP, no challenge involved.
async function resolveStayOnline(link) {
  const page = await httpGet(link, { 'Referer': `${BASE_URL}/` });
  if (!page) return null;

  const idMatch = page.match(/var\s+linkId\s*=\s*"([^"]+)"/);
  const linkId = idMatch ? idMatch[1] : (link.match(/\/l\/([A-Za-z0-9]+)/) || [])[1];
  if (!linkId) return null;

  try {
    const res = await fetch('https://stayonline.pro/ajax/linkView.php', {
      method: 'POST',
      headers: {
        'Origin': 'https://stayonline.pro',
        'Referer': link,
        'User-Agent': USER_AGENT,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: `id=${encodeURIComponent(linkId)}&ref=`,
      signal: timeoutSignal(REQUEST_TIMEOUT_MS)
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.status !== 'success' || !json.data || !json.data.value) return null;
    return json.data.value;
  } catch (_) {
    return null;
  }
}

// Dean Edwards packer, as used by MixDrop to hide the media url.
function unpackJs(source) {
  const m = source.match(/\}\s*\(\s*'([\s\S]*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]*?)'\s*\.split\('\|'\)/);
  if (!m) return null;

  let payload = m[1];
  const base = parseInt(m[2], 10);
  let count = parseInt(m[3], 10);
  const dictionary = m[4].split('|');

  const encode = (value) => {
    const head = value < base ? '' : encode(Math.floor(value / base));
    const rest = value % base;
    return head + (rest > 35 ? String.fromCharCode(rest + 29) : rest.toString(36));
  };

  while (count--) {
    if (!dictionary[count]) continue;
    payload = payload.replace(new RegExp('\\b' + encode(count) + '\\b', 'g'), dictionary[count]);
  }
  return payload;
}

async function extractMixDrop(embedUrl) {
  const origin = (embedUrl.match(/^https?:\/\/[^/]+/) || [])[0] || 'https://mixdrop.ag';
  const html = await httpGet(embedUrl, { 'Referer': `${origin}/` });
  if (!html) return null;

  let wurl = (html.match(/MDCore\.wurl\s*=\s*"([^"]+)"/) || [])[1];
  if (!wurl) {
    const unpacked = unpackJs(html);
    if (unpacked) wurl = (unpacked.match(/MDCore\.wurl\s*=\s*"([^"]+)"/) || [])[1];
  }
  if (!wurl) return null;

  let finalUrl = wurl.trim();
  if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;
  else if (finalUrl.startsWith('/')) finalUrl = origin + finalUrl;

  return {
    url: finalUrl,
    headers: { 'User-Agent': USER_AGENT, 'Referer': `${origin}/` }
  };
}

// Pair every stayonline link with the heading it sits under, by comparing
// positions in the raw html: the last heading before a link is its section.
function collectLinksWithSection(html) {
  const sections = [];
  let s;
  SECTION_RE.lastIndex = 0;
  while ((s = SECTION_RE.exec(html)) !== null) {
    sections.push({ index: s.index, hd: Boolean(s[1]) });
  }

  const found = [];
  const seen = new Set();
  let m;
  STAYONLINE_RE.lastIndex = 0;
  while ((m = STAYONLINE_RE.exec(html)) !== null) {
    const url = m[0];
    if (seen.has(url)) continue;
    seen.add(url);

    let hd = false;
    for (const section of sections) {
      if (section.index < m.index) hd = section.hd;
      else break;
    }
    found.push({ url, hd });
  }
  return found;
}

// m1xdrop is an alias domain; the embed lives on the canonical one.
function toMixDropEmbed(rawUrl) {
  const url = String(rawUrl || '');
  const alias = url.match(/m1xdrop\.net\/f\/([A-Za-z0-9]+)/);
  if (alias) return `https://mixdrop.ag/e/${alias[1]}`;
  const direct = url.match(/mixdrop\.[a-z]+\/[ef]\/([A-Za-z0-9]+)/);
  if (direct) return `https://mixdrop.ag/e/${direct[1]}`;
  return null;
}

// --- entry point ---------------------------------------------------------

async function getStreams(id, type, season, episode, providerContext = null) {
  BASE_URL = await resolveLiveDomain("https://cb01uno.baby");
  const normalizedType = String(type || '').toLowerCase();
  // CB01 series pages route through uprot, which is captcha-gated, so only
  // movies can be served reliably from a plugin.
  if (normalizedType !== 'movie') return [];

  const tmdbId = await resolveTmdbId(id, 'movie', providerContext);
  if (!tmdbId) return [];

  const info = await getMovieInfo(tmdbId, providerContext);
  if (!info || !info.title) return [];

  const queries = [info.title];
  if (info.originalTitle && info.originalTitle !== info.title) queries.push(info.originalTitle);

  // Si interrogano tutte le query (titolo italiano e originale) accumulando i
  // risultati: fermarsi alla prima query non vuota faceva perdere il titolo
  // originale quando quello italiano restituiva schede non pertinenti, che poi
  // il punteggio scartava lasciando zero candidati.
  let candidates = [];
  const seenCandidateUrls = new Set();
  for (const q of queries) {
    const found = await searchCb01(q);
    for (const c of found) {
      if (seenCandidateUrls.has(c.url)) continue;
      seenCandidateUrls.add(c.url);
      candidates.push(c);
    }
  }
  if (!candidates.length) return [];

  const wantedTitle = normalizeTitle(info.title);
  candidates = candidates
    .map(c => Object.assign({}, c, { score: scoreCandidate(c, wantedTitle, info.year) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);
  if (!candidates.length) return [];

  // Pick the page in two passes. Only a minority of CB01 entries link their
  // imdb page, so treating that as mandatory would discard most matches: it is
  // used as confirmation when present, not as a requirement.
  let pageHtml = null;      // confirmed by imdb id
  let fallbackHtml = null;  // best exact title match seen so far

  for (const candidate of candidates) {
    const html = await httpGet(candidate.url, { 'Referer': `${BASE_URL}/` });
    if (!html) continue;

    if (info.imdbId && html.indexOf(info.imdbId) !== -1) { pageHtml = html; break; }
    // candidates are sorted by score, so the first one reaching the exact-title
    // threshold is the best available fallback
    if (!fallbackHtml && candidate.score >= 10) fallbackHtml = html;
  }

  if (!pageHtml) pageHtml = fallbackHtml;
  if (!pageHtml) return [];

  const links = collectLinksWithSection(pageHtml);
  if (!links.length) return [];

  // Each link costs three round trips (stayonline page, ajax resolve, embed).
  // Resolving them in parallel turns the total from the sum of the chains into
  // the length of the slowest one; a dead link no longer delays the others.
  const resolvedLinks = await Promise.all(links.map(async (link) => {
    try {
      const resolved = await resolveStayOnline(link.url);
      if (!resolved) return null;

      const embed = toMixDropEmbed(resolved);
      if (!embed) return null;

      const media = await extractMixDrop(embed);
      if (!media) return null;

      return { link, media };
    } catch (_) {
      return null;   // one broken link must not sink the whole batch
    }
  }));

  const streams = [];
  const seenUrls = new Set();

  for (const entry of resolvedLinks) {
    if (!entry || seenUrls.has(entry.media.url)) continue;
    seenUrls.add(entry.media.url);

    // A resolution in the final url beats the site's own label; fall back to
    // the section heading, which at least separates HD from the rest.
    const quality = getQualityFromUrl(entry.media.url) || (entry.link.hd ? '1080p' : '720p');

    streams.push({
      name: entry.link.hd ? 'CB01 - MixDrop HD' : 'CB01 - MixDrop',
      title: info.year ? `${info.title} (${info.year})` : info.title,
      url: entry.media.url,
      headers: entry.media.headers,
      quality: quality,
      type: 'direct',
      language: 'Italian',
      behaviorHints: {
        notWebReady: true,
        proxyHeaders: { request: entry.media.headers }
      }
    });
  }

  return streams.map(s => formatStream(s, 'CB01')).filter(Boolean);
}

// collectLinksWithSection is exported for local testing; Nuvio only calls getStreams.
module.exports = { getStreams, collectLinksWithSection };
