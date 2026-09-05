import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import os from "os";
import { exec } from "child_process";
import util from "util";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import Stripe from "stripe";
import { createServer as createViteServer } from "vite";
import { BUURTKAART_43_WIJKEN, syncWijkenWithBuurtkaart, LEGACY_SLUG_MAP } from "./src/data/defaultWijken.js";
import { getPageMetadata, injectMetadataIntoHtml } from "./src/server/metaGenerator.js";

// NodeMailer helper logic
function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendTransactionalEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  const transporter = getEmailTransporter();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"Lijst van Andel" <info@lijstvanandel.nl>';

  if (!transporter) {
    console.log(`[EMAIL DISPATCH - SIMULATION MODE]
  Geen SMTP-configuratie gevonden in omgevingsvariabelen (SMTP_HOST, SMTP_USER, SMTP_PASS).
  Naar: ${to}
  Onderwerp: ${subject}
  Preview text: ${text || html.replace(/<[^>]+>/g, "").slice(0, 150)}...`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
    });
    console.log(`[EMAIL DISPATCH - VERZONDEN VIA SMTP] E-mail succesvol verstuurd naar ${to}, Message ID: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`[EMAIL DISPATCH - FOUT BIJ VERZENDEN VIA SMTP]:`, err.message);
    return false;
  }
}

const execPromise = util.promisify(exec);
let lastCacheClearedTime: string | null = null;
let lastSystemSyncTime: string | null = null;

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-dev-key";
const DB_FILE = path.join(process.cwd(), "db.json");

// Stripe Lazy Initialization Client
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

function resolveRequestOrigin(req: any): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = (typeof forwardedProto === "string" ? forwardedProto.split(",")[0].trim() : null) || (req.secure ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  let origin = req.headers.origin || `${proto}://${host}`;
  if (origin.includes("run.app") && origin.startsWith("http://")) {
    origin = origin.replace("http://", "https://");
  }
  return origin;
}

// Ensure upload directories exist
const UPLOAD_DIRS = [
  "public/uploads",
  "public/uploads/fractieleden",
  "public/uploads/videos",
  "public/uploads/news",
  "public/uploads/events",
  "public/uploads/wijken",
  "public/uploads/documents",
  "public/uploads/stemgedrag",
  "public/uploads/dataproducts",
];
UPLOAD_DIRS.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], fractieleden: [], videos: [], news: [], events: [] }));
}

