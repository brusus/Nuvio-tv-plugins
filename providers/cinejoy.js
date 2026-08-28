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
    var USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
    function checkQualityFromText2(text) {
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
          if (!finalHeaders["User-Agent"]) finalHeaders["User-Agent"] = USER_AGENT;
          const timeoutConfig = createTimeoutSignal(3e3);
          try {
            const response = yield fetch(url, {
              headers: finalHeaders,
              signal: timeoutConfig.signal
            });
            if (!response.ok) return null;
            const text = yield response.text();
            if (!text.startsWith("#EXTM3U")) return null;
            const quality = checkQualityFromText2(text);
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
    function getQualityFromUrl(url) {
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
      getQualityFromUrl,
      checkQualityFromText: checkQualityFromText2
    };
  }
});

// src/cinejoy/index.js
var { formatStream } = require_formatter();
var { resolveLiveDomain } = require_domain_helper();
var { checkQualityFromText } = require_quality_helper();
var IS_SERVER = typeof process !== "undefined" && process.versions && process.versions.node;
if (!IS_SERVER) {
  module.exports = {
    getStreams: (id, type, season, episode) => __async(null, null, function* () {
      try {
        const params = new URLSearchParams({
          id: String(id || ""),
          type: String(type || ""),
          s: String(season || 1),
          ep: String(episode || 1)
        });
        const response = yield fetch(`https://easystreams.realbestia.com/resolve/cinejoy?${params}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = yield response.json();
        return Array.isArray(data == null ? void 0 : data.streams) ? data.streams : [];
      } catch (error) {
        console.error("[Cinejoy-Client] API Error:", error.message);
        return [];
      }
    })
  };
} else {
  let setDiagnostics = function(stage, details = {}) {
    lastDiagnostics = __spreadValues({
      stage,
      at: (/* @__PURE__ */ new Date()).toISOString()
    }, details);
    const summary = Object.entries(details).filter(([, value]) => value !== void 0 && value !== null).map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(",") : value}`).join(" ");
    console.log(`[Cinejoy] ${stage}${summary ? ` ${summary}` : ""}`);
  }, getDiagnostics = function() {
    return __spreadValues({}, lastDiagnostics);
  }, fetchWithTimeout = function(url, options = {}, timeoutMs = 5e3) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, __spreadProps(__spreadValues({}, options), { provider: "cinejoy", signal: controller.signal })).finally(() => clearTimeout(timer));
  }, resolveTmdbId = function(id, providerContext = null) {
    const contextId = String((providerContext == null ? void 0 : providerContext.tmdbId) || "").trim();
    if (/^\d+$/.test(contextId)) return contextId;
    const rawId = String(id || "").trim();
    const prefixedId = rawId.match(/^tmdb:(\d+)$/i);
    if (prefixedId) return prefixedId[1];
    if (/^\d+$/.test(rawId)) return rawId;
    return null;
  }, getTitleHint = function(providerContext) {
    const hints = [
      ...Array.isArray(providerContext == null ? void 0 : providerContext.titleHints) ? providerContext.titleHints : [],
      ...Array.isArray(providerContext == null ? void 0 : providerContext.mappedTitleHints) ? providerContext.mappedTitleHints : []
    ];
    return hints.map((value) => String(value || "").trim()).find(Boolean) || null;
  }, parseHlsAttributes = function(value) {
    const attributes = {};
    const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
    let match;
    while ((match = regex.exec(value)) !== null) {
      attributes[match[1]] = match[2].replace(/^"|"$/g, "");
    }
    return attributes;
  }, normalizeQuality = function(height) {
    const value = Number.parseInt(height, 10);
    if (!Number.isInteger(value)) return null;
    if (value >= 2160) return "4K";
    if (value >= 1440) return "1440p";
    if (value >= 1080) return "1080p";
    if (value >= 720) return "720p";
    if (value >= 480) return "480p";
    if (value >= 360) return "360p";
    return "240p";
  }, resolvePlaylistUrl = function(value, baseUrl) {
    try {
      return new URL(String(value || "").trim(), baseUrl || void 0).toString();
    } catch (e) {
      return String(value || "").trim();
    }
  }, inspectHlsMaster = function(text, baseUrl = "") {
    var _a;
    const audioLanguages = [];
    const audioSeen = /* @__PURE__ */ new Set();
    const qualities = [];
    const qualitySeen = /* @__PURE__ */ new Set();
    const variants = [];
    let pendingVariant = null;
    for (const line of String(text || "").split(/\r?\n/)) {
      const trimmedLine = line.trim();
      if (line.startsWith("#EXT-X-MEDIA:") && /TYPE=AUDIO/i.test(line)) {
        const attributes = parseHlsAttributes(line.slice("#EXT-X-MEDIA:".length));
        const language = String(attributes.LANGUAGE || "").trim().toLowerCase();
        const name = String(attributes.NAME || language).trim();
        const label = language === "it" ? "Italian" : name || language;
        const key = label.toLowerCase();
        if (key && !audioSeen.has(key)) {
          audioSeen.add(key);
          audioLanguages.push(label);
        }
      }
      if (line.startsWith("#EXT-X-STREAM-INF:")) {
        const attributes = parseHlsAttributes(line.slice("#EXT-X-STREAM-INF:".length));
        const height = (_a = String(attributes.RESOLUTION || "").match(/x(\d+)$/i)) == null ? void 0 : _a[1];
        const quality = normalizeQuality(height);
        pendingVariant = { attributes, height: Number.parseInt(height || "", 10) || 0, quality };
        if (quality && !qualitySeen.has(quality)) {
          qualitySeen.add(quality);
          qualities.push(quality);
        }
        continue;
      }
      if (pendingVariant && trimmedLine && !trimmedLine.startsWith("#")) {
        variants.push(__spreadProps(__spreadValues({}, pendingVariant), {
          url: resolvePlaylistUrl(trimmedLine, baseUrl)
        }));
        pendingVariant = null;
      }
    }
    const qualityRank = { "4K": 0, "1440p": 1, "1080p": 2, "720p": 3, "480p": 4, "360p": 5, "240p": 6 };
    qualities.sort((a, b) => qualityRank[a] - qualityRank[b]);
    const bestVariant = variants.filter((variant) => variant.quality || variant.height > 0).sort((a, b) => {
      var _a2, _b;
      return ((_a2 = qualityRank[a.quality]) != null ? _a2 : 99) - ((_b = qualityRank[b.quality]) != null ? _b : 99);
    })[0];
    return {
      audioLanguages,
      qualities,
      quality: qualities[0] || checkQualityFromText(text) || null,
      videoUrl: (bestVariant == null ? void 0 : bestVariant.url) || String(baseUrl || "").trim()
    };
  }, encodeBase64Url = function(value) {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }, buildVixsrcAudioUrl = function(mediaRequest) {
    var _a, _b, _c;
    const tmdbId = String(((_a = mediaRequest == null ? void 0 : mediaRequest.payload) == null ? void 0 : _a.tmdb) || "").trim();
    if (!tmdbId) return "";
    if ((mediaRequest == null ? void 0 : mediaRequest.path) === "movie") {
      return `https://vixsrc.to/movie/${encodeURIComponent(tmdbId)}`;
    }
    const season = String(((_b = mediaRequest == null ? void 0 : mediaRequest.payload) == null ? void 0 : _b.season) || "").trim();
    const episode = String(((_c = mediaRequest == null ? void 0 : mediaRequest.payload) == null ? void 0 : _c.episode) || "").trim();
    if (!season || !episode) return "";
    return `https://vixsrc.to/tv/${encodeURIComponent(tmdbId)}/${encodeURIComponent(season)}/${encodeURIComponent(episode)}`;
  }, buildDualFallbackUrl = function(providerContext, videoUrl, mediaRequest, cacheInfo = {}) {
    const proxyUrl = String((providerContext == null ? void 0 : providerContext.proxyUrl) || "").trim().replace(/\/+$/, "");
    const audioUrl = buildVixsrcAudioUrl(mediaRequest);
    if (!proxyUrl || !audioUrl || !videoUrl) return "";
    const descriptorPayload = {
      video: { url: videoUrl },
      audio: { extractor: "vixsrc", d: audioUrl },
      audio_lang: "ita",
      resolution: Number(cacheInfo.resolution) || 2160
    };
    if (mediaRequest == null ? void 0 : mediaRequest.mediaKey) descriptorPayload.media_key = mediaRequest.mediaKey;
    if (cacheInfo.mediaKey) descriptorPayload.media_key = cacheInfo.mediaKey;
    if (cacheInfo.videoFingerprint) descriptorPayload.video_fingerprint = cacheInfo.videoFingerprint;
    const descriptor = encodeBase64Url(descriptorPayload);
    const params = new URLSearchParams({ d: descriptor });
    const password = String((providerContext == null ? void 0 : providerContext.proxyPassword) || "").trim();
    if (password) params.set("api_password", password);
    return `${proxyUrl}/dual/menifest.m3u8?${params.toString()}`;
  }, getMediaRequest = function(type, tmdbId, season, episode) {
    const isMovie = type === "movie";
    return {
      path: isMovie ? "movie" : "series",
      payload: isMovie ? { tmdb: tmdbId } : { tmdb: tmdbId, season: String(season), episode: String(episode) }
    };
  }, buildDualMediaKey = function(rawId, mediaRequest, season, episode) {
    const mediaType = (mediaRequest == null ? void 0 : mediaRequest.path) === "movie" ? "movie" : "series";
    const sourceId = String(rawId || "").split(":", 1)[0].trim();
    const mediaSeason = mediaType === "movie" ? 0 : Number(season) || 0;
    const mediaEpisode = mediaType === "movie" ? 0 : Number(episode) || 0;
    return sourceId ? `${mediaType}:${sourceId}:${mediaSeason}:${mediaEpisode}` : "";
  }, buildDualVideoFingerprint = function(server, playlist) {
    let path = String(playlist || "").trim();
    try {
      path = new URL(path).pathname;
    } catch (e) {
    }
    const stable = `cinejoy|${String((server == null ? void 0 : server.name) || "").trim().toLowerCase()}|${path}`;
    return createHash("sha1").update(stable).digest("hex").slice(0, 20);
  };
  setDiagnostics2 = setDiagnostics, getDiagnostics2 = getDiagnostics, fetchWithTimeout2 = fetchWithTimeout, resolveTmdbId2 = resolveTmdbId, getTitleHint2 = getTitleHint, parseHlsAttributes2 = parseHlsAttributes, normalizeQuality2 = normalizeQuality, resolvePlaylistUrl2 = resolvePlaylistUrl, inspectHlsMaster2 = inspectHlsMaster, encodeBase64Url2 = encodeBase64Url, buildVixsrcAudioUrl2 = buildVixsrcAudioUrl, buildDualFallbackUrl2 = buildDualFallbackUrl, getMediaRequest2 = getMediaRequest, buildDualMediaKey2 = buildDualMediaKey, buildDualVideoFingerprint2 = buildDualVideoFingerprint;
  const { webcrypto, createHash } = require("crypto");
  let BASE_URL = "https://cinejoy.to";
  const API_URL = "https://api.shegu.st";
  const WASM_URL = `${API_URL}/crush.wasm`;
  const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
  const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";
  const BROWSER_HEADERS = {
    Accept: "application/json, text/plain, */*",
    Origin: BASE_URL,
    Referer: `${BASE_URL}/`,
    "User-Agent": USER_AGENT
  };
  const REQUEST_HEADER = __spreadProps(__spreadValues({}, BROWSER_HEADERS), {
    Accept: "*/*",
    "Content-Type": "text/plain;charset=UTF-8"
  });
  let wasmExportsPromise = null;
  let serversCache = null;
  let serversCacheAt = 0;
  const titleCache = /* @__PURE__ */ new Map();
  let lastDiagnostics = { stage: "idle", at: null };
  function getWasmExports() {
    return __async(this, null, function* () {
      if (!wasmExportsPromise) {
        wasmExportsPromise = fetchWithTimeout(WASM_URL, {}, 8e3).then((response) => {
          if (!response.ok) throw new Error(`Cinejoy WASM HTTP ${response.status}`);
          return response.arrayBuffer();
        }).then((bytes) => WebAssembly.instantiate(bytes, {})).then(({ instance }) => instance.exports).catch((error) => {
          wasmExportsPromise = null;
          throw error;
        });
      }
      return wasmExportsPromise;
    });
  }
  function sealRequest(payload) {
    return __async(this, null, function* () {
      const wasm = yield getWasmExports();
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
          throw new Error("Cinejoy request sealing failed");
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
    });
  }
  function openResponse(responseBytes, request) {
    return __async(this, null, function* () {
      if (responseBytes.length < 28) throw new Error("Cinejoy response too short");
      const encoder = new TextEncoder();
      const additionalData = new Uint8Array([
        ...encoder.encode("lumen-gate-v2"),
        0,
        2,
        request.keyId,
        ...request.ephemeralPublic
      ]);
      const cryptoKey = yield webcrypto.subtle.importKey(
        "raw",
        request.responseKey,
        "AES-GCM",
        false,
        ["decrypt"]
      );
      const plaintext = yield webcrypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: responseBytes.slice(0, 12),
          additionalData,
          tagLength: 128
        },
        cryptoKey,
        responseBytes.slice(12)
      );
      const result = JSON.parse(new TextDecoder().decode(plaintext));
      if (!result || typeof result.status !== "number" || !("data" in result)) {
        throw new Error("Invalid Cinejoy response");
      }
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Cinejoy API HTTP ${result.status}`);
      }
      return result.data;
    });
  }
  function encryptedRequest(path, payload) {
    return __async(this, null, function* () {
      const request = yield sealRequest({ path, payload });
      const response = yield fetchWithTimeout(`${API_URL}/g`, {
        method: "POST",
        headers: REQUEST_HEADER,
        body: request.body
      }, 8e3);
      const responseBytes = new Uint8Array(yield response.arrayBuffer());
      if (!response.ok) throw new Error(`Cinejoy gateway HTTP ${response.status}`);
      return openResponse(responseBytes, request);
    });
  }
  function getServers() {
    return __async(this, null, function* () {
      if (serversCache && Date.now() - serversCacheAt < 5 * 60 * 1e3) return serversCache;
      const response = yield fetchWithTimeout(`${API_URL}/servers`, {
        headers: BROWSER_HEADERS
      }, 8e3);
      if (!response.ok) throw new Error(`Cinejoy servers HTTP ${response.status}`);
      const payload = yield response.json();
      const servers = Array.isArray(payload) ? payload : payload == null ? void 0 : payload.servers;
      if (!Array.isArray(servers)) throw new Error("Invalid Cinejoy servers response");
      serversCache = servers.filter((server) => (server == null ? void 0 : server.name) && server.status === "ok");
      serversCacheAt = Date.now();
      return serversCache;
    });
  }
  function resolveMediaTitle(tmdbId, type, providerContext = null) {
    return __async(this, null, function* () {
      const hintedTitle = getTitleHint(providerContext);
      if (hintedTitle) return hintedTitle;
      const endpoint = type === "movie" ? "movie" : "tv";
      const cacheKey = `${endpoint}:${tmdbId}`;
      if (titleCache.has(cacheKey)) return titleCache.get(cacheKey);
      try {
        const response = yield fetchWithTimeout(
          `https://api.themoviedb.org/3/${endpoint}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}&language=it-IT`,
          {},
          3e3
        );
        if (response.ok) {
          const payload = yield response.json();
          const title = (payload == null ? void 0 : payload.title) || (payload == null ? void 0 : payload.name) || (payload == null ? void 0 : payload.original_title) || (payload == null ? void 0 : payload.original_name) || null;
          titleCache.set(cacheKey, title);
          return title;
        }
      } catch (e) {
      }
      titleCache.set(cacheKey, null);
      return null;
    });
  }
  function inspectPlaylist(url, headers) {
    return __async(this, null, function* () {
      let lastError = null;
      for (const requestHeaders of [headers, void 0]) {
        try {
          const response = yield fetchWithTimeout(
            url,
            requestHeaders ? { headers: requestHeaders } : {},
            1e4
          );
          if (!response.ok) {
            lastError = new Error(`Cinejoy playlist HTTP ${response.status}`);
            continue;
          }
          const finalUrl = String(response.url || url);
          return inspectHlsMaster(yield response.text(), finalUrl);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error("Cinejoy playlist check failed");
    });
  }
  function getServerStreams(_0, _1, _2) {
    return __async(this, arguments, function* (server, mediaRequest, title, providerContext = null, { dualOnly = false } = {}) {
      const data = yield encryptedRequest(`/${server.name}/${mediaRequest.path}`, mediaRequest.payload);
      const entries = Array.isArray(data == null ? void 0 : data.stream) ? data.stream : [];
      setDiagnostics("stream_response", { server: server.name, entries: entries.length });
      const headers = { Referer: `${BASE_URL}/`, "User-Agent": USER_AGENT };
      const inspectedEntries = (yield Promise.all(entries.map((entry) => __async(null, null, function* () {
        const playlist = String((entry == null ? void 0 : entry.playlist) || "").trim();
        if (!/^https?:\/\/[^\s]+\.m3u8(?:[?#].*)?$/i.test(playlist)) {
          setDiagnostics("invalid_playlist", { server: server.name });
          return null;
        }
        let playlistInfo = null;
        try {
          playlistInfo = yield inspectPlaylist(playlist, headers);
        } catch (error) {
          setDiagnostics("playlist_check_failed", { server: server.name, error: error.message });
          playlistInfo = null;
        }
        const quality = (playlistInfo == null ? void 0 : playlistInfo.quality) || (server["4k"] === true ? "4K" : "Unknown");
        const audioLanguages = (playlistInfo == null ? void 0 : playlistInfo.audioLanguages) || [];
        const availableQualities = (playlistInfo == null ? void 0 : playlistInfo.qualities) || [];
        const selectedVideoUrl = (playlistInfo == null ? void 0 : playlistInfo.videoUrl) || playlist;
        const hasItalianAudio = audioLanguages.some((language) => /\bitalian\b/i.test(language));
        setDiagnostics("playlist_checked", {
          server: server.name,
          quality,
          audioTracks: audioLanguages.length,
          italian: hasItalianAudio
        });
        if (!hasItalianAudio) {
          setDiagnostics("playlist_rejected_no_italian", {
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
      })))).filter(Boolean);
      const directStreams = dualOnly ? [] : inspectedEntries.filter((entry) => entry.hasItalianAudio).map((entry) => {
        const normalizedQuality = entry.quality === "4K" ? "2160p" : entry.quality;
        return formatStream({
          name: "Cinejoy",
          title,
          url: entry.playlist,
          quality: normalizedQuality,
          language: "Italian",
          audioLanguages: entry.audioLanguages,
          availableQualities: entry.availableQualities,
          type: "hls"
          // Cinejoy accepts direct HLS requests. Do not expose headers here:
          // Stremio's local HLS proxy corrupts the child playlist URLs.
        }, "Cinejoy");
      }).filter(Boolean);
      const hasDirect4KItalian = inspectedEntries.some(
        (entry) => entry.hasItalianAudio && entry.quality === "4K"
      );
      if (!dualOnly && hasDirect4KItalian) return directStreams;
      const fourKPlaylist = inspectedEntries.find((entry) => entry.quality === "4K");
      const dualCache = fourKPlaylist ? {
        mediaKey: mediaRequest.mediaKey || "",
        resolution: 2160,
        videoFingerprint: buildDualVideoFingerprint(server, fourKPlaylist.playlist)
      } : null;
      const dualUrl = buildDualFallbackUrl(
        providerContext,
        fourKPlaylist == null ? void 0 : fourKPlaylist.playlist,
        mediaRequest,
        dualCache || {}
      );
      if (dualUrl) {
        setDiagnostics("dual_4k_fallback", {
          server: server.name,
          audio: "vixsrc/ita"
        });
        directStreams.push(formatStream({
          name: "Cinejoy DUAL",
          title,
          url: dualUrl,
          quality: "2160p",
          language: "Italian",
          audioLanguages: ["Italian"],
          availableQualities: ["4K"],
          type: "hls",
          cinejoyDualFallback: true,
          dualCache,
          behaviorHints: { notWebReady: false }
        }, "Cinejoy"));
      }
      return directStreams.filter(Boolean);
    });
  }
  function getStreams(id, type, season, episode, providerContext = null) {
    return __async(this, null, function* () {
      BASE_URL = yield resolveLiveDomain("https://cinejoy.to");
      setDiagnostics("start", { id: String(id || ""), type: String(type || "") });
      const normalizedType = String(type || "").toLowerCase();
      if (!["movie", "tv", "series"].includes(normalizedType)) return [];
      const tmdbId = resolveTmdbId(id, providerContext);
      if (!tmdbId) {
        setDiagnostics("invalid_tmdb_id");
        return [];
      }
      const isMovie = normalizedType === "movie";
      const effectiveSeason = Number.parseInt(String(season || ""), 10) || 1;
      const effectiveEpisode = Number.parseInt(String(episode || ""), 10) || 1;
      const mediaRequest = getMediaRequest(isMovie ? "movie" : "series", tmdbId, effectiveSeason, effectiveEpisode);
      mediaRequest.mediaKey = buildDualMediaKey(id, mediaRequest, effectiveSeason, effectiveEpisode);
      const mediaTitle = yield resolveMediaTitle(tmdbId, isMovie ? "movie" : "tv", providerContext);
      const baseTitle = mediaTitle || (isMovie ? "Film" : "Serie TV");
      const title = isMovie ? baseTitle : `${baseTitle} ${effectiveSeason}x${effectiveEpisode}`;
      let servers;
      try {
        servers = yield getServers();
        setDiagnostics("servers_loaded", { count: servers.length });
      } catch (error) {
        console.warn(`[Cinejoy] Server list failed: ${error.message}`);
        setDiagnostics("servers_failed", { error: error.message });
        return [];
      }
      const primaryServer = servers.find((server) => server["4k"] === true) || servers[0];
      if (!primaryServer) {
        setDiagnostics("no_primary_server");
        return [];
      }
      setDiagnostics("primary_server", { server: primaryServer.name });
      let streams = [];
      let primaryServerFailed = false;
      try {
        streams = yield getServerStreams(primaryServer, mediaRequest, title, providerContext);
      } catch (error) {
        primaryServerFailed = true;
        console.warn(`[Cinejoy] ${primaryServer.name} extraction failed: ${error.message}`);
        setDiagnostics("extraction_failed", { server: primaryServer.name, error: error.message });
      }
      const hasDirect4KItalian = streams.some(
        (stream) => !(stream == null ? void 0 : stream.cinejoyDualFallback) && String((stream == null ? void 0 : stream.quality) || "").toLowerCase() === "2160p"
      );
      const hasDualFallback = streams.some((stream) => (stream == null ? void 0 : stream.cinejoyDualFallback) === true);
      if (!hasDirect4KItalian && !hasDualFallback && (providerContext == null ? void 0 : providerContext.proxyUrl)) {
        for (const server of servers) {
          if (!primaryServerFailed && server === primaryServer) continue;
          try {
            const fallbackStreams = yield getServerStreams(
              server,
              mediaRequest,
              title,
              providerContext,
              { dualOnly: true }
            );
            const dualFallback = fallbackStreams.find((stream) => (stream == null ? void 0 : stream.cinejoyDualFallback) === true);
            if (dualFallback) {
              streams.push(dualFallback);
              setDiagnostics("dual_4k_fallback_server", { server: server.name });
              break;
            }
          } catch (error) {
            console.warn(`[Cinejoy] ${server.name} DUAL fallback skipped: ${error.message}`);
            setDiagnostics("dual_fallback_server_failed", {
              server: server.name,
              error: error.message
            });
          }
        }
      }
      if (streams.length > 0) setDiagnostics("ok", { streams: streams.length });
      return streams;
    });
  }
  module.exports = { getStreams, getDiagnostics };
}
var setDiagnostics2;
var getDiagnostics2;
var fetchWithTimeout2;
var resolveTmdbId2;
var getTitleHint2;
var parseHlsAttributes2;
var normalizeQuality2;
var resolvePlaylistUrl2;
var inspectHlsMaster2;
var encodeBase64Url2;
var buildVixsrcAudioUrl2;
var buildDualFallbackUrl2;
var getMediaRequest2;
var buildDualMediaKey2;
var buildDualVideoFingerprint2;
