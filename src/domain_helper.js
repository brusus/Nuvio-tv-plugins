// Auto-guarigione del dominio.
//
// Questi siti cambiano indirizzo spesso e, di norma, il vecchio dominio
// redirige al nuovo. resolveLiveDomain parte dall'ultimo dominio noto, segue
// il redirect e restituisce l'indirizzo di arrivo, che il provider usa poi per
// tutte le richieste. Cosi' i cambi di tipo "SPOSTATO" si correggono da soli,
// senza ricompilare o aggiornare il codice a mano.
//
// Limite: un dominio morto SENZA redirect non e' risolvibile (non c'e' un nuovo
// indirizzo da seguire): in quel caso si resta sul dominio noto.
//
// Il risultato e' cachato per processo e per dominio di partenza, quindi una
// sola richiesta extra a getStreams, non una per ogni pagina.

const DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const _cache = new Map(); // dominio di partenza -> Promise<dominio vivo>

async function resolveLiveDomain(startUrl, userAgent) {
  const start = String(startUrl || '').replace(/\/+$/, '');
  if (!start) return start;
  if (_cache.has(start)) return await _cache.get(start);

  const p = (async () => {
    try {
      const res = await fetch(start + '/', {
        headers: {
          'User-Agent': userAgent || DEFAULT_UA,
          'Accept-Language': 'it-IT,it;q=0.9'
        }
      });
      // Serve solo l'URL finale dopo i redirect: il corpo si scarta.
      if (res && res.body && typeof res.body.cancel === 'function') {
        res.body.cancel().catch(() => {});
      }
      if (res && res.ok && res.url) {
        const origin = new URL(res.url).origin;
        if (origin && origin !== start) {
          console.log('[domain] spostato: ' + start + ' -> ' + origin);
        }
        return origin || start;
      }
      return start;
    } catch (_) {
      return start; // dominio irraggiungibile: si resta sul noto
    }
  })();

  _cache.set(start, p);
  return await p;
}

module.exports = { resolveLiveDomain };
