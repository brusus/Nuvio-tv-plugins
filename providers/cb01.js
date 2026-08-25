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

// src/cb01/index.js
var { formatStream } = require_formatter();
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var BASE_URL = "https://cb01uno.monster";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var REQUEST_TIMEOUT_MS = 15e3;
var MAX_CANDIDATES = 5;
var STAYONLINE_RE = /https?:\/\/stayonline\.pro\/l\/[A-Za-z0-9]+\/?/g;
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
    const normalizedType = String(type || "").toLowerCase();
    if (normalizedType !== "movie") return [];
    const tmdbId = yield resolveTmdbId(id, "movie", providerContext);
    if (!tmdbId) return [];
    const info = yield getMovieInfo(tmdbId, providerContext);
    if (!info || !info.title) return [];
    const queries = [info.title];
    if (info.originalTitle && info.originalTitle !== info.title) queries.push(info.originalTitle);
    let candidates = [];
    for (const q of queries) {
      candidates = yield searchCb01(q);
      if (candidates.length) break;
    }
    if (!candidates.length) return [];
    const wantedTitle = normalizeTitle(info.title);
    candidates = candidates.map((c) => Object.assign({}, c, { score: scoreCandidate(c, wantedTitle, info.year) })).filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES);
    if (!candidates.length) return [];
    let pageHtml = null;
    for (const candidate of candidates) {
      const html = yield httpGet(candidate.url, { "Referer": `${BASE_URL}/` });
      if (!html) continue;
      if (info.imdbId && html.indexOf(info.imdbId) !== -1) {
        pageHtml = html;
        break;
      }
      if (!info.imdbId && candidate.score >= 10) {
        pageHtml = html;
        break;
      }
    }
    if (!pageHtml) return [];
    const links = Array.from(new Set(pageHtml.match(STAYONLINE_RE) || []));
    if (!links.length) return [];
    const streams = [];
    for (const link of links) {
      const resolved = yield resolveStayOnline(link);
      if (!resolved) continue;
      const embed = toMixDropEmbed(resolved);
      if (!embed) continue;
      const media = yield extractMixDrop(embed);
      if (!media) continue;
      if (streams.some((s) => s.url === media.url)) continue;
      streams.push({
        name: "CB01 - MixDrop",
        title: info.year ? `${info.title} (${info.year})` : info.title,
        url: media.url,
        headers: media.headers,
        quality: "unknown",
        type: "direct",
        language: "Italian",
        behaviorHints: {
          notWebReady: true,
          proxyHeaders: { request: media.headers }
        }
      });
    }
    return streams.map((s) => formatStream(s, "CB01")).filter(Boolean);
  });
}
module.exports = { getStreams };
