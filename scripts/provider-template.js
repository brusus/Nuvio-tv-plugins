/*
 * MODELLO DI PROVIDER NUVIO — riferimento, non un provider funzionante.
 *
 * Non viene compilato: build.js prende solo le cartelle dentro src/, e questo
 * file sta in scripts/. Per farne un provider vero si copia in
 * src/<nome>/index.js e si riempiono i punti marcati DA ADATTARE.
 *
 * Esempio reale gia' funzionante nel repo: src/cb01/index.js
 *
 * ---------------------------------------------------------------------------
 * IL CONTRATTO, IN UNA RIGA
 *
 *   async function getStreams(id, type, season, episode, providerContext)
 *
 * Nuvio ti passa un titolo GIA' IDENTIFICATO e vuole indietro un elenco di
 * flussi. Non puoi proporre cataloghi, non puoi chiedere niente all'utente:
 * il codice gira in QuickJS, un motore JavaScript senza interfaccia, senza
 * DOM e senza API di sistema. Solo fetch e logica.
 *
 * Parametri:
 *   id        "tt1234567" | "tmdb:550" | "550"
 *   type      "movie" | "tv" | "series"
 *   season    numero di stagione, solo per le serie
 *   episode   numero di episodio, solo per le serie
 *   context   opzionale, puo' contenere gia' tmdbId / imdbId
 *
 * Ritorno: array di oggetti passati per formatStream(). Array vuoto se non
 * trovi nulla — mai null, mai eccezioni non gestite.
 * ---------------------------------------------------------------------------
 */

const { formatStream } = require('../formatter.js');
const { getQualityFromUrl } = require('../quality_helper.js');

// --- 1. COSTANTI ------------------------------------------------------------
// Il dominio sta qui, da solo: quando il sito cambia indirizzo si tocca una
// riga sola. E' anche il punto che check-domini.ps1 va a leggere.

const TMDB_API_KEY = '68e094699525b18a70bab2f86b1fa706'; // condivisa nel repo
const BASE_URL = 'https://esempio.invalid';              // DA ADATTARE
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT_MS = 15000;

// --- 2. RETE ----------------------------------------------------------------
// Ogni richiesta va con timeout e in try/catch. Un provider che lancia
// un'eccezione o resta appeso blocca l'intera ricerca: Nuvio interroga tutti
// i provider abilitati in parallelo e aspetta i piu' lenti.

function timeoutSignal(ms) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  } catch (_) {
    return undefined;   // QuickJS senza AbortController: si procede comunque
  }
}

