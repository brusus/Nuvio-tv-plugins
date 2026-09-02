# Nuvio tv plugins

Raccolta di **provider italiani** per [Nuvio](https://github.com/tapframe/NuvioTV): film, serie TV e anime da diversi siti di streaming, con contenuti in lingua **italiana**.

I plugin girano direttamente nell'app (sul dispositivo) — non serve nessun server.

## Installazione

In Nuvio → sezione **Plugin** → aggiungi repo, incolla questo URL:

```
https://raw.githubusercontent.com/brusus/Nuvio-tv-plugins/refs/heads/main/manifest.json
```

Poi abilita i provider che vuoi usare. Se compare "nessun plugin installato" nonostante l'URL sia giusto, rimuovi e ri-aggiungi il repo (Nuvio a volte tiene in cache un caricamento fallito).

## Provider inclusi

| Provider | Contenuti | Tipi |
|---|---|---|
| **StreamingCommunity** | Film e serie | movie, tv |
| **CinemaCity** | Film e serie | movie, tv |
| **Guardoserie** | Film e serie | movie, tv |
| **AltadefinizioneStreaming** | Film e serie | movie, tv |
| **Cinejoy** | Film e serie (server resolver) | movie, tv |
| **PCC** | Film, serie e anime | movie, tv |
| **CB01** | Solo film (le serie passano da un captcha) | movie |
| **AnimeUnity** | Anime | anime, tv, movie |
| **AnimeWorld** | Anime | anime, tv, movie |
| **AnimeSaturn** | Anime | anime, tv, movie |

## StreamingCommunity — login premium (1080p)

Da anonimo StreamingCommunity funziona ma si ferma a **720p**. Per sbloccare il **1080p** serve un account premium: inserisci le credenziali nelle **impostazioni del plugin** dentro l'app (campi `email` e `password`).

Le credenziali **non** sono scritte nel codice (questo repo è pubblico): vengono lette solo da ciò che inserisci nell'app. Senza login, il provider resta anonimo a 720p.

## Auto-guarigione dei domini

Questi siti cambiano dominio spesso. Un workflow GitHub Actions (`Heal Domains`) gira **ogni ora**: segue i redirect, e se un sito si è spostato aggiorna il dominio nel codice, ricompila i bundle e committa da solo — solo se il nuovo dominio risponde correttamente e il build riesce. In più ogni provider si auto-cura anche a runtime seguendo il redirect.

## Note e limiti

- I provider dietro **Cloudflare** (CinemaCity, Guardoserie e occasionalmente altri) possono essere meno affidabili quando girano solo nell'app, perché il bypass completo di Cloudflare richiede un browser che il motore dei plugin non può eseguire. Gli altri provider funzionano senza problemi.
- Tutti i contenuti sono in **italiano** (`contentLanguage: it`).

## Sviluppo

```bash
npm install
npm run build   # ricompila providers/*.js da src/ con esbuild
```

I sorgenti stanno in `src/<provider>/index.js`; `build.js` li compila nei bundle in `providers/` che il manifest referenzia.

## Crediti

Fork di [realbestia1/easystreams](https://github.com/realbestia1/easystreams), personalizzato e ripulito per l'uso come plugin Nuvio.
