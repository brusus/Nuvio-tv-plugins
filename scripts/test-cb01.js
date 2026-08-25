// Prove manuali del provider CB01. Non fa parte della build.
//   node scripts/test-cb01.js            -> test offline del parsing delle sezioni
//   node scripts/test-cb01.js tt35224721 -> prova end-to-end (richiede rete non bloccata)
const { getStreams, collectLinksWithSection } = require('../src/cb01/index.js');

// Frammento reale dalla scheda di un film su cb01uno.monster
const HTML = `
<table class="cbtable" width="100%" bgcolor="#F7F7F7">
<tr><td valign="top">
<table class="tableinside"><tr><td><u><strong>Streaming:</strong></u></td></tr></table>
<table class="tableinside"><tr><td><a href="https://uprot.net/msf/6p17q6cvh3vv" target="_blank">Maxstream</a></td></tr></table>
<table class="tableinside"><tr><td><a href="https://stayonline.pro/l/n0lZK/" target="_blank">Mixdrop</a></td></tr></table>
<table class="cbtable" height="30"><tr><td valign="bottom"><u><strong>Streaming HD:</strong></u></td></tr></table>
<table class="tableinside"><tr><td><a href="https://uprot.net/msf/k7h5kabc" target="_blank">Maxstream</a></td></tr></table>
<table class="tableinside"><tr><td><a href="https://stayonline.pro/l/ZZ9qW/" target="_blank">Mixdrop</a></td></tr></table>
</td></tr></table>`;

function testParsing() {
  const links = collectLinksWithSection(HTML);
  console.log('--- parsing sezioni (offline) ---');
  console.log('link stayonline trovati: ' + links.length + ' (attesi 2)');
  links.forEach(l => console.log('  ' + (l.hd ? 'HD ' : 'SD ') + l.url));

  const ok = links.length === 2
    && links[0].url.indexOf('n0lZK') !== -1 && links[0].hd === false
    && links[1].url.indexOf('ZZ9qW') !== -1 && links[1].hd === true;
  console.log(ok ? 'ESITO: OK' : 'ESITO: FALLITO');
  // i link uprot devono essere ignorati
  console.log(links.some(l => l.url.indexOf('uprot') !== -1) ? 'ATTENZIONE: uprot incluso' : 'uprot correttamente escluso');
}

(async () => {
  testParsing();
  const imdbId = process.argv[2];
  if (!imdbId) return;
  console.log('\n--- end-to-end ' + imdbId + ' ---');
  const streams = await getStreams(imdbId, 'movie', null, null, null);
  console.log('flussi: ' + streams.length);
  streams.forEach((s, i) => {
    console.log('[' + i + '] ' + s.name + ' | ' + s.qualityTag + ' | ' + String(s.url).slice(0, 70));
  });
})();
