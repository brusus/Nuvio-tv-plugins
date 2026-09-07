# Nuvio tv plugins

Raccolta di provider per [Nuvio](https://github.com/tapframe/NuvioTV): film, serie TV e anime da diversi siti di streaming, in **italiano** e **spagnolo**.

I plugin girano direttamente nell'app (sul dispositivo) — non serve nessun server.

## Installazione

I provider italiani e quelli spagnoli sono **due manifest separati**, cosi' si possono aggiungere/rimuovere in Nuvio come due repo indipendenti invece di abilitare/disabilitare 10 provider alla volta.

In Nuvio → sezione **Plugin** → aggiungi repo, incolla uno o entrambi:

```
# Provider italiani
https://raw.githubusercontent.com/brusus/Nuvio-tv-plugins/refs/heads/main/manifest.json

# Provider Latino (spagnolo)
https://raw.githubusercontent.com/brusus/Nuvio-tv-plugins/refs/heads/main/manifest-latino.json
```

Per vedere solo una lingua alla volta, rimuovi l'altro repo dalla lista — non serve toccare i singoli provider.

Se compare "nessun plugin installato" nonostante l'URL sia giusto, rimuovi e ri-aggiungi il repo (Nuvio a volte tiene in cache un caricamento fallito).

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

### Provider in spagnolo (Latino)

| Provider | Contenuti | Tipi |
|---|---|---|
| **CineCalidad** | Film | movie |
| **Embed69** | Film e serie | movie, tv |
| **Zoowomaniacos** | Film (cinema d'autore) | movie |
| **Xupalace** | Film e serie | movie, tv |
| **SeriesMetro** | Film e serie | movie, tv |
| **PelisSeriesHoy** | Film e serie | movie, tv |
| **Seriesflix** | Serie | tv |
| **Detodopeliculas** | Film e serie | movie, tv |
| **LaMovie** | Film e serie | movie, tv |
| **HackStore** | Film e serie | movie, tv |

Questi 10 provider sono bundle pre-compilati vendorizzati da [KennethJYS/Nuvio-Providers-Latino](https://github.com/KennethJYS/Nuvio-Providers-Latino) (nessuna licenza dichiarata dall'autore originale — crediti completi a lui). Vivono in `providers/latino/` con un manifest proprio (`manifest-latino.json`), separati dai provider italiani: non hanno sorgente in `src/` in questo repo, e invece dell'auto-guarigione dei domini si sincronizzano con l'upstream (vedi sotto).

## StreamingCommunity — login premium (1080p)

Da anonimo StreamingCommunity funziona ma si ferma a **720p**. Per sbloccare il **1080p** serve un account premium: inserisci le credenziali nelle **impostazioni del plugin** dentro l'app (campi `email` e `password`).

Le credenziali **non** sono scritte nel codice (questo repo è pubblico): vengono lette solo da ciò che inserisci nell'app. Senza login, il provider resta anonimo a 720p.

## Auto-guarigione dei domini

Questi siti cambiano dominio spesso. Un workflow GitHub Actions (`Heal Domains`) gira **ogni ora** e fa due cose:

- **Provider italiani**: segue i redirect, e se un sito si è spostato aggiorna il dominio nel codice, ricompila i bundle e committa da solo — solo se il nuovo dominio risponde correttamente e il build riesce. In più ogni provider si auto-cura anche a runtime seguendo il redirect.
- **Provider Latino**: confronta ogni bundle con la versione live sul repo di KennethJYS e, se diversa, la scarica (dominio cambiato, fix, o provider nuovo). Non rimuove mai un provider sparito dall'upstream, solo lo segnala.

## Note e limiti

- I provider dietro **Cloudflare** (CinemaCity, Guardoserie e occasionalmente altri) possono essere meno affidabili quando girano solo nell'app, perché il bypass completo di Cloudflare richiede un browser che il motore dei plugin non può eseguire. Gli altri provider funzionano senza problemi.
- I provider italiani sono in `contentLanguage: it`, quelli Latino in `contentLanguage: es`.

## Sviluppo

```bash
npm install
npm run build   # ricompila providers/*.js da src/ con esbuild
```

I sorgenti stanno in `src/<provider>/index.js`; `build.js` li compila nei bundle in `providers/` che il manifest referenzia.

## Crediti

- Provider italiani: fork di [realbestia1/easystreams](https://github.com/realbestia1/easystreams), personalizzato e ripulito per l'uso come plugin Nuvio.
- Provider Latino (`providers/latino/`): vendorizzati da [KennethJYS/Nuvio-Providers-Latino](https://github.com/KennethJYS/Nuvio-Providers-Latino), crediti completi all'autore originale.
