var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/formatter.js
var require_formatter = __commonJS({
  "src/formatter.js"(exports2, module2) {
    function normalizePlaybackHeaders(headers) {
      if (!headers || typeof headers !== "object") return headers;
      const normalized = {};
      for (const [key, value] of Object.entries(headers)) {
        if (value == null) continue;
        const lowerKey = String(key).toLowerCase();
        if (lowerKey === "user-agent") normalized["User-Agent"] = value;
        else if (lowerKey === "referer" || lowerKey === "referrer") normalized["Referer"] = value;
        else if (lowerKey === "origin") normalized["Origin"] = value;
        else if (lowerKey === "accept") normalized["Accept"] = value;
        else if (lowerKey === "accept-language") normalized["Accept-Language"] = value;
        else normalized[key] = value;
      }
      return normalized;
    }
    function shouldForceNotWebReadyForPlugin(stream, providerName, headers, behaviorHints) {
      const text = [
        stream == null ? void 0 : stream.url,
        stream == null ? void 0 : stream.name,
        stream == null ? void 0 : stream.title,
        stream == null ? void 0 : stream.server,
        providerName
      ].filter(Boolean).join(" ").toLowerCase();
      if (text.includes("loadm") || text.includes("loadm.cam") || text.includes("mixdrop") || text.includes("mxcontent")) {
        return true;
      }
      return false;
    }
    function normalizeProviderId(providerName) {
      const normalized = String(providerName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
      return normalized || void 0;
    }
    function normalizeEpisodeTemplate(value) {
      return String(value || "").replace(
        /\b(\d{1,3})[xX](\d{1,3})\b/g,
        (_, season, episode) => `S${season.padStart(2, "0")}E${episode.padStart(2, "0")}`
      ).replace(
        /\bS(\d{1,3})\s*E(\d{1,3})\b/gi,
        (_, season, episode) => `S${season.padStart(2, "0")}E${episode.padStart(2, "0")}`
      );
    }
    function formatStream2(stream, providerName) {
      let quality = stream.quality || "";
      if (["4k", "2160p"].includes(String(quality).toLowerCase())) quality = "\u{1F525}4K UHD";
      else if (quality === "1440p") quality = "\u2728 QHD";
      else if (quality === "1080p") quality = "\u{1F680} FHD";
      else if (quality === "720p") quality = "\u{1F4BF} HD";
      else if (quality === "576p" || quality === "480p" || quality === "360p" || quality === "240p") quality = "\u{1F4A9} Low Quality";
      else if (!quality || ["auto", "unknown", "unknow"].includes(String(quality).toLowerCase())) quality = "\u{1F4BF} HD";
      const normalizedTitle = normalizeEpisodeTemplate(stream.title || "Stream");
      let title = `\u{1F4C1} ${normalizedTitle}`;
      let language = stream.language;
      if (language === "Italian") {
        language = "\u{1F1EE}\u{1F1F9}";
      } else if (stream.name && (stream.name.includes("SUB ITA") || stream.name.includes("SUB"))) {
        language = "\u{1F1EF}\u{1F1F5} \u{1F1EE}\u{1F1F9}";
      } else if (normalizedTitle.includes("SUB ITA") || normalizedTitle.includes("SUB")) {
        language = "\u{1F1EF}\u{1F1F5} \u{1F1EE}\u{1F1F9}";
      } else if (language === void 0 || language === null) {
        language = "";
      }
      let details = [];
      if (stream.size) details.push(`\u{1F4E6} ${stream.size}`);
      const desc = details.join(" | ");
      let pName = stream.name || stream.server || providerName;
      if (pName) {
        pName = pName.replace(/\s*\[?\(?\s*SUB\s*ITA\s*\)?\]?/i, "").replace(/\s*\[?\(?\s*ITA\s*\)?\]?/i, "").replace(/\s*\[?\(?\s*SUB\s*\)?\]?/i, "").replace(/\(\s*\)/g, "").replace(/\[\s*\]/g, "").trim();
      }
      if (pName === providerName) {
        pName = pName.charAt(0).toUpperCase() + pName.slice(1);
      }
      if (pName) {
        pName = `\u{1F4E1} ${pName}`;
      }
      const behaviorHints = stream.behaviorHints && typeof stream.behaviorHints === "object" ? __spreadValues({}, stream.behaviorHints) : {};
      let finalHeaders = stream.headers;
      if (behaviorHints.proxyHeaders && behaviorHints.proxyHeaders.request) {
        finalHeaders = behaviorHints.proxyHeaders.request;
      } else if (behaviorHints.headers) {
        finalHeaders = behaviorHints.headers;
      }
      finalHeaders = normalizePlaybackHeaders(finalHeaders);
      const isStreamingCommunityProvider = String(providerName || "").toLowerCase() === "streamingcommunity" || String((stream == null ? void 0 : stream.name) || "").toLowerCase().includes("streamingcommunity");
      if (isStreamingCommunityProvider && !finalHeaders) {
        delete behaviorHints.proxyHeaders;
        delete behaviorHints.headers;
        delete behaviorHints.notWebReady;
      }
      if (finalHeaders) {
        behaviorHints.proxyHeaders = behaviorHints.proxyHeaders || {};
        behaviorHints.proxyHeaders.request = finalHeaders;
        behaviorHints.headers = finalHeaders;
      }
      const providerExplicitNotWebReady = stream.behaviorHints && "notWebReady" in stream.behaviorHints;
      const shouldForceNotWebReady = shouldForceNotWebReadyForPlugin(stream, providerName, finalHeaders, behaviorHints);
      if (!isStreamingCommunityProvider && shouldForceNotWebReady) {
        behaviorHints.notWebReady = true;
      } else if (!providerExplicitNotWebReady) {
        delete behaviorHints.notWebReady;
      }
      const finalName = pName;
      let finalTitle = `\u{1F4C1} ${normalizedTitle}`;
      if (desc) finalTitle += ` | ${desc}`;
      if (language) finalTitle += ` | ${language}`;
      const playbackReferer = stream.referer || (finalHeaders == null ? void 0 : finalHeaders.Referer) || (finalHeaders == null ? void 0 : finalHeaders.referer);
      const playbackUserAgent = stream.userAgent || (finalHeaders == null ? void 0 : finalHeaders["User-Agent"]) || (finalHeaders == null ? void 0 : finalHeaders["user-agent"]);
      return __spreadProps(__spreadValues({}, stream), {
        // Keep original properties
        name: finalName,
        title: finalTitle,
        // Metadata for Stremio UI reconstruction (safer names for RN)
        providerName: pName,
        qualityTag: quality,
        description: desc,
        originalTitle: normalizedTitle,
        // Ensure language is set for Stremio/Nuvio sorting
        language,
        // Mark as formatted
        _nuvio_formatted: true,
        behaviorHints,
        provider: stream.provider || normalizeProviderId(providerName),
        referer: playbackReferer,
        userAgent: playbackUserAgent,
        // Explicitly ensure root headers are preserved for Nuvio
        headers: finalHeaders
      });
    }
    module2.exports = { formatStream: formatStream2 };
  }
});

// src/domain_helper.js
var require_domain_helper = __commonJS({
  "src/domain_helper.js"(exports2, module2) {
    var DEFAULT_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    var _cache = /* @__PURE__ */ new Map();
    function resolveLiveDomain2(startUrl, userAgent) {
      return __async(this, null, function* () {
        const start = String(startUrl || "").replace(/\/+$/, "");
        if (!start) return start;
        if (_cache.has(start)) return yield _cache.get(start);
        const p = (() => __async(null, null, function* () {
          try {
            const res = yield fetch(start + "/", {
              headers: {
                "User-Agent": userAgent || DEFAULT_UA,
                "Accept-Language": "it-IT,it;q=0.9"
              }
            });
            if (res && res.body && typeof res.body.cancel === "function") {
              res.body.cancel().catch(() => {
              });
            }
            if (res && res.ok && res.url) {
              const origin = new URL(res.url).origin;
              if (origin && origin !== start) {
                console.log("[domain] spostato: " + start + " -> " + origin);
              }
              return origin || start;
            }
            return start;
          } catch (_) {
            return start;
          }
        }))();
        _cache.set(start, p);
        return yield p;
      });
    }
    module2.exports = { resolveLiveDomain: resolveLiveDomain2 };
  }
});

// src/altadefinizionestreaming/index.js
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var BASE_URL = "https://altadefinizionestreaming.tv";
var USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
var CDN_PROBE_TIMEOUT_MS = 500;
var SESSION_COOKIE = "sid=32234dfabd14e587764e84405e75e99856c6bef31c6b1752e19897b8ae3d4a21";
var { formatStream } = require_formatter();
var { resolveLiveDomain } = require_domain_helper();
function getCookie() {
  var _a, _b;
  try {
    return (((_a = globalThis == null ? void 0 : globalThis.SCRAPER_SETTINGS) == null ? void 0 : _a.altadefinizioneCookie) || ((_b = process == null ? void 0 : process.env) == null ? void 0 : _b.ALTADEFINIZIONE_COOKIE) || SESSION_COOKIE || "").trim();
  } catch (e) {
    return SESSION_COOKIE || "";
  }
}
function fetchJson(url, cookie) {
  return __async(this, null, function* () {
    try {
      const headers = {
        "User-Agent": USER_AGENT,
        "Referer": `${BASE_URL}/`,
        "Accept": "application/json,text/plain,*/*"
      };
      if (cookie && url.startsWith(BASE_URL)) headers.Cookie = cookie;
      const response = yield fetch(url, { headers });
      if (!response.ok) return null;
      return yield response.json();
    } catch (e) {
      return null;
    }
  });
}
function resolveTmdbId(id, type, providerContext = null) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    const contextTmdbId = providerContext && /^\d+$/.test(String(providerContext.tmdbId || "")) ? String(providerContext.tmdbId) : null;
    if (contextTmdbId) return contextTmdbId;
    const idStr = String(id || "").trim();
    if (/^tmdb:\d+$/i.test(idStr)) return idStr.split(":")[1];
    if (/^\d+$/.test(idStr)) return idStr;
    const contextImdbId = providerContext && /^tt\d+$/i.test(String(providerContext.imdbId || "")) ? String(providerContext.imdbId) : null;
    const imdbId = /^tt\d+$/i.test(idStr) ? idStr : contextImdbId;
    if (!imdbId) return null;
    const normalizedType = String(type || "").toLowerCase();
    const payload = yield fetchJson(`https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?api_key=${TMDB_API_KEY}&external_source=imdb_id`);
    if (!payload) return null;
    if (normalizedType === "movie") {
      if (Array.isArray(payload.movie_results) && ((_a = payload.movie_results[0]) == null ? void 0 : _a.id)) return String(payload.movie_results[0].id);
      if (Array.isArray(payload.tv_results) && ((_b = payload.tv_results[0]) == null ? void 0 : _b.id)) return String(payload.tv_results[0].id);
    }
    if (Array.isArray(payload.tv_results) && ((_c = payload.tv_results[0]) == null ? void 0 : _c.id)) return String(payload.tv_results[0].id);
    if (Array.isArray(payload.movie_results) && ((_d = payload.movie_results[0]) == null ? void 0 : _d.id)) return String(payload.movie_results[0].id);
    return null;
  });
}
function getShowTitle(tmdbId, type) {
  return __async(this, null, function* () {
    const endpoint = String(type || "").toLowerCase() === "movie" ? "movie" : "tv";
    const payload = yield fetchJson(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=it-IT`);
    if (!payload) return null;
    return payload.title || payload.name || payload.original_title || payload.original_name || null;
  });
}
function isCdnAllowedQuickly(url, headers) {
  return __async(this, null, function* () {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CDN_PROBE_TIMEOUT_MS);
    try {
      const response = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, headers), { Range: "bytes=0-0" }),
        signal: controller.signal
      });
      if (response.body && typeof response.body.cancel === "function") {
        response.body.cancel().catch(() => {
        });
      }
      return response.status !== 403;
    } catch (e) {
      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  });
}
function addCdnStream(streams, tmdbId, type, season, episode, displayName, cookie) {
  return __async(this, null, function* () {
    var _a, _b;
    const normalizedType = String(type || "").toLowerCase();
    const endpoint = normalizedType === "movie" ? `${BASE_URL}/api/player-sources/movie/${tmdbId}` : `${BASE_URL}/api/player-sources/tv/${tmdbId}/${season}/${episode}`;
    const payload = yield fetchJson(endpoint, cookie);
    const isAllowed = (s) => (s == null ? void 0 : s.url) && !/vixsrc\.to/i.test(String(s.url));
    const source = ((_a = payload == null ? void 0 : payload.sources) == null ? void 0 : _a.find((s) => String((s == null ? void 0 : s.provider) || "").toLowerCase() === "cdn" && isAllowed(s))) || ((_b = payload == null ? void 0 : payload.sources) == null ? void 0 : _b.find((s) => isAllowed(s)));
    if (!(source == null ? void 0 : source.url)) return;
    const headers = { "User-Agent": USER_AGENT, "Referer": `${BASE_URL}/` };
    if (!(yield isCdnAllowedQuickly(source.url, headers))) return;
    streams.push({
      name: "AltadefinizioneStreaming - CDN",
      title: displayName,
      url: source.url,
      easyProxySourceUrl: endpoint,
      headers,
      quality: "720p",
      type: "direct",
      language: ""
    });
  });
}
function getStreams(id, type, season, episode, providerContext = null) {
  return __async(this, null, function* () {
    BASE_URL = yield resolveLiveDomain("https://altadefinizionestreaming.tv");
    const normalizedType = String(type || "").toLowerCase();
    if (normalizedType !== "movie" && normalizedType !== "tv" && normalizedType !== "series") return [];
    const cookie = getCookie();
    const tmdbId = yield resolveTmdbId(id, normalizedType === "movie" ? "movie" : "tv", providerContext);
    if (!tmdbId) return [];
    const effectiveSeason = parseInt(String(season || ""), 10) || 1;
    const effectiveEpisode = parseInt(String(episode || ""), 10) || 1;
    const providerType = normalizedType === "movie" ? "movie" : "tv";
    const showTitle = (yield getShowTitle(tmdbId, providerType)) || (normalizedType === "movie" ? "Film" : "Serie");
    const displayName = normalizedType === "movie" ? showTitle : `${showTitle} ${effectiveSeason}x${effectiveEpisode}`;
    const streams = [];
    yield addCdnStream(streams, tmdbId, providerType, effectiveSeason, effectiveEpisode, displayName, cookie);
    return streams.map((s) => formatStream(s, "AltadefinizioneStreaming")).filter(Boolean);
  });
}
module.exports = { getStreams };
