const STREAMINGCOMMUNITY_CONFIG_URL = 'https://raw.githubusercontent.com/realbestia1/domains/refs/heads/main/domains.json';
const STREAMINGCOMMUNITY_DEFAULT_BASE_URL = 'https://dancingmonkeyvideolover.xyz';
const STREAMINGCOMMUNITY_BASE_URL_OVERRIDE = String(
  (typeof process !== 'undefined' && process.env && process.env.STREAMINGCOMMUNITY_BASE_URL) || ''
).trim();
const STREAMINGCOMMUNITY_MEDIA_HOST_OVERRIDE = String(
  (typeof process !== 'undefined' && process.env && process.env.STREAMINGCOMMUNITY_MEDIA_HOST) || ''
).trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');

function normalizeStreamingCommunityBaseUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!/^https?:$/i.test(parsed.protocol) || !parsed.hostname) return null;
    return parsed.toString().replace(/\/+$/, '');
  } catch (_) {
    return null;
  }
}

let streamingCommunityBaseUrl = normalizeStreamingCommunityBaseUrl(STREAMINGCOMMUNITY_BASE_URL_OVERRIDE)
  || STREAMINGCOMMUNITY_DEFAULT_BASE_URL;
let streamingCommunityMediaHost = STREAMINGCOMMUNITY_MEDIA_HOST_OVERRIDE
  || new URL(streamingCommunityBaseUrl).hostname;
let streamingCommunityConfigLoaded = Boolean(STREAMINGCOMMUNITY_BASE_URL_OVERRIDE);
let streamingCommunityConfigPromise = null;

