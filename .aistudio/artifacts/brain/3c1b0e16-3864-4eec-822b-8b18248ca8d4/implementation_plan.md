# Advies & Uitwerkingsplan: Is deze website overkill voor een lokale politieke partij?

Dit document biedt een grondige analyse van de huidige omvang van de website en formuleert een gerichte strategie om de site optimaal af te stemmen op de behoeften van een lokale politieke partij. Het doel is om de krachtigste functies voor inwoners en kiezers centraal te stellen, terwijl het beheer en de navigatie zo overzichtelijk en efficiënt mogelijk blijven.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Samenvatting van de keuzes van de gebruiker (Phase 1 Clarifications):**
> - **Voornaamste doel**: Een analyse ontvangen van wat nuttig is en wat eventueel vereenvoudigd kan worden.
> - **Meest waardevolle functies voor kiezers**: Kernstandpunten, kandidatenlijst, nieuws en contact.
> - **Gewenste vervolgstap**: Het opstellen van dit overzichtelijke advies- en uitwerkingsplan.

---

## 1. Overview & Analyse van de Huidige Website

### Is de huidige website overkill?
- **Waarom het WÉL enorm waardevol is**:
  - De website beschikt over een rijk partijprogramma (10 thematische hoofdstukken, 30+ standpunten), interactieve videokoppelingen, fractie-/kandidatenprofielen en een actuele nieuws- en agendagrid. Dit geeft de partij een uitermate professionele, transparante en moderne uitstraling die vertrouwen wekt bij kiezers.
- **Waarom het overkill KAN aanvoelen**:
  - Mogelijke overdaad zit niet in de inhoud zelf, maar in de **visuele drukte** en **beheerscomplexiteit**:
    1. **Beheerdashboard (Admin)**: Het admin-paneel bevat veel opties (waaronder GIS/wijkkaarten, uitgebreide video-editor en geavanceerde instellingen) die voor een lokaal vrijwilligersteam als te tijdsintensief kunnen aanvoelen.
    2. **Navigatie & Homepage**: Wanneer te veel functies (video's, wijkkaarten, documenten, commissies) gelijkwaardige aandacht vragen op de homepage, raken kiezers sneller afgeleid van de hoofdboodschap.

### Strategische Conclusie
Schrap geen waardevolle functionaliteiten uit de database of code, maar **stroomlijn de presentatie** rondom de **4 Kernpijlers** (Standpunten, Kandidaten, Nieuws, Contact) en verberg geavanceerde instellingen achter een overzichtelijke 'Eenvoudig Beheer' modus.

---

## 2. User Experience & Visual Design

### A. De 4 Kernpijlers op de Homepage
1. **Pijler 1: Standpunten & Partijprogramma**
   - Directe zoekbalk op de homepage ("Zoek op thema: Wonen, Bereikbaarheid, Zorg, Duurzaamheid").
   - Duidelijke top 5 speerpunten direct in beeld met doorklik naar de volledige standpuntenpagina.
2. **Pijler 2: Onze Mensen (Kandidaten & Fractie)**
   - Overzichtelijke fotogrid met kandidaten, hun rol/buurt en hun persoonlijke drijfveer.
3. **Pijler 3: Nieuws & Lokale Agenda**
   - Recente berichten, persberichten en aankomende bijeenkomsten/raadsvergaderingen.
4. **Pijler 4: Direct Contact & Actie**
   - Duidelijke uitnodiging om vragen te stellen, een idee in te sturen of lid/vrijwilliger te worden.

### B. Secundaire Functies Rustig Integreren
- **Video's**: Niet als los drukelement op de homepage, maar als visuele verrijking *binnen* het betreffende standpunt of nieuwsbericht.
- **Wijken & Kernen**: Geïntegreerd in het standpuntenoverzicht als filteroptie in plaats van als een apart ingewikkeld hoofdmenu.

---

## 3. Key Product Decisions & Trade-Offs

- **Besluit 1: 'Snel Beheer' vs 'Geavanceerd Beheer' in het Dashboard**
  - *Gekozen Aanpak*: Het Admin Dashboard voorzien van twee tabbladen/modi:
    - **Snel Beheer (Standaard)**: Direct nieuws plaatsen, kandidaten bijwerken en contactverzoeken inzien.
    - **Geavanceerd**: Video's beheren, wijkkaarten instellen en systeeminstellingen wijzigen.
  - *Waarom*: Zo kan elk bestuurslid of vrijwilliger zonder technische kennis binnen 2 minuten nieuws of kandidaten aanpassen.

- **Besluit 2: Hoofdnavigatie Vereenvoudigen naar Kiezersbehoefte**
  - *Gekozen Aanpak*: De topbar-navigatie strikt beperken tot: `Standpunten | Onze Mensen | Nieuws & Agenda | Contact`.
  - *Waarom*: Dit geeft rust op desktop en mobiel, en leidt kiezers direct naar de informatie waar zij naar zoeken.

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LOKALE PARTIJ WEBSITE                           │
├────────────────────────────────────────────────────────────────────────┤
│  NAVIGATIEBAR: [Logo]  |  Standpunten  Onze Mensen  Nieuws  Contact    │
├────────────────────────────────────────────────────────────────────────┤
│  HERO SECTIE: Met lokale luchtfoto, verkiezingsbelofte & zoekbalk     │
├────────────────────────────────────────────────────────────────────────┤
│  HOOFDPAVELJOENEN (4 KERNPIJLERS):                                      │
│  ┌───────────────────┐ ┌───────────────────┐ ┌──────────────────────┐  │
│  │ 1. Speerpunten    │ │ 2. Kandidaten     │ │ 3. Nieuws & Agenda   │  │
│  └───────────────────┘ └───────────────────┘ └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 4. Contact & Inwonerspaneel (Vraag stellen / Lid worden)         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  BEHEERDASHBOARD (ADMIN):                                              │
│  ┌───────────────────────────────────┐ ┌────────────────────────────┐  │
│  │ [Tab 1] Snel Beheer (Nieuws/Mensen)│ │ [Tab 2] Geavanceerde Opties│  │
│  └───────────────────────────────────┘ └────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Voorgesteld Uitvoeringsplan (Vervolgstappen)

Indien u akkoord bent met dit plan, kunnen we de volgende verbeteringen doorvoeren:

1. **Stroomlijnen Hoofdnavigatie & Homepage**:
   - Menu-structuur aanpassen naar de 4 kernpijlers.
   - Homepage indelen met de focus op de speerpunten, kandidaten, nieuws en contact.
2. **Dashboard Vereenvoudigen**:
   - Een overzichtelijk 'Snel Beheer' dashboard-overzicht toevoegen voor dagelijks gebruik door de partij.
3. **Visuele Rust & Toegankelijkheid**:
   - Optimaliseren van spatiëring, typografie en mobiele weergave.
