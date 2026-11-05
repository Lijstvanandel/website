# Strategische Audit & Implementatieplan — Institutionele Verankering in Steenwijkerland

Dit document bevat de feitelijke doorlichting van de huidige website en beheeromgeving ten opzichte van het rapport **"Strategisch Onderzoek: Electorale Overleving en Institutionele Verankering na Fractieafsplitsing in Steenwijkerland"**, gevolgd door het concrete implementatieplan op basis van uw keuzes.

---

## Deel 1: Feitelijke Gap-Analyse (Rapport vs. Huidige Website)

### 1. Wat de website nu al GOED doet (Behouden & Versterken)
* **Hyperlokale Wijk- en Kernenstructuur (Hoofdstuk 1.1 & 2.1 — Model-De Mos & EVB):** De website beschikt over een interactieve buurtkaart met alle **43 wijken en kernen** van Steenwijkerland (`/wijken-en-kernen`), gekoppeld aan wijkspecifieke dossiers, nieuwsberichten en aanspreekpunten.
* **Laagdrempelige Ombudspolitiek:** Het belafsprakensysteem (`BelafspraakDialog`) op de homepage en fractiepagina biedt inwoners direct toegang tot de raads- en burgerraadsleden op vaste avonden.
* **Raads- en Programmadossieranalyse (Hoofdstuk 1.1 — Model-EVB):** Het `/raadspaneel` bevat reeds een vergelijkingsengine (`standpuntMatcher.ts`) waarmee raadsvoorstellen worden getoetst aan de verkiezingsprogramma's van BGL, CPB, VVD, CDA, D66, ChristenUnie, STEM en PRO Steenwijkerland.
* **Communicatie-embargo FvD (Hoofdstuk 2.2 Don't 1):** De website bevat geen enkele aanval op de voormalige moederpartij (FvD), geen verwijzingen naar landelijke conflicten en geen defensieve teksten over zetelbehoud. Dit sluit naadloos aan op de psychologische strategie van *asymmetrisch contrast*.

---

### 2. Wat de website volgens het rapport NIET meer moet doen (Saneren & Corrigeren)
* **NIET: Direct stemrecht op de ALV toekennen bij online registratie (Hoofdstuk 4.2 — Verdedigingslinie 1):**
  * *Huidige situatie op de website:* Op `/doneren` (regel 438) staat: *"Voor slechts € 12,00 per jaar bent u officieel lid met stemrecht op de algemene ledenvergadering."* Ook `/registreren` en Artikel 3 van de Algemene Voorwaarden gaan uit van directe toelating als volwaardig lid.
  * *Waarom dit fout is volgens het rapport:* Een kleine, nieuwe partij is uiterst kwetsbaar voor een vijandige overname (coup/infiltratie) waarbij vijftien tot twintig kwaadwillenden kort voor een ALV lid worden en het bestuur wegstemmen.
* **NIET: Persoonsgebonden partijnaam zonder Steenwijkerland-brede identiteit (Hoofdstuk 1.2C & 2.1 Do 1):**
  * *Huidige situatie op de website:* De partij heet overal uitsluitend *"Lijst van Andel"*.
  * *Waarom dit fout is volgens het rapport:* Een persoonsgebonden naam ("Lijst [Achternaam]") wekt bij kiezers en potentiële kandidaten de indruk van een tijdelijk eenmansvehikel en belemmert duurzame opvolging en bredere verankering.
* **NIET: Landelijke symboliek en buiten-gemeentelijke standpunten voeren (Hoofdstuk 1.2B & 2.2 Don't 2):**
  * *Huidige situatie op de website:* In `/standpunten` (`src/data/partijprogramma.ts`) staan nog diverse puur landelijke of ideologische punten waar de gemeenteraad van Steenwijkerland geen bevoegdheid over heeft:
    * H1.2: *"Rechtstreeks gekozen burgemeester"* (Grondwets-/Kroonbenoemingskwestie, geen gemeentelijke bevoegdheid).
    * H1.8 & H1.9: *"Geen internationale politiek / Stop met Sustainable Development Goals (SDG's)"*.
    * H3.3 & H3.8: Landelijk asiel- en terugkeerbeleid omtrent Oekraïense ontheemden.
  * *Huidige situatie in `/agenda` (`src/data/events.ts`):* Het enige geplande evenement heet *"Lezing: Electorale tragedie van de moderne mens"*. Dit ademt de sfeer van een filosofisch-landelijke denktank in plaats van een zichtbare lokale dorpspartij.
* **NIET: Financiële en juridische vermenging van Raadsfractie en Partijvereniging (Hoofdstuk 2.2 Don't 3 & Hoofdstuk 4.1):**
  * *Huidige situatie op de website:* In Artikel 5 lid 1 van de Algemene Voorwaarden staat dat donaties ten goede komen aan *"partijactiviteiten, verkiezingscampagnes en fractieondersteuning"*, en in de Privacyverklaring wordt het stadhuisadres (*Vendelweg 1, Fractiekamer*) gebruikt als vestigingsadres van de partijvereniging. Daarnaast beheert `TreasurerManager.tsx` de fractierekening en de verenigingsrekening nog in één gezamenlijke liquiditeitspool en één facturenstroom.
  * *Waarom dit fout is volgens het rapport:* Artikel 9 van de *Verordening ambtelijke bijstand en fractieondersteuning Steenwijkerland 2021* verbiedt strikt dat de gemeentelijke fractievergoeding (€ 500 per zetel = € 1.000/jaar) wordt gebruikt voor partij-, campagne- of notariskosten. Omgekeerd moet de privaatrechtelijke vereniging scherp gescheiden blijven van de publiekrechtelijke raadsfractie.
* **NIET: Anonieme vraagtekens tonen op de Steunfractie-pagina (Hoofdstuk 1.2C):**
  * *Huidige situatie op de website:* Op `/steunfractie` (`src/pages/Steunfractie.tsx`) staan drie kaarten met als naam `"?"`, `"?"` en `"Volgt nog"` en e-mailadressen als `?@lijstvanandel.nl`. Dit versterkt het beeld van organisatorische onvolwassenheid.

---

### 3. Wat er op de website ONTBREEKT en toegevoegd moet worden (Conform het Rapport)
1. **Nieuwe Steenwijkerland-brede Partijnaam + Kieswet-validatie (Hoofdstuk 2.1 Do 1 & 4.3):**
   * Directe doorvoering van de nieuwe, inclusieve partijnaam **"Steenwijkerlands Belang"** (23 tekens — ruim binnen het wettelijk maximum van 35 tekens ex Art. G 3 lid 4 Kieswet) met als verbindende ondertitel *"Lijst van Andel • Steenwijkerland"*, plus centrale beheerbaarheid vanuit het bestuurspaneel.
2. **Sociaal-Conservatieve Positionering & De 3 Kernpijlers (Hoofdstuk 2.1 Do 2 & 3.2):**
   * Expliciete positionering in het electoraal vacante **sociaal-conservatieve kwadrant** van Steenwijkerland: behoudend op cultuur, landschap (geen megawindturbines bij Oldemarkt/Willemsoord) en lokale woningtoewijzing, gecombineerd met **sociale zekerheid, bescherming van lokale voorzieningen (zwembaden De Waterwyck & Vollenhove, dorpshuizen, streekvervoer lijn 70) en armoedebestrijding (*Iedereen aan Boord*)**.
3. **Formele Portefeuilleverdeling Sammy van Andel & Lisa Mars (Hoofdstuk 2.1 Do 3 & 4.1):**
   * Zichtbare rol- en portefeuilleverdeling op `/fractie` en `/standpunten` conform Art. 7 lid 3 RvO Steenwijkerland:
     * **Sammy van Andel (Fractievoorzitter):** Bestuur, Financiën & OZB, Ruimtelijke Ordening, Wonen in de Kernen & Landelijk Gebied.
     * **Lisa Mars (Plaatsvervangend Fractievoorzitter):** Sociaal Domein, Minimabeleid (*Iedereen aan Boord*), Jeugdzorg, Onderwijs, Lokale Voorzieningen, Cultuur & Ondernemerschap.
4. **Coup-bestendig Getrapt Lidmaatschap & Governance-slot (Hoofdstuk 4.2):**
   * Volledige implementatie van de 3 statutaire verdedigingslinies in `/registreren`, `/doneren`, `/bestuur`, `/dashboard` en `/secretaris`:
     * **Verdedigingslinie 1 (Getrapt lidmaatschap):** Nieuwe aanmeldingen worden geregistreerd als **Aspirant-lid (Sympathisant)** zonder stemrecht op de ALV. Promotie naar **Gewoon lid** (met stemrecht) vereist minimaal **2 jaar aspirant-lidmaatschap** én een **unaniem besluit van het partijbestuur**.
     * **Verdedigingslinie 2 (Bestuursbenoeming & Tekenbevoegdheid):** Bindende voordracht door het zittende bestuur, ontslag alleen met **2/3e meerderheid** bij een quorum van ten minste de helft van de stemgerechtigde leden, en verplichte **gezamenlijke tekenbevoegdheid (vier-ogenprincipe)** bij de Kamer van Koophandel.
     * **Verdedigingslinie 3 (Kandidatenlijst & Statutenwijziging):** Kandidaatstellingscommissie benoemd door het bestuur; wijziging van de voordracht door de ALV vereist een **gekwalificeerde meerderheid van 3/4e (75%)**. Statutaire beschermingsartikelen kunnen uitsluitend worden gewijzigd met **unanieme goedkeuring van het bestuur + 3/4e meerderheid in de ALV**.
5. **Strikte Scheiding Gemeentelijk Fractiebudget vs. Verenigingskas (Hoofdstuk 4.1):**
   * In `TreasurerManager.tsx` (`/penningmeester`) wordt de **Gemeentelijke Fractierekening (Publiekrechtelijk — Art. 6 & 9 Verordening 2021)** volledig losgekoppeld van de **Verenigingsrekening (Privaatrechtelijk)**. Inclusief nalevingscheck op het variabele deel (€ 500 × 2 zetels = € 1.000/jaar + rato fractiereserve ex Art. 10 lid 5), verantwoording binnen 3 maanden na het kalenderjaar (Art. 11 lid 1) en een automatische compliance-blokkade tegen uitgaven voor verkiezingscampagnes, notariskosten of partijbijeenkomsten.
6. **4-Fasen Juridische & Kieswet-Tracker (Hoofdstuk 4 & 5):**
   * Nieuwe strategische voortgangsmodule in `/voorzitter` en `/secretaris`:
     * **Fase 1 — Griffie & RvO (Maand 1):** Schriftelijke melding ex Art. 7 lid 1 & 3 RvO, zetelverdeling commissies (*Politieke Markt / Rond-de-Tafelgesprekken* ex Art. 7 lid 4 RvO) en rato-overboeking fractiereserve (Art. 10 lid 5 Verordening 2021).
     * **Fase 2 — Notariële Oprichting & KVK (Maand 2–4):** Vereniging met volledige rechtsbevoegdheid (Boek 2 BW), WBTR-bepalingen, UBO-registratie, vier-ogenprincipe en zakelijke bankrekening.
     * **Fase 3 — Naamregistratie Centraal Stembureau (Uiterlijk 90 dagen voor verkiezingen):** Art. G 3 Kieswet, controle op 35-tekenslimiet (Art. G 3 lid 4), gewaarmerkte statuten, KVK-uittreksel en storting waarborgsom **€ 112,50** (Art. G 3 lid 3).
     * **Fase 4 — Kandidaatstelling (Dag van de Kandidaatstelling):** Art. H 4 Kieswet tracker voor ten minste **20 ondersteuningsverklaringen (Model H 4)** afgelegd op het gemeentehuis in Steenwijk (met streefdoel 25–30 verklaringen verspreid over de 43 kernen), instemmingsverklaringen (Model H 9) en waarborgsom **€ 225,00** (Art. H 14 Kieswet).
7. **Tweewekelijkse Kernen-Spreekuren & Werkbezoeken + Wijkambassadeurs (Hoofdstuk 2.1 Do 4):**
   * Vervanging van de abstracte lezing op `/agenda` door een concrete reeks **Kernen-Spreekuren & Werkbezoeken** in dorpshuizen (Giethoorn, Vollenhove, Oldemarkt, Sint Jansklooster, Blokzijl, Steenwijkerwold) en hervorming van `/steunfractie` naar een professioneel overzicht van de **Steunfractie & Wijkambassadeurs in de 43 kernen** (zonder `"?"`-placeholders, met directe aanmeldmogelijkheid per kern).
8. **Constructieve Coalitie- & Mede-indienerschapstracker (Hoofdstuk 2.1 Do 5 & 3.1):**
   * Uitbreiding van `StemgedragSection.tsx` en `Raadspaneel.tsx` met weergave van **coalitiepartners / mede-indieners** (BGL, CPB, VVD, CDA, D66, CU, STEM, PRO) per motie en amendement, plus een samenvattende teller die de constructieve samenwerking in de raad zichtbaar maakt voor kiezers.

---

## Deel 2: Concrete Wijzigingen per Bestand

### 1. Nieuwe Partijnaam & Centrale Merkconfiguratie
* **`src/data/partyConfig.ts` (Nieuw):** Centrale configuratie voor de partijnaam (`"Steenwijkerlands Belang"`), ondertitel (`"Lijst van Andel • Steenwijkerland"`), korte aanduiding conform Art. G 3 lid 4 Kieswet (23/35 tekens), en de formele scheiding tussen de Raadsfractie (*Vendelweg 1, Steenwijk*) en de Partijvereniging.
* **`index.html` & `metadata.json`:** Synchronisatie van `<title>`, `<meta name="description">` en OpenGraph-tags naar **Steenwijkerlands Belang (Lijst van Andel) — Gemeenteraad Steenwijkerland**.
* **`src/components/Header.tsx` & `src/components/Footer.tsx`:** Weergave van de nieuwe partijnaam **Steenwijkerlands Belang** met subtiele vermelding *Lijst van Andel • Steenwijkerland*, plus strikte scheiding tussen het postadres van de Raadsfractie en de Vereniging in de footer.

### 2. Sociaal-Conservatieve Herijking Standpunten & Homepage
* **`src/pages/Home.tsx`:**
  * Hero-sectie en Speerpunten herschrijven rond de **3 strategische kernpijlers** uit Hoofdstuk 2.1 Do 2 & 3.2:
    1. *Betaalbare Woningbouw & Voorrang in de Kernen* (starters, gezinnen en senioren in Giethoorn, Oldemarkt, Vollenhove en Steenwijk).
    2. *Realistisch Ondernemers-, Boeren- & Plattelandsbeleid* (lage OZB, bescherming agrariërs en toerisme, géén megawindturbines).
    3. *Behoud Lokale Voorzieningen & Sociaal Minimabeleid* (behoud zwembaden De Waterwyck & Vollenhove, dorpshuizen, streekvervoer lijn 70 en steun voor *Iedereen aan Boord*).
* **`src/data/partijprogramma.ts` & `src/pages/Standpunten.tsx`:**
  * Herschrijven van de landelijke punten in Hoofdstuk 1, 3 en 8 naar **directe gemeentelijke bevoegdheden in Steenwijkerland**:
    * H1.2 wordt *"Raadsbrede controle op openbare orde en burgemeestersportefeuille"* (conform Gemeentewet en RvO Steenwijkerland).
    * H1.8 & H1.9 worden *"Gemeentelijke kerntaken eerst: géén geld naar prestigeprojecten buiten Steenwijkerland"*.
    * H3 wordt volledig toegespitst op *Gemeentelijke regie op huisvesting, lokale binding bij woningtoewijzing en draagkracht van onze 43 kernen*.
    * H8 krijgt een expliciet speerpunt voor *Sociaal Minimabeleid & Armoedebestrijding ('Iedereen aan Boord')*: bescherming van kwetsbare inwoners, ouderen en kinderen tegen energiearmoede en maatschappelijke uitsluiting.
  * Toevoegen van een overzichtelijke **Sociaal-Conservatieve Koers & Portefeuilleverdeling** bovenaan `/standpunten`.

### 3. Portefeuilleverdeling Fractie, Constructief Stemgedrag & Steunfractie
* **`src/data/fractieleden.ts` & `src/pages/Raadsleden.tsx`:**
  * Toevoegen van de formele functie conform Art. 7 lid 3 RvO (*Fractievoorzitter* voor Sammy van Andel en *Plaatsvervangend Fractievoorzitter* voor Lisa Mars) inclusief hun afgebakende portefeuille-badges.
* **`src/components/StemgedragSection.tsx` & `src/types/stemgedrag.ts`:**
  * Toevoegen van constructieve samenwerkingsstatistieken (aantal aangenomen eigen moties, mede-ingediende voorstellen en samenwerking met andere Steenwijkerlandse fracties zoals BGL, CPB, VVD en CDA) om bestuurlijke effectiviteit te bewijzen (Hoofdstuk 2.1 Do 5).
* **`src/pages/Steunfractie.tsx`:**
  * Verwijderen van de `"?"` en `"Volgt nog"` placeholders. Omvormen tot de pagina **Steunfractie & Wijkambassadeurs**, met uitleg over de rol van de steunfractie bij de *Politieke Markt / Rond-de-Tafelgesprekken* (Art. 7 lid 4 RvO) en de actieve wijkvertegenwoordigers in de kernen.

### 4. Coup-Bestendig Getrapt Lidmaatschap & Juridische Documenten
* **`src/pages/Register.tsx` & `src/pages/Doneren.tsx`:**
  * Aanpassen van het registratieformulier en de keuzeknoppen op `/doneren`: nieuwe aanmelders schrijven zich in als **Aspirant-lid (Sympathisant)** (€ 12,00/jaar).
  * Heldere, positief geformuleerde toelichting in het aanmeldproces: aspirant-leden krijgen direct toegang tot het digitale ledenportaal, bijeenkomsten en meedenksessies; na een betrokkenheidsperiode van **2 jaar** beslist het partijbestuur (bij unaniem besluit) over toekenning van het **Gewoon Lidmaatschap met stemrecht op de ALV**.
* **`src/data/legalDocuments.ts` & `src/pages/Bestuur.tsx`:**
  * Volledige actualisatie van de **Algemene Voorwaarden (Art. 3 & 5)**, **Privacyverklaring**, **Verwerkingsreglement** en de **Statuten / Reglementen** op `/bestuur` met:
    1. Het getrapte lidmaatschap (Aspirant-lid vs. Gewoon lid, 2 jaar wachttijd, unaniem bestuursbesluit).
    2. De bestuursbescherming (bindende voordracht, 2/3e ontslagdrempel met 50% quorum, gezamenlijke tekenbevoegdheid / vier-ogenprincipe).
    3. De 3/4e (75%) gekwalificeerde meerderheid voor wijziging van de kandidatenlijst en statutaire beschermingsbepalingen.
    4. Strikte juridische en financiële scheiding tussen de Publiekrechtelijke Raadsfractie en de Privaatrechtelijke Partijvereniging.
* **`src/pages/Dashboard.tsx`:**
  * Weergave van de exacte lidmaatschapsstatus van de ingelogde gebruiker (*Aspirant-lid — wachttijd voor ALV-stemrecht* vs. *Gewoon lid — stemgerechtigd op de ALV*).

### 5. Financiële Scheiding (Art. 9 Fractievergoeding) & 4-Fasen Kieswet-Tracker
* **`src/components/admin/TreasurerManager.tsx` (`/penningmeester`):**
  * Strikte scheiding tussen het **Verenigingsvermogen (Contributies & Giften)** en het **Gemeentelijk Fractiebudget ex Verordening Steenwijkerland 2021** (€ 500 × 2 zetels = € 1.000/jaar + rato fractiereserve ex Art. 10 lid 5).
  * Toevoegen van een **Art. 9 Bestedingstoets** bij het boeken van facturen ten laste van de fractierekening (blokkeert automatisch kosten voor verkiezingscampagnes, partijvereniging of notaris en controleert de verantwoordingstermijn van 3 maanden ex Art. 11 lid 1).
* **`src/components/admin/SecretaryManager.tsx` & `src/components/admin/ChairmanManager.tsx` (`/secretaris` & `/voorzitter`):**
  * **4-Fasen Juridische & Kieswet-Roadmap Tracker:** Interactieve checklist en voortgangsbalk voor Fase 1 (Art. 7 RvO & Griffie), Fase 2 (Notaris, Boek 2 BW, WBTR, UBO & Vier-ogenprincipe), Fase 3 (Centraal Stembureau Art. G 3 Kieswet, 35-tekenscheck + € 112,50 waarborgsom) en Fase 4 (Art. H 4 Kieswet: tracker voor minimaal **20 ondersteuningsverklaringen H4** per kern + € 225 waarborgsom H14).
  * **Aspirant-leden Beoordelingsmodule:** Overzicht van aspirant-leden met startdatum, automatische berekening van de 2-jaarstermijn en vastlegging van het unanieme bestuursbesluit voor promotie naar Gewoon Lid.

### 6. Kernen-Spreekuren & Werkbezoeken in de Agenda
* **`src/data/events.ts` & `src/pages/Agenda.tsx`:**
  * Vervangen van de filosofische lezing door een realistische **Tweewekelijkse Kernen-Tour & Inwonersspreekuren** langs de kernen van Steenwijkerland (Steenwijk, Vollenhove, Giethoorn, Oldemarkt, Sint Jansklooster en Blokzijl) met duidelijke thema's (Woningbouw in de kern, Behoud zwembad & dorpshuis, Verkeersveiligheid & Ondernemersklimaat).
