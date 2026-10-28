# Implementatieplan: Verkiezingsprogramma's Andere Fracties & Controlerende Fractievragen (`/raadspaneel`)

## 1. Doel & Overzicht
We breiden het `/raadspaneel` uit met een feitelijke, bron-gebaseerde analyse van de 2026–2030 verkiezingsprogramma's van de **8 andere raadsfracties** in Steenwijkerland (**BGL**, **CDA**, **D66**, **CPB**, **VVD**, **CU**, **STEM**, en **PRO (GroenLinks-PvdA)**). Hierbij geldt een strikte **Zero-Hallucination & Juistheidsgarantie**: elke stellingname en elke vraag wordt direct onderbouwd met een letterlijk citaat en hoofdstuk-/paginaverwijzing uit het betreffende verkiezingsprogramma. Wanneer een verkiezingsprogramma geen concreet aanknopingspunt bevat voor een specifiek onderwerp of raadsstuk, wordt dit voor die partij expliciet vermeld (*"Geen specifiek standpunt in verkiezingsprogramma 2026–2030"*), en worden er géén verzonnen vragen geformuleerd.

---

## 2. Geplande Onderdelen & Gebruikerservaring

### A. Gestructureerde Kennisbank van de 8 Verkiezingsprogramma's (`src/data/otherPartiesPrograms.ts`)
- Alle 8 aangeleverde PDF-verkiezingsprogramma's (in `/public/assets/aistudio/`) worden gestructureerd vastgelegd met:
  - Partij-identificatie (`BGL`, `CDA`, `D66`, `CPB`, `VVD`, `CU`, `STEM`, `PRO (GroenLinks-PvdA)`), volledige naam, programmatitel en link naar het bron-PDF bestand.
  - Thematische standpunten per partij met hoofdstuk/thema, kernpositie, trefwoorden en **letterlijke citaten** uit het verkiezingsprogramma.

### B. Uitvouwbaar Blok bij 'Partijprogramma & Standpunten' (`TopicStandpuntenSection.tsx`)
- Onder de bestaande standpuntenanalyse van **Lijst van Andel** voegen we een uitvouwbaar blok toe: **"Hoe staan andere partijen hier mogelijk in? (Verkiezingsprogramma's 2026–2030)"**.
- Toont in één oogopslag een samenvattend overzicht van de 8 fracties en klapt op verzoek open.
- Per partij wordt getoond:
  - **Partijnaam & Verwacht Standpunt-label**: `Positief / Voor`, `Kritisch / Tegen`, `Genuanceerd / Voorwaardelijk`, of `Geen specifiek standpunt in programma`.
  - **Inhoudelijke Toelichting**: Korte, feitelijke duiding hoe het voorstel zich verhoudt tot het verkiezingsprogramma van de partij.
  - **Letterlijk Citaat & Bronverwijzing**: Het exacte citaat uit het verkiezingsprogramma (inclusief hoofdstuk/paragraaf en directe link om het originele verkiezingsprogramma-PDF in te zien), of de expliciete melding dat het programma over dit specifieke onderwerp niets vermeldt.

### C. Uitvouwbaar Overzicht per Document bij 'Bijbehorende Vergaderstukken' (`Raadspaneel.tsx`)
- Bij elk document onder **'Bijbehorende Vergaderstukken'** komt een uitvouwbare knop/sectie: **"Posities andere partijen bij dit stuk"**.
- Wanneer uitgeklapt toont dit per partij (`BGL`, `CDA`, `D66`, `CPB`, `VVD`, `CU`, `STEM`, `PRO (GroenLinks-PvdA)`) hoe zij dit specifieke vergaderstuk benaderen op basis van hun programma (standpunt-label, toelichting en letterlijk citaat), of de expliciete vermelding dat hun verkiezingsprogramma hier niets over zegt.

### D. 'Vragen aan andere fracties' in het Steundossier (`SupportDossierPanel.tsx` & `supportDossierService.ts`)
- Bij het klikken op **'Compileer Ondersteuningsdossier'** worden naast de *Klemzet-vragen aan de wethouder* ook **controlerende vragen richting de andere fracties** gegenereerd en in een apart blok **direct onder de vragen aan de wethouder** getoond.
- **Strikte feitelijkheid**:
  - Een vraag aan een andere fractie wordt **uitsluitend** geformuleerd wanneer het huidige raadsvoorstel raakt aan (of schuurt met) een aantoonbare belofte of passage uit het verkiezingsprogramma van die fractie.
  - Elke vraag vermeldt:
    1. **Gericht aan fractie** (bijv. `BGL`, `VVD`, `D66`, `PRO (GroenLinks-PvdA)`, etc.)
    2. **De controlerende debatvraag** (direct te kopiëren of met één klik toe te voegen aan de bijdrage voor de Politieke Markt of Raadsvergadering).
    3. **Programma-grondslag (Citaat)**: Het letterlijke citaat + hoofdstuk uit het verkiezingsprogramma van die partij waarop de vraag is gebaseerd.
  - Als er voor een partij op basis van haar verkiezingsprogramma geen feitelijk onderbouwde vraag te stellen valt over het onderwerp, wordt er voor die partij geen vraag verzonnen.

---

## 3. Technische Architectuur & Bestanden
1. **`src/types/council.ts`**:
   - Toevoegen van interfaces `OtherPartyId`, `OtherPartyStanceItem`, `DocumentOtherPartyStance`, en `FactionControlQuestion`.
   - Uitbreiden van `CouncilAgendaTopic`, `CouncilDocument`, en `SupportDossier` met deze velden.
2. **`src/data/otherPartiesPrograms.ts`** *(nieuw)*:
   - Volledige, geverifieerde dataset van de 8 verkiezingsprogramma's (`BGL`, `CDA`, `D66`, `CPB`, `VVD`, `CU`, `STEM`, `PRO (GroenLinks-PvdA)`) met exacte passages, citaten, hoofdstukverwijzingen en PDF-paden.
3. **`src/lib/standpuntMatcher.ts` & `src/server/standpuntScannerService.ts`**:
   - Toevoegen van zowel deterministische als Gemini AI-gestuurde (met strikte bronverificatie tegen `otherPartiesPrograms.ts`) matching van de 8 partijen op onderwerp- én documentniveau, zodat alle 8 partijen altijd aanwezig zijn (met match + citaat óf expliciete melding "Geen specifiek standpunt in programma").
4. **`src/server/supportDossierService.ts`**:
   - Uitbreiden van `compileEvidenceAndAnalysis` en `buildDeterministicAnalysis` om `fractieVragen` (`FactionControlQuestion[]`) samen te stellen op basis van daadwerkelijke raakvlakken tussen de vergaderstukken en de verkiezingsprogramma's van de andere fracties.
5. **`src/components/council/TopicStandpuntenSection.tsx`**:
   - Toevoegen van het uitvouwbare blok voor de 8 andere partijen onder de Lijst van Andel standpunten.
6. **`src/pages/Raadspaneel.tsx`**:
   - Toevoegen van het uitvouwbare blok per vergaderstuk onder 'Bijbehorende Vergaderstukken'.
7. **`src/components/SupportDossierPanel.tsx`**:
   - Toevoegen van het blok **'Vragen aan andere fracties'** onder de vragen aan de wethouder, inclusief kopieerknop, broncitaat uit het betreffende verkiezingsprogramma en knoppen om de vraag direct in te voegen in de bijdrage voor Politieke Markt of Raadsvergadering.
