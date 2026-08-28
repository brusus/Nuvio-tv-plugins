const { formatStream } = require('../formatter.js');
const { resolveLiveDomain } = require('../domain_helper.js');
const { checkQualityFromText } = require('../quality_helper.js');

const IS_SERVER = typeof process !== 'undefined' && process.versions && process.versions.node;

if (!IS_SERVER) {
  module.exports = {
    getStreams: async (id, type, season, episode) => {
      try {
        const params = new URLSearchParams({
          id: String(id || ''),
          type: String(type || ''),
          s: String(season || 1),
          ep: String(episode || 1)
        });
        const response = await fetch(`https://easystreams.realbestia.com/resolve/cinejoy?${params}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return Array.isArray(data?.streams) ? data.streams : [];
      } catch (error) {
        console.error('[Cinejoy-Client] API Error:', error.message);
        return [];
      }
    }
  };
} else {
const { webcrypto, createHash } = require('crypto');

let BASE_URL = 'https://cinejoy.to';
const API_URL = 'https://api.shegu.st';
const WASM_URL = `${API_URL}/crush.wasm`;
const TMDB_API_KEY = '68e094699525b18a70bab2f86b1fa706';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const BROWSER_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  Origin: BASE_URL,
  Referer: `${BASE_URL}/`,
  'User-Agent': USER_AGENT
};
const REQUEST_HEADER = {
  ...BROWSER_HEADERS,
  Accept: '*/*',
  'Content-Type': 'text/plain;charset=UTF-8'
};

let wasmExportsPromise = null;
let serversCache = null;
let serversCacheAt = 0;
const titleCache = new Map();
let lastDiagnostics = { stage: 'idle', at: null };

function setDiagnostics(stage, details = {}) {
  lastDiagnostics = {
    stage,
    at: new Date().toISOString(),
    ...details
  };
  const summary = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : value}`)
    .join(' ');
  console.log(`[Cinejoy] ${stage}${summary ? ` ${summary}` : ''}`);
}

function getDiagnostics() {
  return { ...lastDiagnostics };
}

function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, provider: 'cinejoy', signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function getWasmExports() {
  if (!wasmExportsPromise) {
    wasmExportsPromise = fetchWithTimeout(WASM_URL, {}, 8000)
      .then(response => {
        if (!response.ok) throw new Error(`Cinejoy WASM HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then(bytes => WebAssembly.instantiate(bytes, {}))
      .then(({ instance }) => instance.exports)
      .catch(error => {
        wasmExportsPromise = null;
        throw error;
      });
  }

  return wasmExportsPromise;
}

async function sealRequest(payload) {
  const wasm = await getWasmExports();
  const encoder = new TextEncoder();
  const input = encoder.encode(JSON.stringify(payload));
  const keyMaterial = new Uint8Array(44);
  webcrypto.getRandomValues(keyMaterial);

  const inputPtr = wasm.alloc(input.length);
  const keyPtr = wasm.alloc(keyMaterial.length);
  const outputCapacity = input.length + 512;
  const outputPtr = wasm.alloc(outputCapacity);

  try {
    new Uint8Array(wasm.memory.buffer).set(input, inputPtr);
    new Uint8Array(wasm.memory.buffer).set(keyMaterial, keyPtr);

    const sealedLength = wasm.seal_request(
      inputPtr,
      input.length,
      keyPtr,
      keyMaterial.length,
      outputPtr,
      outputCapacity
    );

    if (!Number.isInteger(sealedLength) || sealedLength < 98 || sealedLength > outputCapacity) {
      throw new Error('Cinejoy request sealing failed');
    }

    const sealed = new Uint8Array(wasm.memory.buffer).slice(outputPtr, outputPtr + sealedLength);
    return {
      responseKey: sealed.slice(0, 32),
      keyId: sealed[32],
      ephemeralPublic: sealed.slice(33, 98),
      body: sealed.slice(98)
    };
  } finally {
    wasm.dealloc(inputPtr, input.length);
    wasm.dealloc(keyPtr, keyMaterial.length);
    wasm.dealloc(outputPtr, outputCapacity);
  }
}

async function openResponse(responseBytes, request) {
  if (responseBytes.length < 28) throw new Error('Cinejoy response too short');

  const encoder = new TextEncoder();
  const additionalData = new Uint8Array([
    ...encoder.encode('lumen-gate-v2'),
    0,
    2,
    request.keyId,
    ...request.ephemeralPublic
  ]);
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    request.responseKey,
    'AES-GCM',
    false,
    ['decrypt']
  );
  const plaintext = await webcrypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: responseBytes.slice(0, 12),
      additionalData,
      tagLength: 128
    },
    cryptoKey,
    responseBytes.slice(12)
  );

  const result = JSON.parse(new TextDecoder().decode(plaintext));
  if (!result || typeof result.status !== 'number' || !('data' in result)) {
    throw new Error('Invalid Cinejoy response');
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Cinejoy API HTTP ${result.status}`);
  }

  return result.data;
}

async function encryptedRequest(path, payload) {
  const request = await sealRequest({ path, payload });
  const response = await fetchWithTimeout(`${API_URL}/g`, {
    method: 'POST',
    headers: REQUEST_HEADER,
    body: request.body
  }, 8000);

  const responseBytes = new Uint8Array(await response.arrayBuffer());
  if (!response.ok) throw new Error(`Cinejoy gateway HTTP ${response.status}`);
  return openResponse(responseBytes, request);
}

async function getServers() {
  if (serversCache && Date.now() - serversCacheAt < 5 * 60 * 1000) return serversCache;

  const response = await fetchWithTimeout(`${API_URL}/servers`, {
    headers: BROWSER_HEADERS
  }, 8000);
  if (!response.ok) throw new Error(`Cinejoy servers HTTP ${response.status}`);
  const payload = await response.json();
  const servers = Array.isArray(payload) ? payload : payload?.servers;
  if (!Array.isArray(servers)) throw new Error('Invalid Cinejoy servers response');

  serversCache = servers.filter(server => server?.name && server.status === 'ok');
  serversCacheAt = Date.now();
  return serversCache;
}

function resolveTmdbId(id, providerContext = null) {
  const contextId = String(providerContext?.tmdbId || '').trim();
  if (/^\d+$/.test(contextId)) return contextId;

  const rawId = String(id || '').trim();
  const prefixedId = rawId.match(/^tmdb:(\d+)$/i);
  if (prefixedId) return prefixedId[1];
  if (/^\d+$/.test(rawId)) return rawId;

  return null;
}

function getTitleHint(providerContext) {
  const hints = [
    ...(Array.isArray(providerContext?.titleHints) ? providerContext.titleHints : []),
    ...(Array.isArray(providerContext?.mappedTitleHints) ? providerContext.mappedTitleHints : [])
  ];
  return hints.map(value => String(value || '').trim()).find(Boolean) || null;
}

async function resolveMediaTitle(tmdbId, type, providerContext = null) {
  const hintedTitle = getTitleHint(providerContext);
  if (hintedTitle) return hintedTitle;

  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const cacheKey = `${endpoint}:${tmdbId}`;
  if (titleCache.has(cacheKey)) return titleCache.get(cacheKey);

  try {
    const response = await fetchWithTimeout(
      `https://api.themoviedb.org/3/${endpoint}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}&language=it-IT`,
      {},
      3000
    );
    if (response.ok) {
      const payload = await response.json();
      const title = payload?.title || payload?.name || payload?.original_title || payload?.original_name || null;
      titleCache.set(cacheKey, title);
      return title;
    }
  } catch {
    // Keep the provider usable when TMDB is temporarily unavailable.
  }

  titleCache.set(cacheKey, null);
  return null;
}

function parseHlsAttributes(value) {
  const attributes = {};
  const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
  let match;
  while ((match = regex.exec(value)) !== null) {
    attributes[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return attributes;
}

function normalizeQuality(height) {
  const value = Number.parseInt(height, 10);
  if (!Number.isInteger(value)) return null;
  if (value >= 2160) return '4K';
  if (value >= 1440) return '1440p';
  if (value >= 1080) return '1080p';
  if (value >= 720) return '720p';
  if (value >= 480) return '480p';
  if (value >= 360) return '360p';
  return '240p';
}

function resolvePlaylistUrl(value, baseUrl) {
  try {
    return new URL(String(value || '').trim(), baseUrl || undefined).toString();
  } catch {
    return String(value || '').trim();
  }
}

function inspectHlsMaster(text, baseUrl = '') {
  const audioLanguages = [];
  const audioSeen = new Set();
  const qualities = [];
  const qualitySeen = new Set();
  const variants = [];
  let pendingVariant = null;

  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (line.startsWith('#EXT-X-MEDIA:') && /TYPE=AUDIO/i.test(line)) {
      const attributes = parseHlsAttributes(line.slice('#EXT-X-MEDIA:'.length));
      const language = String(attributes.LANGUAGE || '').trim().toLowerCase();
      const name = String(attributes.NAME || language).trim();
      const label = language === 'it' ? 'Italian' : name || language;
      const key = label.toLowerCase();
      if (key && !audioSeen.has(key)) {
        audioSeen.add(key);
        audioLanguages.push(label);
      }
    }

    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const attributes = parseHlsAttributes(line.slice('#EXT-X-STREAM-INF:'.length));
      const height = String(attributes.RESOLUTION || '').match(/x(\d+)$/i)?.[1];
      const quality = normalizeQuality(height);
      pendingVariant = { attributes, height: Number.parseInt(height || '', 10) || 0, quality };
      if (quality && !qualitySeen.has(quality)) {
        qualitySeen.add(quality);
        qualities.push(quality);
      }
      continue;
    }

    if (pendingVariant && trimmedLine && !trimmedLine.startsWith('#')) {
      variants.push({
        ...pendingVariant,
        url: resolvePlaylistUrl(trimmedLine, baseUrl)
      });
      pendingVariant = null;
    }
  }

  const qualityRank = { '4K': 0, '1440p': 1, '1080p': 2, '720p': 3, '480p': 4, '360p': 5, '240p': 6 };
  qualities.sort((a, b) => qualityRank[a] - qualityRank[b]);
  const bestVariant = variants
    .filter(variant => variant.quality || variant.height > 0)
    .sort((a, b) => (qualityRank[a.quality] ?? 99) - (qualityRank[b.quality] ?? 99))[0];

  return {
    audioLanguages,
    qualities,
    quality: qualities[0] || checkQualityFromText(text) || null,
    videoUrl: bestVariant?.url || String(baseUrl || '').trim()
  };
}

function encodeBase64Url(value) {
  return Buffer.from(JSON.stringify(value), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildVixsrcAudioUrl(mediaRequest) {
  const tmdbId = String(mediaRequest?.payload?.tmdb || '').trim();
  if (!tmdbId) return '';

  if (mediaRequest?.path === 'movie') {
    return `https://vixsrc.to/movie/${encodeURIComponent(tmdbId)}`;
  }

  const season = String(mediaRequest?.payload?.season || '').trim();
  const episode = String(mediaRequest?.payload?.episode || '').trim();
  if (!season || !episode) return '';
  return `https://vixsrc.to/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
}

function buildDualFallbackUrl(providerContext, videoUrl, mediaRequest, cacheInfo = {}) {
  const proxyUrl = String(providerContext?.proxyUrl || '').trim().replace(/\/+$/, '');
  const audioUrl = buildVixsrcAudioUrl(mediaRequest);
  if (!proxyUrl || !audioUrl || !videoUrl) return '';

  const descriptorPayload = {
    video: { url: videoUrl },
    audio: { extractor: 'vixsrc', d: audioUrl },
    audio_lang: 'ita',
    resolution: Number(cacheInfo.resolution) || 2160
  };
  if (mediaRequest?.mediaKey) descriptorPayload.media_key = mediaRequest.mediaKey;
  if (cacheInfo.mediaKey) descriptorPayload.media_key = cacheInfo.mediaKey;
  if (cacheInfo.videoFingerprint) descriptorPayload.video_fingerprint = cacheInfo.videoFingerprint;
  const descriptor = encodeBase64Url(descriptorPayload);
  const params = new URLSearchParams({ d: descriptor });
  const password = String(providerContext?.proxyPassword || '').trim();
  if (password) params.set('api_password', password);
  return `${proxyUrl}/dual/menifest.m3u8?${params.toString()}`;
}

async function inspectPlaylist(url, headers) {
  let lastError = null;
  for (const requestHeaders of [headers, undefined]) {
    try {
      const response = await fetchWithTimeout(
        url,
        requestHeaders ? { headers: requestHeaders } : {},
        10000
      );
      if (!response.ok) {
        lastError = new Error(`Cinejoy playlist HTTP ${response.status}`);
        continue;
      }
      const finalUrl = String(response.url || url);
      return inspectHlsMaster(await response.text(), finalUrl);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Cinejoy playlist check failed');
}

function getMediaRequest(type, tmdbId, season, episode) {
  const isMovie = type === 'movie';
  return {
    path: isMovie ? 'movie' : 'series',
    payload: isMovie
      ? { tmdb: tmdbId }
      : { tmdb: tmdbId, season: String(season), episode: String(episode) }
  };
}

function buildDualMediaKey(rawId, mediaRequest, season, episode) {
  const mediaType = mediaRequest?.path === 'movie' ? 'movie' : 'series';
  const sourceId = String(rawId || '').split(':', 1)[0].trim();
  const mediaSeason = mediaType === 'movie' ? 0 : Number(season) || 0;
  const mediaEpisode = mediaType === 'movie' ? 0 : Number(episode) || 0;
  return sourceId
    ? `${mediaType}:${sourceId}:${mediaSeason}:${mediaEpisode}`
    : '';
}

function buildDualVideoFingerprint(server, playlist) {
  let path = String(playlist || '').trim();
  try {
    path = new URL(path).pathname;
  } catch {
    // Keep the raw value if the upstream URL is temporarily malformed.
  }
  const stable = `cinejoy|${String(server?.name || '').trim().toLowerCase()}|${path}`;
  return createHash('sha1').update(stable).digest('hex').slice(0, 20);
}

async function getServerStreams(
  server,
  mediaRequest,
  title,
  providerContext = null,
  { dualOnly = false } = {}
) {
  const data = await encryptedRequest(`/${server.name}/${mediaRequest.path}`, mediaRequest.payload);
  const entries = Array.isArray(data?.stream) ? data.stream : [];
  setDiagnostics('stream_response', { server: server.name, entries: entries.length });
  const headers = { Referer: `${BASE_URL}/`, 'User-Agent': USER_AGENT };

  const inspectedEntries = (await Promise.all(entries.map(async entry => {
    const playlist = String(entry?.playlist || '').trim();
    if (!/^https?:\/\/[^\s]+\.m3u8(?:[?#].*)?$/i.test(playlist)) {
      setDiagnostics('invalid_playlist', { server: server.name });
      return null;
    }

    let playlistInfo = null;
    try {
      playlistInfo = await inspectPlaylist(playlist, headers);
    } catch (error) {
      setDiagnostics('playlist_check_failed', { server: server.name, error: error.message });
      playlistInfo = null;
    }

    const quality = playlistInfo?.quality || (server['4k'] === true ? '4K' : 'Unknown');
    const audioLanguages = playlistInfo?.audioLanguages || [];
    const availableQualities = playlistInfo?.qualities || [];
    const selectedVideoUrl = playlistInfo?.videoUrl || playlist;
    const hasItalianAudio = audioLanguages.some(language => /\bitalian\b/i.test(language));
    setDiagnostics('playlist_checked', {
      server: server.name,
      quality,
      audioTracks: audioLanguages.length,
      italian: hasItalianAudio
    });
    if (!hasItalianAudio) {
      setDiagnostics('playlist_rejected_no_italian', {
        server: server.name,
        qualities: availableQualities,
        audioTracks: audioLanguages.length
      });
      return {
        playlist,
        selectedVideoUrl,
        quality,
        audioLanguages,
        availableQualities,
        hasItalianAudio: false
      };
    }

    return {
      playlist,
      selectedVideoUrl,
      quality,
      audioLanguages,
      availableQualities,
      hasItalianAudio: true
    };
  }))).filter(Boolean);

  const directStreams = dualOnly ? [] : inspectedEntries
    .filter(entry => entry.hasItalianAudio)
    .map(entry => {
      const normalizedQuality = entry.quality === '4K' ? '2160p' : entry.quality;
      return formatStream({
        name: 'Cinejoy',
        title,
        url: entry.playlist,
        quality: normalizedQuality,
        language: 'Italian',
        audioLanguages: entry.audioLanguages,
        availableQualities: entry.availableQualities,
        type: 'hls',
        // Cinejoy accepts direct HLS requests. Do not expose headers here:
        // Stremio's local HLS proxy corrupts the child playlist URLs.
      }, 'Cinejoy');
    })
    .filter(Boolean);

  const hasDirect4KItalian = inspectedEntries.some(entry =>
    entry.hasItalianAudio && entry.quality === '4K'
  );
  if (!dualOnly && hasDirect4KItalian) return directStreams;

  const fourKPlaylist = inspectedEntries.find(entry => entry.quality === '4K');
  const dualCache = fourKPlaylist
    ? {
        mediaKey: mediaRequest.mediaKey || '',
        resolution: 2160,
        videoFingerprint: buildDualVideoFingerprint(server, fourKPlaylist.playlist)
      }
    : null;
  const dualUrl = buildDualFallbackUrl(
    providerContext,
    fourKPlaylist?.playlist,
    mediaRequest,
    dualCache || {}
  );
  if (dualUrl) {
    setDiagnostics('dual_4k_fallback', {
      server: server.name,
      audio: 'vixsrc/ita'
    });
    directStreams.push(formatStream({
      name: 'Cinejoy DUAL',
      title,
      url: dualUrl,
      quality: '2160p',
      language: 'Italian',
      audioLanguages: ['Italian'],
      availableQualities: ['4K'],
      type: 'hls',
      cinejoyDualFallback: true,
      dualCache,
      behaviorHints: { notWebReady: false }
    }, 'Cinejoy'));
  }

  return directStreams.filter(Boolean);
}

async function getStreams(id, type, season, episode, providerContext = null) {
  BASE_URL = await resolveLiveDomain("https://cinejoy.to");
  setDiagnostics('start', { id: String(id || ''), type: String(type || '') });
  const normalizedType = String(type || '').toLowerCase();
  if (!['movie', 'tv', 'series'].includes(normalizedType)) return [];

  const tmdbId = resolveTmdbId(id, providerContext);
  if (!tmdbId) {
    setDiagnostics('invalid_tmdb_id');
    return [];
  }

  const isMovie = normalizedType === 'movie';
  const effectiveSeason = Number.parseInt(String(season || ''), 10) || 1;
  const effectiveEpisode = Number.parseInt(String(episode || ''), 10) || 1;
  const mediaRequest = getMediaRequest(isMovie ? 'movie' : 'series', tmdbId, effectiveSeason, effectiveEpisode);
  mediaRequest.mediaKey = buildDualMediaKey(id, mediaRequest, effectiveSeason, effectiveEpisode);
  const mediaTitle = await resolveMediaTitle(tmdbId, isMovie ? 'movie' : 'tv', providerContext);
  const baseTitle = mediaTitle || (isMovie ? 'Film' : 'Serie TV');
  const title = isMovie ? baseTitle : `${baseTitle} ${effectiveSeason}x${effectiveEpisode}`;

  let servers;
  try {
    servers = await getServers();
    setDiagnostics('servers_loaded', { count: servers.length });
  } catch (error) {
    console.warn(`[Cinejoy] Server list failed: ${error.message}`);
    setDiagnostics('servers_failed', { error: error.message });
    return [];
  }

  // Cinejoy marks its main all-in-one playlist with 4k=true (Lisbon).
  // Return only that source; the remaining servers are fallbacks and should
  // not appear as separate streams in Stremio/Nuvio.
  const primaryServer = servers.find(server => server['4k'] === true) || servers[0];
  if (!primaryServer) {
    setDiagnostics('no_primary_server');
    return [];
  }
  setDiagnostics('primary_server', { server: primaryServer.name });

  let streams = [];
  let primaryServerFailed = false;
  try {
    streams = await getServerStreams(primaryServer, mediaRequest, title, providerContext);
  } catch (error) {
    primaryServerFailed = true;
    console.warn(`[Cinejoy] ${primaryServer.name} extraction failed: ${error.message}`);
    setDiagnostics('extraction_failed', { server: primaryServer.name, error: error.message });
  }

  const hasDirect4KItalian = streams.some(stream =>
    !stream?.cinejoyDualFallback && String(stream?.quality || '').toLowerCase() === '2160p'
  );
  const hasDualFallback = streams.some(stream => stream?.cinejoyDualFallback === true);

  if (!hasDirect4KItalian && !hasDualFallback && providerContext?.proxyUrl) {
    for (const server of servers) {
      if (!primaryServerFailed && server === primaryServer) continue;
      try {
        const fallbackStreams = await getServerStreams(
          server,
          mediaRequest,
          title,
          providerContext,
          { dualOnly: true }
        );
        const dualFallback = fallbackStreams.find(stream => stream?.cinejoyDualFallback === true);
        if (dualFallback) {
          streams.push(dualFallback);
          setDiagnostics('dual_4k_fallback_server', { server: server.name });
          break;
        }
      } catch (error) {
        console.warn(`[Cinejoy] ${server.name} DUAL fallback skipped: ${error.message}`);
        setDiagnostics('dual_fallback_server_failed', {
          server: server.name,
          error: error.message
        });
      }
    }
  }

  if (streams.length > 0) setDiagnostics('ok', { streams: streams.length });
  return streams;
}

module.exports = { getStreams, getDiagnostics };
}
