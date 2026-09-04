const { getRaiLiveStream } = require('../official_vod.js');

// Live channels aren't tied to TMDB/IMDb ids - the app requests them with a
// synthetic "raitv:<slug>" id (e.g. "raitv:rai1"), where <slug> matches the
// channel's raiplay.it/dirette/<slug> path.
async function getStreams(id) {
  const slug = String(id || '').replace(/^raitv:/i, '');
  return getRaiLiveStream(slug);
}

module.exports = { getStreams };
