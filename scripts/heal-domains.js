// Aggiornamento automatico dei domini dei provider (per GitHub Actions).
//
// Per ogni provider con auto-guarigione, prende il dominio corrente (l'argomento
// di resolveLiveDomain("...")), segue il redirect e, se il sito si e' spostato
// (host finale diverso + risposta ok), riscrive il dominio nel sorgente e alza
// la versione nel manifest. Non ricompila e non committa: quello lo fa il
// workflow, solo se questo script ha prodotto modifiche.
//
// Il provider 'cc' usa un default base64 (resolveLiveDomain(CC_DEFAULT)), quindi
// non ha un literal e viene naturalmente ignorato: va aggiornato a mano.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const MANIFEST = path.join(__dirname, '..', 'manifest.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Estrae il dominio corrente da: resolveLiveDomain("https://...")
const CALL_RE = /resolveLiveDomain\(\s*["'](https?:\/\/[^"']+)["']\s*\)/;

function hostOf(u) {
  try { return new URL(u).host; } catch (_) { return null; }
}

async function liveOrigin(start) {
  try {
    const res = await fetch(start.replace(/\/+$/, '') + '/', {
      headers: { 'User-Agent': UA, 'Accept-Language': 'it-IT,it;q=0.9' }
    });
    if (res && res.body && typeof res.body.cancel === 'function') res.body.cancel().catch(() => {});
    if (res && res.ok && res.url) return new URL(res.url).origin;
    return null;
  } catch (_) {
    return null;
  }
}

function bumpManifestVersion(providerDir) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const target = `providers/${providerDir}.js`;
  let bumped = null;
  for (const sc of manifest.scrapers) {
    if (sc.filename === target) {
      const p = String(sc.version).split('.');
      p[p.length - 1] = String(Number(p[p.length - 1]) + 1);
      sc.version = p.join('.');
      bumped = sc.version;
    }
  }
  if (bumped) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  return bumped;
}

async function main() {
  const dirs = fs.readdirSync(SRC, { withFileTypes: true }).filter(d => d.isDirectory());
  const changes = [];

  for (const d of dirs) {
    const file = path.join(SRC, d.name, 'index.js');
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const m = src.match(CALL_RE);
    if (!m) continue; // niente literal (es. cc/base64) o niente auto-guarigione

    const current = m[1].replace(/\/+$/, '');
    const startHost = hostOf(current);
    const origin = await liveOrigin(current);
    const newHost = hostOf(origin || '');

    if (!origin || !newHost || newHost === startHost) {
      console.log(`= ${d.name}: ${startHost} invariato`);
      continue;
    }

    // Sostituisce OGNI occorrenza del vecchio dominio nel file (dichiarazione
    // della variabile + argomento di resolveLiveDomain).
    const updated = src.split(current).join(origin.replace(/\/+$/, ''));
    fs.writeFileSync(file, updated);
    const ver = bumpManifestVersion(d.name);
    console.log(`~ ${d.name}: ${startHost} -> ${newHost}  (manifest v${ver || '?'})`);
    changes.push(`${d.name}: ${current} -> ${origin.replace(/\/+$/, '')}`);
  }

  if (!changes.length) {
    console.log('\nNessun dominio spostato.');
  } else {
    console.log('\nDomini aggiornati:\n' + changes.map(c => '  ' + c).join('\n'));
    // Riga di changelog per il messaggio di commit del workflow.
    fs.writeFileSync(path.join(__dirname, '..', '.heal-summary.txt'), changes.join('\n') + '\n');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
