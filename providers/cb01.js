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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
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

// src/fetch_helper.js
var require_fetch_helper = __commonJS({
  "src/fetch_helper.js"(exports2, module2) {
    var FETCH_TIMEOUT = 3e4;
    function createTimeoutSignal(timeoutMs) {
      const parsed = Number.parseInt(String(timeoutMs), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return { signal: void 0, cleanup: null, timed: false };
      }
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        return { signal: AbortSignal.timeout(parsed), cleanup: null, timed: true };
      }
      if (typeof AbortController !== "undefined" && typeof setTimeout === "function") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, parsed);
        return {
          signal: controller.signal,
          cleanup: () => clearTimeout(timeoutId),
          timed: true
        };
      }
      return { signal: void 0, cleanup: null, timed: false };
    }
    function fetchWithTimeout(_0) {
      return __async(this, arguments, function* (url, options = {}) {
        if (typeof fetch === "undefined") {
          throw new Error("No fetch implementation found!");
        }
        const _a = options, { timeout } = _a, fetchOptions = __objRest(_a, ["timeout"]);
        const requestTimeout = timeout || FETCH_TIMEOUT;
        const timeoutConfig = createTimeoutSignal(requestTimeout);
        const requestOptions = __spreadValues({}, fetchOptions);
        if (timeoutConfig.signal) {
          if (requestOptions.signal && typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
            requestOptions.signal = AbortSignal.any([requestOptions.signal, timeoutConfig.signal]);
          } else if (!requestOptions.signal) {
            requestOptions.signal = timeoutConfig.signal;
          }
        }
        try {
          const response = yield fetch(url, requestOptions);
          return response;
        } catch (error) {
          if (error && error.name === "AbortError" && timeoutConfig.timed) {
            throw new Error(`Request to ${url} timed out after ${requestTimeout}ms`);
          }
          throw error;
        } finally {
          if (typeof timeoutConfig.cleanup === "function") {
            timeoutConfig.cleanup();
          }
        }
      });
    }
    module2.exports = { fetchWithTimeout, createTimeoutSignal };
  }
});

// src/quality_helper.js
var require_quality_helper = __commonJS({
  "src/quality_helper.js"(exports2, module2) {
    var { createTimeoutSignal } = require_fetch_helper();
    var USER_AGENT2 = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
    function checkQualityFromText(text) {
      if (!text) return null;
      if (/RESOLUTION=\d+x2160/i.test(text) || /RESOLUTION=2160/i.test(text)) return "4K";
      if (/RESOLUTION=\d+x1440/i.test(text) || /RESOLUTION=1440/i.test(text)) return "1440p";
      if (/RESOLUTION=\d+x1080/i.test(text) || /RESOLUTION=1080/i.test(text)) return "1080p";
      if (/RESOLUTION=\d+x720/i.test(text) || /RESOLUTION=720/i.test(text)) return "720p";
      if (/RESOLUTION=\d+x480/i.test(text) || /RESOLUTION=480/i.test(text)) return "480p";
      return null;
    }
    function checkQualityFromPlaylist(_0) {
      return __async(this, arguments, function* (url, headers = {}) {
        try {
          const finalHeaders = __spreadValues({}, headers);
          if (!finalHeaders["User-Agent"]) finalHeaders["User-Agent"] = USER_AGENT2;
          const timeoutConfig = createTimeoutSignal(3e3);
          try {
            const response = yield fetch(url, {
              headers: finalHeaders,
              signal: timeoutConfig.signal
            });
            if (!response.ok) return null;
            const text = yield response.text();
            if (!text.startsWith("#EXTM3U")) return null;
            const quality = checkQualityFromText(text);
            if (quality) console.log(`[QualityHelper] Detected ${quality} from playlist: ${url}`);
            return quality;
          } finally {
            if (typeof timeoutConfig.cleanup === "function") timeoutConfig.cleanup();
          }
        } catch (_) {
          return null;
        }
      });
    }
    function getQualityFromUrl2(url) {
      if (!url) return null;
      const urlPath = url.split("?")[0].toLowerCase();
      if (urlPath.includes("4k") || urlPath.includes("2160")) return "4K";
      if (urlPath.includes("1440") || urlPath.includes("2k")) return "1440p";
      if (urlPath.includes("1080") || urlPath.includes("fhd")) return "1080p";
      if (urlPath.includes("720") || urlPath.includes("hd")) return "720p";
      if (urlPath.includes("480") || urlPath.includes("sd")) return "480p";
      if (urlPath.includes("360")) return "360p";
      return null;
    }
    module2.exports = {
      checkQualityFromPlaylist,
      getQualityFromUrl: getQualityFromUrl2,
      checkQualityFromText
    };
  }
});

