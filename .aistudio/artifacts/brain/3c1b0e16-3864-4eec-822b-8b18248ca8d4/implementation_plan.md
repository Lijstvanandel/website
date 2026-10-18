# Masterplan: High-Speed Rendering, Server-Side Caching & Cloudflare CDN

Dit masterplan lost de structurele vertragingsknelpunten uit de VPS-laadtijden definitief op door over te stappen op een **Server-Side Snapshot Cache**, **vooraf op schijf gegenereerde statische videothumbnails (WebP/JPG)**, **directe injectie van de hoofdstructuur bij de eerste laadbeurt** en **Cloudflare CDN-optimalisatie**, inclusief een directe knop in het Admin Dashboard om op elk gewenst moment een volledige cache-leging te forceren.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Bevestigde keuzes uit Fase 1:**
> - **Server-Side Cache & Verversing**: Automatische verversing bij beheerwijzigingen én een prominente handmatige knop (*"Cache legen & Snapshot vernieuwen"*) in het Admin Dashboard.
> - **CDN & Edge-laag**: Afgestemd op **Cloudflare** (DNS + CDN proxy voor de VPS) met `s-maxage`, `stale-while-revalidate`, `ETag` en optionele Cloudflare Zone Purge ondersteuning.
> - **Videothumbnails (zoals op `/raadsleden/1`)**: Vooraf als statisch `.webp`- en `.jpg`-bestand op schijf genereren en opslaan bij het aanmaken/wijzigen van een video of fractielid (plus automatische pre-generatie bij serverstart voor bestaande video's), zodat de Node.js-server nooit meer live tijdens een bezoek zware beeldcompositie hoeft uit te voeren.
> - **Frontend, Bundeling & Animaties**: Publieke hoofdpagina's direct meesturen zonder trage chunk-watervallen, zware beheer-/portaalcode strikt gescheiden houden, zichtbare thumbnails direct met hoge prioriteit (`eager` + `fetchpriority="high"`) inladen, en vertragende achtergrond-trackers en zware blur-/scroll-animaties verwijderen.

---

## 1. Overview & Diagnose van de VPS-Laadtijden

### Waarom de website en `/raadsleden/1` nu vertragen op de VPS
Uit de forensische analyse van de server- en frontend-architectuur komen vier hoofdoorzaken naar voren die samen de lange laadtijden (tot 1,5 minuut voor videothumbnails) veroorzaken:

1. **Geen In-Memory Database Snapshot (`getDb()` schrijft en ontsleutelt bij élke lees-actie)**:
   - Bij elke HTTP-aanroep (pagina, API-call én individuele videothumbnail) leest de server alle 20+ publieke SQLite-tabellen opnieuw uit, ontsleutelt het alle 18 AES-256-GCM versleutelde CRM-Vault tabellen, en voert het een synchronisatie én schrijfactie (`saveDb`) naar schijf uit.
   - Wanneer een bezoeker `/raadsleden/1` opent, vinden er ~10 gelijktijdige requests plaats die elk afzonderlijk de volledige database lezen, ontsleutelen, versleutelen en naar schijf wegschrijven.
2. **Live CPU-intensieve beeldmanipulatie blokkeert de Node.js Event Loop**:
   - Voor elke videothumbnail op `/raadsleden/1` voert de server live een pixel-voor-pixel achtergrondverwijdering (`autoCutoutIfNeeded` over miljoenen pixels in JavaScript) en `sharp` SVG-compositie uit op de hoofdthread, met `Cache-Control: no-store`. Hierdoor ontstaat een wachtrij op de VPS waarbij elke thumbnail secondenlang op de vorige moet wachten.
3. **Waterval van netwerkverzoeken bij de "Eerste laadbeurt"**:
   - Een bezoeker downloadt eerst een kale `index.html`, daarna de JS-bundel, vervolgens een losse lazy-loaded paginachunk, en pas dáárna worden `/api/fractieleden`, `/api/videos` en `/api/news?includeAll=true` (inclusief megabytes aan volledige artikel-HTML en onderzoeksdossiers) opgehaald voordat de eerste afbeelding überhaupt bekend is bij de browser.
4. **Achtergrond-telemetrie en zware CSS-effecten concurreren om bandbreedte en main-thread**:
   - De ingebouwde `VisitorPerformanceTracker` onderschept elke `fetch`-aanroep en stuurt tijdens het laden van de pagina POST-requests terug naar de server (wat opnieuw SQLite-schrijfacties triggert).

### Wat dit Masterplan oplevert
- **Eerste laadbeurt (TTFB < 35ms, Directe Render)**: De server houdt een kant-en-klare publieke momentopname (*Server-Side Snapshot*) in het RAM-geheugen en injecteert de kernstructuur direct in de geserveerde HTML. De browser hoeft bij binnenkomst niet meer te wachten op losse API-watervallen.
- **Videothumbnails op `/raadsleden/1` in < 80ms i.p.v. 1,5 minuut**: Alle videothumbnails staan als kant-en-klare, geoptimaliseerde `.webp`- en `.jpg`-bestanden op schijf en in de Cloudflare Edge Cache.
- **1-Klik "Cache Legen" in het Admin Dashboard**: Volledige controle om op elk moment de server-snapshot, de HTML-cache, alle statische videothumbnails en (indien geconfigureerd) de Cloudflare CDN-cache direct te verversen.

---

## 2. User Experience & Visual Design

### A. Bezoekerservaring op Publieke Pagina's (zoals `/raadsleden/1`)
1. **Directe Pagina-opbouw zonder Skeleton-geknipper**:
   - Omdat de publieke hoofdpagina's (`Home`, `Raadsleden`, `FractielidVideos`, `Nieuws`, `NieuwsDetail`, `Standpunten`, `Agenda`, `WijkenEnKernen`, `Contact`) direct in de primaire publieke bundel zitten én gevoed worden door de meegeleverde server-snapshot, verschijnen het profiel van het raadslid, de gekoppelde video's en de gekoppelde nieuwsberichten **op hetzelfde frame** als de navigatiebalk.
2. **Slimme Prioritering van Afbeeldingen & Thumbnails**:
   - **Boven de vouw & zichtbare grid (`/raadsleden/1`)**: De profielfoto van het raadslid en de eerste 6 videothumbnails krijgen `loading="eager"`, `fetchpriority="high"` en `decoding="async"`, en verwijzen rechtstreeks naar het statische `.webp`-bestand (`/uploads/thumbnails/video-{id}.webp?v={hash}`).
   - **Onder de vouw**: Pas bij elementen ver buiten het zichtbare scherm wordt `loading="lazy"` toegepast, zodat boven-de-vouw beelden nooit achteraan in de browserwachtrij belanden.
3. **Visuele Rust & Vloeiende 60fps Interactie**:
   - Zware GPU-effecten zoals gestapelde `backdrop-blur` lagen, oneindige `animate-pulse` indicatoren en layout-verschuivende hover-effecten worden vervangen door lichte, solide oppervlakken (`bg-card`, subtiele `1px` randen) en snelle compositor-transities (`opacity` en `transform` ≤ 150ms).

### B. Beheerervaring: "Cache & Snelheid" Bedieningspaneel in Admin Dashboard
- Bovenin het **Admin Dashboard** (én als overzichtelijke sectie onder Systeeminstellingen) komt een directe actieknop **"Cache legen & Snapshot vernieuwen"**:
  - Toont in één oogopslag de actuele status: tijdstip van de laatste momentopname, aantal vooraf gegenereerde videothumbnails op schijf en de geheugenstatus.
  - Eén klik op **"Nu Cache Legen"** bouwt binnen een seconde de server-snapshot opnieuw op uit SQLite, regenereert ontbrekende of gewijzigde videothumbnails, verhoogt de asset-versiehash (`?v=...`) zodat browsers en Cloudflare direct de nieuwste versie tonen, en toont een heldere bevestiging.

---

## 3. Key Product Decisions & Trade-Offs

- **Besluit 1: Gescheiden Read-Path (Publieke RAM-Snapshot vs. Beveiligde CRM-Vault)**
  - *Gekozen Aanpak*: Publieke bezoekers lezen uitsluitend uit een razendsnelle, vooraf samengestelde in-memory `PublicSiteSnapshot` (zonder toegang tot of ontsleuteling van de AES-256-GCM CRM-Vault). De versleutelde Vault (`users`, `belafspraken`, `contactMessages`, financiën) wordt alléén aangesproken op geauthenticeerde beheer- en portaalroutes.
  - *Waarom*: Dit elimineert 95% van de CPU- en schijfbelasting bij publieke paginabezoeken en verhoogt tegelijkertijd de beveiliging.

- **Besluit 2: Statische Pre-Generatie van Videothumbnails op Schijf (WebP + JPG)**
  - *Gekozen Aanpak*: Zodra een video of fractielidfoto in het Admin Dashboard wordt toegevoegd of gewijzigd (en eenmalig bij het opstarten van de server voor bestaande items), genereert de server direct statische `.webp` (voor snelle weergave in de browser) en `.jpg` (voor OpenGraph/WhatsApp/social sharing) bestanden in `/public/uploads/thumbnails/`. Ook de vrijstaande portretfoto (cutout) per fractielid wordt op schijf gecachet zodat de pixel-analyse nooit dubbel hoeft te draaien.
  - *Waarom*: Een statisch bestand serveren vanaf schijf of Cloudflare CDN kost `< 2ms` en blokkeert de Node.js processor niet, terwijl live genereren met `sharp` tijdens het paginaladen tot wachtrijen van 90 seconden leidde.

- **Besluit 3: Slanke Lijst-Payloads (Geen Volledige Artikel-HTML in Overzichten)**
  - *Gekozen Aanpak*: Overzichtsroutes zoals `/api/news?memberId=1` en de globale bootstrap-snapshot bevatten alleen de kaartgegevens (`id`, `title`, `excerpt`, `date`, `category`, `thumbnailUrl`, `wijkSlug`, `linkedMemberIds`) en strippen de zware `content`-HTML (die soms honderden kilobytes aan interactieve dossiers bevat). De volledige artikel-HTML wordt pas geladen (uit de server-side artikelcache) wanneer iemand daadwerkelijk het artikel opent op `/nieuws/:id`.
  - *Waarom*: Dit verkleint de datagrootte op `/raadsleden/1` en `/nieuws` van honderden kilobytes naar slechts enkele kilobytes, waardoor mobiele en desktopverbindingen alle bandbreedte direct aan de afbeeldingen kunnen geven.

- **Besluit 4: Cloudflare CDN & Browser Cache-Control Strategie**
  - *Gekozen Aanpak*:
    - **Geüploade media & statische videothumbnails (`/uploads/...`, `/assets/...`)**: `Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable` met een automatische versie-querystring (`?v=timestamp`) die bij elke wijziging of handmatige cache-leging verspringt.
    - **Publieke API-endpoints (`/api/public/snapshot`, `/api/videos`, `/api/news`, `/api/fractieleden`)**: `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=3600` plus een sterke `ETag` op basis van de snapshot-versie.
    - **HTML-pagina's met SSR OpenGraph**: `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=600` zodat Cloudflare de HTML op de edge kan bufferen maar bij een cache-leging direct ververst.

---

## 4. Technical Architecture & Data Strategy

### A. Systeemarchitectuur: Van Verzoek tot Directe Render

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         BEZOEKER (Browser / Mobiel)                          │
│  • Ontvangt HTML inclusief ingebakken __INITIAL_PUBLIC_SNAPSHOT__            │
│  • Publieke hoofdpagina's zitten direct in de kernbundel (geen chunk-wachtrij)│
│  • Videothumbnails (/raadsleden/1) laden direct als statische .webp (eager)  │
└──────────────────────┬───────────────────────────────────────▲───────────────┘
                       │ 1. HTTPS Request                      │ 2. < 20ms Response
                       ▼                                       │
┌──────────────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE CDN & EDGE PROXY                           │
│  • Cachet /assets/* en /uploads/thumbnails/*.webp op de Edge (immutable)     │
│  • Valideert publieke API & HTML razendsnel via ETag & stale-while-revalidate│
└──────────────────────┬───────────────────────────────────────▲───────────────┘
                       │ Cache Miss / Revalidate               │
                       ▼                                       │
┌──────────────────────────────────────────────────────────────────────────────┐
│                     NODE.JS / EXPRESS SERVER (Op de VPS)                     │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │               IN-MEMORY SERVER SNAPSHOT & HTML CACHE                   │  │
│  │  • Bevat kant-en-klare JSON voor fractieleden, video's, nieuws-kaarten,│  │
│  │    standpunten, agenda, wijken en vooraf gerenderde SEO/HTML-templates │  │
│  │  • 0ms SQLite-queries en 0ms Vault-decryptie tijdens publiek bezoek    │  │
│  └───────────────────────────────────▲────────────────────────────────────┘  │
│                                      │                                       │
│            Automatische verversing   │   Handmatige knop in Admin Dashboard: │
│            bij POST / PUT / DELETE   │   "Cache legen & Snapshot vernieuwen" │
│                                      │                                       │
│  ┌───────────────────────────────────┴────────────────────────────────────┐  │
│  │          SQLITE DATABASE & PRE-BAKED THUMBNAIL ENGINE (Disk)           │  │
│  │  • Schrijft alleen bij daadwerkelijke mutaties (nooit meer in getDb!)  │  │
│  │  • Slaat samengestelde videothumbnails direct op als .webp & .jpg      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### B. Data Model & Snapshot-Structuur
1. **`PublicSiteSnapshot` (In-Memory Singleton op de Server)**:
   - `version`: Unieke versiestring + timestamp (bijv. `v_1792320000000`), gebruikt voor `ETag`-headers en cache-busting querystrings (`?v=...`) op afbeeldingen en thumbnails.
   - `fractieleden`: Volledige lijst van actieve raadsleden en burgerraadsleden.
   - `videos`: Alle video-items voorzien van hun vooraf gegenereerde, statische `.webp`- en `.jpg`-thumbnailpaden (`/uploads/thumbnails/video-{id}.webp?v={version}`).
   - `newsSummaries`: Alle gepubliceerde nieuwsberichten *zonder* de zware `content`-body, zodat kaarten op `/`, `/nieuws` en `/raadsleden/:id` direct uit het geheugen renderen.
   - `articleCache`: Een in-memory `Map<string, NewsItem>` voor individuele artikelen (`/nieuws/:id`), zodat ook volledige artikelen zonder database-query uit RAM worden geserveerd.
   - `events`, `wijken`, `faqs`, `categories`, `stemgedrag`: Direct beschikbaar in de snapshot.
   - `htmlCache`: Een `Map<string, string>` die de met OpenGraph/SEO-verrijkte HTML per URL-pad en snapshot-versie in het geheugen bewaart.

### C. Interactieve Componenten & State-Koppeling
1. **Eliminatie van Read-Side Writes in `getDb()`**:
   - De eenmalige database-initialisatie, standaarddata-controle en `syncWijkenWithBuurtkaart()` verhuizen naar `initDatabaseOnBoot()` (draait één keer bij het opstarten van de server).
   - `getPublicDb()` retourneert direct de gecachete in-memory objecten (0ms CPU-tijd, 0 schijfacties). Alleen wanneer een admin of portaalgebruiker een route aanroept die gevoelige CRM-data nodig heeft, wordt de Vault aangesproken.
2. **Pre-Baked Video Thumbnail Pipeline (`videoThumbnailService.ts`)**:
   - **Persoon-Cutout Cache op Schijf**: De vrijstaande portretfoto van elk fractielid wordt éénmalig uitgesneden en opgeslagen in `/public/uploads/thumbnails/cutout-member-{id}.png`. De zware pixel-loop (`autoCutoutIfNeeded`) draait daardoor nooit meer opnieuw voor hetzelfde lid.
   - **Statische Video-Thumbnails op Schijf**: Voor elke video wordt `/public/uploads/thumbnails/video-{id}.webp` (hoge kwaliteit, ~25–40 KB) én `/public/uploads/thumbnails/video-{id}.jpg` (voor social media OpenGraph) op schijf weggeschreven.
   - Bij het toevoegen of bewerken van een video of fractielid in het Admin Dashboard worden de bijbehorende statische bestanden direct bijgewerkt.
3. **Cache-Beheer & Force-Purge API (`/api/admin/cache/purge` & `/api/admin/cache/status`)**:
   - In het Admin Dashboard komt een duidelijke knop **"Cache legen"** die `/api/admin/cache/purge` aanroept.
   - Deze actie:
     1. Leest de actuele staat vers uit SQLite en bouwt `PublicSiteSnapshot` en `htmlCache` opnieuw op.
     2. Controleert en regenereert alle statische videothumbnails op schijf.
     3. Verhoogt de `snapshot.version` zodat alle browsers én Cloudflare direct nieuwe versies ophalen.
     4. Stuurt (indien `CLOUDFLARE_ZONE_ID` en `CLOUDFLARE_API_TOKEN` in `.env` zijn ingesteld) automatisch een `purge_everything` verzoek naar de Cloudflare API.
4. **Frontend Bundel, Laadvolgorde & Animatie-Opschoning**:
   - **Directe Imports voor Publieke Kernpagina's**: `Home`, `Raadsleden`, `FractielidVideos`, `Nieuws`, `NieuwsDetail`, `Standpunten`, `Agenda`, `WijkenEnKernen`, `WijkDetail` en `Contact` worden direct meegenomen in de publieke hoofdbundel, terwijl `AdminDashboard`, `Raadspaneel`, `Dashboard` en zware editors lazy-loaded blijven.
   - **Directe Hydratie via `window.__INITIAL_PUBLIC_SNAPSHOT__`**: Pagina's zoals `/raadsleden/1` lezen bij binnenkomst direct hun fractielid, gekoppelde video's en gekoppelde nieuwsberichten uit de geïnjecteerde snapshot — zonder te wachten op `useEffect`-netwerkverzoeken.
   - **Uitschakelen van Vertragende Telemetrie**: `VisitorPerformanceTracker` (die `window.fetch` overschreef en bij elke paginawissel achtergrond-POSTs deed) wordt uit het publieke laadpad verwijderd.