async function loadStreamingCommunityConfig() {
  if (streamingCommunityConfigLoaded) return streamingCommunityBaseUrl;
  if (streamingCommunityConfigPromise) return await streamingCommunityConfigPromise;

  streamingCommunityConfigPromise = (async () => {
    try {
      const response = await fetch(STREAMINGCOMMUNITY_CONFIG_URL, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Config HTTP ${response.status}`);
      const config = await response.json();
      const nextBaseUrl = normalizeStreamingCommunityBaseUrl(config?.vixsrc);
      if (nextBaseUrl) {
        streamingCommunityBaseUrl = nextBaseUrl;
        if (!STREAMINGCOMMUNITY_MEDIA_HOST_OVERRIDE) {
          streamingCommunityMediaHost = new URL(nextBaseUrl).hostname;
        }
      }
    } catch (error) {
      console.warn(`[StreamingCommunity] Domains config unavailable, using fallback: ${error.message}`);
    } finally {
      streamingCommunityConfigLoaded = true;
      streamingCommunityConfigPromise = null;
    }
    return streamingCommunityBaseUrl;
  })();

  return await streamingCommunityConfigPromise;
}

function getStreamingCommunityBaseUrl() {
  return streamingCommunityBaseUrl;
}

const { formatStream } = require('../formatter.js');
require('../fetch_helper.js');
const { checkQualityFromText } = require('../quality_helper.js');

const STREAMINGCOMMUNITY_PROXY = (typeof process !== 'undefined' && process.env.STREAMINGCOMMUNITY_PROXY) || '';
let ProxyAgent = null;
try {
    ProxyAgent = require('undici').ProxyAgent;
} catch (_) {
    ProxyAgent = null;
}

const SC_DEFAULT_SITE = 'https://streamingunity.vip';

// ===========================================================================
// CREDENZIALI DEL PIANO PREMIUM
//
// Compila i due valori qui sotto con il tuo account StreamingCommunity.
// Servono per lo streaming 1080p, che il sito riserva agli abbonati.
//
// ATTENZIONE: questo file e pubblico. Chiunque apra
// raw.githubusercontent.com/brusus/Nuvio-tv-plugins/.../streamingcommunity.js
// legge cio che scrivi qui. Usa una password che non usi da nessuna altra
// parte, cosi un eventuale abuso resta confinato a questo account.
//
// Dopo averli compilati: node build.js, poi commit e push.
// Lasciandoli vuoti il provider funziona come prima, in anonimo a 720p.
// ===========================================================================
const SC_ACCOUNT_EMAIL = 'rooting0001';
const SC_ACCOUNT_PASSWORD = 'N.kwbU7KUHsLpg6';

// Impostazioni fornite dall'app a runtime (globalThis.SCRAPER_SETTINGS) oppure,
// quando il provider gira lato server, da variabile d'ambiente. Non esiste un
// valore di riserva scritto nel codice: questo file e' pubblico su GitHub e
// qualunque credenziale committata qui sarebbe leggibile da chiunque.
function getSetting(settingName, envName) {
  try {
    const settings = (typeof globalThis !== 'undefined' && globalThis.SCRAPER_SETTINGS) || {};
    const fromApp = settings[settingName];
    const fromEnv = (typeof process !== 'undefined' && process.env && process.env[envName]) || '';
    return String(fromApp || fromEnv || '').trim();
  } catch (_) {
    return '';
  }
}

// Gli abbonati ricevono un "dominio premium privato": se configurato si usa
// quello, perche' e' l'host su cui la sessione a pagamento e' valida.
function getSiteBase() {
  const custom = getSetting('streamingcommunitySiteUrl', 'STREAMINGCOMMUNITY_SITE_URL');
  if (!custom) return SC_DEFAULT_SITE;
  const normalized = normalizeStreamingCommunityBaseUrl(custom);
  return normalized || SC_DEFAULT_SITE;
}

// Sessione autenticata, risolta una volta sola per esecuzione.
// Stringa vuota = nessun account configurato o login fallito.
let scSessionCookie = null;
let scSessionPromise = null;

function readCookieValue(jar, name) {
  const match = String(jar || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  if (!match) return "";
  try { return decodeURIComponent(match[1]); } catch (_) { return match[1]; }
}

// I cookie piu recenti sostituiscono i precedenti con lo stesso nome.
function mergeCookies(oldJar, newJar) {
  const jar = new Map();
  for (const part of [oldJar, newJar]) {
    for (const piece of String(part || "").split("; ")) {
      if (!piece) continue;
      const eq = piece.indexOf("=");
      if (eq > 0) jar.set(piece.slice(0, eq), piece.slice(eq + 1));
    }
  }
  return Array.from(jar.entries()).map(([k, v]) => k + "=" + v).join("; ");
}

// Il sito e una applicazione Laravel con Sanctum: prima si raccolgono il
// cookie di sessione e il token XSRF, poi si invia il form di accesso.
async function ensureSession() {
  if (scSessionCookie !== null) return scSessionCookie;
  if (scSessionPromise) return await scSessionPromise;
  if (!SC_ACCOUNT_EMAIL || !SC_ACCOUNT_PASSWORD) {
    scSessionCookie = "";
    return "";
  }

  scSessionPromise = (async () => {
    const base = getSiteBase();
    try {
      const loginPage = await fetch(base + "/login", {
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "it-IT,it;q=0.9" }
      });
      let jar = getResponseCookies(loginPage);

      const csrf = await fetch(base + "/sanctum/csrf-cookie", {
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": base + "/",
          "Cookie": jar,
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      jar = mergeCookies(jar, getResponseCookies(csrf));

      const response = await fetch(base + "/login", {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Cookie": jar,
          "X-XSRF-TOKEN": readCookieValue(jar, "XSRF-TOKEN"),
          "X-Requested-With": "XMLHttpRequest",
          "Referer": base + "/login",
          "Origin": base,
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: "email=" + encodeURIComponent(SC_ACCOUNT_EMAIL) +
              "&password=" + encodeURIComponent(SC_ACCOUNT_PASSWORD)
      });
      jar = mergeCookies(jar, getResponseCookies(response));
      // Si registra solo il codice HTTP: le credenziali non vanno nei log.
      console.log("[StreamingCommunity] Login premium: HTTP " + response.status);
      scSessionCookie = jar;
      return jar;
    } catch (error) {
      console.warn("[StreamingCommunity] Login premium fallito, proseguo anonimo: " + error.message);
      scSessionCookie = "";
      return "";
    } finally {
      scSessionPromise = null;
    }
  })();

  return await scSessionPromise;
}

function getSiteCookie() {
  const fromSettings = getSetting('streamingcommunityCookie', 'STREAMINGCOMMUNITY_COOKIE');
  if (fromSettings) return fromSettings;
  return scSessionCookie || "";
}

// Header per le richieste al sito, con il cookie di sessione se presente.
function getSiteHeaders() {
  const headers = {
    'User-Agent': USER_AGENT,
    'Referer': `${getSiteBase()}/`,
    'Accept-Language': 'it-IT,it;q=0.9'
  };
  const cookie = getSiteCookie();
  if (cookie) headers.Cookie = cookie;
  return headers;
}
let _sitemapCache = null;
let _sitemapPromise = null;

async function getSitemap() {
  if (_sitemapCache) return _sitemapCache;
  if (_sitemapPromise) return await _sitemapPromise;
  _sitemapPromise = (async () => {
    try {
      const r = await fetch(`${getSiteBase()}/titles_it_sitemap.xml`, { headers: getSiteHeaders() });
      if (!r.ok) return [];
      const xml = await r.text();
      const entries = [];
      const re = /titles\/(\d+)-([^<]+)/g;
      let m;
      while ((m = re.exec(xml))) entries.push({ id: Number(m[1]), slug: m[2] });
      _sitemapCache = entries;
      return entries;
    } catch (e) {
      console.warn('[StreamingCommunity] Sitemap fetch error:', e.message);
      return [];
    } finally {
      _sitemapPromise = null;
    }
  })();
  return await _sitemapPromise;
}

function findInSitemap(entries, name) {
  if (!name) return [];
  const cname = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cname.length < 2) return [];
  const exact = [];
  const prefix = [];
  for (const e of entries) {
    const cslug = e.slug.replace(/[^a-z0-9]/g, '');
    if (cslug === cname) exact.push(e);
    else if (cslug.startsWith(cname) || cname.startsWith(cslug)) prefix.push(e);
  }
  return [...exact, ...prefix];
}

async function scrapeTitle(id, slug, season = null) {
  try {
    const baseSlug = slug ? String(slug).replace(/\/season-\d+.*$/i, '') : '';
    let url = `${getSiteBase()}/it/titles/${id}${baseSlug ? '-' + baseSlug : ''}`;
    if (season) url += `/season-${season}`;
    const r = await fetch(url, { headers: getSiteHeaders() });
    if (!r.ok) return null;
    const html = await r.text();
    const m = html.match(/data-page="({.+?})"/);
    if (!m) return null;
    const page = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    const t = page?.props?.title;
    if (!t) return null;
    const loadedSeason = page?.props?.loadedSeason;
    const ep = loadedSeason?.episodes;
    return {
      id: t.id, slug: t.slug, name: t.name, type: t.type,
      tmdb_id: t.tmdb_id, imdb_id: t.imdb_id, coming_soon: Boolean(t.coming_soon),
      seasonNumber: loadedSeason?.number || null,
      episodes: ep?.map(e => ({ id: e.id, number: e.number, name: e.name })) || null
    };
  } catch (e) { return null; }
}

async function getCamEmbed(titleId, episodeId) {
  try {
    let url = `${getSiteBase()}/it/iframe/${titleId}`;
    if (episodeId) url += `?episode_id=${episodeId}`;
    const r = await fetch(url, { headers: getSiteHeaders() });
    if (!r.ok) return null;
    const m = (await r.text()).match(/src="(https:\/\/vixcloud\.co\/embed\/[^"]+)"/);
    return m ? m[1].replace(/&amp;/g, '&') : null;
  } catch (e) { return null; }
}

async function resolveSczEmbed(metadata, normalizedType, season, episode, rawId) {
  try {
    const entries = await getSitemap();
    if (!entries.length) return null;

    const inputIsTmdb = /^\d+$/.test(String(rawId).replace(/^tmdb:/i, ''));
    const targetTmdb = metadata?.id || (inputIsTmdb ? String(rawId).replace(/^tmdb:/i, '') : null);
    const targetImdb = metadata?.imdb_id || (!inputIsTmdb ? String(rawId) : null);

    const titlesToTry = [targetImdb, metadata?.title, metadata?.name, metadata?.original_title, metadata?.original_name].filter(Boolean);
    const candidateMatches = [];
    for (const t of titlesToTry) {
      for (const m of findInSitemap(entries, t)) {
        if (!candidateMatches.some(c => c.id === m.id)) candidateMatches.push(m);
      }
    }

    if (!candidateMatches.length) {
      for (const t of titlesToTry) {
        try {
          const r = await fetch(`${getSiteBase()}/it/search?q=${encodeURIComponent(t)}`, { headers: getSiteHeaders() });
          if (!r.ok) continue;
          const html = await r.text();
          const m = html.match(/data-page="({.+?})"/);
          if (m) {
            const page = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
            const titles = page.props?.titles || [];
            for (const item of titles) {
              if (!candidateMatches.some(c => c.id === item.id)) {
                candidateMatches.push({ id: item.id, slug: item.slug });
              }
            }
          }
        } catch (_) {}
      }
    }

    let foundTitle = null;
    for (const m of candidateMatches.slice(0, 8)) {
      const scraped = await scrapeTitle(m.id, m.slug, normalizedType === 'tv' ? season : null);
      if (!scraped) continue;
      const matchTmdb = targetTmdb && scraped.tmdb_id !== null && String(scraped.tmdb_id) === String(targetTmdb);
      const matchImdb = targetImdb && scraped.imdb_id && String(scraped.imdb_id).toLowerCase() === String(targetImdb).toLowerCase();
      if (matchTmdb || matchImdb) {
        foundTitle = scraped;
        break;
      }
    }

    if (!foundTitle || foundTitle.coming_soon) return null;

    let episodeId = null;
    if (normalizedType === 'tv') {
      const targetSeason = Number(season) || 1;
      if (foundTitle.seasonNumber !== targetSeason || !foundTitle.episodes) return null;
      const epNum = Number(episode) || 1;
      const epObj = foundTitle.episodes.find(e => e.number === epNum);
      if (!epObj) return null;
      episodeId = epObj.id;
    }

    const iframeUrl = `${getSiteBase()}/it/iframe/${foundTitle.id}${episodeId ? '?episode_id=' + episodeId : ''}`;
    const embedUrl = await getCamEmbed(foundTitle.id, episodeId);
    if (!embedUrl) return null;

    return { embedUrl, iframeUrl };
  } catch (e) {
    console.error('[StreamingCommunity] SCZ embed resolve error:', e.message);
    return null;
  }
}

const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function getCommonHeaders() {
  return {
    "User-Agent": USER_AGENT,
    "Referer": `${getStreamingCommunityBaseUrl()}/`,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
  };
}

function getEmbedHeaders(embedUrl) {
  const cookie = getSiteCookie();
  return {
    ...(cookie ? { Cookie: cookie } : {}),
    "User-Agent": USER_AGENT,
    "Referer": `${getStreamingCommunityBaseUrl()}/`,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7"
  };
}

function getPlaylistHeaders(embedUrl) {
  let origin = getStreamingCommunityBaseUrl();
  try { origin = new URL(embedUrl).origin; } catch (_) { }
  return {
    "User-Agent": USER_AGENT,
    "Referer": embedUrl,
    "Origin": origin,
    "Accept": "*/*",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
  };
}

function getResponseCookies(response) {
  try {
    const cookies = typeof response.headers?.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers?.get?.('set-cookie')].filter(Boolean);
    return cookies
      .map(value => String(value).split(';', 1)[0])
      .filter(Boolean)
      .join('; ');
  } catch (_) {
    return '';
  }
}

function rewriteStreamingCommunityHost(value) {
  return String(value || '')
    .replace(/vixcloud\.co/gi, streamingCommunityMediaHost)
    .replace(/vixsrc\.to/gi, streamingCommunityMediaHost);
}

function extractEmbedSrcFromApiPayload(payload) {
  const rawSrc = payload && typeof payload === "object" ? payload.src : null;
  if (!rawSrc) return null;
  try {
    return new URL(rawSrc, getStreamingCommunityBaseUrl()).toString();
  } catch (e) {
    return null;
  }
}

function extractMasterPlaylistFromEmbedHtml(html, preferActiveStream = false) {
  if (!html) return null;

  const tokenMatch = html.match(/'token'\s*:\s*'([^']+)'/i);
  const expiresMatch = html.match(/'expires'\s*:\s*'([^']+)'/i);
  const urlMatch = html.match(/url\s*:\s*'([^']+\/playlist\/\d+[^']*)'/i);

  if (!tokenMatch || !expiresMatch || !urlMatch) {
    return null;
  }

  let playlistUrl = urlMatch[1];
  if (preferActiveStream) {
    const streamsMatch = html.match(/window\.streams\s*=\s*(\[[\s\S]*?\])\s*;\s*window\.masterPlaylist/i);
    if (streamsMatch) {
      try {
        const streams = JSON.parse(streamsMatch[1]);
        const selected = streams.find(stream => stream?.active && stream?.url)
          || streams.find(stream => stream?.url);
        if (selected?.url) playlistUrl = selected.url;
      } catch (_) { }
    }
  }

  return {
    token: tokenMatch[1],
    expires: expiresMatch[1],
    url: playlistUrl
  };
}

function getQualityFromName(qualityStr) {
  if (!qualityStr) return "Unknown";
  const quality = qualityStr.toUpperCase();
  if (quality === "ORG" || quality === "ORIGINAL") return "Original";
  if (quality === "4K" || quality === "2160P") return "4K";
  if (quality === "1440P" || quality === "2K") return "1440p";
  if (quality === "1080P" || quality === "FHD") return "1080p";
  if (quality === "720P" || quality === "HD") return "720p";
  if (quality === "480P" || quality === "SD") return "480p";
  if (quality === "360P") return "360p";
  if (quality === "240P") return "240p";
  const match = qualityStr.match(/(\d{3,4})[pP]?/);
  if (match) {
    const resolution = parseInt(match[1]);
    if (resolution >= 2160) return "4K";
    if (resolution >= 1440) return "1440p";
    if (resolution >= 1080) return "1080p";
    if (resolution >= 720) return "720p";
    if (resolution >= 480) return "480p";
    if (resolution >= 360) return "360p";
    return "240p";
  }
  return "Unknown";
}

async function getTmdbId(imdbId, type) {
  const normalizedType = String(type).toLowerCase();
  const findUrl = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
  try {
    const response = await fetch(findUrl);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data) return null;
    if (normalizedType === "movie" && data.movie_results && data.movie_results.length > 0) {
      return data.movie_results[0].id.toString();
    } else if (normalizedType === "tv" && data.tv_results && data.tv_results.length > 0) {
      return data.tv_results[0].id.toString();
    }
    return null;
  } catch (e) {
    console.error("[StreamingCommunity] Conversion error:", e);
    return null;
  }
}

async function getMetadata(id, type) {
  try {
    const normalizedType = String(type).toLowerCase();
    let url;
    if (String(id).startsWith("tt")) {
      url = `https://api.themoviedb.org/3/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id&language=it-IT`;
    } else {
      const endpoint = normalizedType === "movie" ? "movie" : "tv";
      url = `https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${TMDB_API_KEY}&language=it-IT`;
    }
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (String(id).startsWith("tt")) {
      const results = normalizedType === "movie" ? data.movie_results : data.tv_results;
      if (results && results.length > 0) return results[0];
    } else {
      return data;
    }
    return null;
  } catch (e) {
    console.error("[StreamingCommunity] Metadata error:", e);
    return null;
  }
}

async function getStreams(id, type, season, episode, providerContext = null) {
  await loadStreamingCommunityConfig();
  await ensureSession();
  const requestedType = String(type).toLowerCase();
  const normalizedType = requestedType === "series" ? "tv" : requestedType;
  const baseUrl = getStreamingCommunityBaseUrl();
  const commonHeaders = getCommonHeaders();
  let tmdbId = id.toString();
  let resolvedSeason = season;
  const contextTmdbId = providerContext && /^\d+$/.test(String(providerContext.tmdbId || ""))
    ? String(providerContext.tmdbId)
    : null;

  if (contextTmdbId) {
    tmdbId = contextTmdbId;
  } else if (tmdbId.startsWith("tmdb:")) {
    tmdbId = tmdbId.replace("tmdb:", "");
  } else if (tmdbId.startsWith("tt")) {
    const convertedId = await getTmdbId(tmdbId, normalizedType);
    if (convertedId) {
      console.log(`[StreamingCommunity] Converted ${id} to TMDB ID: ${convertedId}`);
      tmdbId = convertedId;
    } else {
      console.warn(`[StreamingCommunity] Could not convert IMDb ID ${id} to TMDB ID.`);
    }
  }

  let metadata = null;
  try {
    metadata = await getMetadata(tmdbId, type);
  } catch (e) {
    console.error("[StreamingCommunity] Error fetching metadata:", e);
  }

  const title = metadata && (metadata.title || metadata.name || metadata.original_title || metadata.original_name) ? metadata.title || metadata.name || metadata.original_title || metadata.original_name : normalizedType === "movie" ? "Film Sconosciuto" : "Serie TV";
  const displayName = normalizedType === "movie" ? title : `${title} ${resolvedSeason}x${episode}`;
  const finalDisplayName = displayName;

  let url;
  let apiUrl;
  if (normalizedType === "movie") {
    url = `${baseUrl}/movie/${tmdbId}`;
    apiUrl = `${baseUrl}/api/movie/${tmdbId}`;
  } else if (normalizedType === "tv") {
    url = `${baseUrl}/tv/${tmdbId}/${resolvedSeason}/${episode}`;
    apiUrl = `${baseUrl}/api/tv/${tmdbId}/${resolvedSeason}/${episode}`;
  } else {
    return [];
  }

  try {
    const proxySocks = STREAMINGCOMMUNITY_PROXY || (typeof process !== 'undefined' && process.env.SOCKS5_PROXY) || '';
    const useProxyFetch = proxySocks && typeof ProxyAgent === 'function';
    let proxyAgent = null;
    if (useProxyFetch) {
      try {
        proxyAgent = new ProxyAgent(proxySocks);
        console.log(`[StreamingCommunity] Using SOCKS5 proxy for fetches`);
      } catch (e) {
        console.warn(`[StreamingCommunity] Failed to create proxy agent: ${e.message}`);
      }
    }

    console.log(`[StreamingCommunity] Fetching API: ${apiUrl}`);

    // Fetch embed URLs concurrently from both Vixsrc API and StreamingCommunityZ
    const [vixRes, sczRes] = await Promise.all([
      fetch(apiUrl, { headers: commonHeaders, dispatcher: proxyAgent || undefined })
        .then(r => r.ok ? r.json() : null)
        .then(payload => {
          const embedUrl = extractEmbedSrcFromApiPayload(payload);
          return embedUrl ? { embedUrl, iframeUrl: url } : null;
        })
        .catch(() => null),
      resolveSczEmbed(metadata, normalizedType, resolvedSeason, episode, id)
    ]);

    const embedSources = [];
    if (sczRes?.embedUrl) embedSources.push({ ...sczRes, source: 'scz' });
    if (vixRes?.embedUrl && vixRes.embedUrl !== sczRes?.embedUrl) embedSources.push({ ...vixRes, source: 'vixsrc' });

    if (embedSources.length === 0) {
      console.log("[StreamingCommunity] Could not find embed src from any source");
      return [];
    }

    const streams = [];

    for (const item of embedSources) {
      const embedUrl = item.embedUrl;
      const isSczSource = item.source === 'scz';
      let embedHtml;
      let embedCookies = '';
      try {
        console.log(`[StreamingCommunity] Fetching embed (${item.source}): ${embedUrl}`);
        const embedResponse = await fetch(embedUrl, {
          headers: getEmbedHeaders(embedUrl),
          dispatcher: proxyAgent || undefined
        });
        if (!embedResponse.ok) {
          console.error(`[StreamingCommunity] Failed to fetch embed: ${embedResponse.status}`);
          continue;
        }
        embedCookies = getResponseCookies(embedResponse);
        embedHtml = await embedResponse.text();
      } catch (e) {
        console.error(`[StreamingCommunity] Failed to fetch embed: ${e.message}`);
        continue;
      }
      if (!embedHtml) continue;

      const masterPlaylist = extractMasterPlaylistFromEmbedHtml(embedHtml);
      if (!masterPlaylist) {
        console.log("[StreamingCommunity] Could not find playlist info in HTML");
        continue;
      }

      const embedParams = new URL(embedUrl).searchParams;
      const playlistParams = [
        ['token', masterPlaylist.token],
        ['expires', masterPlaylist.expires],
        ...(embedParams.get('canPlayFHD') ? [['h', '1']] : []),
        ...(embedParams.get('scz') ? [['scz', '1']] : []),
        ['lang', embedParams.get('lang') || 'en']
      ];
      const playlistSeparator = masterPlaylist.url.includes('?') ? '&' : '?';
      const streamUrl = rewriteStreamingCommunityHost(
        `${masterPlaylist.url}${playlistSeparator}${playlistParams
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&')}`
      );
      const cleanEmbedUrl = rewriteStreamingCommunityHost(embedUrl);
      const cleanIframeUrl = rewriteStreamingCommunityHost(item.iframeUrl || cleanEmbedUrl);
      const streamHeaders = getPlaylistHeaders(embedUrl);
      if (embedCookies) streamHeaders.Cookie = embedCookies;
      console.log(`[StreamingCommunity] Final stream URL (${item.source}): ${streamUrl}`);

      let quality = "1080p";
      let hasItalianAudio = false;
      let playlistFetched = false;
      try {
        const playlistResponse = await fetch(streamUrl, {
          headers: streamHeaders,
          dispatcher: proxyAgent || undefined
        });
        if (!playlistResponse.ok) {
          console.warn(`[StreamingCommunity] Playlist pre-check failed: ${playlistResponse.status}, stream not playable`);
          continue;
        }
        playlistFetched = true;
        const playlistText = await playlistResponse.text();
        if (playlistText) {
          hasItalianAudio = /#EXT-X-MEDIA:TYPE=AUDIO.*(?:LANGUAGE="it"|LANGUAGE="ita"|NAME="Italian"|NAME="Ita")/i.test(playlistText);
          const detected = checkQualityFromText(playlistText);
          if (detected) quality = detected;
        }
      } catch (e) {
        console.warn(`[StreamingCommunity] Playlist pre-check failed, continuing:`, e);
        continue;
      }

      const normalizedQuality = getQualityFromName(quality);
      const isItalianAudio = isSczSource || (playlistFetched && hasItalianAudio);
      const resultLanguage = isItalianAudio ? 'Italian' : '';

      const isStremioAddon = Boolean(providerContext?.proxyUrl);
      const targetProxySource = isStremioAddon ? cleanIframeUrl : cleanEmbedUrl;

      const result = {
        name: isItalianAudio ? `StreamingCommunity` : `StreamingCommunity ENG`,
        title: finalDisplayName,
        url: streamUrl,
        easyProxySourceUrl: targetProxySource,
        quality: normalizedQuality,
        type: "direct",
        headers: streamHeaders,
        behaviorHints: {
          notWebReady: false
        },
        language: resultLanguage
      };

      const formatted = formatStream(result, "StreamingCommunity");
      if (formatted) streams.push(formatted);
    }

    // Il sito espone due varianti dello stesso titolo: quella scz, in italiano,
    // e quella vixsrc con canPlayFHD, che spesso e' l'unica a salire di
    // risoluzione. Prima ne veniva restituita una sola, la prima italiana,
    // e la seconda andava persa anche quando offriva una qualita' migliore.
    // Entrambe dichiarano una traccia audio ita, quindi il filtro per lingua
    // non bastava a distinguerle: si restituiscono entrambe, italiane prima,
    // deduplicando per URL.
    const itaStreams = streams.filter(s => Boolean(s.language) || s.title?.includes('🇮🇹'));
    const otherStreams = streams.filter(s => !itaStreams.includes(s));

    const out = [];
    const seenUrls = new Set();
    const seenQualities = new Set();
    for (const stream of [...itaStreams, ...otherStreams]) {
      if (!stream || seenUrls.has(stream.url)) continue;
      // Una seconda variante entra solo se offre una qualita' che manca:
      // spesso le due sono identiche e aggiungerla sarebbe solo una voce
      // doppia nella lista del player.
      const tag = String(stream.qualityTag || stream.quality || '');
      if (out.length > 0 && seenQualities.has(tag)) continue;
      seenUrls.add(stream.url);
      seenQualities.add(tag);
      out.push(stream);
    }
    return out;
  } catch (error) {
    console.error("[StreamingCommunity] Error:", error);
    return [];
  }
}

module.exports = { getStreams };