// src/cb01/index.js
var { formatStream } = require_formatter();
var { resolveLiveDomain } = require_domain_helper();
var { getQualityFromUrl } = require_quality_helper();
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var BASE_URL = "https://cb01uno.blog";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var REQUEST_TIMEOUT_MS = 15e3;
var MAX_CANDIDATES = 5;
var STAYONLINE_RE = /https?:\/\/stayonline\.pro\/l\/[A-Za-z0-9]+\/?/g;
var SECTION_RE = /<strong>\s*Streaming(\s*HD)?\s*:?\s*<\/strong>/gi;
function timeoutSignal(ms) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  } catch (_) {
    return void 0;
  }
}
function httpGet(url, extraHeaders) {
  return __async(this, null, function* () {
    try {
      const headers = Object.assign({
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9"
      }, extraHeaders || {});
      const res = yield fetch(url, { headers, signal: timeoutSignal(REQUEST_TIMEOUT_MS) });
      if (!res.ok) return null;
      return yield res.text();
    } catch (_) {
      return null;
    }
  });
}
function fetchJson(url) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, {
        headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
        signal: timeoutSignal(REQUEST_TIMEOUT_MS)
      });
      if (!res.ok) return null;
      return yield res.json();
    } catch (_) {
      return null;
    }
  });
}
function decodeEntities(text) {
  return String(text || "").replace(/&#8217;|&#039;|&#39;/g, "'").replace(/&#8211;|&#8212;/g, "-").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function normalizeTitle(text) {
  return decodeEntities(text).toLowerCase().replace(/\[[^\]]*\]/g, " ").replace(/\((\d{4})\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
}
function resolveTmdbId(id, type, providerContext) {
  return __async(this, null, function* () {
    const ctxTmdb = providerContext && /^\d+$/.test(String(providerContext.tmdbId || "")) ? String(providerContext.tmdbId) : null;
    if (ctxTmdb) return ctxTmdb;
    const idStr = String(id || "").trim();
    if (/^tmdb:\d+$/i.test(idStr)) return idStr.split(":")[1];
    if (/^\d+$/.test(idStr)) return idStr;
    const ctxImdb = providerContext && /^tt\d+$/i.test(String(providerContext.imdbId || "")) ? String(providerContext.imdbId) : null;
    const imdbId = /^tt\d+$/i.test(idStr) ? idStr : ctxImdb;
    if (!imdbId) return null;
    const payload = yield fetchJson(
      `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
    );
    if (!payload) return null;
    if (Array.isArray(payload.movie_results) && payload.movie_results[0] && payload.movie_results[0].id) {
      return String(payload.movie_results[0].id);
    }
    return null;
  });
}
function getMovieInfo(tmdbId, providerContext) {
  return __async(this, null, function* () {
    const payload = yield fetchJson(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=it-IT&append_to_response=external_ids`
    );
    if (!payload) return null;
    const ctxImdb = providerContext && /^tt\d+$/i.test(String(providerContext.imdbId || "")) ? String(providerContext.imdbId) : null;
    return {
      title: payload.title || payload.original_title || null,
      originalTitle: payload.original_title || null,
      year: payload.release_date ? parseInt(String(payload.release_date).slice(0, 4), 10) : null,
      imdbId: payload.external_ids && payload.external_ids.imdb_id || ctxImdb || null
    };
  });
}
function parseSearchResults(html) {
  const results = [];
  const re = /<h3 class="card-title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const raw = decodeEntities(m[2].replace(/<[^>]+>/g, "")).trim();
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
function searchCb01(query) {
  return __async(this, null, function* () {
    const html = yield httpGet(`${BASE_URL}/?s=${encodeURIComponent(query)}`);
    if (!html) return [];
    return parseSearchResults(html);
  });
}
function scoreCandidate(candidate, wantedTitle, wantedYear) {
  let score = 0;
  if (candidate.title === wantedTitle) score += 10;
  else if (candidate.title.indexOf(wantedTitle) !== -1 || wantedTitle.indexOf(candidate.title) !== -1) score += 5;
  if (wantedYear && candidate.year === wantedYear) score += 4;
  else if (wantedYear && candidate.year && Math.abs(candidate.year - wantedYear) === 1) score += 1;
  return score;
}
function resolveStayOnline(link) {
  return __async(this, null, function* () {
    const page = yield httpGet(link, { "Referer": `${BASE_URL}/` });
    if (!page) return null;
    const idMatch = page.match(/var\s+linkId\s*=\s*"([^"]+)"/);
    const linkId = idMatch ? idMatch[1] : (link.match(/\/l\/([A-Za-z0-9]+)/) || [])[1];
    if (!linkId) return null;
    try {
      const res = yield fetch("https://stayonline.pro/ajax/linkView.php", {
        method: "POST",
        headers: {
          "Origin": "https://stayonline.pro",
          "Referer": link,
          "User-Agent": USER_AGENT,
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        body: `id=${encodeURIComponent(linkId)}&ref=`,
        signal: timeoutSignal(REQUEST_TIMEOUT_MS)
      });
      if (!res.ok) return null;
      const json = yield res.json();
      if (!json || json.status !== "success" || !json.data || !json.data.value) return null;
      return json.data.value;
    } catch (_) {
      return null;
    }
  });
}
function unpackJs(source) {
  const m = source.match(/\}\s*\(\s*'([\s\S]*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]*?)'\s*\.split\('\|'\)/);
  if (!m) return null;
  let payload = m[1];
  const base = parseInt(m[2], 10);
  let count = parseInt(m[3], 10);
  const dictionary = m[4].split("|");
  const encode = (value) => {
    const head = value < base ? "" : encode(Math.floor(value / base));
    const rest = value % base;
    return head + (rest > 35 ? String.fromCharCode(rest + 29) : rest.toString(36));
  };
  while (count--) {
    if (!dictionary[count]) continue;
    payload = payload.replace(new RegExp("\\b" + encode(count) + "\\b", "g"), dictionary[count]);
  }
  return payload;
}
function extractMixDrop(embedUrl) {
  return __async(this, null, function* () {
    const origin = (embedUrl.match(/^https?:\/\/[^/]+/) || [])[0] || "https://mixdrop.ag";
    const html = yield httpGet(embedUrl, { "Referer": `${origin}/` });
    if (!html) return null;
    let wurl = (html.match(/MDCore\.wurl\s*=\s*"([^"]+)"/) || [])[1];
    if (!wurl) {
      const unpacked = unpackJs(html);
      if (unpacked) wurl = (unpacked.match(/MDCore\.wurl\s*=\s*"([^"]+)"/) || [])[1];
    }
    if (!wurl) return null;
    let finalUrl = wurl.trim();
    if (finalUrl.startsWith("//")) finalUrl = "https:" + finalUrl;
    else if (finalUrl.startsWith("/")) finalUrl = origin + finalUrl;
    return {
      url: finalUrl,
      headers: { "User-Agent": USER_AGENT, "Referer": `${origin}/` }
    };
  });
}
function collectLinksWithSection(html) {
  const sections = [];
  let s;
  SECTION_RE.lastIndex = 0;
  while ((s = SECTION_RE.exec(html)) !== null) {
    sections.push({ index: s.index, hd: Boolean(s[1]) });
  }
  const found = [];
  const seen = /* @__PURE__ */ new Set();
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
function toMixDropEmbed(rawUrl) {
  const url = String(rawUrl || "");
  const alias = url.match(/m1xdrop\.net\/f\/([A-Za-z0-9]+)/);
  if (alias) return `https://mixdrop.ag/e/${alias[1]}`;
  const direct = url.match(/mixdrop\.[a-z]+\/[ef]\/([A-Za-z0-9]+)/);
  if (direct) return `https://mixdrop.ag/e/${direct[1]}`;
  return null;
}
function getStreams(id, type, season, episode, providerContext = null) {
  return __async(this, null, function* () {
    BASE_URL = yield resolveLiveDomain("https://cb01uno.blog");
    const normalizedType = String(type || "").toLowerCase();
    if (normalizedType !== "movie") return [];
    const tmdbId = yield resolveTmdbId(id, "movie", providerContext);
    if (!tmdbId) return [];
    const info = yield getMovieInfo(tmdbId, providerContext);
    if (!info || !info.title) return [];
    const queries = [info.title];
    if (info.originalTitle && info.originalTitle !== info.title) queries.push(info.originalTitle);
    let candidates = [];
    const seenCandidateUrls = /* @__PURE__ */ new Set();
    for (const q of queries) {
      const found = yield searchCb01(q);
      for (const c of found) {
        if (seenCandidateUrls.has(c.url)) continue;
        seenCandidateUrls.add(c.url);
        candidates.push(c);
      }
    }
    if (!candidates.length) return [];
    const wantedTitle = normalizeTitle(info.title);
    candidates = candidates.map((c) => Object.assign({}, c, { score: scoreCandidate(c, wantedTitle, info.year) })).filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES);
    if (!candidates.length) return [];
    let pageHtml = null;
    let fallbackHtml = null;
    for (const candidate of candidates) {
      const html = yield httpGet(candidate.url, { "Referer": `${BASE_URL}/` });
      if (!html) continue;
      if (info.imdbId && html.indexOf(info.imdbId) !== -1) {
        pageHtml = html;
        break;
      }
      if (!fallbackHtml && candidate.score >= 10) fallbackHtml = html;
    }
    if (!pageHtml) pageHtml = fallbackHtml;
    if (!pageHtml) return [];
    const links = collectLinksWithSection(pageHtml);
    if (!links.length) return [];
    const resolvedLinks = yield Promise.all(links.map((link) => __async(null, null, function* () {
      try {
        const resolved = yield resolveStayOnline(link.url);
        if (!resolved) return null;
        const embed = toMixDropEmbed(resolved);
        if (!embed) return null;
        const media = yield extractMixDrop(embed);
        if (!media) return null;
        return { link, media };
      } catch (_) {
        return null;
      }
    })));
    const streams = [];
    const seenUrls = /* @__PURE__ */ new Set();
    for (const entry of resolvedLinks) {
      if (!entry || seenUrls.has(entry.media.url)) continue;
      seenUrls.add(entry.media.url);
      const quality = getQualityFromUrl(entry.media.url) || (entry.link.hd ? "1080p" : "720p");
      streams.push({
        name: entry.link.hd ? "CB01 - MixDrop HD" : "CB01 - MixDrop",
        title: info.year ? `${info.title} (${info.year})` : info.title,
        url: entry.media.url,
        headers: entry.media.headers,
        quality,
        type: "direct",
        language: "Italian",
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: entry.media.headers }
        }
      });
    }
    return streams.map((s) => formatStream(s, "CB01")).filter(Boolean);
  });
}
module.exports = { getStreams, collectLinksWithSection };
