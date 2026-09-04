// Mediaset Infinity's live streams are Widevine DRM-protected, so unlike RAI
// there's no manifest URL for this scraper to resolve - Nuvio instead opens
// the channel's mediasetinfinity.mediaset.it page directly in an in-app
// WebView, letting Mediaset's own player negotiate its own DRM license (same
// as a real Chrome visit). This scraper exists only so the app's Plugins
// screen can show a Login button that stores the user's Mediaset account
// credentials, matching the pattern used for RaiPlay/RaiPlay Live TV.
async function getStreams() {
  return [];
}

module.exports = { getStreams };
