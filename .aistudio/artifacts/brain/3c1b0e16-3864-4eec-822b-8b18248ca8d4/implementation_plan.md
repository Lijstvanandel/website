# Implementatieplan: 'Alleen voor leden' Nieuwsberichten & Contributiebeveiliging

## Status: Voltooid (Completed)

### 1. Data & Server Model
- **`NewsItem` Interface (`src/data/news.ts`)**: uitgebreid met optionele velden `membersOnly?: boolean` en `isMembersOnly?: boolean`.
- **Backend API Endpoints (`server.ts`)**:
  - `POST /api/admin/news`: verwerkt en bewaart `membersOnly` / `isMembersOnly`.
  - `PUT /api/admin/news/:id`: verwerkt en behoudt `membersOnly` / `isMembersOnly`.
  - `PATCH /api/admin/news/:id/toggle-members-only`: snelle beheerderstoggle om artikelen direct vanuit het overzicht op openbaar of alleen voor leden te zetten.

### 2. Beheerdersdashboard (`/admin`)
- **`AdminDashboard.tsx`**:
  - `nMembersOnly` formulierstatus toegevoegd en gekoppeld aan `startEditNews`, `cancelEditNews` en `submitNews`.
  - Selector in het formulier onder zichtbaarheid toegevoegd: keuze tussen *Openbaar (Iedereen)* en *🔒 Alleen voor leden*.
  - Badge in de nieuwslijst: toont een goud/amber badge `🔒 Alleen voor leden`.
  - Actieknop met sloticoon toegevoegd waarmee de beheerder met één klik de ledenstatus kan in- of uitschakelen (`toggleNewsMembersOnly`).

### 3. Afscherming & Melding op Artikeldetail (`/nieuws/:id`)
- **`NieuwsDetail.tsx`**:
  - Toegangscontrole via `hasMemberAccess`:
    - Niet-leden / niet-ingelogden hebben geen toegang tot ledenartikelen.
    - Leden met openstaande contributie (`billingStatus !== 'paid'` en `billingStatus !== 'exempt'`) worden geblokkeerd.
    - Volwaardige betalende leden (`billingStatus === 'paid'` of `isFullMember === true`) en bestuurs-/raadsleden/admins hebben volledige toegang.
  - Wanneer de toegang wordt geweigerd, komt alle content **vanaf de auteur te vervallen** (auteurblok, voorlezen, artikeltekst, interactieve dossiers en gekoppelde standpunten) en wordt vervangen door een melding:
    - Titel: **'Dit artikel is alleen voor leden'**.
    - Beschrijving afgestemd op de status:
      - Indien niet ingelogd: toelichting dat het artikel exclusief is voor leden van Lijst van Andel.
      - Indien ingelogd met openstaande contributie: toelichting met vermelding van de gebruikersnaam en dat de jaarlijkse contributie nog openstaat.
    - Twee duidelijke knoppen:
      - **'Word lid'** (linkt naar `/word-lid` of `/dashboard` om de contributie te voldoen).
      - **'Login'** (linkt naar `/login` met automatische terugverwijzing naar het artikel na succesvol inloggen).
  - Badge `Alleen voor leden` met sloticoon toegevoegd in de metadata-header van het artikel en op de overzichtskaarten op `/nieuws`.
