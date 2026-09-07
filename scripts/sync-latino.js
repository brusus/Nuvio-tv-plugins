// Sincronizzazione dei provider Latino (per GitHub Actions).
//
// I provider in providers/latino/ sono bundle vendorizzati da
// KennethJYS/Nuvio-Providers-Latino: non abbiamo il loro sorgente, solo il
// file gia' compilato, quindi non possiamo applicare la stessa
// auto-guarigione a stringa usata in heal-domains.js (che riscrive
// resolveLiveDomain("...") dentro src/*/index.js).
//
// L'equivalente qui e' sincronizzarsi con l'upstream: se l'autore originale
// aggiorna un bundle (dominio cambiato, fix, nuovo provider), lo prendiamo
// automaticamente confrontando byte a byte. Non ricompila nulla (i bundle
// Latino non passano da esbuild) e non committa: quello lo fa il workflow,
// solo se questo script ha prodotto modifiche.
//
// Vive in manifest-latino.json, separato da manifest.json (solo italiano):
// cosi' in Nuvio i due gruppi si possono aggiungere/rimuovere come repo
// indipendenti, invece di abilitare/disabilitare 10 provider alla volta.
//
// Non rimuove mai un provider sparito dall'upstream: lo segnala soltanto,
// cosi' una rimozione va sempre confermata a mano.

const fs = require('fs');
const path = require('path');

const UPSTREAM_MANIFEST = 'https://raw.githubusercontent.com/KennethJYS/Nuvio-Providers-Latino/refs/heads/main/manifest.json';
const UPSTREAM_PROVIDERS_BASE = 'https://raw.githubusercontent.com/KennethJYS/Nuvio-Providers-Latino/refs/heads/main/providers';

const ROOT = path.join(__dirname, '..');
const LATINO_DIR = path.join(ROOT, 'providers', 'latino');
const MANIFEST = path.join(ROOT, 'manifest-latino.json');
const SUMMARY_FILE = path.join(ROOT, '.heal-summary.txt');

function bumpOurEntry(manifest, id, upsertFields) {
  const target = manifest.scrapers.find(s => s.id === id);
  if (target) {
    const p = String(target.version).split('.');
    p[p.length - 1] = String(Number(p[p.length - 1]) + 1);
    target.version = p.join('.');
    Object.assign(target, upsertFields, { version: target.version });
    return { entry: target, wasNew: false };
  }
  const created = { id, version: '1.0.0', ...upsertFields };
  manifest.scrapers.push(created);
  return { entry: created, wasNew: true };
}

async function main() {
  const manifestRes = await fetch(UPSTREAM_MANIFEST, { headers: { Accept: 'application/json' } });
  if (!manifestRes.ok) throw new Error(`Manifest upstream HTTP ${manifestRes.status}`);
  const upstream = await manifestRes.json();
  const upstreamScrapers = Array.isArray(upstream.scrapers) ? upstream.scrapers : [];

  if (!fs.existsSync(LATINO_DIR)) fs.mkdirSync(LATINO_DIR, { recursive: true });

  const ourManifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const changes = [];
  const seenUpstreamIds = new Set();

  for (const s of upstreamScrapers) {
    if (!s.id || !s.filename) continue;
    seenUpstreamIds.add(s.id);

    const bundleUrl = `${UPSTREAM_PROVIDERS_BASE}/${s.id}.js`;
    const bundleRes = await fetch(bundleUrl);
    if (!bundleRes.ok) {
      console.log(`! ${s.id}: bundle upstream non raggiungibile (HTTP ${bundleRes.status})`);
      continue;
    }
    const bundleText = await bundleRes.text();

    const localFile = path.join(LATINO_DIR, `${s.id}.js`);
    const localText = fs.existsSync(localFile) ? fs.readFileSync(localFile, 'utf8') : null;

    if (localText === bundleText) {
      console.log(`= ${s.id}: invariato`);
      continue;
    }

    fs.writeFileSync(localFile, bundleText);
    const { wasNew } = bumpOurEntry(ourManifest, `latino-${s.id}`, {
      name: s.name,
      description: s.description,
      resources: ['stream'],
      contentLanguage: s.contentLanguage,
      formats: ['mp4', 'm3u8'],
      idPrefixes: ['tt', 'tmdb'],
      filename: `providers/latino/${s.id}.js`,
      supportedTypes: s.supportedTypes,
      enabled: true
    });

    const label = wasNew ? 'nuovo provider' : 'aggiornato';
    console.log(`~ ${s.id}: ${label}`);
    changes.push(`latino/${s.id}: ${label}`);
  }

  const ourLatinoIds = ourManifest.scrapers
    .filter(s => String(s.id).startsWith('latino-'))
    .map(s => s.id.replace(/^latino-/, ''));
  for (const id of ourLatinoIds) {
    if (!seenUpstreamIds.has(id)) {
      console.log(`? ${id}: sparito dal manifest upstream, non rimosso automaticamente (controlla a mano)`);
    }
  }

  if (!changes.length) {
    console.log('\nNessun aggiornamento dai provider Latino.');
    return;
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(ourManifest, null, 2) + '\n');
  console.log('\nProvider Latino aggiornati:\n' + changes.map(c => '  ' + c).join('\n'));

  const existingSummary = fs.existsSync(SUMMARY_FILE) ? fs.readFileSync(SUMMARY_FILE, 'utf8') : '';
  fs.writeFileSync(SUMMARY_FILE, existingSummary + changes.join('\n') + '\n');
}

main().catch(e => { console.error(e); process.exit(1); });
