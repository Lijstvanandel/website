export interface LegalDocumentData {
  id: string;
  slug: string;
  title: string;
  category: string;
  confidentiality: string;
  date: string;
  author: string;
  description: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  pageCount?: number;
}

export const LEGAL_DOCUMENTS: Record<string, LegalDocumentData> = {
  privacyverklaring: {
    id: "doc-juridisch-privacyverklaring",
    slug: "privacyverklaring",
    title: "Privacyverklaring",
    category: "Juridisch & Privacy",
    confidentiality: "Openbaar / Publiek",
    date: "2026-06-01",
    author: "Bestuur Lijst van Andel Steenwijkerland",
    description: "Officieel privacybeleid en verantwoording conform de Algemene Verordening Gegevensbescherming (AVG / GDPR).",
    fileUrl: "/uploads/documents/privacyverklaring_lijst_van_andel.pdf",
    fileName: "privacyverklaring_lijst_van_andel.pdf",
    fileSize: "420 KB",
    pageCount: 4,
    content: `# Privacyverklaring Lijst van Andel Steenwijkerland

*Vastgesteld door het Bestuur van Lijst van Andel*  
*Status: Officieel AVG/GDPR Privacybeleid — Laatst bijgewerkt: 1 juni 2026*

Lijst van Andel hecht de grootst mogelijke waarde aan het respecteren van uw privacy en de zorgvuldige, rechtmatige bescherming van uw persoonsgegevens. In deze privacyverklaring informeren wij u transparant over de wijze waarop wij met persoonsgegevens omgaan, voor welke doeleinden wij gegevens verwerken, hoe deze worden beveiligd en welke rechten u kunt uitoefenen.

---

### 1. Wie zijn wij? (Verwerkingsverantwoordelijke)
De vereniging en politieke partij **Lijst van Andel**, actief in de gemeente Steenwijkerland, is de verwerkingsverantwoordelijke in de zin van de Algemene Verordening Gegevensbescherming (AVG).

- **Adres:** Vendelweg 1, 8331 XE Steenwijk (Fractiekamer Lijst van Andel)
- **E-mailadres:** contact@lijstvanandel.nl / privacy@lijstvanandel.nl
- **Website:** https://lijstvanandel.nl
- **Kamer van Koophandel:** Ingeschreven in het verenigingenregister

Voor privacygerelateerde vragen, inzageverzoeken of opmerkingen kunt u te allen tijde contact opnemen met onze secretaris of privacycoördinator.

---

### 2. Welke persoonsgegevens verwerken wij en waarom?

#### A. Ledenadministratie en Ledenportaal
Wanneer u zich aanmeldt als lid van Lijst van Andel, verwerken wij:
- Uw voor- en achternaam, aanhef en geslacht;
- Uw adres, postcode en woonplaats (wijk of kern binnen Steenwijkerland);
- Uw e-mailadres en telefoonnummer;
- Uw geboortedatum (van belang voor jongeren- en seniorenparticipatie);
- Betalings- en contributiegegevens;
- Beveiligde inloggegevens (versleuteld wachtwoord en toegekende gebruikersrol).

**Doel & Grondslag:** Uitvoering van de lidmaatschapsovereenkomst en statutaire verplichtingen. Dit stelt ons in staat u uit te nodigen voor Algemene Ledenvergaderingen (ALV), fractiebijeenkomsten en u toegang te verlenen tot het besloten digitale ledenportaal en exclusieve beraadstukken.

#### B. Nieuwsbrief en Fractie-updates
Wanneer u zich via de website aanmeldt voor onze periodieke nieuwsbrief of fractie-updates:
- Uw e-mailadres;
- Aanmelddatum en optionele wijkvoorkeur.

**Doel & Grondslag:** Uw uitdrukkelijke toestemming (art. 6 lid 1 sub a AVG). Wij gebruiken uw adres uitsluitend om u te informeren over raadsnieuws, standpunten en lokale bijeenkomsten. U kunt zich te allen tijde met één klik uitschrijven via de afmeldlink onderaan iedere mailing of via onze website (/nieuwsbrief/afmelden).

#### C. Donaties en Financiële Verantwoording
Wanneer u een donatie doet ter ondersteuning van onze lokale partij:
- Uw naam en adresgegevens;
- Uw bankrekeningnummer (IBAN) en betaalmethode;
- Het donatiebedrag en de transactiedatum.

**Doel & Grondslag:** Wettelijke verplichting (art. 6 lid 1 sub c AVG) op grond van de *Wet financiering politieke partijen (Wfpp)* en de Algemene wet inzake rijksbelastingen. Giften boven de wettelijke publicatiedrempel worden conform de geldende wetgeving verantwoord aan het Ministerie van Binnenlandse Zaken en Koninkrijksrelaties.

#### D. Contactformulieren, Belafspraken en Inwonerssignalen
Wanneer u het contactformulier invult, een belafspraak plant met een raadslid of een signaal uit uw wijk doorgeeft:
- Uw naam, telefoonnummer en e-mailadres;
- De inhoud van uw bericht, vraag of melding over uw woonomgeving.

**Doel & Grondslag:** Gerechtvaardigd belang (art. 6 lid 1 sub f AVG) om als lokale volksvertegenwoordigers met u in dialoog te treden en uw signaal zorgvuldig te kunnen behandelen in de gemeenteraad.

#### E. Websitebezoek en Technische Gegevens
Onze website maakt uitsluitend gebruik van functionele en privacyvriendelijke analytische cookies:
- Geanonimiseerd IP-adres (waarbij het laatste octet direct wordt gemaskeerd);
- Type browser, besturingssysteem en schermresolutie;
- Bezochte pagina's binnen onze website.

**Privacy-garantie:** Wij verkopen nooit persoonsgegevens aan derden en maken geen gebruik van commerciële trackingpixels (zoals Facebook Pixel of commerciële remarketingnetwerken).

---

### 3. Hoe beveiligen wij uw persoonsgegevens?
Lijst van Andel hanteert strikte technische en organisatorische maatregelen om uw persoonsgegevens te beveiligen tegen verlies, misbruik of onbevoegde toegang:
- Alle dataverbindingen zijn versleuteld via moderne TLS 1.3 (HTTPS) protocollen.
- Wachtwoorden worden cryptografisch gehasht en gezouten opgeslagen.
- Toegang tot persoonsgegevens is strikt beperkt op basis van het *need-to-know* beginsel en Role-Based Access Control (RBAC).
- Exclusieve documenten zijn beveiligd met dynamische ledenwatermerken en anti-opnamemechanismen.
- Gegevensopslag vindt plaats op ISO 27001-gecertificeerde servers binnen de Europese Unie (conform AVG en BIO-richtlijnen).

---

### 4. Bewaartermijnen
Wij bewaren uw persoonsgegevens niet langer dan noodzakelijk voor de doeleinden waarvoor zij zijn verkregen:
- **Lidmaatschapsgegevens:** Gedurende de looptijd van uw lidmaatschap en maximaal 2 jaar na beëindiging voor administratieve doeleinden.
- **Financiële administratie & Donaties:** 7 jaar conform de wettelijke fiscale bewaartermijn van de Belastingdienst en de Wfpp.
- **Nieuwsbriefgegevens:** Tot het moment van uitschrijving; daarna worden de gegevens direct uit de verzendlijst verwijderd.
- **Contact- en belafspraken:** Maximaal 6 maanden na afronding van de behandeling van uw vraag of verzoek.

---

### 5. Delen van gegevens met derden
Lijst van Andel verkoopt of verhuurt uw gegevens **nooit** aan derden. Wij delen gegevens uitsluitend met betrouwbare verwerkers waarmee een AVG-verwerkersovereenkomst is afgesloten (zoals onze hostingprovider, e-maildienstverlener en betaalproviders), en uitsluitend voor zover noodzakelijk voor onze dienstverlening.

---

### 6. Uw rechten onder de AVG
Op grond van de Algemene Verordening Gegevensbescherming heeft u te allen tijde de volgende rechten:
1. **Recht op inzage:** U kunt te allen tijde opvragen welke persoonsgegevens wij van u verwerken.
2. **Recht op rectificatie:** U kunt onjuiste of onvolledige gegevens laten corrigeren.
3. **Recht op gegevenswissing:** U kunt verzoeken om verwijdering van uw gegevens, mits er geen wettelijke bewaarplicht geldt.
4. **Recht op beperking:** U kunt verzoeken de verwerking tijdelijk op te schorten.
5. **Recht op dataportabiliteit:** U kunt verzoeken uw gegevens in een gestructureerd en gangbaar machineleesbaar formaat te ontvangen.
6. **Recht van bezwaar:** U kunt bezwaar maken tegen een gegevensverwerking op basis van ons gerechtvaardigd belang.

U kunt uw verzoek indienen via **privacy@lijstvanandel.nl**. Wij reageren uiterlijk binnen vier weken op uw verzoek.

---

### 7. Klacht indienen bij de Autoriteit Persoonsgegevens
Indien u van mening bent dat wij niet zorgvuldig omgaan met uw persoonsgegevens, horen wij dat graag om dit samen met u op te lossen. Daarnaast heeft u te allen tijde het wettelijke recht om een klacht in te dienen bij de toezichthoudende autoriteit: de **Autoriteit Persoonsgegevens (AP)** via [www.autoriteitpersoonsgegevens.nl](https://www.autoriteitpersoonsgegevens.nl).

---

### 8. Wijzigingen in deze privacyverklaring
Lijst van Andel behoudt zich het recht voor deze privacyverklaring aan te passen indien wetgeving of onze processen daartoe aanleiding geven. De meest recente versie is te allen tijde raadpleegbaar op onze website.`,
  },

  voorwaarden: {
    id: "doc-juridisch-algemene-voorwaarden",
    slug: "algemene-voorwaarden",
    title: "Algemene Voorwaarden",
    category: "Juridisch & Privacy",
    confidentiality: "Openbaar / Publiek",
    date: "2026-06-01",
    author: "Bestuur Lijst van Andel Steenwijkerland",
    description: "Voorwaarden betreffende lidmaatschap, donaties, evenementen en het gebruik van de digitale kanalen van Lijst van Andel.",
    fileUrl: "/uploads/documents/algemene_voorwaarden_lijst_van_andel.pdf",
    fileName: "algemene_voorwaarden_lijst_van_andel.pdf",
    fileSize: "380 KB",
    pageCount: 3,
    content: `# Algemene Voorwaarden Lijst van Andel Steenwijkerland

*Vastgesteld door het Bestuur en de Algemene Ledenvergadering van Lijst van Andel*  
*Versie: 2.1 — Laatst herzien: 1 juni 2026*

Deze algemene voorwaarden zijn van toepassing op alle rechtsbetrekkingen tussen de politieke vereniging **Lijst van Andel** (gevestigd te Steenwijkerland) en haar leden, donateurs, vrijwilligers en bezoekers van haar websites en digitale portalen.

---

### Artikel 1: Begripsbepalingen
1. **Lijst van Andel:** De politieke vereniging en raadsfractie Lijst van Andel in Steenwijkerland.
2. **Lid:** De natuurlijke persoon die overeenkomstig de statuten is toegelaten als lid van Lijst van Andel.
3. **Platform:** De officiële website (lijstvanandel.nl), het besloten Ledenportaal, de Progressive Web App (PWA) en daaraan gekoppelde digitale diensten.
4. **Exclusieve Documenten:** Alle interne stukken, concept-verkiezingsprogramma's, fractiebijeenkomstverslagen en financiële kwartaalrapportages die uitsluitend toegankelijk zijn voor actieve leden.
5. **ALV:** De Algemene Ledenvergadering van de vereniging.

---

### Artikel 2: Toepasselijkheid
1. Deze voorwaarden zijn van toepassing op elk gebruik van het platform, elke aanmelding voor het lidmaatschap, elke donatie en elke deelname aan bijeenkomsten van Lijst van Andel.
2. Afwijkingen van deze algemene voorwaarden zijn uitsluitend geldig indien deze uitdrukkelijk en schriftelijk door het partijbestuur zijn bevestigd.
3. Door registratie als lid, het verrichten van een donatie of het inloggen op het ledenportaal stemt de gebruiker in met de toepasselijkheid van deze voorwaarden.

---

### Artikel 3: Lidmaatschap en Toelating
1. Een ieder die de grondbeginselen, doelstellingen en lokale standpunten van Lijst van Andel onderschrijft, kan een aanvraag tot lidmaatschap indienen via het platform of het officiële aanmeldformulier.
2. Het lidmaatschap staat open voor natuurlijke personen vanaf 16 jaar. Stemgerechtigde leden op de Algemene Ledenvergadering dienen ten minste 18 jaar oud te zijn.
3. Het lidmaatschap is strikt persoonlijk en niet overdraagbaar.
4. Het bestuur beslist over de toelating van nieuwe leden. Bij afwijzing kan de betrokkene in beroep gaan bij de ALV.
5. Leden mogen niet gelijktijdig lid zijn van een andere politieke partij die actief deelneemt aan de gemeenteraadsverkiezingen in Steenwijkerland, behoudens voorafgaande schriftelijke dispensatie van het bestuur.

---

### Artikel 4: Contributie en Financiële Verplichtingen
1. De hoogte van de jaarlijkse contributie wordt jaarlijks vastgesteld door de Algemene Ledenvergadering.
2. Leden zijn gehouden de contributie tijdig te voldoen via de op het platform geboden betaalmethoden (zoals iDEAL of automatische incasso).
3. Indien een lid na herhaalde herinnering in verzuim blijft met de contributiebetaling, kan het bestuur het account op het besloten platform tijdelijk opschorten en eventueel overgaan tot beëindiging van het lidmaatschap.

---

### Artikel 5: Donaties en Wet financiering politieke partijen (Wfpp)
1. Financiële giften en donaties komen ten goede aan de partijactiviteiten, verkiezingscampagnes en fractieondersteuning van Lijst van Andel in Steenwijkerland.
2. Alle donaties worden verwerkt in overeenstemming met de geldende *Wet financiering politieke partijen (Wfpp)*.
3. Anonieme donaties boven het wettelijk toegestane maximum worden geweigerd of teruggestort. Donaties van meer dan € 4.500,- op jaarbasis worden met vermelding van naam en woonplaats openbaar gemaakt in het financieel jaarverslag conform wettelijk voorschrift.
4. Donaties zijn definitief en worden niet gerestitueerd, behoudens aantoonbare technische storingen of administratieve vergissingen.

---

### Artikel 6: Gebruik van het Ledenportaal en Exclusieve Documenten
1. Aan geregistreerde leden wordt een persoonlijk account ter beschikking gesteld. Het is ten strengste verboden accountgegevens of wachtwoorden met derden te delen.
2. Documenten in het ledenportaal onder 'Exclusieve Documenten' zijn vertrouwelijk en uitsluitend bestemd voor persoonlijke inzage door het betreffende lid.
3. Het downloaden, kopiëren, fotograferen, distribueren of op enigerlei wijze openbaar maken van exclusieve documenten, concept-standpunten of interne beraadstukken zonder voorafgaande schriftelijke instemming van de fractievoorzitter of het bestuur is uitdrukkelijk verboden.
4. Het platform maakt gebruik van dynamische watermerken en beveiligingsmechanismen tegen schermopnames. Overtreding van de geheimhoudingsplicht leidt per direct tot intrekking van accounttoegang en kan grond vormen voor royement.

---

### Artikel 7: Beëindiging van het Lidmaatschap
1. Het lidmaatschap kan door het lid schriftelijk of per e-mail worden opgezegd tegen het einde van het lopende verenigingsjaar, met inachtneming van een opzegtermijn van vier weken.
2. Bij tussentijdse opzegging vindt geen restitutie plaats van reeds voldane contributie.
3. Het bestuur is bevoegd een lid te royeren indien het lid handelt in strijd met de statuten, het partijbelang ernstig schaadt of de geheimhoudingsplicht schendt.

---

### Artikel 8: Intellectueel Eigendom en Aansprakelijkheid
1. Alle intellectuele eigendomsrechten op teksten, logo's, standpunten, datamodellen en media op de website en het ledenportaal berusten bij Lijst van Andel.
2. Lijst van Andel spant zich in om correcte en actuele informatie te verstrekken, doch is niet aansprakelijk voor schade als gevolg van eventuele onjuistheden of tijdelijke technische onbeschikbaarheid van de servers.

---

### Artikel 9: Toepasselijk Recht en Geschillen
1. Op alle rechtsverhoudingen waarbij Lijst van Andel partij is, is uitsluitend **Nederlands recht** van toepassing.
2. Geschillen die niet in onderling overleg kunnen worden opgelost, worden voorgelegd aan de bevoegde rechter in het arrondissement Overijssel.`,
  },

  verwerkingsreglement: {
    id: "doc-juridisch-verwerkingsreglement",
    slug: "verwerkingsreglement",
    title: "Verwerkingsreglement",
    category: "Juridisch & Privacy",
    confidentiality: "Openbaar / Publiek",
    date: "2026-06-01",
    author: "Bestuur & Privacycoördinator Lijst van Andel",
    description: "Intern en extern reglement voor de rechtmatige verwerking en beveiliging van persoonsgegevens conform AVG en BIO.",
    fileUrl: "/uploads/documents/verwerkingsreglement_lijst_van_andel.pdf",
    fileName: "verwerkingsreglement_lijst_van_andel.pdf",
    fileSize: "450 KB",
    pageCount: 4,
    content: `# Verwerkingsreglement Persoonsgegevens Lijst van Andel

*Vastgesteld door het Bestuur van Lijst van Andel te Steenwijkerland*  
*Conform artikel 24, 30 en 32 van de Algemene Verordening Gegevensbescherming (AVG)*  
*Laatste herziening: 1 juni 2026*

Dit verwerkingsreglement legt de bindende interne en externe voorschriften vast voor de rechtmatige, transparante en veilige omgang met persoonsgegevens binnen de vereniging en de raadsfractie van Lijst van Andel.

---

### 1. Doel en Reikwijdte
1. Dit reglement is van toepassing op alle geautomatiseerde en niet-geautomatiseerde verwerkingen van persoonsgegevens die onder de verantwoordelijkheid van Lijst van Andel plaatsvinden.
2. Het reglement waarborgt dat gegevensverwerkingen plaatsvinden conform de eisen van de Algemene Verordening Gegevensbescherming (AVG), de Uitvoeringswet AVG (UAVG) en de van toepassing zijnde richtlijnen van de Baseline Informatiebeveiliging Overheid (BIO).

---

### 2. Verantwoordelijkheden en Rollen

#### A. Het Partijbestuur
Het bestuur van Lijst van Andel draagt de eindverantwoordelijkheid voor het privacy- en informatiebeveiligingsbeleid en zorgt voor de nodige technische en financiële middelen om veilige gegevensverwerking te borgen.

#### B. De Secretaris / Privacycoördinator
De secretaris is belast met de operationele coördinatie van privacyzaken:
- Het actueel houden van het Verwerkingsregister (art. 30 AVG);
- Het toezien op de naleving van dit reglement;
- Het behandelen van verzoeken van betrokkenen binnen de wettelijke termijn van 30 dagen;
- Het coördineren van de respons bij eventuele datalekken.

#### C. De Penningmeester
Verantwoordelijk voor de rechtmatige en beveiligde verwerking van financiële gegevens van leden en donateurs conform fiscale bewaartermijnen en de Wet financiering politieke partijen (Wfpp).

#### D. Fractieleden, Commissieleden en Vrijwilligers
Iedereen die uit hoofde van zijn of haar taak kennisneemt van persoonsgegevens is gebonden aan een strikte geheimhoudingsplicht en volgt de veiligheidsinstructies uit dit reglement nauwgezet op.

---

### 3. Register van Verwerkingsactiviteiten (Art. 30 AVG)
Lijst van Andel houdt een centraal verwerkingsregister bij waarin voor elke verwerking de volgende elementen worden vastgelegd:
1. De doelen van de gegevensverwerking (ledenbeheer, nieuwsbrief, donaties, wijkvertegenwoordiging, belafspraken);
2. De categorieën van betrokkenen en bijbehorende persoonsgegevens;
3. De wettelijke grondslag voor de verwerking (toestemming, overeenkomst, wettelijke verplichting of gerechtvaardigd belang);
4. De categorieën van ontvangers en verwerkers binnen de Europese Economische Ruimte (EER);
5. De gehanteerde bewaartermijnen;
6. Een beschrijving van de technische en organisatorische beveiligingsmaatregelen.

---

### 4. Beveiligingsmaatregelen en Toegangscontrole
Ter bescherming van persoonsgegevens hanteert Lijst van Andel de volgende strikte normen:
1. **Rolgebaseerde Toegang (RBAC):** Toegang tot ledendata en interne stukken is uitsluitend voorbehouden aan geautoriseerde functionarissen op basis van gedefinieerde rollen (Admin, Secretaris, Penningmeester, Fractielid, Lid).
2. **Versleuteling:** Alle gegevens tijdens transport (data-in-transit) zijn beveiligd met TLS 1.3 versleuteling. Gegevensopslag (data-at-rest) in de centrale database is versleuteld.
3. **Wachtwoord- en 2FA-beleid:** Beheerdersaccounts zijn verplicht beveiligd met tweeledige authenticatie en sterke wachtwoordhashing.
4. **Watermerken en Anti-Diefstal:** Exclusieve documenten tonen dynamische watermerken met gebruikers-ID en activeren een veiligheidsmaskering bij detectie van schermopnamesoftware.
5. **Back-ups & Continuïteit:** Dagelijkse geautomatiseerde, versleutelde back-ups op redundante datacenters binnen de Europese Unie.

---

### 5. Datalekkenprocedure (Art. 33 en 34 AVG)
1. **Definitie:** Onder een datalek wordt verstaan: een inbreuk op de beveiliging die per ongeluk of op onrechtmatige wijze leidt tot de vernietiging, het verlies, de wijziging of de ongeoorloofde verstrekking van of toegang tot persoonsgegevens.
2. **Meldingsplicht binnen de organisatie:** Een ieder die een (mogelijk) datalek constateert, meldt dit per direct bij de secretaris en voorzitter.
3. **Melding aan de Autoriteit Persoonsgegevens (AP):** Indien aannemelijk is dat het datalek leidt tot een risico voor de rechten en vrijheden van betrokkenen, meldt de secretaris dit binnen **72 uur** na ontdekking aan de Autoriteit Persoonsgegevens.
4. **Informatie aan betrokkenen:** Wanneer een inbreuk waarschijnlijk een hoog risico oplevert voor de persoonlijke levenssfeer van betrokkenen, worden zij onverwijld schriftelijk of per e-mail geïnformeerd over het incident, de mogelijke gevolgen en de genomen maatregelen.
5. **Intern Incidentenregister:** Alle incidenten, ongeacht of melding bij de AP verplicht is, worden gedocumenteerd in het interne incidentenregister met toelichting op de corrigerende acties.

---

### 6. Afhandeling van Verzoeken van Betrokkenen
1. Betrokkenen kunnen hun rechten (inzage, rectificatie, verwijdering, bezwaar, beperking en gegevensoverdraagbaarheid) uitoefenen via **privacy@lijstvanandel.nl**.
2. Verzoeken worden binnen uiterlijk 30 kalenderdagen schriftelijk beantwoord door de secretaris.
3. Bij twijfel over de identiteit van de verzoeker kan om nadere verificatie worden gevraagd ter bescherming van persoonsgegevens.

---

### 7. Verwerkersovereenkomsten met Leveranciers
1. Met iedere externe leverancier die in opdracht van Lijst van Andel persoonsgegevens verwerkt (zoals IT-hostingbedrijven, administratiesoftware en nieuwsbriefplatformen), wordt vooraf een AVG-verwerkersovereenkomst gesloten.
2. Daarin wordt contractueel vastgelegd dat gegevens uitsluitend binnen de Europese Economische Ruimte (EER) worden verwerkt en niet voor eigen doeleinden van de verwerker mogen worden aangewend.

---

### 8. Geheimhouding en Integriteit
Alle bestuursleden, fractieleden en vrijwilligers die toegang hebben tot persoonsgegevens tekenen een geheimhoudingsverklaring. Deze verplichting tot geheimhouding blijft ook na beëindiging van het lidmaatschap of de functie onverkort van kracht.

---

### 9. Evaluatie en Inwerkingtreding
Dit verwerkingsreglement treedt in werking op 1 juni 2026. Het reglement wordt ten minste eenmaal per twee jaar door het bestuur geëvalueerd en geactualiseerd.`,
  },
};

export function getLegalDocumentBySlug(slug: string): LegalDocumentData | null {
  const normalized = slug.toLowerCase().replace(/[-_]/g, "");
  if (normalized.includes("privacy")) return LEGAL_DOCUMENTS.privacyverklaring;
  if (normalized.includes("voorwaarden") || normalized.includes("algemeen")) return LEGAL_DOCUMENTS.voorwaarden;
  if (normalized.includes("verwerking") || normalized.includes("reglement")) return LEGAL_DOCUMENTS.verwerkingsreglement;
  return null;
}