function getDb() {
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (!db.fractieleden) db.fractieleden = [];
  if (!db.videos) db.videos = [];
  if (!db.belafspraken) db.belafspraken = [];
  if (!db.news || !Array.isArray(db.news) || db.news.length === 0) {
    db.news = [
      {
        id: "kopwijzer-rtv-slos",
        title: "Sammy van Andel te gast bij Kopwijzer (RTV SLOS)",
        excerpt: "In de uitzending van Kopwijzer sprak Sammy met de presentator over de speerpunten van Lijst van Andel en de lokale agenda.",
        description: "In de uitzending van Kopwijzer sprak Sammy met de presentator over de speerpunten van Lijst van Andel en de lokale agenda.",
        content: "<p>Tijdens de uitzending van Kopwijzer op RTV SLOS ging Sammy van Andel uitgebreid in op de lokale prioriteiten van Lijst van Andel.</p><p>Onderwerpen die voorbijkwamen waren onder meer voorrang voor eigen inwoners op de woningmarkt, het behoud van de Weerribben-Wieden en een bestuurscultuur die dichter bij de inwoner staat. Sammy benadrukte het belang van een lokale, onafhankelijke stem in de raad — vrij van Haagse invloeden.</p>",
        date: "2026-04-18",
        createdAt: "2026-04-18T10:00:00.000Z",
        author: "Redactie",
        thumbnailUrl: "/assets/news-kopwijzer.jpg",
        headerUrl: "/assets/news-kopwijzer.jpg",
        category: "Media"
      },
      {
        id: "nieuwe-impulsen-binnenstad",
        title: "Lijst van Andel pleit voor nieuwe impulsen in de binnenstad",
        excerpt: "De fractie dient een motie in om leegstand op de Markt actief aan te pakken en lokale ondernemers ruimte te geven.",
        description: "De fractie dient een motie in om leegstand op de Markt actief aan te pakken en lokale ondernemers ruimte te geven.",
        content: "<p>In de komende raadsvergadering dient Lijst van Andel een motie in die het college oproept met een concreet plan te komen om leegstand in het centrum van Steenwijk te bestrijden.</p><p>Volgens de fractie verdient de binnenstad een impuls die past bij de identiteit van de gemeente: ruimte voor lokale ondernemers, sfeer op de Markt en een aantrekkelijk verblijfsklimaat voor inwoners én bezoekers.</p>",
        date: "2026-05-02",
        createdAt: "2026-05-02T14:30:00.000Z",
        author: "Lijst van Andel",
        thumbnailUrl: "/assets/markt-steenwijk.jpg",
        headerUrl: "/assets/markt-steenwijk.jpg",
        category: "Politiek",
        wijkSlug: "steenwijk-centrum",
        wijkNaam: "Steenwijk Centrum / Binnenstad"
      }
    ];
    saveDb(db);
  }
  if (!db.events || !Array.isArray(db.events) || db.events.length === 0) {
    db.events = [
      {
        id: "1788383596955",
        title: "Inloopavond en Ideeëncafé Steenwijkerland",
        date: "2026-09-15",
        address: "Markt 1, Steenwijk",
        startTime: "19:30",
        endTime: "21:30",
        shortDescription: "Praat mee over de toekomst van onze gemeente. Iedereen is welkom voor een open gesprek met fractieleden onder het genot van koffie.",
        description: "<p>Lijst van Andel organiseert een openbare inloopavond in het hart van Steenwijk. Tijdens dit ideeëncafé gaan fractieleden en inwoners met elkaar in gesprek over actuele thema's die spelen in onze wijken en kernen.</p><h3>Wat staat er op de agenda?</h3><ul class=\"list-disc pl-6 my-4 space-y-1\"><li>Woningbouw en voorrang voor lokale inwoners</li><li>Leefbaarheid in de dorpen en bereikbaarheid van voorzieningen</li><li>Ruimte voor vragen, ideeën en directe input voor de gemeenteraad</li></ul><p>Aanmelden is gratis. We zien u graag op dinsdag 15 september op de Markt in Steenwijk!</p>",
        isPublic: true,
        isPublished: true,
        isCancelled: false,
        lat: 52.7901,
        lng: 6.1186,
        thumbnailUrl: "/assets/markt-steenwijk.jpg",
        attendees: [],
        createdAt: "2026-09-02T21:13:16.955Z"
      }
    ];
    saveDb(db);
  } else {
    // Ensure all existing events have shortDescription
    let changed = false;
    db.events.forEach((e: any) => {
      if (!e.shortDescription) {
        e.shortDescription = e.description ? e.description.replace(/<[^>]*>/g, '').substring(0, 160) : "";
        changed = true;
      }
    });
    if (changed) saveDb(db);
  }
  if (!db.categories || !Array.isArray(db.categories) || db.categories.length === 0) {
    db.categories = [
      { id: "cat-1", name: "Politiek", slug: "politiek", description: "Standpunten, moties en raadsdebatten van de fractie", color: "#c6a858" },
      { id: "cat-2", name: "Media", slug: "media", description: "Interviews, artikelen en optredens in de media", color: "#2d6a4f" },
      { id: "cat-3", name: "Wijken & Kernen", slug: "wijken-en-kernen", description: "Lokaal nieuws uit de wijken en dorpen in Steenwijkerland", color: "#3d5a80" },
      { id: "cat-4", name: "Woningbouw", slug: "woningbouw", description: "Huisvesting, woningmarkt en nieuwbouw voor inwoners", color: "#d4a373" },
      { id: "cat-5", name: "Evenementen", slug: "evenementen", description: "Inloopavonden, bijeenkomsten en acties", color: "#e76f51" },
      { id: "cat-6", name: "Algemeen", slug: "algemeen", description: "Algemene mededelingen van Lijst van Andel", color: "#6c757d" }
    ];
    saveDb(db);
  }
  if (!db.contactMessages || !Array.isArray(db.contactMessages)) {
    db.contactMessages = [
      {
        id: "msg-1",
        name: "Jan Mulder",
        email: "jan.mulder@outlook.com",
        phone: "06-12345678",
        subject: "Vraag over starterslening en nieuwbouw Steenwijkerland",
        message: "Beste fractie van Lijst van Andel,\n\nIk las jullie speerpunt over voorrang voor eigen inwoners bij woningbouw. Ik woon al mijn hele leven in Steenwijk en zoek al geruime tijd een betaalbare starterswoning. Hebben jullie plannen om de starterslening in onze gemeente te verruimen of nieuwe projecten te versnellen?\n\nMet vriendelijke groet,\nJan Mulder",
        status: "moet nog beantwoord worden",
        createdAt: "2026-09-01T14:20:00.000Z",
        handledAt: null,
        handledBy: null,
        notes: ""
      },
      {
        id: "msg-2",
        name: "Astrid de Boer",
        email: "astrid.deboer@gmail.com",
        phone: "06-98765432",
        subject: "Snelheid en verkeersveiligheid Oostermeenthe",
        message: "Goedemiddag,\n\nGraag wil ik aandacht vragen voor de verkeerssituatie rondom de basisschool in Oostermeenthe. Er wordt regelmatig te hard gereden tijdens het halen en brengen van de kinderen. Kan de fractie hier aandacht voor vragen in de raad of een verzoek indienen bij het college?\n\nAlvast hartelijk dank,\nAstrid de Boer",
        status: "afgehandeld",
        createdAt: "2026-08-28T09:15:00.000Z",
        handledAt: "2026-08-29T11:00:00.000Z",
        handledBy: "Sammy van Andel",
        notes: "Telefonisch besproken met mw. De Boer. Schriftelijke vragen voorbereid voor wethouder mobiliteit."
      }
    ];
    saveDb(db);
  }
  if (!db.faqs || !Array.isArray(db.faqs) || db.faqs.length === 0) {
    db.faqs = [
      {
        id: "faq-1",
        question: "Wat is de werkwijze van Lijst van Andel in Steenwijkerland?",
        answer: "Lijst van Andel staat voor een nuchtere, transparante en direct benaderbare lokale politiek. Wij geloven in duidelijke taal, gezond verstand en besluitvorming mét de inwoners in plaats van over hen. Wij zijn actief in alle wijken van Steenwijk en de omliggende kernen van Steenwijkerland.",
        category: "Algemeen",
        order: 1,
        published: true,
        createdAt: "2026-08-15T10:00:00.000Z"
      },
      {
        id: "faq-2",
        question: "Hoe kan ik als inwoner een probleem of idee doorgeven aan de fractie?",
        answer: "U kunt ons direct een bericht sturen via het contactformulier op deze pagina, een persoonlijke belafspraak van maximaal 30 minuten inplannen met een van onze raadsleden, of ons mailen via info@lijstvanandel.nl. Wij reageren doorgaans binnen 1 tot 2 werkdagen en brengen relevante signalen in bij de gemeenteraad of commissievergaderingen.",
        category: "Contact & Inwoners",
        order: 2,
        published: true,
        createdAt: "2026-08-15T10:05:00.000Z"
      },
      {
        id: "faq-3",
        question: "Wat houdt een belafspraak met een fractielid precies in?",
        answer: "Iedere woensdag-, donderdag- en vrijdagavond tussen 19:00 en 21:00 reserveren onze raadsleden tijd voor een-op-een telefonische gesprekken met inwoners. U kiest zelf het gewenste tijdslot via de knop 'Belafspraak inplannen'. Het gesprek duurt maximaal 30 minuten, is vertrouwelijk en vrijblijvend.",
        category: "Contact & Inwoners",
        order: 3,
        published: true,
        createdAt: "2026-08-15T10:10:00.000Z"
      },
      {
        id: "faq-4",
        question: "Wat zijn de belangrijkste speerpunten van Lijst van Andel?",
        answer: "Onze kernprioriteiten zijn: voorrang voor eigen inwoners bij woningbouw en toewijzing, behoud en versterking van onze natuur en het veengebied, behoud van voorzieningen en basisscholen in de dorpen en kernen, lagere lokale lasten en een moderne, digitale en efficiënte overheid.",
        category: "Politiek & Standpunten",
        order: 4,
        published: true,
        createdAt: "2026-08-15T10:15:00.000Z"
      },
      {
        id: "faq-5",
        question: "Hoe kan ik lid worden of mij inzetten voor de fractie?",
        answer: "Iedere inwoner van Steenwijkerland die zich herkent in onze visie kan zich aansluiten via de pagina 'Lid worden' of de steunfractie versterken. Als lid ontvangt u uitnodigingen voor onze inloopbijeenkomsten, fractievergaderingen en kunt u meedenken over moties en plannen.",
        category: "Lidmaatschap",
        order: 5,
        published: true,
        createdAt: "2026-08-15T10:20:00.000Z"
      },
      {
        id: "faq-6",
        question: "Hoe kan ik een raadsvergadering bijwonen of inspreken?",
        answer: "De vergaderingen van de gemeenteraad van Steenwijkerland in het gemeentehuis te Steenwijk zijn openbaar. U kunt inspreken tijdens het vragenuur voor inwoners aan het begin van raads- en commissievergaderingen. Neem gerust vooraf contact met ons op als u advies wilt over het inspreekrecht of om uw onderwerp samen voor te bereiden.",
        category: "Politiek & Standpunten",
        order: 6,
        published: true,
        createdAt: "2026-08-15T10:25:00.000Z"
      }
    ];
    saveDb(db);
  }

  const DEFAULT_WIJKEN = BUURTKAART_43_WIJKEN;

  // Ensure database is populated and synchronized with the official 42 Buurtkaart units (excluding Groot binnenwater)
  db.wijken = syncWijkenWithBuurtkaart(db.wijken || []);
  saveDb(db);

  if (!db.documents || !Array.isArray(db.documents) || db.documents.length === 0) {
    db.documents = [
      {
        id: "doc-concept-programma-2026",
        title: "Concept Partijprogramma 2026-2030",
        description: "Meest recente vertrouwelijke versie ter inzage voor de ALV en fractieberaad met amendementsruimte.",
        category: "Partijprogramma",
        confidentiality: "Vertrouwelijk - Alleen Leden",
        date: "2026-05-10",
        fileUrl: "/uploads/documents/concept_partijprogramma_2026.pdf",
        fileName: "concept_partijprogramma_2026.pdf",
        fileSize: "1.8 MB",
        pageCount: 3,
        author: "Sammy van Andel & Programmacommissie",
        createdAt: "2026-05-10T09:00:00.000Z",
        content: "HOOFDSTUK 1: WONINGBOUW & LEEFBAARHEID IN STEENWIJKERLAND\\n\\n1.1 Voorrang voor lokale woningzoekenden\\nLijst van Andel stelt vast dat starters en senioren uit onze eigen kernen en wijken te vaak buiten de boot vallen. In het nieuwe programma eisen wij bindende voorrangsregels voor lokale inwoners bij nieuwbouwprojecten in Steenwijk en omliggende kernen.\\n\\n1.2 Behoud van het unieke landschap\\nBouwen doen we met respect voor het Weerribben-Wieden gebied en ons waardevolle cultuurlandschap. Geen massale hoogbouw in authentieke dorpsgezichten.\\n\\nHOOFDSTUK 2: VOORZIENINGEN & BEREIKBAARHEID\\n\\n2.1 Basisscholen en dorpshuizen\\nIedere kern moet kunnen rekenen op het behoud van ontmoetingsplekken. Het buurthuis is het kloppend hart van de dorpsgemeenschap.\\n\\n2.2 Openbaar vervoer en buurtbussen\\nVerbetering van de aansluiting tussen de buitengebieden en het NS-station in Steenwijk.\\n\\nHOOFDSTUK 3: TRANSPARANTE BESTUURSSTIJL\\n\\nFractieleden zijn direct aanspreekbaar. Besluiten worden genomen in open dialoog met wijkvertegenwoordigers."
      },
      {
        id: "doc-financieel-jaarverslag-2025",
        title: "Financieel Jaarverslag & Begroting 2026",
        description: "Volledige financiële verantwoording van de penningmeester inclusief kascommissieverslag en reserveopbouw.",
        category: "Financiën",
        confidentiality: "Strikt Vertrouwelijk",
        date: "2026-03-28",
        fileUrl: "/uploads/documents/financieel_jaarverslag_2025.pdf",
        fileName: "financieel_jaarverslag_2025.pdf",
        fileSize: "840 KB",
        pageCount: 2,
        author: "Penningmeester Lijst van Andel",
        createdAt: "2026-03-28T14:30:00.000Z",
        content: "FINANCIEEL OVERZICHT BOEKJAAR 2025\\n\\n1. BATEN & INKOMSTEN\\n- Contributies geregistreerde leden: € 14.850,-\\n- Vrijwillige donaties & giften: € 6.420,-\\n- Totaal baten: € 21.270,-\\n\\n2. LASTEN & UITGAVEN\\n- Communicatie, website & ledenportaal: € 4.150,-\\n- Zaalhuur ALV & wijkbijeenkomsten: € 2.800,-\\n- Drukwerk & flyers kernenbezoek: € 3.200,-\\n- Reserve campagnekas gemeenteraad 2026: € 9.500,-\\n- Algemene administratie & bankkosten: € 820,-\\n- Totaal lasten: € 20.470,-\\n\\n3. RESULTAAT & BALANS\\nPositief exploitatiesaldo van € 800,- toegevoegd aan de algemene reserve.\\n\\n4. KASCOMMISSIEVERKLARING\\nDe kascommissie heeft de boeken en bankafschriften gecontroleerd en adviseert de ALV om het bestuur decharge te verlenen."
      },
      {
        id: "doc-fractiestatuut-reglement",
        title: "Fractiestatuut & Huishoudelijk Reglement",
        description: "Interne gedragsregels, stemprocedures en vertrouwelijkheidsrichtlijnen van Lijst van Andel.",
        category: "Statuten & Reglementen",
        confidentiality: "Vertrouwelijk - Alleen Leden",
        date: "2026-01-15",
        fileUrl: "/uploads/documents/fractiestatuut_en_reglement.pdf",
        fileName: "fractiestatuut_en_reglement.pdf",
        fileSize: "620 KB",
        pageCount: 2,
        author: "Fractiebestuur",
        createdAt: "2026-01-15T11:00:00.000Z",
        content: "FRACTIESTATUUT LIJST VAN ANDEL\\n\\nARTIKEL 1: GEMEENSCHAPPELIJKE VERANTWOORDELIJKHEID\\n1. De fractie van Lijst van Andel vertegenwoordigt de inwoners van Steenwijkerland op basis van het verkiezingsprogramma en lokale speerpunten.\\n2. Leden en fractieleden handelen te allen tijde integer, transparant en met respect voor elkaar.\\n\\nARTIKEL 2: VERTROUWELIJKHEID & DIGITALE STUKKEN\\n1. Documenten aangemerkt als vertrouwelijk zijn uitsluitend bestemd voor geregistreerde leden en fractieleden.\\n2. Het delen, exporteren of kopiëren van interne beraadstukken zonder schriftelijke instemming van de fractievoorzitter is uitdrukkelijk verboden.\\n\\nARTIKEL 3: BESLUITVORMING & STEMPROCEDURE\\n1. Besluiten binnen de fractie worden bij voorkeur genomen op basis van consensus.\\n2. Bij stemming beslist de gewone meerderheid der uitgebrachte geldige stemmen."
      }
    ];
    saveDb(db);
  }

  if (!db.stemgedrag || !Array.isArray(db.stemgedrag) || db.stemgedrag.length === 0) {
    db.stemgedrag = [
      {
        id: "motie-voorrang-lokale-inwoners",
        title: "Motie: Minimaal 50% voorrang voor lokale woningzoekenden bij nieuwbouw",
        category: "motie",
        motionType: "eigen",
        vote: "voor",
        date: "2026-05-20",
        raadsvergadering: "Raadsvergadering 20 mei 2026",
        resultaat: "Aangenomen",
        description: "Lijst van Andel heeft deze motie zelf opgesteld en ingediend om bindende afspraken te maken dat minimaal 50% van de nieuwe koop- en huurwoningen in Steenwijkerland met voorrang wordt toegewezen aan inwoners met een aantoonbare economische of maatschappelijke binding met onze gemeente of dorpen. Onze eigen jeugd en gezinnen mogen niet langer verdrongen worden op de woningmarkt.",
        imageUrl: "/assets/markt-steenwijk.jpg",
        pdfUrl: "",
        pdfFileName: "",
        createdAt: "2026-05-20T19:30:00.000Z"
      },
      {
        id: "motie-behoud-dorpshuizen",
        title: "Motie: Structurele subsidiebescherming dorpshuizen en buurthuizen",
        category: "motie",
        motionType: "mede-indiener",
        vote: "voor",
        date: "2026-04-14",
        raadsvergadering: "Raadsvergadering 14 april 2026",
        resultaat: "Aangenomen",
        description: "Als trotse mede-indiener van deze motie staan wij pal voor het behoud van de ontmoetingsplekken in al onze kernen. Het dorpshuis is het kloppend hart van het verenigingsleven. We hebben vóór gestemd omdat bezuinigingen op onze dorpshuizen onacceptabel zijn voor de leefbaarheid en sociale samenhang in het buitengebied.",
        imageUrl: "/assets/t-wiede.jpg",
        pdfUrl: "",
        pdfFileName: "",
        createdAt: "2026-04-14T20:00:00.000Z"
      },
      {
        id: "motie-verhoging-ozb-tarief",
        title: "Raadsvoorstel: Extra verhoging van de Onroerendezaakbelasting (OZB)",
        category: "voorstel",
        motionType: "regulier",
        vote: "tegen",
        date: "2026-03-10",
        raadsvergadering: "Raadsvergadering 10 maart 2026",
        resultaat: "Verworpen",
        description: "Wij hebben resoluut TEGEN dit voorstel gestemd. De woon- en leeflasten voor gezinnen en ondernemers in Steenwijkerland zijn de afgelopen jaren al onevenredig gestegen. De gemeente moet eerst kritisch naar de eigen ambtelijke uitgaven kijken en efficiënter werken voordat de rekening opnieuw bij de hardwerkende inwoner wordt neergelegd.",
        imageUrl: "/assets/stemmen.jpg",
        pdfUrl: "",
        pdfFileName: "",
        createdAt: "2026-03-10T21:15:00.000Z"
      }
    ];
    saveDb(db);
  }

  if (!db.membershipSettings) {
    db.membershipSettings = {
      enabled: true,
      amount: 12.00,
      currency: "eur",
      interval: "year",
      productName: "Lidmaatschap Lijst van Andel (1 jaar)",
      description: "Jaarlijkse partijcontributie voor leden van Lijst van Andel",
      requirePaymentAtRegistration: true,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
  }

  return db;
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subfolder = 'public/uploads';
    const url = req.originalUrl || req.url || '';
    if (file.fieldname === 'img') {
      subfolder = 'public/uploads/fractieleden';
    } else if (file.fieldname === 'video') {
      subfolder = 'public/uploads/videos';
    } else if (file.fieldname === 'thumbnail' && url.includes('/videos')) {
      subfolder = 'public/uploads/videos';
    } else if (url.includes('/dataproduct') || file.fieldname === 'dataproduct' || file.originalname.toLowerCase().endsWith('.html') || file.originalname.toLowerCase().endsWith('.htm')) {
      subfolder = 'public/uploads/dataproducts';
    } else if (url.includes('/news') || url.includes('/upload-image') || file.fieldname === 'image') {
      subfolder = 'public/uploads/news';
    } else if (url.includes('/events')) {
      subfolder = 'public/uploads/events';
    } else if (url.includes('/wijken') || file.fieldname === 'banner' || file.fieldname === 'foto') {
      subfolder = 'public/uploads/wijken';
    } else if (url.includes('/stemgedrag') || url.includes('/moties')) {
      subfolder = 'public/uploads/stemgedrag';
    } else if (url.includes('/documents') || file.fieldname === 'document' || file.fieldname === 'pdf') {
      subfolder = 'public/uploads/documents';
    }
    const fullDir = path.join(process.cwd(), subfolder);
    if (!fs.existsSync(fullDir)) {
      try {
        fs.mkdirSync(fullDir, { recursive: true });
      } catch (err) {
        console.error('Error creating directory', fullDir, err);
      }
    }
    cb(null, fullDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

function mirrorUploadToDist(subpath: string) {
  try {
    const src = path.join(process.cwd(), "public", subpath);
    const dest = path.join(process.cwd(), "dist", subpath);
    if (fs.existsSync(src)) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  } catch (e) {
    // ignore
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Gzip/Brotli compression middleware for Core Web Vitals & fast LCP
  app.use(compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  // Support raw body for Stripe webhook signature verification
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/stripe/webhook') {
      next();
    } else {
      express.json({ limit: "50mb" })(req, res, next);
    }
  });

  // Explicitly serve uploaded assets with PDF content-type and inline disposition
  const uploadsPath = path.join(process.cwd(), "public", "uploads");

  // Sync public uploads into dist uploads on startup
  try {
    const syncFolders = ["stemgedrag", "dataproducts", "news", "documents", "events", "fractieleden"];
    for (const folder of syncFolders) {
      const pubFolder = path.join(uploadsPath, folder);
      const distFolder = path.join(process.cwd(), "dist", "uploads", folder);
      if (fs.existsSync(pubFolder) && fs.existsSync(path.join(process.cwd(), "dist"))) {
        if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder, { recursive: true });
        const files = fs.readdirSync(pubFolder);
        for (const f of files) {
          const srcF = path.join(pubFolder, f);
          const dstF = path.join(distFolder, f);
          if (fs.statSync(srcF).isFile() && !fs.existsSync(dstF)) {
            fs.copyFileSync(srcF, dstF);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
  const staticUploadsOptions = {
    maxAge: 86400000 * 7, // 7 days browser cache
    dotfiles: 'allow' as const,
    setHeaders: (res: any, filePath: string) => {
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      } else if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      } else if (/\.(jpg|jpeg|png|webp|svg|gif)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      }
    }
  };

  // Dedicated route for interactive .html dataproducts (Folium maps, Plotly graphs, etc.)
  app.get("/uploads/dataproducts/:filename", (req, res, next) => {
    const safeFilename = path.basename(req.params.filename);
    const candidatePaths = [
      path.join(uploadsPath, "dataproducts", safeFilename),
      path.join(process.cwd(), "dist", "uploads", "dataproducts", safeFilename),
      path.join(uploadsPath, safeFilename)
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.sendFile(p);
      }
    }
    next();
  });

  // Dedicated routes with cross-folder fallback for uploaded documents/PDFs
  app.get("/uploads/stemgedrag/:filename", (req, res, next) => {
    const filePath = path.join(uploadsPath, "stemgedrag", req.params.filename);
    if (fs.existsSync(filePath)) {
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
      return res.sendFile(filePath);
    }
    const fallbackPath = path.join(uploadsPath, "documents", req.params.filename);
    if (fs.existsSync(fallbackPath)) {
      if (fallbackPath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
      return res.sendFile(fallbackPath);
    }
    next();
  });

  app.get("/uploads/documents/:filename", (req, res, next) => {
    const filePath = path.join(uploadsPath, "documents", req.params.filename);
    if (fs.existsSync(filePath)) {
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
      return res.sendFile(filePath);
    }
    const fallbackPath = path.join(uploadsPath, "stemgedrag", req.params.filename);
    if (fs.existsSync(fallbackPath)) {
      if (fallbackPath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
      return res.sendFile(fallbackPath);
    }
    next();
  });

  // Guaranteed document streaming endpoint that Nginx static regex will NEVER intercept (bypasses .pdf static regex)
  app.get("/api/document/view", (req: any, res: any) => {
    const rawFile = req.query.file || req.query.path || "";
    if (!rawFile || typeof rawFile !== "string") {
      return res.status(400).json({ error: "Geen bestandspad opgegeven" });
    }

    const cleanPath = rawFile.replace(/^\/+/, "").replace(/\.\./g, "");
    const baseName = path.basename(cleanPath);

    const candidatePaths = [
      path.join(process.cwd(), "public", cleanPath),
      path.join(process.cwd(), cleanPath),
      path.join(process.cwd(), "public", "uploads", "stemgedrag", baseName),
      path.join(process.cwd(), "public", "uploads", "documents", baseName),
      path.join(process.cwd(), "public", "uploads", baseName),
      path.join(process.cwd(), "dist", cleanPath),
      path.join(process.cwd(), "dist", "uploads", "stemgedrag", baseName),
      path.join(process.cwd(), "dist", "uploads", "documents", baseName)
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        const ext = path.extname(p).toLowerCase();
        if (ext === ".pdf") {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", `inline; filename="${baseName}"`);
        } else if (ext === ".jpg" || ext === ".jpeg") {
          res.setHeader("Content-Type", "image/jpeg");
        } else if (ext === ".png") {
          res.setHeader("Content-Type", "image/png");
        }
        return res.sendFile(p);
      }
    }

    return res.status(404).json({ error: `Document '${baseName}' kon niet worden gevonden op de server.` });
  });

  // Guaranteed endpoint for viewing and embedding interactive .html dataproducts (Folium kaarten, Plotly etc.)
  app.get("/api/dataproduct/view", (req: any, res: any) => {
    const rawFile = req.query.file || req.query.path || "";
    if (!rawFile || typeof rawFile !== "string") {
      return res.status(400).json({ error: "Geen bestandspad opgegeven" });
    }

    const cleanPath = rawFile.replace(/^\/+/, "").replace(/\.\./g, "");
    const baseName = path.basename(cleanPath);

    const candidatePaths = [
      path.join(process.cwd(), "public", "uploads", "dataproducts", baseName),
      path.join(process.cwd(), "dist", "uploads", "dataproducts", baseName),
      path.join(process.cwd(), "public", cleanPath),
      path.join(process.cwd(), cleanPath),
      path.join(process.cwd(), "dist", cleanPath),
      path.join(process.cwd(), "public", "uploads", baseName),
      path.join(process.cwd(), "dist", "uploads", baseName)
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.sendFile(p);
      }
    }

    return res.status(404).json({ error: `Dataproduct '${baseName}' kon niet worden gevonden op de server.` });
  });

  app.use("/uploads", express.static(uploadsPath, staticUploadsOptions));
  app.use("/public/uploads", express.static(uploadsPath, staticUploadsOptions));
  app.use("/api/uploads", express.static(uploadsPath, staticUploadsOptions));

  // Middleware for checking auth & admin
  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Niet geautoriseerd" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const db = getDb();
      const user = db.users.find((u: any) => u.id === decoded.id);
      if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Ongeldige token" });
    }
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Toegang geweigerd: beheerdersrechten vereist" });
    }
    next();
  };

  // Auth Routes
  app.post("/api/register", async (req, res) => {
    const { salutation, fullName, address, city, username, email, password, remarks, directDebit, newsletterSubscribed } = req.body;
    const db = getDb();
    if (db.users.find((u: any) => u.username === username)) {
      return res.status(400).json({ error: "Gebruikersnaam is al in gebruik." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const isFirstUser = db.users.length === 0;
    const isAdminUser = username === 'admin' || isFirstUser;
    const resolvedEmail = (email && typeof email === 'string') ? email.trim() : (username.includes('@') ? username : '');

    const settings = db.membershipSettings || {
      enabled: true,
      amount: 12.00,
      currency: "eur",
      interval: "year",
      productName: "Lidmaatschap Lijst van Andel (1 jaar)",
      description: "Jaarlijkse partijcontributie voor leden van Lijst van Andel",
      requirePaymentAtRegistration: true,
    };

    const initialBillingStatus = isAdminUser ? 'exempt' : (settings.enabled && settings.requirePaymentAtRegistration ? 'pending' : 'paid');

    const newUser: any = {
      id: Date.now().toString(),
      salutation, 
      fullName, 
      address, 
      city, 
      username, 
      email: resolvedEmail,
      password: hashedPassword, 
      remarks, 
      directDebit,
      newsletterSubscribed: newsletterSubscribed !== undefined ? Boolean(newsletterSubscribed) : true,
      role: isAdminUser ? 'admin' : 'member',
      isActive: true,
      billingStatus: initialBillingStatus,
      paidAmount: initialBillingStatus === 'paid' ? Number(settings.amount) || 12 : 0,
      paidAt: initialBillingStatus === 'paid' ? new Date().toISOString() : null,
      paidUntil: initialBillingStatus === 'paid' ? new Date(Date.now() + 365*24*60*60*1000).toISOString() : null,
      stripeCustomerId: null,
      stripeSessionId: null,
      createdAt: new Date().toISOString()
    };

    let checkoutUrl: string | null = null;
    let sessionId: string | null = null;

    if (settings.enabled && settings.requirePaymentAtRegistration && !isAdminUser) {
      const stripe = getStripe();
      const origin = resolveRequestOrigin(req);

      if (stripe) {
        try {
          const session = await stripe.checkout.sessions.create({
            line_items: [
              {
                price_data: {
                  currency: (settings.currency || "eur").toLowerCase(),
                  product_data: {
                    name: settings.productName || "Lidmaatschap Lijst van Andel (1 jaar)",
                    description: settings.description || `Jaarlijkse lidmaatschapscontributie voor ${fullName || username}`,
                  },
                  unit_amount: Math.round((Number(settings.amount) || 12) * 100),
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            customer_email: resolvedEmail && resolvedEmail.includes("@") ? resolvedEmail : undefined,
            client_reference_id: newUser.id,
            metadata: {
              userId: newUser.id,
              username: newUser.username,
              type: "membership_registration",
            },
            success_url: `${origin}/registreren?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/registreren?payment_cancelled=true`,
          });

          checkoutUrl = session.url;
          sessionId = session.id;
          newUser.stripeSessionId = session.id;
        } catch (stripeErr: any) {
          console.error("Fout bij aanmaken Stripe checkout sessie:", stripeErr.message);
          // Fallback to simulated test session
          sessionId = `sim_session_${newUser.id}_${Date.now()}`;
          newUser.stripeSessionId = sessionId;
          checkoutUrl = `/registreren?payment_success=true&session_id=${sessionId}&simulated=true`;
        }
      } else {
        // Stripe secret key is not yet set in .env on server
        sessionId = `sim_session_${newUser.id}_${Date.now()}`;
        newUser.stripeSessionId = sessionId;
        checkoutUrl = `/registreren?payment_success=true&session_id=${sessionId}&simulated=true`;
      }
    }

    db.users.push(newUser);
    saveDb(db);

    res.status(201).json({ 
      message: "Registratie succesvol", 
      user: { 
        id: newUser.id, 
        username: newUser.username,
        billingStatus: newUser.billingStatus,
        role: newUser.role
      },
      checkoutUrl,
      sessionId
    });
  });

  const handleLoginLogic = async (req: any, res: any) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Gebruikersnaam of e-mailadres en wachtwoord zijn verplicht." });
    }

    const identifier = String(username).trim().toLowerCase();
    const db = getDb();
    const user = db.users.find((u: any) => {
      const uName = (u.username || "").toLowerCase();
      const uEmail = (u.email || "").toLowerCase();
      return uName === identifier || uEmail === identifier;
    });

    if (!user) {
      return res.status(401).json({ error: "Ongeldige inloggegevens" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
      const resolvedEmail = user.email || (user.username.includes("@") ? user.username : "");
      const newsletterSubscribed = user.newsletterSubscribed !== undefined ? Boolean(user.newsletterSubscribed) : true;
      res.status(200).json({ 
        message: "Succesvol ingelogd", 
        user: { 
          id: user.id, 
          username: user.username, 
          fullName: user.fullName, 
          salutation: user.salutation,
          address: user.address,
          city: user.city,
          email: resolvedEmail,
          role: user.role, 
          isActive: user.isActive,
          newsletterSubscribed,
          billingStatus: user.billingStatus || (user.role === "admin" ? "exempt" : "paid"),
          paidAmount: user.paidAmount,
          paidAt: user.paidAt,
          paidUntil: user.paidUntil,
          createdAt: user.createdAt
        },
        token
      });
    } else {
      res.status(401).json({ error: "Ongeldige inloggegevens" });
    }
  };

  app.post("/api/login", handleLoginLogic);
  app.post("/api/auth/login", handleLoginLogic);

  // Forgot Password Request Endpoint
  app.post("/api/auth/forgot-password", async (req: any, res: any) => {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Vul een geldig e-mailadres in." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    if (!Array.isArray(db.passwordResetTokens)) {
      db.passwordResetTokens = [];
    }

    // Clean up expired tokens (older than 1 hour)
    const now = Date.now();
    db.passwordResetTokens = db.passwordResetTokens.filter((t: any) => t.expiresAt > now);

    const user = db.users.find((u: any) => {
      const uEmail = (u.email || "").toLowerCase();
      const uName = (u.username || "").toLowerCase();
      return uEmail === normalizedEmail || (uName === normalizedEmail && uName.includes("@"));
    });

    const origin = resolveRequestOrigin(req);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = now + 60 * 60 * 1000; // 1 hour

      db.passwordResetTokens.push({
        token: resetToken,
        userId: user.id,
        email: user.email || normalizedEmail,
        expiresAt,
        createdAt: new Date().toISOString()
      });
      saveDb(db);

      const resetUrl = `${origin}/reset-wachtwoord?token=${resetToken}`;
      console.log(`[PASSWORD RESET] Wachtwoord herstellink aangemaakt voor ${user.username} (${user.email}): ${resetUrl}`);

      const emailSubject = "Wachtwoord opnieuw instellen - Lijst van Andel";
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px 0; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { color: #005a36; font-size: 24px; margin: 0 0 8px 0; }
            .btn { display: inline-block; background-color: #005a36; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
            .footer { margin-top: 32px; pt-4; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lijst van Andel</h1>
              <p style="color: #64748b; font-size: 14px; margin: 0;">Ledenportaal Steenwijkerland</p>
            </div>
            <p>Beste <strong>${user.name || user.username}</strong>,</p>
            <p>Er is een aanvraag gedaan om het wachtwoord van uw ledenaccount bij Lijst van Andel opnieuw in te stellen.</p>
            <p>Klik op de onderstaande knop om een nieuw wachtwoord te kiezen:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="btn" target="_blank">Nieuw wachtwoord instellen</a>
            </div>
            <p style="font-size: 13px; color: #64748b;">
              Deze link is <strong>1 uur geldig</strong>. Heeft u deze aanvraag niet zelf gedaan? Dan kunt u deze e-mail veilig negeren; uw huidige wachtwoord blijft ongewijzigd.
            </p>
            <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
              Werkt de knop niet? Kopieer en plak deze link in uw browser:<br>
              <a href="${resetUrl}" style="color: #005a36;">${resetUrl}</a>
            </p>
            <div class="footer">
              <p>Met vriendelijke groet,<br><strong>Lijst van Andel Steenwijkerland</strong><br>
              <a href="https://lijstvanandel.nl" style="color: #005a36;">lijstvanandel.nl</a> &bull; info@lijstvanandel.nl</p>
            </div>
          </div>
        </body>
        </html>
      `;
      const emailText = `Beste ${user.name || user.username},\n\nEr is een aanvraag gedaan om het wachtwoord van uw ledenaccount bij Lijst van Andel opnieuw in te stellen.\n\nOpen deze link om een nieuw wachtwoord in te stellen:\n${resetUrl}\n\nDeze link is 1 uur geldig.\n\nMet vriendelijke groet,\nLijst van Andel Steenwijkerland`;

      sendTransactionalEmail(user.email || normalizedEmail, emailSubject, emailHtml, emailText).catch((err) => {
        console.error("Fout bij achtergrond e-mailverzending:", err);
      });

      return res.status(200).json({
        success: true,
        message: `Er is een herstellink verzonden naar ${normalizedEmail}.`,
        previewResetUrl: resetUrl
      });
    }

    // Return generic success to prevent email enumeration
    return res.status(200).json({
      success: true,
      message: `Als dit e-mailadres bij ons bekend is, ontvangt u een link om uw wachtwoord opnieuw in te stellen.`
    });
  });

  // Reset Password Execution Endpoint
  app.post("/api/auth/reset-password", async (req: any, res: any) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Ongeldige gegevens opgegeven." });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "Het nieuwe wachtwoord moet minimaal 6 tekens lang zijn." });
    }

    const db = getDb();
    if (!Array.isArray(db.passwordResetTokens)) {
      db.passwordResetTokens = [];
    }

    const now = Date.now();
    const tokenRecordIndex = db.passwordResetTokens.findIndex(
      (t: any) => t.token === token && t.expiresAt > now
    );

    if (tokenRecordIndex === -1) {
      return res.status(400).json({ error: "Deze herstellink is ongeldig of verlopen. Vraag een nieuwe herstellink aan." });
    }

    const tokenRecord = db.passwordResetTokens[tokenRecordIndex];
    const user = db.users.find((u: any) => u.id === tokenRecord.userId);
    if (!user) {
      return res.status(404).json({ error: "De bijbehorende gebruiker kon niet worden gevonden." });
    }

    user.password = await bcrypt.hash(newPassword.trim(), 10);
    // Remove used token
    db.passwordResetTokens.splice(tokenRecordIndex, 1);
    saveDb(db);

    console.log(`[PASSWORD RESET] Wachtwoord succesvol gewijzigd voor gebruiker ${user.username}`);
    return res.status(200).json({
      success: true,
      message: "Uw wachtwoord is succesvol gewijzigd. U kunt nu inloggen met uw nieuwe wachtwoord."
    });
  });

  // Donations Endpoints (Stripe checkout + verification)
  app.post("/api/donations/create-checkout-session", async (req: any, res: any) => {
    const { amount, donorName, donorEmail, message, agreedToTerms } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({ error: "Donatiebedrag moet minimaal € 1,00 zijn." });
    }

    if (numAmount > 4500) {
      return res.status(400).json({
        error: "Giften boven € 4.500,- vereisen voorafgaande schriftelijke instemming van het bestuur conform artikel 3 van het Giftenreglement."
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({ error: "U dient akkoord te gaan met de bepalingen uit het Giftenreglement." });
    }

    const db = getDb();
    if (!Array.isArray(db.donations)) {
      db.donations = [];
    }

    const donationId = `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const origin = resolveRequestOrigin(req);
    const stripe = getStripe();

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: "Vrijwillige Gift aan Lijst van Andel",
                  description: `Steun aan politieke partij Lijst van Andel Steenwijkerland (Giftenreglement conform)`,
                },
                unit_amount: Math.round(numAmount * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          customer_email: donorEmail && donorEmail.includes("@") ? donorEmail.trim() : undefined,
          client_reference_id: donationId,
          metadata: {
            donationId,
            donorName: donorName || "Anoniem",
            donorEmail: donorEmail || "",
            message: message || "",
            type: "party_donation",
          },
          success_url: `${origin}/doneren?donation_success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/doneren?donation_cancelled=true`,
        });

        db.donations.push({
          id: donationId,
          amount: numAmount,
          donorName: donorName || "Anoniem",
          donorEmail: donorEmail || "",
          message: message || "",
          status: "pending",
          stripeSessionId: session.id,
          createdAt: new Date().toISOString(),
        });
        saveDb(db);

        return res.json({ checkoutUrl: session.url, sessionId: session.id, donationId });
      } catch (err: any) {
        console.error("Fout bij aanmaken Stripe checkout sessie voor donatie:", err.message);
        return res.status(500).json({ error: "Fout bij initialiseren van Stripe betaalomgeving: " + err.message });
      }
    } else {
      // Graceful simulation fallback when STRIPE_SECRET_KEY is not configured
      const simSessionId = `sim_don_session_${donationId}`;
      db.donations.push({
        id: donationId,
        amount: numAmount,
        donorName: donorName || "Anoniem",
        donorEmail: donorEmail || "",
        message: message || "",
        status: "pending",
        stripeSessionId: simSessionId,
        createdAt: new Date().toISOString(),
      });
      saveDb(db);

      return res.json({
        checkoutUrl: `${origin}/doneren?donation_success=true&session_id=${simSessionId}&simulated=true`,
        sessionId: simSessionId,
        donationId
      });
    }
  });

  // Verify Donation Session (Called from Frontend or Polling)
  app.get("/api/donations/verify-session", async (req: any, res: any) => {
    const sessionId = (req.query.sessionId as string || "").trim();
    if (!sessionId) {
      return res.status(400).json({ error: "Geen sessie ID opgegeven" });
    }

    const db = getDb();
    if (!Array.isArray(db.donations)) {
      db.donations = [];
    }

    const donation = db.donations.find((d: any) => d.stripeSessionId === sessionId || sessionId.includes(d.id));
    if (!donation) {
      return res.status(404).json({ error: "Donatie bij deze sessie niet gevonden" });
    }

    if (donation.status === "completed") {
      return res.json({ success: true, donation });
    }

    let isPaid = false;
    const stripe = getStripe();

    if (sessionId.startsWith("sim_don_session_")) {
      isPaid = true;
    } else if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === "paid") {
          isPaid = true;
          if (session.amount_total) {
            donation.amount = session.amount_total / 100;
          }
        }
      } catch (err: any) {
        console.error("Fout bij ophalen Stripe donatiesessie:", err.message);
      }
    }

    if (isPaid) {
      donation.status = "completed";
      donation.completedAt = new Date().toISOString();
      saveDb(db);

      return res.json({
        success: true,
        message: "Donatie succesvol ontvangen!",
        donation
      });
    }

    return res.json({
      success: false,
      status: donation.status,
      message: "Betaling is nog niet afgerond bij Stripe."
    });
  });

  // List Donations (Publicly visible totals and verified donations for ANBI transparency)
  app.get("/api/donations", (req: any, res: any) => {
    const db = getDb();
    const donations = Array.isArray(db.donations) ? db.donations : [];
    const completed = donations.filter((d: any) => d.status === "completed");
    const totalRaised = completed.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);

    // Return sanitized donation records (respecting privacy if requested)
    const publicDonations = completed.map((d: any) => ({
      id: d.id,
      amount: d.amount,
      donorName: d.donorName ? (d.donorName.length > 25 ? d.donorName.substring(0, 25) + '...' : d.donorName) : 'Anoniem',
      message: d.message || null,
      createdAt: d.completedAt || d.createdAt,
    }));

    res.json({
      totalRaised,
      donationCount: completed.length,
      donations: publicDonations
    });
  });

  app.get("/api/me", requireAuth, (req: any, res: any) => {
    const { password, ...userProfile } = req.user;
    if (userProfile.newsletterSubscribed === undefined) {
      userProfile.newsletterSubscribed = true;
    }
    if (!userProfile.email && userProfile.username?.includes('@')) {
      userProfile.email = userProfile.username;
    }
    if (!userProfile.billingStatus) {
      userProfile.billingStatus = userProfile.role === 'admin' ? 'exempt' : 'paid';
    }
    res.status(200).json({ user: userProfile });
  });

  // Member Newsletter Preferences Toggle & Email update
  app.patch("/api/me/newsletter", requireAuth, (req: any, res: any) => {
    const { newsletterSubscribed, email } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });

    if (typeof newsletterSubscribed === "boolean") {
      user.newsletterSubscribed = newsletterSubscribed;
    }
    if (typeof email === "string") {
      user.email = email.trim();
    }
    saveDb(db);
    const { password, ...userProfile } = user;
    res.status(200).json({
      message: user.newsletterSubscribed
        ? "U ontvangt voortaan onze nieuwsbrief."
        : "U bent afgemeld voor de nieuwsbrief.",
      user: userProfile
    });
  });

  // Member Registration Profile Update (Edit profile data)
  app.put("/api/me/profile", requireAuth, async (req: any, res: any) => {
    const { salutation, fullName, email, address, city, username, password, remarks, directDebit } = req.body;
    const db = getDb();
    const userIndex = db.users.findIndex((u: any) => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: "Gebruiker niet gevonden" });
    const existingUser = db.users[userIndex];

    // Check if username changed and is already taken
    if (username && username.trim() !== existingUser.username) {
      const trimmedUsername = username.trim();
      const conflict = db.users.find((u: any) => u.username.toLowerCase() === trimmedUsername.toLowerCase() && u.id !== existingUser.id);
      if (conflict) {
        return res.status(400).json({ error: "Deze gebruikersnaam is al in gebruik door een ander lid." });
      }
      existingUser.username = trimmedUsername;
    }

    if (salutation !== undefined) existingUser.salutation = salutation;
    if (fullName !== undefined && fullName.trim()) existingUser.fullName = fullName.trim();
    if (email !== undefined) existingUser.email = email.trim();
    if (address !== undefined) existingUser.address = address.trim();
    if (city !== undefined) existingUser.city = city.trim();
    if (remarks !== undefined) existingUser.remarks = remarks;
    if (directDebit !== undefined) existingUser.directDebit = Boolean(directDebit);

    if (password && typeof password === "string" && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res.status(400).json({ error: "Het nieuwe wachtwoord moet minimaal 6 tekens bevatten." });
      }
      existingUser.password = await bcrypt.hash(password.trim(), 10);
    }

    saveDb(db);

    const token = jwt.sign({ id: existingUser.id, username: existingUser.username }, JWT_SECRET, { expiresIn: "24h" });
    const { password: _p, ...safeUser } = existingUser;

    res.status(200).json({
      message: "Uw gegevens zijn succesvol bijgewerkt!",
      user: safeUser,
      token
    });
  });

  // Member Self-Deletion of Account
  app.delete("/api/me/account", requireAuth, (req: any, res: any) => {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });

    // Protect primary root admin account
    if (user.username === "admin") {
      return res.status(403).json({ error: "Het hoofdbeheerdersaccount 'admin' kan niet worden verwijderd." });
    }

    // Remove from db.users
    db.users = db.users.filter((u: any) => u.id !== req.user.id);

    // Remove user ID from all event attendees
    if (Array.isArray(db.events)) {
      db.events.forEach((ev: any) => {
        if (Array.isArray(ev.attendees)) {
          ev.attendees = ev.attendees.filter((uid: string) => String(uid) !== String(req.user.id));
        }
      });
    }

    saveDb(db);

    res.json({
      success: true,
      message: "Uw account is definitief verwijderd. Al uw gegevens zijn gewist."
    });
  });

  // Admin Routes - Users
  app.get("/api/admin/users", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const safeUsers = db.users.map((u: any) => {
      const { password, ...rest } = u;
      if (rest.newsletterSubscribed === undefined) {
        rest.newsletterSubscribed = true;
      }
      if (!rest.billingStatus) {
        rest.billingStatus = rest.role === "admin" ? "exempt" : "paid";
      }
      return rest;
    });
    res.json(safeUsers);
  });

  // Admin: Update user billing status manually (e.g. marked as paid after bank transfer or cash)
  app.patch("/api/admin/users/:id/billing", requireAuth, requireAdmin, (req: any, res: any) => {
    const { billingStatus, paidAmount, notes } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });

    const validStatuses = ["paid", "pending", "exempt", "failed", "cancelled"];
    if (!validStatuses.includes(billingStatus)) {
      return res.status(400).json({ error: "Ongeldige facturatiestatus" });
    }

    user.billingStatus = billingStatus;
    if (billingStatus === "paid") {
      user.paidAmount = paidAmount !== undefined ? parseFloat(paidAmount) : (db.membershipSettings?.amount || 12);
      user.paidAt = new Date().toISOString();
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      user.paidUntil = nextYear.toISOString();
    } else if (billingStatus === "pending") {
      user.paidAmount = 0;
      user.paidAt = null;
      user.paidUntil = null;
    }
    if (notes !== undefined) {
      user.billingNotes = notes;
    }

    saveDb(db);
    res.json({ message: "Facturatiestatus succesvol bijgewerkt", user });
  });

  // Public: Membership Configuration Info
  app.get("/api/membership/config", (req: any, res: any) => {
    const db = getDb();
    const settings = db.membershipSettings || {
      enabled: true,
      amount: 12.00,
      currency: "eur",
      interval: "year",
      productName: "Lidmaatschap Lijst van Andel (1 jaar)",
      description: "Jaarlijkse partijcontributie voor leden van Lijst van Andel",
      requirePaymentAtRegistration: true,
    };
    res.json({
      enabled: settings.enabled !== false,
      amount: settings.amount || 12.00,
      currency: settings.currency || "eur",
      interval: settings.interval || "year",
      productName: settings.productName || "Lidmaatschap Lijst van Andel (1 jaar)",
      description: settings.description || "Jaarlijkse contributie voor partijleden",
      requirePaymentAtRegistration: settings.requirePaymentAtRegistration !== false,
      isStripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY)
    });
  });

  // Admin: Membership Settings & Stripe Status
  app.get("/api/admin/membership/settings", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const settings = db.membershipSettings || {
      enabled: true,
      amount: 12.00,
      currency: "eur",
      interval: "year",
      productName: "Lidmaatschap Lijst van Andel (1 jaar)",
      description: "Jaarlijkse partijcontributie voor leden van Lijst van Andel",
      requirePaymentAtRegistration: true,
    };

    const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY);
    const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    const maskedSecretKey = process.env.STRIPE_SECRET_KEY
      ? `${process.env.STRIPE_SECRET_KEY.substring(0, 7)}...${process.env.STRIPE_SECRET_KEY.slice(-4)}`
      : "";

    // Calculate billing metrics
    const users = db.users || [];
    const paidUsers = users.filter((u: any) => u.billingStatus === "paid");
    const pendingUsers = users.filter((u: any) => u.billingStatus === "pending");
    const exemptUsers = users.filter((u: any) => u.billingStatus === "exempt" || u.role === "admin");
    const totalRevenue = paidUsers.reduce((sum: number, u: any) => sum + (Number(u.paidAmount) || Number(settings.amount) || 12), 0);

    res.json({
      settings,
      stripe: {
        isConfigured: hasStripeKey,
        hasWebhookSecret,
        maskedSecretKey,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
        webhookUrl: `${req.protocol}://${req.get("host")}/api/stripe/webhook`
      },
      stats: {
        totalMembers: users.length,
        paidMembers: paidUsers.length,
        pendingMembers: pendingUsers.length,
        exemptMembers: exemptUsers.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        expectedAnnualRevenue: Math.round((users.length * (settings.amount || 12)) * 100) / 100
      }
    });
  });

  app.patch("/api/admin/membership/settings", requireAuth, requireAdmin, (req: any, res: any) => {
    const { enabled, amount, currency, interval, productName, description, requirePaymentAtRegistration } = req.body;
    const db = getDb();
    if (!db.membershipSettings) db.membershipSettings = {};

    if (enabled !== undefined) db.membershipSettings.enabled = Boolean(enabled);
    if (amount !== undefined) db.membershipSettings.amount = Math.max(0, parseFloat(amount) || 0);
    if (currency !== undefined) db.membershipSettings.currency = String(currency).toLowerCase();
    if (interval !== undefined) db.membershipSettings.interval = String(interval);
    if (productName !== undefined) db.membershipSettings.productName = String(productName).trim();
    if (description !== undefined) db.membershipSettings.description = String(description).trim();
    if (requirePaymentAtRegistration !== undefined) db.membershipSettings.requirePaymentAtRegistration = Boolean(requirePaymentAtRegistration);
    db.membershipSettings.updatedAt = new Date().toISOString();

    saveDb(db);
    res.json({ message: "Contributie-instellingen succesvol opgeslagen", settings: db.membershipSettings });
  });

  // Member Portal: Create Stripe Checkout Session for Pending Member
  app.post("/api/membership/create-checkout-session", requireAuth, async (req: any, res: any) => {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });

    const settings = db.membershipSettings || {
      enabled: true,
      amount: 12.00,
      currency: "eur",
      productName: "Lidmaatschap Lijst van Andel (1 jaar)",
      description: "Jaarlijkse partijcontributie voor leden van Lijst van Andel",
    };

    const stripe = getStripe();
    const origin = resolveRequestOrigin(req);

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price_data: {
                currency: (settings.currency || "eur").toLowerCase(),
                product_data: {
                  name: settings.productName || "Lidmaatschap Lijst van Andel (1 jaar)",
                  description: settings.description || `Jaarlijkse contributie voor ${user.fullName || user.username}`,
                },
                unit_amount: Math.round((Number(settings.amount) || 12) * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          customer_email: user.email && user.email.includes("@") ? user.email : undefined,
          client_reference_id: user.id,
          metadata: {
            userId: user.id,
            username: user.username,
            type: "membership_dues",
          },
          success_url: `${origin}/dashboard?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/dashboard?payment_cancelled=true`,
        });

        user.stripeSessionId = session.id;
        saveDb(db);
        return res.json({ checkoutUrl: session.url, sessionId: session.id });
      } catch (err: any) {
        console.error("Fout bij aanmaken Stripe sessie voor lid:", err.message);
        return res.status(500).json({ error: "Fout bij initialiseren van Stripe: " + err.message });
      }
    } else {
      const simSessionId = `sim_session_${user.id}_${Date.now()}`;
      user.stripeSessionId = simSessionId;
      saveDb(db);
      return res.json({ 
        checkoutUrl: `/dashboard?payment_success=true&session_id=${simSessionId}&simulated=true`,
        sessionId: simSessionId
      });
    }
  });

  // Verify Checkout Session (Called from Frontend when redirected back from Stripe)
  app.get("/api/checkout/verify-session", async (req: any, res: any) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).json({ error: "Geen sessie ID opgegeven" });
    }

    const db = getDb();
    const user = db.users.find((u: any) => u.stripeSessionId === sessionId || (sessionId.startsWith("sim_session_") && sessionId.includes(u.id)));
    if (!user) {
      return res.status(404).json({ error: "Gebruiker bij deze sessie niet gevonden" });
    }

    const stripe = getStripe();
    let isPaymentValid = false;
    let paymentAmount = db.membershipSettings?.amount || 12;

    if (sessionId.startsWith("sim_session_")) {
      isPaymentValid = true;
    } else if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === "paid") {
          isPaymentValid = true;
          if (session.amount_total) {
            paymentAmount = session.amount_total / 100;
          }
          if (session.customer) {
            user.stripeCustomerId = session.customer as string;
          }
        }
      } catch (err: any) {
        console.error("Fout bij ophalen Stripe sessie:", err.message);
      }
    }

    if (isPaymentValid) {
      user.billingStatus = "paid";
      user.paidAmount = paymentAmount;
      user.paidAt = new Date().toISOString();
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      user.paidUntil = nextYear.toISOString();
      saveDb(db);

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
      const { password, ...safeUser } = user;
      return res.json({
        success: true,
        message: "Betaling succesvol geverifieerd!",
        user: safeUser,
        token
      });
    }

    return res.status(400).json({ error: "Betaling is nog niet voltooid of niet geldig." });
  });

  // Stripe Webhook Handler for asynchronous events
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: any, res: any) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;

    if (stripe && webhookSecret) {
      const sig = req.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      try {
        event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      } catch (e) {
        event = {};
      }
    }

    if (event?.type === "checkout.session.completed") {
      const session = event.data?.object;
      const userId = session?.client_reference_id || session?.metadata?.userId;
      if (userId) {
        const db = getDb();
        const user = db.users.find((u: any) => u.id === userId);
        if (user) {
          user.billingStatus = "paid";
          user.paidAmount = session.amount_total ? session.amount_total / 100 : (db.membershipSettings?.amount || 12);
          user.paidAt = new Date().toISOString();
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          user.paidUntil = nextYear.toISOString();
          if (session.customer) user.stripeCustomerId = session.customer;
          saveDb(db);
          console.log(`Lidmaatschap succesvol geactiveerd voor ${user.username} via webhook.`);
        }
      }
    }

    res.json({ received: true });
  });

  app.patch("/api/admin/users/:id/status", requireAuth, requireAdmin, (req: any, res: any) => {
    const { isActive } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });
    user.isActive = isActive;
    saveDb(db);
    res.json({ message: "Status bijgewerkt", user });
  });

  app.patch("/api/admin/users/:id/role", requireAuth, requireAdmin, (req: any, res: any) => {
    const { role } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });
    user.role = role;
    saveDb(db);
    res.json({ message: "Rol bijgewerkt", user });
  });

  app.patch("/api/admin/users/:id/newsletter", requireAuth, requireAdmin, (req: any, res: any) => {
    const { newsletterSubscribed } = req.body;
    const db = getDb();
    const user = db.users.find((u: any) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });
    user.newsletterSubscribed = Boolean(newsletterSubscribed);
    saveDb(db);
    res.json({ message: "Nieuwsbriefstatus bijgewerkt", user });
  });

  // Export all newsletter subscribers
  app.get("/api/admin/users/export-newsletter", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const format = (req.query.format as string) || "csv";
    
    // Select members who want the newsletter
    const subscribers = db.users.filter((u: any) => {
      const isSubscribed = u.newsletterSubscribed !== undefined ? Boolean(u.newsletterSubscribed) : true;
      return isSubscribed && u.isActive !== false;
    });

    if (format === "txt") {
      const emails = subscribers
        .map((u: any) => (u.email && u.email.trim()) || (u.username?.includes("@") ? u.username : `${u.username}@leden.lijstvanandel.nl`))
        .filter(Boolean);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=\"nieuwsbrief-leden-steenwijkerland.txt\"");
      return res.send(emails.join("\n"));
    }

    // CSV format with UTF-8 BOM for Microsoft Excel compatibility
    const csvHeader = "Volledige Naam,Aanhef,Gebruikersnaam,E-mailadres,Woonplaats,Rol,Status,Nieuwsbrief,Registratiedatum\r\n";
    const escapeCsv = (str: any) => `"${String(str || "").replace(/"/g, '""')}"`;
    
    const csvRows = subscribers.map((u: any) => {
      const email = (u.email && u.email.trim()) || (u.username?.includes("@") ? u.username : `${u.username}@leden.lijstvanandel.nl`);
      return [
        escapeCsv(u.fullName || ""),
        escapeCsv(u.salutation || ""),
        escapeCsv(u.username || ""),
        escapeCsv(email),
        escapeCsv(u.city || ""),
        escapeCsv(u.role || "member"),
        escapeCsv(u.isActive ? "Actief" : "Inactief"),
        escapeCsv("Aangemeld"),
        escapeCsv(u.createdAt || "")
      ].join(",");
    }).join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"nieuwsbrief-leden-steenwijkerland.csv\"");
    return res.send("\uFEFF" + csvHeader + csvRows);
  });

  // Admin Routes - Fractieleden
  app.get("/api/fractieleden", (req, res) => {
    const db = getDb();
    res.json(db.fractieleden || []);
  });

  app.get("/api/fractieleden/:id", (req, res) => {
    const db = getDb();
    const lid = (db.fractieleden || []).find((f: any) => f.id === req.params.id);
    if (!lid) return res.status(404).json({ error: "Fractielid niet gevonden" });
    res.json(lid);
  });

  app.post("/api/admin/fractieleden", requireAuth, requireAdmin, upload.single('img'), (req: any, res: any) => {
    const db = getDb();
    const { name, firstName, role, type, bio, speerpunten, email, facebook, instagram, linkedin } = req.body;
    const imgUrl = req.file ? `/uploads/fractieleden/${req.file.filename}` : '';
    const newLid = {
      id: Date.now().toString(),
      name, firstName, role, type, bio,
      speerpunten: speerpunten ? JSON.parse(speerpunten) : [],
      email, socials: { facebook, instagram, linkedin }, imgUrl
    };
    db.fractieleden.push(newLid);
    saveDb(db);
    res.status(201).json(newLid);
  });

  app.delete("/api/admin/fractieleden/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.fractieleden = db.fractieleden.filter((f: any) => f.id !== req.params.id);
    saveDb(db);
    res.json({ message: "Verwijderd" });
  });

  // Admin: Link a registered user to a fractielid / burgerraadslid
  app.post("/api/admin/fractieleden/:id/link-user", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const lid = (db.fractieleden || []).find((f: any) => f.id === req.params.id);
    if (!lid) return res.status(404).json({ error: "Fractielid niet gevonden" });

    const { userId } = req.body;
    if (userId) {
      const targetUser = (db.users || []).find((u: any) => u.id === userId);
      if (!targetUser) return res.status(404).json({ error: "Gekozen gebruiker niet gevonden" });
      lid.linkedUserId = targetUser.id;
      lid.linkedUsername = targetUser.username;
    } else {
      lid.linkedUserId = null;
      lid.linkedUsername = null;
    }

    // Synchronize existing belafspraken for this fractielid
    if (db.belafspraken && Array.isArray(db.belafspraken)) {
      db.belafspraken.forEach((b: any) => {
        if (b.fractielidId === lid.id) {
          b.linkedUserId = lid.linkedUserId;
          b.linkedUsername = lid.linkedUsername;
        }
      });
    }

    saveDb(db);
    res.json({ success: true, message: "Koppeling succesvol opgeslagen", fractielid: lid });
  });

  // Admin Routes - Videos
  app.get("/api/videos", (req, res) => {
    const db = getDb();
    let videos = db.videos || [];
    if (req.query.memberId) videos = videos.filter((v: any) => v.fractieledenIds?.includes(req.query.memberId));
    if (req.query.wijkSlug) videos = videos.filter((v: any) => v.wijkSlug === req.query.wijkSlug);
    if (req.query.hoofdstukNr) videos = videos.filter((v: any) => Number(v.hoofdstukNr) === Number(req.query.hoofdstukNr));
    if (req.query.standpuntNr) videos = videos.filter((v: any) => Number(v.standpuntNr) === Number(req.query.standpuntNr));
    res.json(videos);
  });

  app.post("/api/admin/videos", requireAuth, requireAdmin, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), (req: any, res: any) => {
    const db = getDb();
    const { title, category, date, fractieledenIds, wijkSlug, burgerraadslidTitle, description, hoofdstukNr, standpuntNr, standpuntTitel } = req.body;
    let parsedIds: string[] = [];
    if (fractieledenIds) {
      try {
        parsedIds = typeof fractieledenIds === 'string' ? JSON.parse(fractieledenIds) : fractieledenIds;
      } catch {
        parsedIds = Array.isArray(fractieledenIds) ? fractieledenIds : [fractieledenIds];
      }
    }

    // Controleer of de video aan een burgerraadslid is gekoppeld
    const linkedMembers = (db.fractieleden || []).filter((f: any) => parsedIds.includes(f.id));
    const hasBurgerraadslid = linkedMembers.some((f: any) =>
      f.type?.toLowerCase() === "burgerraadslid" || f.role?.toLowerCase() === "burgerraadslid"
    );

    const effectiveTitle = (title || burgerraadslidTitle || "").trim();
    if (hasBurgerraadslid && !effectiveTitle) {
      return res.status(400).json({
        error: "Een titel is verplicht wanneer de video aan een burgerraadslid is gekoppeld."
      });
    }

    const videoFile = req.files?.video?.[0];
    const thumbFile = req.files?.thumbnail?.[0];

    const videoUrl = videoFile ? `/uploads/videos/${videoFile.filename}` : req.body.videoUrl;
    const thumbnailUrl = thumbFile ? `/uploads/videos/${thumbFile.filename}` : (req.body.thumbnailUrl || null);

    const newVideo = {
      id: Date.now().toString(),
      title: effectiveTitle || "Videobijdrage",
      burgerraadslidTitle: burgerraadslidTitle?.trim() || effectiveTitle || "",
      description: description ? String(description).trim() : "",
      category: category || "Algemeen",
      date: date || new Date().toISOString().slice(0, 10),
      videoUrl,
      thumbnailUrl,
      fractieledenIds: parsedIds,
      wijkSlug: wijkSlug || null,
      hoofdstukNr: hoofdstukNr ? parseInt(hoofdstukNr, 10) : null,
      standpuntNr: standpuntNr ? parseInt(standpuntNr, 10) : null,
      standpuntTitel: standpuntTitel ? String(standpuntTitel).trim() : null
    };
    db.videos.push(newVideo);
    saveDb(db);
    res.status(201).json(newVideo);
  });

  app.delete("/api/admin/videos/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.videos = db.videos.filter((v: any) => v.id !== req.params.id);
    saveDb(db);
    res.json({ message: "Verwijderd" });
  });

  // News Routes
  app.get("/api/news", (req, res) => {
    const db = getDb();
    let newsList = db.news || [];
    const { wijkSlug, category } = req.query;
    if (wijkSlug) {
      newsList = newsList.filter((n: any) => n.wijkSlug === wijkSlug);
    }
    if (category) {
      newsList = newsList.filter((n: any) => n.category?.toLowerCase() === String(category).toLowerCase());
    }
    res.json(newsList);
  });
  
  app.get("/api/news/:id", (req, res) => {
    const db = getDb();
    const article = db.news.find((n: any) => n.id === req.params.id);
    if (!article) return res.status(404).json({ error: "Nieuws niet gevonden" });
    res.json(article);
  });

  app.post("/api/admin/news", requireAuth, requireAdmin, upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'header', maxCount: 1 }]), (req: any, res: any) => {
    const db = getDb();
    const { title, category, description, content, wijkSlug, wijkNaam, authorId, authorName, authorRole, authorAvatar } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const thumbnailUrl = files?.['thumbnail']?.[0] ? `/uploads/news/${files['thumbnail'][0].filename}` : '';
    const headerUrl = files?.['header']?.[0] ? `/uploads/news/${files['header'][0].filename}` : '';
    
    const newArticle = {
      id: Date.now().toString(),
      title,
      category: category || "Algemeen",
      description: description || "",
      content: content || "",
      wijkSlug: wijkSlug || "",
      wijkNaam: wijkNaam || "",
      author: authorName || req.body.author || "",
      authorId: authorId || "",
      authorName: authorName || "",
      authorRole: authorRole || "",
      authorAvatar: authorAvatar || "",
      thumbnailUrl,
      headerUrl,
      createdAt: new Date().toISOString()
    };
    db.news.push(newArticle);
    saveDb(db);
    res.status(201).json(newArticle);
  });

  app.put("/api/admin/news/:id", requireAuth, requireAdmin, upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'header', maxCount: 1 }]), (req: any, res: any) => {
    const db = getDb();
    const index = db.news.findIndex((n: any) => n.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Nieuws niet gevonden" });

    const { title, category, description, content, wijkSlug, wijkNaam, authorId, authorName, authorRole, authorAvatar } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const current = db.news[index];

    const thumbnailUrl = files?.['thumbnail']?.[0] ? `/uploads/news/${files['thumbnail'][0].filename}` : current.thumbnailUrl;
    const headerUrl = files?.['header']?.[0] ? `/uploads/news/${files['header'][0].filename}` : current.headerUrl;

    db.news[index] = {
      ...current,
      title: title !== undefined ? title : current.title,
      category: category !== undefined ? category : current.category,
      description: description !== undefined ? description : current.description,
      content: content !== undefined ? content : current.content,
      wijkSlug: wijkSlug !== undefined ? wijkSlug : current.wijkSlug,
      wijkNaam: wijkNaam !== undefined ? wijkNaam : current.wijkNaam,
      author: authorName !== undefined ? authorName : current.author,
      authorId: authorId !== undefined ? authorId : current.authorId,
      authorName: authorName !== undefined ? authorName : current.authorName,
      authorRole: authorRole !== undefined ? authorRole : current.authorRole,
      authorAvatar: authorAvatar !== undefined ? authorAvatar : current.authorAvatar,
      thumbnailUrl,
      headerUrl,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    res.json(db.news[index]);
  });

  app.delete("/api/admin/news/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.news = db.news.filter((n: any) => n.id !== req.params.id);
    saveDb(db);
    res.json({ message: "Nieuws verwijderd" });
  });

  // Admin: Upload news article image (for insertion in article content)
  app.post("/api/admin/news/upload-image", requireAuth, requireAdmin, upload.single("image"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "Geen afbeeldingsbestand ontvangen" });
    }
    mirrorUploadToDist(path.join("uploads", "news", req.file.filename));
    const url = `/uploads/news/${req.file.filename}`;
    res.json({
      success: true,
      url,
      filename: req.file.originalname,
      size: req.file.size
    });
  });

  // Admin: Upload interactive .html dataproduct (Python Folium maps, Plotly charts, Altair, etc.)
  app.post("/api/admin/news/upload-dataproduct", requireAuth, requireAdmin, upload.single("file"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "Geen .html bestand ontvangen" });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== ".html" && ext !== ".htm") {
      return res.status(400).json({ error: "Alleen .html of .htm bestanden zijn toegestaan voor interactieve dataproducten" });
    }
    mirrorUploadToDist(path.join("uploads", "dataproducts", req.file.filename));
    const url = `/uploads/dataproducts/${req.file.filename}`;
    res.json({
      success: true,
      url,
      filename: req.file.originalname,
      size: req.file.size
    });
  });

  // Category Management Routes
  app.get("/api/categories", (req, res) => {
    const db = getDb();
    res.json(db.categories || []);
  });

  app.post("/api/admin/categories", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const { name, description, color, slug } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Categorienaam is verplicht" });
    }

    const trimmedName = name.trim();
    const cleanSlug = (slug && slug.trim() ? slug : trimmedName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const exists = db.categories.some(
      (c: any) => c.name.toLowerCase() === trimmedName.toLowerCase() || c.slug === cleanSlug
    );
    if (exists) {
      return res.status(400).json({ error: "Een categorie met deze naam of slug bestaat al" });
    }

    const newCategory = {
      id: Date.now().toString(),
      name: trimmedName,
      slug: cleanSlug || `cat-${Date.now()}`,
      description: description ? description.trim() : "",
      color: color || "#c6a858",
      createdAt: new Date().toISOString()
    };

    db.categories.push(newCategory);
    saveDb(db);
    res.status(201).json(newCategory);
  });

  app.put("/api/admin/categories/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const index = db.categories.findIndex((c: any) => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Categorie niet gevonden" });

    const { name, description, color, slug } = req.body;
    const current = db.categories[index];

    let cleanSlug = current.slug;
    if (slug && slug.trim()) {
      cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    db.categories[index] = {
      ...current,
      name: name && name.trim() ? name.trim() : current.name,
      slug: cleanSlug,
      description: description !== undefined ? description.trim() : current.description,
      color: color || current.color || "#c6a858",
      updatedAt: new Date().toISOString()
    };

    saveDb(db);
    res.json(db.categories[index]);
  });

  app.delete("/api/admin/categories/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const cat = db.categories.find((c: any) => c.id === req.params.id);
    if (!cat) return res.status(404).json({ error: "Categorie niet gevonden" });

    db.categories = db.categories.filter((c: any) => c.id !== req.params.id);
    saveDb(db);
    res.json({ message: "Categorie verwijderd" });
  });

  // Helper to extract only the place / city (plaats) from an address string
  function extractCity(address?: string): string {
    if (!address || !address.trim()) return "Steenwijk";
    const trimmed = address.trim();
    if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
      const lastPart = parts[parts.length - 1];
      const cleanCity = lastPart.replace(/^\s*\d{4}\s?[A-Za-z]{2}\s+/, "").trim();
      if (cleanCity) return cleanCity;
    }
    const postalMatch = trimmed.match(/\b\d{4}\s?[A-Za-z]{2}\s+(.+)$/);
    if (postalMatch && postalMatch[1]) {
      return postalMatch[1].trim();
    }
    if (!/\d/.test(trimmed)) {
      return trimmed;
    }
    const lastWord = trimmed.split(/\s+/).pop();
    if (lastWord && isNaN(Number(lastWord))) {
      return lastWord;
    }
    return trimmed;
  }

  // Events/Agenda Routes
  app.get("/api/events", (req: any, res: any) => {
    const db = getDb();
    // Parse token optionally to see if user is member or admin
    let isMember = false;
    let currentUserId: string | null = null;
    let isAdmin = false;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded: any = jwt.verify(token, JWT_SECRET);
        isMember = true;
        currentUserId = decoded.id;
        isAdmin = decoded.role === "admin";
      } catch (e) {
        // Token verification failed or expired, treat as guest
      }
    }

    let events = db.events.filter((e: any) => e.isPublished);
    if (!isMember) {
      events = events.filter((e: any) => e.isPublic);
    }

    // Sanitize address: only show street & house number if registered via portal or admin
    const sanitizedEvents = events.map((e: any) => {
      const isAttending = Boolean(currentUserId && e.attendees?.includes(currentUserId));
      const canSeeFullAddress = Boolean(isAttending || isAdmin);
      const city = extractCity(e.address);

      return {
        ...e,
        city,
        address: canSeeFullAddress ? e.address : city,
        fullAddress: canSeeFullAddress ? e.address : undefined,
        isAttending,
      };
    });

    res.json(sanitizedEvents);
  });

  app.get("/api/events/:id", (req: any, res: any) => {
    const db = getDb();
    let isMember = false;
    let currentUserId: string | null = null;
    let isAdmin = false;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded: any = jwt.verify(token, JWT_SECRET);
        isMember = true;
        currentUserId = decoded.id;
        isAdmin = decoded.role === "admin";
      } catch (e) {
        // Token verification failed or expired, treat as guest
      }
    }

    const ev = db.events.find((e: any) => e.id === req.params.id);
    if (!ev) {
      return res.status(404).json({ error: "Evenement niet gevonden" });
    }

    if (!ev.isPublished && !isMember) {
      return res.status(404).json({ error: "Evenement niet gevonden" });
    }

    const isAttending = Boolean(currentUserId && ev.attendees?.includes(currentUserId));
    const canSeeFullAddress = Boolean(isAttending || isAdmin);
    const city = extractCity(ev.address);

    if (!ev.isPublic && !isMember) {
      return res.json({
        ...ev,
        city,
        address: "Locatie zichtbaar voor leden na inloggen",
        fullAddress: undefined,
        isPrivateForUser: true,
        isAttending: false,
      });
    }

    res.json({
      ...ev,
      city,
      address: canSeeFullAddress ? ev.address : city,
      fullAddress: canSeeFullAddress ? ev.address : undefined,
      isAttending,
    });
  });

  app.get("/api/admin/events", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    res.json(db.events);
  });

  app.post("/api/admin/events", requireAuth, requireAdmin, upload.single('thumbnail'), (req: any, res: any) => {
    const db = getDb();
    const { title, date, address, startTime, endTime, shortDescription, description, isPublic, isPublished, lat, lng } = req.body;
    const thumbnailUrl = req.file ? `/uploads/events/${req.file.filename}` : '';
    
    const newEvent = {
      id: Date.now().toString(),
      title: title || "",
      date: date || "",
      address: address || "",
      startTime: startTime || "",
      endTime: endTime || "",
      shortDescription: shortDescription || (description ? description.replace(/<[^>]*>/g, '').substring(0, 160) : ""),
      description: description || "",
      isPublic: isPublic === 'true' || isPublic === true,
      isPublished: isPublished === 'true' || isPublished === true,
      isCancelled: false,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      thumbnailUrl,
      attendees: [],
      createdAt: new Date().toISOString()
    };
    db.events.push(newEvent);
    saveDb(db);
    res.status(201).json(newEvent);
  });

  // Geocoding Proxy Route with Steenwijkerland Context
  app.get("/api/geocode", async (req, res) => {
    const query = ((req.query.q as string) || "").trim();
    if (!query) return res.status(400).json({ error: "Geen adres opgegeven" });

    try {
      let searchQuery = query;
      const lower = searchQuery.toLowerCase();
      if (
        !lower.includes("steenwijk") &&
        !lower.includes("steenwijkerland") &&
        !lower.includes("nederland") &&
        !lower.includes("overijssel")
      ) {
        searchQuery += ", Steenwijkerland, Nederland";
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1&addressdetails=1`;

      const geoRes = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "LijstVanAndel-Portal/1.0 (info@lijstvanandel.nl)",
          "Accept-Language": "nl",
        },
      });

      if (geoRes.ok) {
        const data: any = await geoRes.json();
        if (Array.isArray(data) && data.length > 0) {
          return res.json({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
          });
        }
      }

      // Fallback: Steenwijkerland Kernen / Belangrijke locaties
      const knownLocations: Record<string, [number, number]> = {
        steenwijk: [52.7885, 6.1172],
        markt: [52.7901, 6.1186],
        "de meenthe": [52.7887, 6.113],
        meenthe: [52.7887, 6.113],
        oostermeenthe: [52.7932, 6.136],
        woldmeenthe: [52.7925, 6.104],
        tuk: [52.8022, 6.0965],
        oldemarkt: [52.8206, 5.9739],
        vollenhove: [52.6797, 5.9525],
        giethoorn: [52.7408, 6.0792],
        blokzijl: [52.7267, 5.9611],
        kuinre: [52.788, 5.841],
        "sint jansklooster": [52.6775, 6.0028],
        wanneperveen: [52.7058, 6.1264],
        willemsoord: [52.8258, 6.0667],
        "de blesse": [52.839, 6.046],
        scheerwolde: [52.7975, 5.9928],
        "belt-schutsloot": [52.6739, 6.0642],
        eesveen: [52.8122, 6.1369],
        onna: [52.7761, 6.1492],
        zuidveen: [52.7753, 6.1175],
        steenwijkerwold: [52.8078, 6.0658],
      };

      for (const [key, coords] of Object.entries(knownLocations)) {
        if (lower.includes(key)) {
          return res.json({
            lat: coords[0],
            lng: coords[1],
            displayName: `${query} (in de buurt van ${key}, Steenwijkerland)`,
          });
        }
      }

      // Default to Steenwijk center
      return res.json({
        lat: 52.7885,
        lng: 6.1172,
        displayName: query,
        fallback: true,
      });
    } catch (err) {
      return res.json({
        lat: 52.7885,
        lng: 6.1172,
        displayName: query,
        fallback: true,
      });
    }
  });

  app.put("/api/admin/events/:id", requireAuth, requireAdmin, upload.single('thumbnail'), (req: any, res: any) => {
    const db = getDb();
    const ev = db.events.find((e: any) => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: "Evenement niet gevonden" });
    
    const {
      title,
      date,
      address,
      startTime,
      endTime,
      shortDescription,
      description,
      isPublic,
      isPublished,
      isCancelled,
      lat,
      lng
    } = req.body;

    if (title !== undefined) ev.title = title;
    if (date !== undefined) ev.date = date;
    if (address !== undefined) ev.address = address;
    if (startTime !== undefined) ev.startTime = startTime;
    if (endTime !== undefined) ev.endTime = endTime;
    if (shortDescription !== undefined) ev.shortDescription = shortDescription;
    if (description !== undefined) ev.description = description;
    if (isPublic !== undefined) ev.isPublic = isPublic === 'true' || isPublic === true;
    if (isPublished !== undefined) ev.isPublished = isPublished === 'true' || isPublished === true;
    if (isCancelled !== undefined) ev.isCancelled = isCancelled === 'true' || isCancelled === true;
    if (lat !== undefined && lat !== "") ev.lat = parseFloat(lat);
    if (lng !== undefined && lng !== "") ev.lng = parseFloat(lng);
    if (req.file) {
      ev.thumbnailUrl = `/uploads/events/${req.file.filename}`;
    }
    
    saveDb(db);
    res.json(ev);
  });

  app.delete("/api/admin/events/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.events = db.events.filter((e: any) => e.id !== req.params.id);
    saveDb(db);
    res.json({ message: "Evenement verwijderd" });
  });

  app.get("/api/admin/events/:id/attendees", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const ev = db.events.find((e: any) => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: "Evenement niet gevonden" });
    
    const attendees = ev.attendees.map((uid: string) => {
      const u = db.users.find((u: any) => u.id === uid);
      return u ? { id: u.id, fullName: u.fullName, email: u.username } : null;
    }).filter(Boolean);
    
    res.json(attendees);
  });

  app.post("/api/events/:id/attend", requireAuth, (req: any, res: any) => {
    const db = getDb();
    const ev = db.events.find((e: any) => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: "Evenement niet gevonden" });
    if (ev.isCancelled) return res.status(400).json({ error: "Evenement is geannuleerd" });
    
    if (!ev.attendees.includes(req.user.id)) {
      ev.attendees.push(req.user.id);
      saveDb(db);
    }
    res.json({
      message: "Succesvol aangemeld",
      address: ev.address,
      fullAddress: ev.address,
      city: extractCity(ev.address)
    });
  });

  // Member Un-attend / Afmelden for event
  app.delete("/api/events/:id/attend", requireAuth, (req: any, res: any) => {
    const db = getDb();
    const ev = db.events.find((e: any) => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: "Evenement niet gevonden" });

    if (Array.isArray(ev.attendees)) {
      ev.attendees = ev.attendees.filter((uid: string) => String(uid) !== String(req.user.id));
      saveDb(db);
    }
    res.json({
      success: true,
      message: "U bent succesvol afgemeld voor dit evenement.",
      isAttending: false
    });
  });

  app.post("/api/events/:id/unattend", requireAuth, (req: any, res: any) => {
    const db = getDb();
    const ev = db.events.find((e: any) => e.id === req.params.id);
    if (!ev) return res.status(404).json({ error: "Evenement niet gevonden" });

    if (Array.isArray(ev.attendees)) {
      ev.attendees = ev.attendees.filter((uid: string) => String(uid) !== String(req.user.id));
      saveDb(db);
    }
    res.json({
      success: true,
      message: "U bent succesvol afgemeld voor dit evenement.",
      isAttending: false
    });
  });

  app.get("/api/me/events", requireAuth, (req: any, res: any) => {
    const db = getDb();
    const now = new Date().toISOString().split('T')[0];
    
    const attending = db.events
      .filter((e: any) => e.attendees?.includes(req.user.id) && e.date >= now && !e.isCancelled)
      .map((e: any) => ({
        ...e,
        city: extractCity(e.address),
        fullAddress: e.address,
        isAttending: true,
      }));
    const cancelled = db.events
      .filter((e: any) => e.isCancelled && e.date >= now)
      .map((e: any) => ({
        ...e,
        city: extractCity(e.address),
        fullAddress: e.attendees?.includes(req.user.id) ? e.address : undefined,
        isAttending: Boolean(e.attendees?.includes(req.user.id)),
      }));
    
    res.json({ attending, cancelled });
  });

  // Contact Messages Routes
  // Public endpoint for submitting contact form
  app.post("/api/contact", (req, res) => {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Vul alstublieft alle verplichte velden in (naam, e-mail en bericht)." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Vul een geldig e-mailadres in." });
    }

    const db = getDb();
    if (!db.contactMessages) db.contactMessages = [];

    const newMessage = {
      id: Date.now().toString(),
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : "",
      subject: subject && String(subject).trim() ? String(subject).trim() : "Bericht via contactformulier",
      message: String(message).trim(),
      status: "moet nog beantwoord worden",
      createdAt: new Date().toISOString(),
      handledAt: null,
      handledBy: null,
      notes: ""
    };

    db.contactMessages.unshift(newMessage);
    saveDb(db);

    res.status(201).json({
      success: true,
      message: "Uw bericht is succesvol verzonden. We nemen zo snel mogelijk contact met u op.",
      data: newMessage
    });
  });

  // Admin: Get all contact messages
  app.get("/api/admin/contact-messages", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const messages = (db.contactMessages || []).slice().sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    res.json(messages);
  });

  // Admin: Update status / notes of contact message
  app.put("/api/admin/contact-messages/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const msg = (db.contactMessages || []).find((m: any) => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: "Bericht niet gevonden" });

    const { status, notes } = req.body;
    if (status !== undefined) {
      if (status === "afgehandeld") {
        msg.status = "afgehandeld";
        msg.handledAt = new Date().toISOString();
        msg.handledBy = req.user?.fullName || req.user?.username || "Beheerder";
      } else {
        msg.status = "moet nog beantwoord worden";
        msg.handledAt = null;
        msg.handledBy = null;
      }
    }

    if (notes !== undefined) {
      msg.notes = String(notes);
    }

    saveDb(db);
    res.json({ message: "Status succesvol bijgewerkt", data: msg });
  });

  // Admin: Delete contact message
  app.delete("/api/admin/contact-messages/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.contactMessages = (db.contactMessages || []).filter((m: any) => m.id !== req.params.id);
    saveDb(db);
    res.json({ message: "Bericht verwijderd" });
  });

  // Public: Get published FAQs
  app.get("/api/faqs", (req: any, res: any) => {
    const db = getDb();
    const faqs = (db.faqs || [])
      .filter((f: any) => f.published !== false)
      .sort((a: any, b: any) => (a.order ?? 99) - (b.order ?? 99));
    res.json(faqs);
  });

  // Admin: Get all FAQs (including unpublished)
  app.get("/api/admin/faqs", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const faqs = (db.faqs || []).sort((a: any, b: any) => (a.order ?? 99) - (b.order ?? 99));
    res.json(faqs);
  });

  // Admin: Create new FAQ
  app.post("/api/admin/faqs", requireAuth, requireAdmin, (req: any, res: any) => {
    const { question, answer, category, order, published } = req.body;
    if (!question || !String(question).trim() || !answer || !String(answer).trim()) {
      return res.status(400).json({ error: "Vraag en antwoord zijn verplicht" });
    }

    const db = getDb();
    if (!db.faqs) db.faqs = [];

    const maxOrder = db.faqs.reduce((max: number, f: any) => Math.max(max, f.order || 0), 0);
    const newFaq = {
      id: "faq-" + Date.now(),
      question: String(question).trim(),
      answer: String(answer).trim(),
      category: category ? String(category).trim() : "Algemeen",
      order: typeof order === "number" ? order : maxOrder + 1,
      published: published !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.faqs.push(newFaq);
    saveDb(db);
    res.status(201).json({ message: "FAQ succesvol aangemaakt", data: newFaq });
  });

  // Admin: Update FAQ
  app.put("/api/admin/faqs/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const { question, answer, category, order, published } = req.body;
    const db = getDb();
    if (!db.faqs) db.faqs = [];

    const faqIndex = db.faqs.findIndex((f: any) => f.id === req.params.id);
    if (faqIndex === -1) {
      return res.status(404).json({ error: "FAQ niet gevonden" });
    }

    const faq = db.faqs[faqIndex];
    if (question !== undefined) faq.question = String(question).trim();
    if (answer !== undefined) faq.answer = String(answer).trim();
    if (category !== undefined) faq.category = String(category).trim();
    if (order !== undefined) faq.order = Number(order);
    if (published !== undefined) faq.published = Boolean(published);
    faq.updatedAt = new Date().toISOString();

    saveDb(db);
    res.json({ message: "FAQ succesvol bijgewerkt", data: faq });
  });

  // Admin: Reorder FAQs
  app.put("/api/admin/faqs-reorder", requireAuth, requireAdmin, (req: any, res: any) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "Array met IDs is vereist" });
    }

    const db = getDb();
    if (!db.faqs) db.faqs = [];

    ids.forEach((id: string, index: number) => {
      const item = db.faqs.find((f: any) => f.id === id);
      if (item) {
        item.order = index + 1;
      }
    });

    saveDb(db);
    res.json({ message: "Volgorde bijgewerkt", data: db.faqs });
  });

  // Admin: Delete FAQ
  app.delete("/api/admin/faqs/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.faqs = (db.faqs || []).filter((f: any) => f.id !== req.params.id);
    saveDb(db);
    res.json({ message: "FAQ verwijderd" });
  });

  // ==========================================
  // BELAFSPRAKEN API & AUTOMATISCHE AFHANDELING
  // ==========================================

  function checkAndUpdateExpiredBelafspraken(db: any): boolean {
    if (!db.belafspraken || !Array.isArray(db.belafspraken)) {
      db.belafspraken = [];
      return false;
    }
    const now = Date.now();
    let changed = false;

    for (const item of db.belafspraken) {
      if (item.status === "ingepland") {
        let endMs = 0;
        if (item.endDateTime) {
          endMs = new Date(item.endDateTime).getTime();
        } else if (item.datum && item.eindTijd) {
          endMs = new Date(`${item.datum}T${item.eindTijd}:00`).getTime();
        }

        // Als een belafspraak een halfuur (30 min = 1.800.000 ms) na eindtijd niet is afgehandeld:
        if (endMs > 0 && !isNaN(endMs) && now > (endMs + 30 * 60 * 1000)) {
          item.status = "niet afgehandeld";
          item.handledAt = new Date().toISOString();
          item.handledBy = "Systeem (automatisch >30 min na eindtijd)";
          changed = true;
        }
      }
    }

    if (changed) {
      saveDb(db);
    }
    return changed;
  }

  // Public: Get list of raadsleden & burgerraadsleden for booking a call
  app.get("/api/belafspraken/personen", (req, res) => {
    const db = getDb();
    const personen = (db.fractieleden || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      role: f.role,
      type: f.type || "Raadslid",
      imgUrl: f.imgUrl || "",
      linkedUserId: f.linkedUserId || null,
      linkedUsername: f.linkedUsername || null
    }));
    res.json(personen);
  });

  // Public: Book a new call appointment
  app.post("/api/belafspraken", (req, res) => {
    const db = getDb();
    if (!db.belafspraken) db.belafspraken = [];

    const { email, fractielidId, fractielidNaam, datum, startTijd, eindTijd, onderwerp } = req.body;
    const name = req.body.name || req.body.naam;
    const phone = req.body.phone || req.body.telefoon;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Uw naam is verplicht" });
    }
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ error: "Telefoonnummer is verplicht" });
    }

    // Resolve fractielid
    let chosenFractielid = null;
    if (fractielidId) {
      chosenFractielid = (db.fractieleden || []).find((f: any) => f.id === String(fractielidId));
    }
    if (!chosenFractielid && fractielidNaam) {
      const q = String(fractielidNaam).toLowerCase();
      chosenFractielid = (db.fractieleden || []).find((f: any) => 
        q.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(q)
      );
    }
    if (!chosenFractielid && db.fractieleden && db.fractieleden.length > 0) {
      chosenFractielid = db.fractieleden[0];
    }

    const resolvedDate = datum || new Date().toISOString().split("T")[0];
    const resolvedStart = startTijd || "19:00";
    const resolvedEnd = eindTijd || "19:30";

    // Create ISO timestamps with timezone preservation
    const startDateTime = new Date(`${resolvedDate}T${resolvedStart}:00`).toISOString();
    const endDateTime = new Date(`${resolvedDate}T${resolvedEnd}:00`).toISOString();

    const newBelafspraak = {
      id: "bel-" + Date.now().toString(),
      name: String(name).trim(),
      email: email ? String(email).trim() : "",
      phone: String(phone).trim(),
      fractielidId: chosenFractielid?.id || "1",
      fractielidNaam: chosenFractielid ? `${chosenFractielid.name} — ${chosenFractielid.role}` : "Raadslid",
      linkedUserId: chosenFractielid?.linkedUserId || null,
      linkedUsername: chosenFractielid?.linkedUsername || null,
      datum: resolvedDate,
      startTijd: resolvedStart,
      eindTijd: resolvedEnd,
      startDateTime,
      endDateTime,
      onderwerp: onderwerp ? String(onderwerp).trim() : "",
      status: "ingepland", // 'ingepland' | 'afgehandeld' | 'nam niet op' | 'niet afgehandeld'
      notitie: "",
      handledAt: null,
      handledBy: null,
      createdAt: new Date().toISOString()
    };

    db.belafspraken.unshift(newBelafspraak);
    saveDb(db);

    res.status(201).json({
      success: true,
      message: "Belafspraak succesvol ingepland! We nemen contact met u op.",
      data: newBelafspraak
    });
  });

  // Authenticated: Get belafspraken for current logged-in user (or all if admin)
  app.get("/api/belafspraken", requireAuth, (req: any, res: any) => {
    const db = getDb();
    checkAndUpdateExpiredBelafspraken(db);

    const currentUser = req.user;
    const all = db.belafspraken || [];

    if (currentUser.role === "admin") {
      return res.json(all);
    }

    // Check if user is linked to any fractielid
    const linkedFractielid = (db.fractieleden || []).find((f: any) => 
      f.linkedUserId === currentUser.id || 
      (f.linkedUsername && f.linkedUsername.toLowerCase() === currentUser.username.toLowerCase())
    );

    const myAppointments = all.filter((b: any) => {
      if (b.linkedUserId && b.linkedUserId === currentUser.id) return true;
      if (b.linkedUsername && b.linkedUsername.toLowerCase() === currentUser.username.toLowerCase()) return true;
      if (linkedFractielid && b.fractielidId === linkedFractielid.id) return true;
      return false;
    });

    res.json(myAppointments);
  });

  // Authenticated: Update appointment status ('afgehandeld', 'nam niet op', 'niet afgehandeld')
  app.patch("/api/belafspraken/:id/status", requireAuth, (req: any, res: any) => {
    const db = getDb();
    const appt = (db.belafspraken || []).find((b: any) => b.id === req.params.id);
    if (!appt) return res.status(404).json({ error: "Belafspraak niet gevonden" });

    const { status, notitie } = req.body;
    const validStatuses = ["ingepland", "afgehandeld", "nam niet op", "niet afgehandeld"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Ongeldige status. Kies uit: afgehandeld, nam niet op, niet afgehandeld of ingepland" });
    }

    appt.status = status;
    appt.handledAt = new Date().toISOString();
    appt.handledBy = req.user.fullName || req.user.username || "Raadslid";

    if (notitie !== undefined) {
      appt.notitie = String(notitie);
    }

    saveDb(db);
    res.json({
      success: true,
      message: `Status bijgewerkt naar '${status}'`,
      data: appt
    });
  });

  // Admin: Get all belafspraken with vertical column counts
  app.get("/api/admin/belafspraken", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    checkAndUpdateExpiredBelafspraken(db);

    const all = (db.belafspraken || []).slice().sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const counts = {
      total: all.length,
      ingepland: all.filter((b: any) => b.status === "ingepland").length,
      afgehandeld: all.filter((b: any) => b.status === "afgehandeld").length,
      namNietOp: all.filter((b: any) => b.status === "nam niet op").length,
      nietAfgehandeld: all.filter((b: any) => b.status === "niet afgehandeld").length
    };

    res.json({
      appointments: all,
      counts
    });
  });

  // Admin: Update any appointment field
  app.patch("/api/admin/belafspraken/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const appt = (db.belafspraken || []).find((b: any) => b.id === req.params.id);
    if (!appt) return res.status(404).json({ error: "Belafspraak niet gevonden" });

    const { status, notitie, fractielidId, datum, startTijd, eindTijd } = req.body;

    if (status !== undefined) {
      appt.status = status;
      appt.handledAt = new Date().toISOString();
      appt.handledBy = req.user.fullName || req.user.username || "Beheerder";
    }
    if (notitie !== undefined) appt.notitie = String(notitie);
    if (fractielidId !== undefined) {
      const fl = (db.fractieleden || []).find((f: any) => f.id === fractielidId);
      if (fl) {
        appt.fractielidId = fl.id;
        appt.fractielidNaam = `${fl.name} — ${fl.role}`;
        appt.linkedUserId = fl.linkedUserId || null;
        appt.linkedUsername = fl.linkedUsername || null;
      }
    }
    if (datum !== undefined) appt.datum = datum;
    if (startTijd !== undefined) appt.startTijd = startTijd;
    if (eindTijd !== undefined) appt.eindTijd = eindTijd;

    if (appt.datum && appt.startTijd) {
      appt.startDateTime = new Date(`${appt.datum}T${appt.startTijd}:00`).toISOString();
    }
    if (appt.datum && appt.eindTijd) {
      appt.endDateTime = new Date(`${appt.datum}T${appt.eindTijd}:00`).toISOString();
    }

    saveDb(db);
    res.json({ success: true, message: "Belafspraak bijgewerkt", data: appt });
  });

  // Admin: Delete appointment
  app.delete("/api/admin/belafspraken/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.belafspraken = (db.belafspraken || []).filter((b: any) => b.id !== req.params.id);
    saveDb(db);
    res.json({ success: true, message: "Belafspraak verwijderd" });
  });

  // ==========================================
  // WIJKEN EN KERNEN API
  // ==========================================

  // Public: Get all wijken en kernen
  app.get("/api/wijken", (req, res) => {
    const db = getDb();
    res.json(db.wijken || []);
  });

  // Public: Get single wijk by slug (with alias resolution)
  app.get("/api/wijken/:slug", (req, res) => {
    const db = getDb();
    const rawSlug = req.params.slug.toLowerCase();
    const slug = LEGACY_SLUG_MAP[rawSlug] || rawSlug;
    const wijk = (db.wijken || []).find((w: any) => w.slug.toLowerCase() === slug || w.slug.toLowerCase() === rawSlug);
    if (!wijk) {
      return res.status(404).json({ error: "Wijk of kern niet gevonden" });
    }
    res.json(wijk);
  });

  // Admin: Force reset / synchronize with official 42 Buurtkaart units
  app.post("/api/admin/wijken/sync-buurtkaart", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.wijken = syncWijkenWithBuurtkaart(db.wijken || []);
    saveDb(db);
    res.json({
      message: "Wijken en kernen succesvol gesynchroniseerd met de 42 Buurtkaart-gebieden",
      count: db.wijken.length,
      data: db.wijken,
    });
  });

  // Admin: Upload photo (banner or vertegenwoordiger foto) for a wijk/kern
  app.post("/api/admin/wijken/upload", requireAuth, requireAdmin, upload.single("file"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "Geen bestand geüpload" });
    }
    const url = `/uploads/wijken/${req.file.filename}`;
    res.json({ url });
  });

  // Admin: Update wijk/kern (achtergrondfoto, beschrijving, vertegenwoordiger)
  app.put("/api/admin/wijken/:slug", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const slug = req.params.slug.toLowerCase();
    const wijkIndex = (db.wijken || []).findIndex((w: any) => w.slug.toLowerCase() === slug);

    if (wijkIndex === -1) {
      return res.status(404).json({ error: "Wijk of kern niet gevonden" });
    }

    const {
      bannerUrl,
      beschrijving,
      vertegenwoordiger,
      naam,
      type,
      gemeente,
    } = req.body;

    const wijk = db.wijken[wijkIndex];

    if (bannerUrl !== undefined) wijk.bannerUrl = String(bannerUrl).trim();
    if (beschrijving !== undefined) wijk.beschrijving = String(beschrijving).trim();
    if (naam !== undefined && naam) wijk.naam = String(naam).trim();
    if (type !== undefined && (type === "Wijk" || type === "Kern")) wijk.type = type;
    if (gemeente !== undefined && gemeente) wijk.gemeente = String(gemeente).trim();

    if (vertegenwoordiger === null || req.body.removeVertegenwoordiger) {
      wijk.vertegenwoordiger = null;
    } else if (vertegenwoordiger && typeof vertegenwoordiger === "object") {
      const socials = vertegenwoordiger.socials || {};
      wijk.vertegenwoordiger = {
        voornaam: String(vertegenwoordiger.voornaam || "").trim(),
        achternaam: String(vertegenwoordiger.achternaam || "").trim(),
        fotoUrl: String(vertegenwoordiger.fotoUrl || "").trim(),
        beschrijving: String(vertegenwoordiger.beschrijving || "").trim(),
        email: String(vertegenwoordiger.email || "").trim(),
        rol: String(vertegenwoordiger.rol || (wijk.type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger")).trim(),
        socials: {
          facebook: String(socials.facebook || "").trim(),
          instagram: String(socials.instagram || "").trim(),
          linkedin: String(socials.linkedin || "").trim(),
          twitter: String(socials.twitter || socials.x || "").trim(),
          telegram: String(socials.telegram || "").trim(),
          tiktok: String(socials.tiktok || "").trim(),
        },
      };
    }

    wijk.updatedAt = new Date().toISOString();
    saveDb(db);
    res.json({ message: "Wijk succesvol bijgewerkt", data: wijk });
  });

  // Admin: Add custom wijk/kern
  app.post("/api/admin/wijken", requireAuth, requireAdmin, (req: any, res: any) => {
    const { naam, type, gemeente, bannerUrl, beschrijving, vertegenwoordiger } = req.body;
    if (!naam || !type) {
      return res.status(400).json({ error: "Naam en type zijn verplicht" });
    }

    const slug = naam
      .toLowerCase()
      .replace(/[,]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const db = getDb();
    if (!db.wijken) db.wijken = [];

    const exists = db.wijken.some((w: any) => w.slug === slug);
    if (exists) {
      return res.status(400).json({ error: "Een wijk of kern met deze naam bestaat al" });
    }

    const newWijk = {
      slug,
      naam: String(naam).trim(),
      type: type === "Kern" ? "Kern" : "Wijk",
      gemeente: String(gemeente || (type === "Wijk" ? "Steenwijk" : "Steenwijkerland")).trim(),
      bannerUrl: String(bannerUrl || "/assets/hero-banner.jpg").trim(),
      beschrijving: String(beschrijving || "").trim(),
      vertegenwoordiger: vertegenwoordiger ? {
        voornaam: String(vertegenwoordiger.voornaam || "").trim(),
        achternaam: String(vertegenwoordiger.achternaam || "").trim(),
        fotoUrl: String(vertegenwoordiger.fotoUrl || "").trim(),
        beschrijving: String(vertegenwoordiger.beschrijving || "").trim(),
        email: String(vertegenwoordiger.email || "").trim(),
        rol: String(vertegenwoordiger.rol || (type === "Wijk" ? "Wijkvertegenwoordiger" : "Kernvertegenwoordiger")).trim(),
        socials: {
          facebook: String(vertegenwoordiger.socials?.facebook || "").trim(),
          instagram: String(vertegenwoordiger.socials?.instagram || "").trim(),
          linkedin: String(vertegenwoordiger.socials?.linkedin || "").trim(),
          twitter: String(vertegenwoordiger.socials?.twitter || "").trim(),
          telegram: String(vertegenwoordiger.socials?.telegram || "").trim(),
          tiktok: String(vertegenwoordiger.socials?.tiktok || "").trim(),
        },
      } : null,
      updatedAt: new Date().toISOString(),
    };

    db.wijken.push(newWijk);
    saveDb(db);
    res.status(201).json({ message: "Wijk of kern succesvol toegevoegd", data: newWijk });
  });

  // ==========================================
  // VACATURES & OPENSTAANDE FUNCTIES API
  // ==========================================

  // Public / Member: Get all open positions
  app.get("/api/vacancies", (req, res) => {
    const db = getDb();
    const positions: any[] = [];

    // 1. Wijken and Kernen without representative
    const openWijken = (db.wijken || []).filter((w: any) => !w.vertegenwoordiger || !w.vertegenwoordiger.voornaam);
    for (const w of openWijken) {
      const typeLabel = w.type === "Kern" ? "Kernvertegenwoordiger" : "Wijkvertegenwoordiger";
      positions.push({
        id: `wijk-${w.slug}`,
        type: "wijkvertegenwoordiger",
        title: `${typeLabel} ${w.naam}`,
        wijkNaam: w.naam,
        wijkSlug: w.slug,
        gemeente: w.gemeente || (w.type === "Wijk" ? "Steenwijk" : "Steenwijkerland"),
        category: w.type === "Kern" ? "Kernvertegenwoordiger" : "Wijkvertegenwoordiger",
        description: `Als vertegenwoordiger bent u de ogen en oren voor Lijst van Andel in ${w.naam}. U spreekt met bewoners, signaleert knelpunten rond leefbaarheid, woningbouw of verkeer, en brengt lokale signalen direct in bij onze raadsfractie.`,
        isOpen: true,
        isWijk: true
      });
    }

    // 2. Custom administrative / general vacancies
    const customVacancies = (db.vacancies || []).filter((v: any) => v.isOpen !== false);
    for (const cv of customVacancies) {
      positions.push({
        id: cv.id,
        type: "custom",
        title: cv.title,
        wijkNaam: cv.wijkNaam || "Gemeente Steenwijkerland",
        wijkSlug: null,
        gemeente: "Steenwijkerland",
        category: cv.category || "Algemeen",
        description: cv.description || "Ondersteun onze partij en fractie in een actieve vrijwilligersrol.",
        isOpen: true,
        isWijk: false
      });
    }

    res.json(positions);
  });

  // Member apply for open position (requiresAuth)
  app.post("/api/vacancies/apply", requireAuth, (req: any, res: any) => {
    const { vacancyId, vacancyTitle, wijkNaam, motivation, applicantName, applicantEmail } = req.body;
    if (!motivation || typeof motivation !== "string" || motivation.trim().length < 5) {
      return res.status(400).json({ error: "Schrijf alstublieft een motiverende beschrijving van minimaal enkele zinnen." });
    }

    const db = getDb();
    if (!db.applications) db.applications = [];

    const user = req.user;
    const newApp = {
      id: "app-" + Date.now(),
      vacancyId: vacancyId || "onbekend",
      vacancyTitle: vacancyTitle || "Openstaande Functie",
      wijkNaam: wijkNaam || "Steenwijkerland",
      userId: user.id,
      applicantName: (applicantName && String(applicantName).trim()) || user.fullName || "Lid",
      applicantEmail: (applicantEmail && String(applicantEmail).trim()) || user.email || (user.username?.includes("@") ? user.username : `${user.username}@leden.lijstvanandel.nl`),
      motivation: motivation.trim(),
      status: "nieuw", // nieuw | in_behandeling | gecontacteerd | afgerond
      adminNotes: "",
      createdAt: new Date().toISOString()
    };

    db.applications.unshift(newApp);
    saveDb(db);

    res.status(201).json({
      message: `Uw aanmelding voor '${newApp.vacancyTitle}' is succesvol verstuurd! We nemen spoedig contact met u op.`,
      application: newApp
    });
  });

  // Admin: Get all applications
  app.get("/api/admin/vacancies/applications", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    res.json(db.applications || []);
  });

  // Admin: Update application status or notes
  app.patch("/api/admin/vacancies/applications/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const { status, adminNotes } = req.body;
    const db = getDb();
    const appItem = (db.applications || []).find((a: any) => a.id === req.params.id);
    if (!appItem) return res.status(404).json({ error: "Aanmelding niet gevonden" });

    if (status) appItem.status = status;
    if (adminNotes !== undefined) appItem.adminNotes = adminNotes;
    saveDb(db);

    res.json({ message: "Aanmelding bijgewerkt", application: appItem });
  });

  // Admin: Delete application
  app.delete("/api/admin/vacancies/applications/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.applications = (db.applications || []).filter((a: any) => a.id !== req.params.id);
    saveDb(db);
    res.json({ message: "Aanmelding verwijderd" });
  });

  // Admin: Custom vacancies CRUD
  app.get("/api/admin/vacancies/custom", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    res.json(db.vacancies || []);
  });

  app.post("/api/admin/vacancies/custom", requireAuth, requireAdmin, (req: any, res: any) => {
    const { title, category, wijkNaam, description, isOpen } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "Titel is verplicht" });
    const db = getDb();
    if (!db.vacancies) db.vacancies = [];
    const newVac = {
      id: "vac-" + Date.now(),
      title: title.trim(),
      category: category?.trim() || "Algemeen",
      wijkNaam: wijkNaam?.trim() || "Heel Steenwijkerland",
      description: description?.trim() || "",
      isOpen: isOpen !== undefined ? Boolean(isOpen) : true,
      createdAt: new Date().toISOString()
    };
    db.vacancies.push(newVac);
    saveDb(db);
    res.status(201).json({ message: "Vacature aangemaakt", vacancy: newVac });
  });

  app.put("/api/admin/vacancies/custom/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const { title, category, wijkNaam, description, isOpen } = req.body;
    const db = getDb();
    const vac = (db.vacancies || []).find((v: any) => v.id === req.params.id);
    if (!vac) return res.status(404).json({ error: "Vacature niet gevonden" });

    if (title) vac.title = title.trim();
    if (category !== undefined) vac.category = category.trim();
    if (wijkNaam !== undefined) vac.wijkNaam = wijkNaam.trim();
    if (description !== undefined) vac.description = description.trim();
    if (isOpen !== undefined) vac.isOpen = Boolean(isOpen);
    saveDb(db);
    res.json({ message: "Vacature bijgewerkt", vacancy: vac });
  });

  app.delete("/api/admin/vacancies/custom/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    db.vacancies = (db.vacancies || []).filter((v: any) => v.id !== req.params.id);
    saveDb(db);
    res.json({ message: "Vacature verwijderd" });
  });

  // ==================== EXCLUSIEVE LEDEN DOCUMENTEN ====================
  // Get all documents for authenticated members
  app.get("/api/member-documents", requireAuth, (req: any, res: any) => {
    const db = getDb();
    const documents = (db.documents || []).slice().sort((a: any, b: any) => {
      return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
    });
    res.json(documents);
  });

  // Get single document by ID
  app.get("/api/member-documents/:id", requireAuth, (req: any, res: any) => {
    const db = getDb();
    const doc = (db.documents || []).find((d: any) => d.id === req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document niet gevonden" });
    }
    res.json(doc);
  });

  // Admin: Get all documents
  app.get("/api/admin/documents", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const documents = (db.documents || []).slice().sort((a: any, b: any) => {
      return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
    });
    res.json(documents);
  });

  // Admin: Upload a PDF or document file
  app.post("/api/admin/documents/upload", requireAuth, requireAdmin, upload.single("file"), (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "Geen bestand geüpload" });
    }
    const url = `/uploads/documents/${req.file.filename}`;
    const sizeInMb = (req.file.size / (1024 * 1024)).toFixed(2);
    const fileSize = req.file.size > 1024 * 1024 ? `${sizeInMb} MB` : `${Math.round(req.file.size / 1024)} KB`;

    res.json({
      url,
      fileName: req.file.originalname,
      fileSize,
    });
  });

  // Admin: Create a new document
  app.post("/api/admin/documents", requireAuth, requireAdmin, (req: any, res: any) => {
    const { title, description, category, confidentiality, date, fileUrl, fileName, fileSize, pageCount, content, author } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Titel is verplicht" });
    }

    const db = getDb();
    if (!db.documents) db.documents = [];

    const newDoc = {
      id: "doc-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      description: (description || "").trim(),
      category: (category || "Algemeen").trim(),
      confidentiality: (confidentiality || "Vertrouwelijk - Alleen Leden").trim(),
      date: date || new Date().toISOString().split("T")[0],
      fileUrl: fileUrl || "",
      fileName: fileName || "",
      fileSize: fileSize || "1.0 MB",
      pageCount: Number(pageCount) || 1,
      content: content || "",
      author: author || req.user.fullName || req.user.username || "Beheerder",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.documents.unshift(newDoc);
    saveDb(db);

    res.status(201).json({
      message: "Document succesvol toegevoegd",
      document: newDoc,
    });
  });

  // Admin: Update existing document
  app.put("/api/admin/documents/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const { title, description, category, confidentiality, date, fileUrl, fileName, fileSize, pageCount, content, author } = req.body;
    const db = getDb();
    if (!db.documents) db.documents = [];

    const docIndex = db.documents.findIndex((d: any) => d.id === req.params.id);
    if (docIndex === -1) {
      return res.status(404).json({ error: "Document niet gevonden" });
    }

    const existing = db.documents[docIndex];
    const updated = {
      ...existing,
      title: title !== undefined ? title.trim() : existing.title,
      description: description !== undefined ? description.trim() : existing.description,
      category: category !== undefined ? category.trim() : existing.category,
      confidentiality: confidentiality !== undefined ? confidentiality.trim() : existing.confidentiality,
      date: date !== undefined ? date : existing.date,
      fileUrl: fileUrl !== undefined ? fileUrl : existing.fileUrl,
      fileName: fileName !== undefined ? fileName : existing.fileName,
      fileSize: fileSize !== undefined ? fileSize : existing.fileSize,
      pageCount: pageCount !== undefined ? Number(pageCount) : existing.pageCount,
      content: content !== undefined ? content : existing.content,
      author: author !== undefined ? author.trim() : existing.author,
      updatedAt: new Date().toISOString(),
    };

    db.documents[docIndex] = updated;
    saveDb(db);

    res.json({
      message: "Document succesvol bijgewerkt",
      document: updated,
    });
  });

  // Admin: Delete document
  app.delete("/api/admin/documents/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const doc = (db.documents || []).find((d: any) => d.id === req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document niet gevonden" });
    }

    db.documents = (db.documents || []).filter((d: any) => d.id !== req.params.id);
    saveDb(db);

    res.json({ message: "Document succesvol verwijderd" });
  });

  // ==========================================
  // STEMGEDRAG ROUTES
  // ==========================================
  app.get("/api/stemgedrag", (req, res) => {
    const db = getDb();
    let items = db.stemgedrag || [];
    const { type, vote, search, category } = req.query;

    if (category && typeof category === "string" && category !== "all") {
      items = items.filter((m: any) => (m.category || "motie") === category);
    }
    if (type && typeof type === "string" && type !== "all") {
      items = items.filter((m: any) => m.motionType === type);
    }
    if (vote && typeof vote === "string") {
      items = items.filter((m: any) => m.vote === vote);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter((m: any) =>
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.raadsvergadering && m.raadsvergadering.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
    }

    // Sort by date descending
    items = [...items].sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    res.json(items);
  });

  app.get("/api/stemgedrag/:id", (req, res) => {
    const db = getDb();
    const item = (db.stemgedrag || []).find((m: any) => m.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Item niet gevonden" });
    res.json(item);
  });

  app.post("/api/admin/stemgedrag", requireAuth, requireAdmin, upload.fields([{ name: "image", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), (req: any, res: any) => {
    const db = getDb();
    const { title, category, motionType, vote, description, date, raadsvergadering, resultaat } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Titel of onderwerp is verplicht." });
    }

    const cleanDesc = (description || "").trim();
    if (cleanDesc.length > 600) {
      return res.status(400).json({ error: `Toelichting mag maximaal 600 tekens bevatten (huidige lengte: ${cleanDesc.length}).` });
    }

    const validCategories = ["motie", "voorstel", "amendement"];
    const validTypes = ["eigen", "mede-indiener", "regulier"];
    const validVotes = ["voor", "tegen"];

    const effectiveCategory = validCategories.includes(category) ? category : "motie";
    const effectiveType = validTypes.includes(motionType) ? motionType : "regulier";
    const effectiveVote = validVotes.includes(vote) ? vote : "voor";

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let imageUrl = req.body.imageUrl || "";
    if (files?.["image"]?.[0]) {
      imageUrl = `/uploads/stemgedrag/${files["image"][0].filename}`;
      mirrorUploadToDist(`uploads/stemgedrag/${files["image"][0].filename}`);
    }

    let pdfUrl = req.body.pdfUrl || "";
    let pdfFileName = req.body.pdfFileName || "";
    if (files?.["pdf"]?.[0]) {
      pdfUrl = `/uploads/stemgedrag/${files["pdf"][0].filename}`;
      pdfFileName = files["pdf"][0].originalname;
      mirrorUploadToDist(`uploads/stemgedrag/${files["pdf"][0].filename}`);
    }

    const newItem = {
      id: "stem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      category: effectiveCategory,
      motionType: effectiveType,
      vote: effectiveVote,
      description: cleanDesc,
      date: date || new Date().toISOString().split("T")[0],
      raadsvergadering: (raadsvergadering || "").trim(),
      resultaat: (resultaat || "").trim(),
      imageUrl,
      pdfUrl,
      pdfFileName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!db.stemgedrag) db.stemgedrag = [];
    db.stemgedrag.unshift(newItem);
    saveDb(db);

    res.status(201).json({
      message: "Stemgedrag succesvol toegevoegd",
      item: newItem
    });
  });

  app.put("/api/admin/stemgedrag/:id", requireAuth, requireAdmin, upload.fields([{ name: "image", maxCount: 1 }, { name: "pdf", maxCount: 1 }]), (req: any, res: any) => {
    const db = getDb();
    if (!db.stemgedrag) db.stemgedrag = [];

    const index = db.stemgedrag.findIndex((m: any) => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Item niet gevonden" });
    }

    const current = db.stemgedrag[index];
    const { title, category, motionType, vote, description, date, raadsvergadering, resultaat, removeImage, removePdf } = req.body;

    const cleanDesc = description !== undefined ? description.trim() : current.description;
    if (cleanDesc && cleanDesc.length > 600) {
      return res.status(400).json({ error: `Toelichting mag maximaal 600 tekens bevatten (huidige lengte: ${cleanDesc.length}).` });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let imageUrl = current.imageUrl || "";
    if (removeImage === "true" || removeImage === true) {
      imageUrl = "";
    } else if (files?.["image"]?.[0]) {
      imageUrl = `/uploads/stemgedrag/${files["image"][0].filename}`;
      mirrorUploadToDist(`uploads/stemgedrag/${files["image"][0].filename}`);
    } else if (req.body.imageUrl !== undefined) {
      imageUrl = req.body.imageUrl;
    }

    let pdfUrl = current.pdfUrl || "";
    let pdfFileName = current.pdfFileName || "";
    if (removePdf === "true" || removePdf === true) {
      pdfUrl = "";
      pdfFileName = "";
    } else if (files?.["pdf"]?.[0]) {
      pdfUrl = `/uploads/stemgedrag/${files["pdf"][0].filename}`;
      pdfFileName = files["pdf"][0].originalname;
      mirrorUploadToDist(`uploads/stemgedrag/${files["pdf"][0].filename}`);
    } else if (req.body.pdfUrl !== undefined) {
      pdfUrl = req.body.pdfUrl;
      pdfFileName = req.body.pdfFileName || "";
    }

    const validCategories = ["motie", "voorstel", "amendement"];
    const validTypes = ["eigen", "mede-indiener", "regulier"];
    const validVotes = ["voor", "tegen"];

    db.stemgedrag[index] = {
      ...current,
      title: title !== undefined ? title.trim() : current.title,
      category: validCategories.includes(category) ? category : (current.category || "motie"),
      motionType: validTypes.includes(motionType) ? motionType : current.motionType,
      vote: validVotes.includes(vote) ? vote : current.vote,
      description: cleanDesc,
      date: date !== undefined ? date : current.date,
      raadsvergadering: raadsvergadering !== undefined ? raadsvergadering.trim() : current.raadsvergadering,
      resultaat: resultaat !== undefined ? resultaat.trim() : current.resultaat,
      imageUrl,
      pdfUrl,
      pdfFileName,
      updatedAt: new Date().toISOString()
    };

    saveDb(db);

    res.json({
      message: "Stemgedrag succesvol bijgewerkt",
      item: db.stemgedrag[index]
    });
  });

  app.delete("/api/admin/stemgedrag/:id", requireAuth, requireAdmin, (req: any, res: any) => {
    const db = getDb();
    const item = (db.stemgedrag || []).find((m: any) => m.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Motie niet gevonden" });
    }

    db.stemgedrag = (db.stemgedrag || []).filter((m: any) => m.id !== req.params.id);
    saveDb(db);

    res.json({ message: "Motie succesvol verwijderd" });
  });

  // --- ADMIN SYSTEM, CACHE & GITHUB UPDATE ENDPOINTS ---
  async function runCmd(cmd: string, timeout = 120000) {
    try {
      const normalizedCmd = cmd.startsWith("git ")
        ? cmd.replace(/^git\s+/, "git -c safe.directory=* ")
        : cmd;
      const res = await execPromise(normalizedCmd, {
        cwd: process.cwd(),
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          GIT_CONFIG_COUNT: "1",
          GIT_CONFIG_KEY_0: "safe.directory",
          GIT_CONFIG_VALUE_0: "*",
          GIT_TERMINAL_PROMPT: "0"
        }
      });
      return { stdout: (res.stdout || "").toString().trim(), stderr: (res.stderr || "").toString().trim(), success: true };
    } catch (err: any) {
      return {
        stdout: (err.stdout || "").toString().trim(),
        stderr: (err.stderr || err.message || "").toString().trim(),
        success: false,
        error: err
      };
    }
  }

  function parseGitHubRepoFromRemote(remoteUrl: string): string {
    if (!remoteUrl) return "Lijstvanandel/website";
    const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?/i);
    if (match) return `${match[1]}/${match[2]}`;
    return "Lijstvanandel/website";
  }

  async function fetchGitHubCommitsApi(repo = "Lijstvanandel/website", branch = "main", perPage = 15) {
    try {
      const url = `https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "LijstVanAndel-SystemUpdater",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (!res.ok) {
        return { success: false, status: res.status, error: `GitHub API status ${res.status}` };
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        return { success: false, error: "Onverwacht GitHub API antwoordformaat" };
      }
      return {
        success: true,
        commits: data.map((c: any) => ({
          hash: c.sha ? c.sha.substring(0, 7) : "",
          fullHash: c.sha || "",
          message: c.commit?.message ? c.commit.message.split("\n")[0] : "",
          author: c.commit?.author?.name || c.author?.login || "GitHub",
          date: c.commit?.author?.date || "",
          url: c.html_url || `https://github.com/${repo}/commit/${c.sha}`
        }))
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Netwerkfout bij aanroepen GitHub API" };
    }
  }

  function clearLocalTempCaches() {
    const cleared: string[] = [];
    const tempDirs = [
      path.join(process.cwd(), "node_modules/.vite-temp"),
      path.join(process.cwd(), "node_modules/.vite"),
      path.join(process.cwd(), ".vite-temp")
    ];
    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
          cleared.push(path.basename(dir));
        } catch (e) {
          // ignore
        }
      }
    }
    lastCacheClearedTime = new Date().toISOString();
    return cleared;
  }

  // 1. Get system & Git status
  app.get("/api/admin/system/status", requireAuth, requireAdmin, async (req: any, res: any) => {
    const isGitRepo = fs.existsSync(path.join(process.cwd(), ".git"));
    let branch = "main";
    let currentCommit = {
      hash: "onbekend",
      fullHash: "",
      message: "Geen Git-repo gedetecteerd",
      author: "Systeem",
      date: new Date().toISOString(),
      branch: "main",
      commitUrl: ""
    };
    let hasRemote = false;

    // Check version.json first (created at build time)
    const versionFiles = [
      path.join(process.cwd(), "dist", "version.json"),
      path.join(process.cwd(), "public", "version.json"),
      path.join(process.cwd(), "version.json")
    ];
    for (const vf of versionFiles) {
      if (fs.existsSync(vf)) {
        try {
          const vData = JSON.parse(fs.readFileSync(vf, "utf-8"));
          if (vData.hash && vData.hash !== "onbekend") {
            currentCommit = {
              ...currentCommit,
              ...vData,
              commitUrl: vData.fullHash
                ? `https://github.com/Lijstvanandel/website/commit/${vData.fullHash}`
                : `https://github.com/Lijstvanandel/website/commit/${vData.hash}`
            };
            if (vData.branch) branch = vData.branch;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (isGitRepo) {
      const bRes = await runCmd("git rev-parse --abbrev-ref HEAD");
      if (bRes.success && bRes.stdout) branch = bRes.stdout;

      const logRes = await runCmd('git log -1 --format="%h||%H||%s||%an||%cd"');
      if (logRes.success && logRes.stdout) {
        const parts = logRes.stdout.split("||");
        if (parts.length >= 4) {
          currentCommit = {
            hash: parts[0],
            fullHash: parts[1] || parts[0],
            message: parts[2] || "",
            author: parts[3] || "",
            date: parts[4] || new Date().toISOString(),
            branch,
            commitUrl: `https://github.com/Lijstvanandel/website/commit/${parts[1] || parts[0]}`
          };
        }
      } else {
        // Direct read from .git directory as fallback
        try {
          const headPath = path.join(process.cwd(), ".git", "HEAD");
          if (fs.existsSync(headPath)) {
            const headContent = fs.readFileSync(headPath, "utf-8").trim();
            if (headContent.startsWith("ref: ")) {
              const refRel = headContent.replace("ref: ", "").trim();
              branch = refRel.split("/").pop() || "main";
              const refFull = path.join(process.cwd(), ".git", refRel);
              if (fs.existsSync(refFull)) {
                const h = fs.readFileSync(refFull, "utf-8").trim();
                currentCommit = {
                  hash: h.substring(0, 7),
                  fullHash: h,
                  message: "Actieve commit uit git ref",
                  author: "Git",
                  date: new Date().toISOString(),
                  branch,
                  commitUrl: `https://github.com/Lijstvanandel/website/commit/${h}`
                };
              }
            } else if (headContent.length >= 7) {
              currentCommit = {
                hash: headContent.substring(0, 7),
                fullHash: headContent,
                message: "Actieve detached commit",
                author: "Git",
                date: new Date().toISOString(),
                branch,
                commitUrl: `https://github.com/Lijstvanandel/website/commit/${headContent}`
              };
            }
          }
        } catch (e) {
          // ignore
        }
      }

      const remoteRes = await runCmd("git remote");
      hasRemote = Boolean(remoteRes.success && remoteRes.stdout.includes("origin"));
    }

    const mem = process.memoryUsage();
    res.json({
      isGitRepo,
      branch,
      hasRemote,
      currentCommit,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`
      },
      lastCacheCleared: lastCacheClearedTime,
      lastSystemSync: lastSystemSyncTime
    });
  });

  // 2. Clear cache
  app.post("/api/admin/system/clear-cache", requireAuth, requireAdmin, (req: any, res: any) => {
    const cleared = clearLocalTempCaches();
    res.json({
      success: true,
      message: "Server- en bouwcache succesvol gewist.",
      cleared,
      timestamp: lastCacheClearedTime
    });
  });

  // 3. Check for updates from GitHub
  app.post("/api/admin/system/check-updates", requireAuth, requireAdmin, async (req: any, res: any) => {
    const isGitRepo = fs.existsSync(path.join(process.cwd(), ".git"));
    let branch = "main";
    let repoName = "Lijstvanandel/website";
    let currentHash = "";
    let currentFullHash = "";

    // 1. Haal de lokale actieve branch, remote en commit hash op
    if (isGitRepo) {
      const branchRes = await runCmd("git rev-parse --abbrev-ref HEAD");
      if (branchRes.success && branchRes.stdout && branchRes.stdout !== "HEAD") {
        branch = branchRes.stdout;
      }
      const remoteRes = await runCmd("git config --get remote.origin.url");
      if (remoteRes.success && remoteRes.stdout) {
        repoName = parseGitHubRepoFromRemote(remoteRes.stdout);
      }
      const headRes = await runCmd("git rev-parse HEAD");
      if (headRes.success && headRes.stdout) {
        currentFullHash = headRes.stdout.trim();
        currentHash = currentFullHash.substring(0, 7);
      }
    }

    // Fallback naar version.json indien HEAD niet direct via git beschikbaar was
    if (!currentHash) {
      const versionFiles = [
        path.join(process.cwd(), "dist", "version.json"),
        path.join(process.cwd(), "public", "version.json"),
        path.join(process.cwd(), "version.json")
      ];
      for (const vf of versionFiles) {
        if (fs.existsSync(vf)) {
          try {
            const vData = JSON.parse(fs.readFileSync(vf, "utf-8"));
            if (vData.hash && vData.hash !== "onbekend") {
              currentHash = vData.hash;
              currentFullHash = vData.fullHash || vData.hash;
              if (vData.branch) branch = vData.branch;
              break;
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }

    // 2. Lokale git fetch origin proberen om lokale refs te vernieuwen
    let fetchOutput = "";
    let localGitBehindCount: number | null = null;
    let localGitCommits: any[] = [];
    if (isGitRepo) {
      const fetchRes = await runCmd(`git fetch origin ${branch}`, 25000);
      fetchOutput = fetchRes.stdout || fetchRes.stderr;
      const countRes = await runCmd(`git rev-list --count HEAD..origin/${branch}`);
      if (countRes.success && countRes.stdout) {
        localGitBehindCount = parseInt(countRes.stdout, 10);
        if (isNaN(localGitBehindCount)) localGitBehindCount = null;
      }
      if (localGitBehindCount && localGitBehindCount > 0) {
        const commitsRes = await runCmd(`git log HEAD..origin/${branch} --pretty=format:"%h||%H||%s||%an||%cr" -n 15`);
        if (commitsRes.success && commitsRes.stdout) {
          localGitCommits = commitsRes.stdout.split("\n").filter(Boolean).map(line => {
            const [h, fh, msg, author, time] = line.split("||");
            return {
              hash: h || "",
              fullHash: fh || h,
              message: msg || "",
              author: author || "",
              time: time || "",
              url: `https://github.com/${repoName}/commit/${fh || h}`
            };
          });
        }
      }
    }

    // 3. Raadpleeg direct de officiële GitHub REST API (100% accuraat en onafhankelijk van lokale git authenticatie)
    const apiResult = await fetchGitHubCommitsApi(repoName, branch, 15);

    if (apiResult.success && apiResult.commits && apiResult.commits.length > 0) {
      const remoteCommits = apiResult.commits;
      const latestRemote = remoteCommits[0];

      // Vergelijk huidige lokale commit met de nieuwste commit op GitHub
      const isUpToDate = currentFullHash
        ? latestRemote.fullHash === currentFullHash || latestRemote.hash === currentHash
        : false;

      let behindCount = 0;
      let pendingCommits: any[] = [];

      if (!isUpToDate) {
        let foundIndex = -1;
        if (currentHash) {
          foundIndex = remoteCommits.findIndex((c: any) =>
            (currentFullHash && c.fullHash === currentFullHash) ||
            c.hash === currentHash ||
            (c.fullHash && currentHash && c.fullHash.startsWith(currentHash)) ||
            (currentFullHash && c.hash && currentFullHash.startsWith(c.hash))
          );
        }

        if (foundIndex > 0) {
          behindCount = foundIndex;
          pendingCommits = remoteCommits.slice(0, foundIndex);
        } else if (foundIndex === 0) {
          behindCount = 0;
          pendingCommits = [];
        } else {
          // Niet gevonden in de top 15 commits van GitHub -> server loopt voorop of minimaal 15 commits achter
          behindCount = Math.max(localGitBehindCount || 0, remoteCommits.length);
          pendingCommits = remoteCommits.slice(0, 10);
        }
      }

      if (localGitBehindCount && localGitBehindCount > behindCount) {
        behindCount = localGitBehindCount;
        if (localGitCommits.length > 0) pendingCommits = localGitCommits;
      }

      return res.json({
        success: true,
        isGitRepo,
        branch,
        repo: repoName,
        updatesAvailable: behindCount > 0,
        behindCount,
        currentCommitHash: currentHash || "onbekend",
        latestRemoteCommit: latestRemote,
        pendingCommits: pendingCommits.map((c: any) => ({
          hash: c.hash,
          message: c.message,
          author: c.author,
          time: c.date ? new Date(c.date).toLocaleString("nl-NL") : (c.time || "Recent"),
          url: c.url
        })),
        fetchOutput,
        checkMethod: "github_api",
        message: behindCount > 0
          ? `Er zijn ${behindCount} nieuwe commit(s) gevonden op GitHub (${repoName})!`
          : `De server is up-to-date. Actieve commit #${currentHash || "huidig"} is gelijk aan de nieuwste commit op GitHub (#${latestRemote.hash}).`
      });
    }

    // 4. Fallback op lokale Git als GitHub API tijdelijk onbereikbaar is
    const behindCount = localGitBehindCount || 0;
    return res.json({
      success: true,
      isGitRepo,
      branch,
      repo: repoName,
      updatesAvailable: behindCount > 0,
      behindCount,
      currentCommitHash: currentHash,
      pendingCommits: localGitCommits,
      fetchOutput,
      checkMethod: "git_cli",
      message: behindCount > 0
        ? `Er zijn ${behindCount} nieuwe commit(s) gevonden via Git!`
        : `De server is up-to-date met origin/${branch}.`
    });
  });

  // 4. Deploy update / Full Sync (Cache leegmaken, git pull, npm run build, pm2 reload)
  app.post("/api/admin/system/full-sync", requireAuth, requireAdmin, async (req: any, res: any) => {
    const logs: string[] = [];
    const log = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString("nl-NL");
      logs.push(`[${timestamp}] ${msg}`);
    };

    const isGitRepo = fs.existsSync(path.join(process.cwd(), ".git"));
    log("Start automatische synchronisatie en onderhoud...");

    // Stap 1: Cache legen
    log("Stap 1: Server- en tijdelijke bouwcache opschonen...");
    clearLocalTempCaches();
    log("Tijdelijke cachebestanden zijn succesvol verwijderd.");

    // Stap 2: Git pull uitvoeren
    let updated = false;
    let branch = "main";

    if (isGitRepo) {
      const branchRes = await runCmd("git rev-parse --abbrev-ref HEAD");
      branch = (branchRes.success && branchRes.stdout && branchRes.stdout !== "HEAD") ? branchRes.stdout : "main";
      log(`Actieve branch op de server: ${branch}`);

      log(`Stap 2: Wijzigingen ophalen van GitHub (git pull origin ${branch})...`);
      // Ruim eventuele lokaal gewijzigde build-artefacten (zoals version.json) op zodat git pull nooit blokkeert
      await runCmd("git checkout -- public/version.json 2>/dev/null || true");
      await runCmd("git checkout -- version.json 2>/dev/null || true");

      let pullRes = await runCmd(`git pull origin ${branch}`, 45000);
      if (pullRes.stdout) log(pullRes.stdout);
      if (pullRes.stderr && !pullRes.success) {
        log(`Fout/Waarschuwing: ${pullRes.stderr}`);
        // Als git pull alsnog klaagt over lokale merge conflict op gegenereerde bestanden, voer veilige checkout/stash uit
        if (pullRes.stderr.includes("overwritten by merge") || pullRes.stderr.includes("Please commit your changes or stash")) {
          log("Lokale gegenereerde bestanden gedetecteerd. Veilige reset van lokale buildbestanden...");
          await runCmd("git stash --include-untracked 2>/dev/null || git checkout -- .");
          pullRes = await runCmd(`git pull origin ${branch}`, 45000);
          if (pullRes.stdout) log(pullRes.stdout);
        }
      }

      if (pullRes.stdout.includes("Already up to date") || pullRes.stdout.includes("Al up-to-date")) {
        log(`Lokale repository is reeds up-to-date met origin/${branch}.`);
      } else if (pullRes.success) {
        log("Nieuwste bestanden succesvol binnengehaald vanaf GitHub!");
        updated = true;
      }
    } else {
      log("Stap 2: Geen Git repository gevonden in deze cloud-preview container. Git-pull overgeslagen.");
    }

    // Stap 3: Build uitvoeren
    log("Stap 3: Productiebundel compileren (npm run build)...");
    const buildRes = await runCmd("npm run build", 180000);
    if (buildRes.stdout) {
      const filteredStdout = buildRes.stdout.split("\n").slice(-8).join("\n");
      log(filteredStdout);
    }
    if (buildRes.stderr && !buildRes.success) {
      log(`Foutbericht tijdens build: ${buildRes.stderr}`);
    }

    if (!buildRes.success) {
      log("LET OP: De build is niet voltooid met foutcode. Bekijk de logs.");
    } else {
      log("Productiebuild succesvol afgerond! Nieuwe bestanden staan klaar in dist/.");
    }

    // Stap 4: PM2 procescontrole
    const pm2Check = await runCmd("pm2 -v");
    if (pm2Check.success) {
      log("Stap 4: PM2 procesmanager gedetecteerd. Server herstart veilig nadat dit antwoord is verstuurd.");
    }

    lastSystemSyncTime = new Date().toISOString();
    log("Synchronisatie en onderhoudsprocedure succesvol afgerond!");

    // Stuur eerst de volledige JSON-respons met alle logs naar de browser
    res.json({
      success: buildRes.success,
      updated,
      branch,
      logs,
      message: updated
        ? "Nieuwste wijzigingen zijn succesvol van GitHub opgehaald en gecompileerd! De server herstart automatisch over enkele seconden."
        : "Cache is geleegd en de applicatie is up-to-date gecontroleerd."
    });

    // Herstart PM2 pas 1.5 seconde NADAT de HTTP-verbinding netjes is afgerond en naar de browser is verstuurd
    if (pm2Check.success && buildRes.success) {
      setTimeout(async () => {
        try {
          console.log("[System] Herladen van PM2 proces na voltooide update...");
          await runCmd("pm2 reload all || pm2 restart all");
        } catch (e) {
          console.error("Fout bij uitvoeren van pm2 reload:", e);
        }
      }, 1500);
    }
  });

  // Dynamic Sitemap generator for Google and other search engines
  app.get("/sitemap.xml", (req, res) => {
    try {
      const host = req.get("host") || "lijstvanandel.nl";
      const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
      const baseUrl = `${protocol}://${host}`;
      const db = getDb();

      const staticRoutes = [
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/standpunten", priority: "0.9", changefreq: "weekly" },
        { url: "/nieuws", priority: "0.9", changefreq: "daily" },
        { url: "/wijken-en-kernen", priority: "0.9", changefreq: "weekly" },
        { url: "/agenda", priority: "0.8", changefreq: "daily" },
        { url: "/fractie", priority: "0.8", changefreq: "monthly" },
        { url: "/bestuur", priority: "0.7", changefreq: "monthly" },
        { url: "/steunfractie", priority: "0.7", changefreq: "monthly" },
        { url: "/contact", priority: "0.8", changefreq: "monthly" }
      ];

      const newsRoutes = (db.news || []).map((n: any) => ({
        url: `/nieuws/${n.id}`,
        priority: "0.8",
        changefreq: "weekly",
        lastmod: n.updatedAt ? n.updatedAt.split("T")[0] : (n.createdAt ? n.createdAt.split("T")[0] : (n.date || new Date().toISOString().split("T")[0]))
      }));

      const allWijken = db.wijken?.length ? db.wijken : BUURTKAART_43_WIJKEN;
      const wijkRoutes = allWijken.map((w: any) => ({
        url: `/wijken-en-kernen/${w.slug}`,
        priority: "0.8",
        changefreq: "weekly",
        lastmod: w.updatedAt ? w.updatedAt.split("T")[0] : new Date().toISOString().split("T")[0]
      }));

      const eventRoutes = (db.events || []).filter((e: any) => e.isPublic && e.isPublished).map((e: any) => ({
        url: `/agenda/${e.id}`,
        priority: "0.7",
        changefreq: "weekly",
        lastmod: e.updatedAt ? e.updatedAt.split("T")[0] : (e.createdAt ? e.createdAt.split("T")[0] : new Date().toISOString().split("T")[0])
      }));

      const allUrls = [...staticRoutes, ...newsRoutes, ...wijkRoutes, ...eventRoutes];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${baseUrl}${u.url}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.send(xml);
    } catch (e: any) {
      console.error("Fout bij genereren van sitemap:", e);
      res.status(500).send("Fout bij genereren van sitemap");
    }
  });

  // Robots.txt generator
  app.get("/robots.txt", (req, res) => {
    const host = req.get("host") || "lijstvanandel.nl";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /login
Disallow: /registreren
Disallow: /api/
Disallow: /*?*filter=
Disallow: /*?*sort=
Disallow: /*?*tab=

Sitemap: ${baseUrl}/sitemap.xml
`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.send(txt);
  });

  // Explicit 404 handler for unhandled /api requests so they NEVER fall through to Vite / SPA index.html
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global error handler for API requests
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Server error on", req.method, req.originalUrl, err);
    if (req.originalUrl && req.originalUrl.startsWith("/api")) {
      return res.status(500).json({ error: err?.message || "Interne serverfout" });
    }
    next(err);
  });

  // Helper function to serve HTML with server-side injected OpenGraph & SEO tags
  const renderHtmlWithSeo = (req: express.Request, res: express.Response, rawHtml: string) => {
    try {
      const host = req.get("host") || "lijstvanandel.nl";
      const db = getDb();
      const meta = getPageMetadata(req.originalUrl || req.url, host, db);
      const enhancedHtml = injectMetadataIntoHtml(rawHtml, meta);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(enhancedHtml);
    } catch (err) {
      console.error("Fout bij renderen van SEO metadata:", err);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(rawHtml);
    }
  };

  // Vite middleware for development vs static production serving with SSR meta tags
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // Development SSR HTML injection for index.html
    app.get('*all', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        // Let assets pass through if not handled by vite middleware
        if (url.startsWith("/api") || url.startsWith("/uploads") || url.startsWith("/assets") || url.includes(".")) {
          return next();
        }
        const templatePath = path.join(process.cwd(), "index.html");
        let template = fs.readFileSync(templatePath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        return renderHtmlWithSeo(req, res, template);
      } catch (e) {
        return next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    let cachedIndexHtml = "";
    if (fs.existsSync(indexHtmlPath)) {
      cachedIndexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
    }

    // Serve static assets first (js, css, images) with aggressive caching for fast Core Web Vitals
    app.use(express.static(distPath, {
      index: false,
      maxAge: '30d',
      setHeaders: (res, filePath) => {
        if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (/\.(jpg|jpeg|png|webp|svg|ico|woff2?)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        }
      }
    }));

    // All page routes get dynamic server-side OpenGraph / SEO injection
    app.get('*all', (req, res) => {
      // Reload template if not cached or read fresh
      let html = cachedIndexHtml;
      if (!html && fs.existsSync(indexHtmlPath)) {
        html = fs.readFileSync(indexHtmlPath, "utf-8");
      }
      return renderHtmlWithSeo(req, res, html);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