async function httpGet(url, extraHeaders) {
  try {
    const headers = Object.assign({
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9'
    }, extraHeaders || {});
    const res = await fetch(url, { headers, signal: timeoutSignal(TIMEOUT_MS) });
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
      signal: timeoutSignal(TIMEOUT_MS)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

// --- 3. DALL'ID AL TITOLO ---------------------------------------------------
// Nuvio ti da' un id, il sito ragiona per titoli: questo e' il ponte.
// L'id arriva in tre forme diverse e vanno gestite tutte.

async function resolveTmdbId(id, type, providerContext) {
  const ctx = providerContext && /^\d+$/.test(String(providerContext.tmdbId || ''))
    ? String(providerContext.tmdbId) : null;
  if (ctx) return ctx;

  const idStr = String(id || '').trim();
  if (/^tmdb:\d+$/i.test(idStr)) return idStr.split(':')[1];
  if (/^\d+$/.test(idStr)) return idStr;

  // Se e' un id IMDb va convertito passando dall'endpoint find di TMDB
  const imdbId = /^tt\d+$/i.test(idStr)
    ? idStr
    : (providerContext && /^tt\d+$/i.test(String(providerContext.imdbId || '')) ? String(providerContext.imdbId) : null);
  if (!imdbId) return null;

  const payload = await fetchJson(
    `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
  );
  if (!payload) return null;

  const bucket = String(type).toLowerCase() === 'movie' ? 'movie_results' : 'tv_results';
  if (Array.isArray(payload[bucket]) && payload[bucket][0]) return String(payload[bucket][0].id);
  return null;
}

// Chiedi il titolo in italiano: e' quello con cui i siti italiani indicizzano.
// L'id IMDb serve dopo per confermare di essere sulla scheda giusta.
async function getInfo(tmdbId, type) {
  const endpoint = String(type).toLowerCase() === 'movie' ? 'movie' : 'tv';
  const payload = await fetchJson(
    `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=it-IT&append_to_response=external_ids`
  );
  if (!payload) return null;

  const date = payload.release_date || payload.first_air_date || '';
  return {
    title: payload.title || payload.name || null,
    originalTitle: payload.original_title || payload.original_name || null,
    year: date ? parseInt(String(date).slice(0, 4), 10) : null,
    imdbId: (payload.external_ids && payload.external_ids.imdb_id) || null
  };
}

// --- 4. NORMALIZZAZIONE -----------------------------------------------------
// Confrontare titoli grezzi non funziona: i siti aggiungono [HD], (2024),
// entita' html, punteggiatura. Si riducono entrambi a una forma comune.

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#8217;|&#039;|&#39;/g, "'")
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function normalizeTitle(text) {
  return decodeEntities(text)
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')    // [HD], [SUB ITA]
    .replace(/\((\d{4})\)/g, ' ')   // anno tra parentesi
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// --- 5. RICERCA SUL SITO ----------------------------------------------------
// Qui si guarda l'html vero del sito e si scrive il regex sui suoi selettori.
// DA ADATTARE per intero: ogni sito ha un markup diverso.

function parseResults(html) {
  const results = [];
  // Esempio: <h3 class="card-title"><a href="URL">Titolo (2024)</a></h3>
  const re = /<h3 class="card-title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = decodeEntities(m[2].replace(/<[^>]+>/g, '')).trim();
    const year = raw.match(/\((\d{4})\)/);
    results.push({
      url: m[1],
      title: normalizeTitle(raw),
      year: year ? parseInt(year[1], 10) : null
    });
  }
  return results;
}

// Punteggio, non primo risultato: la ricerca dei siti e' spesso approssimativa.
function scoreCandidate(candidate, wantedTitle, wantedYear) {
  let score = 0;
  if (candidate.title === wantedTitle) score += 10;
  else if (candidate.title.includes(wantedTitle) || wantedTitle.includes(candidate.title)) score += 5;
  if (wantedYear && candidate.year === wantedYear) score += 4;
  else if (wantedYear && candidate.year && Math.abs(candidate.year - wantedYear) === 1) score += 1;
  return score;
}

// --- 6. IL PEZZO PIU' DELICATO ----------------------------------------------
// Dal link della pagina all'URL del video. Cambia completamente da sito a
// sito: iframe da seguire, API da interrogare, JS impacchettato da srotolare.
// In src/cb01/index.js trovi un caso reale: API di stayonline, poi il packer
// di MixDrop.
//
// Regola pratica: se il percorso richiede di eseguire JavaScript o di
// risolvere un captcha, dentro un plugin non si puo' fare. Meglio accorgersene
// qui che dopo aver scritto tutto il resto.

async function resolveMediaUrl(pageUrl) {
  const html = await httpGet(pageUrl, { 'Referer': `${BASE_URL}/` });
  if (!html) return null;

  const iframe = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (!iframe) return null;

  // DA ADATTARE: qui di solito serve un secondo passaggio sull'embed
  return {
    url: iframe[1],
    headers: { 'User-Agent': USER_AGENT, 'Referer': `${BASE_URL}/` }
  };
}

// --- 7. PUNTO DI INGRESSO ---------------------------------------------------

async function getStreams(id, type, season, episode, providerContext = null) {
  const normalizedType = String(type || '').toLowerCase();
  // Dichiara solo cio' che sai davvero servire. Se le serie passano da un
  // percorso che non funziona, escludile qui e nel manifest.
  if (!['movie', 'tv', 'series'].includes(normalizedType)) return [];

  const tmdbType = normalizedType === 'movie' ? 'movie' : 'tv';
  const tmdbId = await resolveTmdbId(id, tmdbType, providerContext);
  if (!tmdbId) return [];

  const info = await getInfo(tmdbId, tmdbType);
  if (!info || !info.title) return [];

  // Prima il titolo italiano, poi l'originale come riserva
  let candidates = [];
  for (const q of [info.title, info.originalTitle].filter(Boolean)) {
    const html = await httpGet(`${BASE_URL}/?s=${encodeURIComponent(q)}`);
    if (html) candidates = parseResults(html);
    if (candidates.length) break;
  }
  if (!candidates.length) return [];

  const wanted = normalizeTitle(info.title);
  candidates = candidates
    .map(c => Object.assign({}, c, { score: scoreCandidate(c, wanted, info.year) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (!candidates.length) return [];

  // Conferma: molti siti linkano la scheda IMDb. Verificare quell'id nella
  // pagina batte qualunque confronto sui titoli, che sbaglia su remake e
  // omonimie. Se il sito non lo espone, ci si accontenta del punteggio pieno.
  let target = null;
  for (const candidate of candidates) {
    const html = await httpGet(candidate.url, { 'Referer': `${BASE_URL}/` });
    if (!html) continue;
    if (info.imdbId && html.includes(info.imdbId)) { target = candidate; break; }
    if (!info.imdbId && candidate.score >= 10) { target = candidate; break; }
  }
  if (!target) return [];

  const media = await resolveMediaUrl(target.url);
  if (!media) return [];

  // --- 8. FORMATO DI USCITA -------------------------------------------------
  // formatStream aggiunge emoji, etichette di qualita' e header di
  // riproduzione. Attenzione: se quality manca o vale 'unknown', ripiega su
  // "HD" — cioe' mente. Meglio dedurre un valore reale, come fa CB01 leggendo
  // le sezioni della pagina.
  //
  // type: 'direct' per un mp4, 'hls' per una playlist m3u8.
  // notWebReady: true quando il server pretende Referer e User-Agent
  // coerenti, perche' il player li deve inoltrare.

  const stream = {
    name: 'NomeSito - NomeServer',                                  // DA ADATTARE
    title: info.year ? `${info.title} (${info.year})` : info.title,
    url: media.url,
    headers: media.headers,
    quality: getQualityFromUrl(media.url) || '720p',
    type: 'direct',
    language: 'Italian',
    behaviorHints: {
      notWebReady: true,
      proxyHeaders: { request: media.headers }
    }
  };

  return [stream].map(s => formatStream(s, 'NomeSito')).filter(Boolean); // DA ADATTARE
}

module.exports = { getStreams };

/*
 * ---------------------------------------------------------------------------
 * COME SI METTE IN PRODUZIONE
 *
 * 1. Copia in src/<nome>/index.js e adatta i punti DA ADATTARE.
 *
 * 2. Aggiungi la voce in manifest.json, dentro l'array scrapers:
 *
 *      {
 *        "id": "nuviotv-<nome>",
 *        "name": "<Nome>",
 *        "version": "1.0.0",
 *        "description": "...",
 *        "resources": ["stream"],
 *        "contentLanguage": ["it"],
 *        "formats": ["mp4", "m3u8"],
 *        "idPrefixes": ["tmdb:", "tt"],
 *        "filename": "providers/<nome>.js",
 *        "supportedTypes": ["movie"],
 *        "enabled": true
 *      }
 *
 *    Il prefisso nuviotv- distingue le aggiunte nostre da quelle di
 *    realbestia1 ed evita collisioni su git pull upstream.
 *
 * 3. node build.js
 *    Scopre da solo le cartelle in src/ e produce providers/<nome>.js.
 *    Ricordati che Nuvio esegue il BUNDLE, non il sorgente: senza build la
 *    modifica non ha alcun effetto.
 *
 * 4. Prova prima con Node, non dall'app: vedi scripts/test-cb01.js.
 *    Debugare dentro Nuvio e' molto piu' lento.
 *
 * 5. Alza version a ogni modifica, altrimenti l'app non propone
 *    l'aggiornamento e continui a usare la build vecchia.
 *
 * ---------------------------------------------------------------------------
 * COSA NON PUO' FARE UN PLUGIN
 *
 * - risolvere un captcha: non c'e' interfaccia, non c'e' utente
 * - superare un challenge JavaScript di Cloudflare: QuickJS non e' un browser
 * - usare Node: niente child_process, niente filesystem, niente processi
 *
 * Per quei casi serve la modalita' addon Stremio (stremio_addon.js), che gira
 * come server e ha accesso a tutto.
 *
 * Nota pratica: un 403 non e' per forza un challenge. Puo' essere la
 * reputazione dell'IP — un'uscita VPN da datacenter ne raccoglie parecchi.
 * Prima di concludere che un sito e' inaccessibile, riprova da una linea
 * normale.
 * ---------------------------------------------------------------------------
 */
