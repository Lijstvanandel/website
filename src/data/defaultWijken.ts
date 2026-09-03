export interface DefaultWijkData {
  slug: string;
  naam: string;
  type: "Wijk" | "Kern";
  gemeente: string;
  is_grouped: boolean;
  bannerUrl: string;
  beschrijving: string;
  vertegenwoordiger: {
    voornaam: string;
    achternaam: string;
    fotoUrl?: string;
    rol?: string;
    beschrijving: string;
    email: string;
    socials: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      twitter?: string;
      telegram?: string;
      tiktok?: string;
    };
  } | null;
}

export const BUURTKAART_43_WIJKEN: DefaultWijkData[] = [
  // =========================================================================
  // 13 Stadswijken van Steenwijk (uit buurt_weergave)
  // =========================================================================
  {
    slug: "centrum-steenwijk",
    naam: "Centrum Steenwijk",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/markt-steenwijk.jpg",
    beschrijving: "Het historische stadshart van Steenwijk met de sfeervolle Markt, winkels, horeca, cultuur en monumentale gevels.",
    vertegenwoordiger: null,
  },
  {
    slug: "clingenborgh",
    naam: "Clingenborgh",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Rustige, groene en ruim opgezette woonwijk aan de rand van Steenwijk met een gemoedelijke sfeer.",
    vertegenwoordiger: null,
  },
  {
    slug: "de-gagels",
    naam: "De gagels",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Geliefde en kindvriendelijke woonwijk met veel openbaar groen, basisonderwijs en veilige speelgelegenheden.",
    vertegenwoordiger: null,
  },
  {
    slug: "nieuwe-gagels",
    naam: "Nieuwe gagels",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Moderne uitbreidingswijk aansluitend op De Gagels met een gevarieerd woningaanbod voor jong en oud.",
    vertegenwoordiger: null,
  },
  {
    slug: "dolderkanaal",
    naam: "Dolderkanaal",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Wijkzone langs het Steenwijkerdiep en het Dolderkanaal met een mix van maritieme bedrijvigheid en wonen aan het water.",
    vertegenwoordiger: null,
  },
  {
    slug: "groot-verlaat",
    naam: "Groot Verlaat",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Dynamisch bedrijventerrein en ondernemersgebied aan de zuidelijke invalsweg van Steenwijk.",
    vertegenwoordiger: null,
  },
  {
    slug: "oostermeenthe",
    naam: "Oostermeenthe",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/oostermeenthe-banner.jpg",
    beschrijving: "Oostermeenthe is een ruim opgezette woonwijk aan de oostzijde van Steenwijk. Een wijk met karakter, met aandacht voor verkeersveiligheid, groen onderhoud en voorzieningen voor jong en oud.",
    vertegenwoordiger: {
      voornaam: "Stef",
      achternaam: "Mars",
      fotoUrl: "/assets/stef-mars.jpg",
      rol: "Wijkvertegenwoordiger Oostermeenthe",
      beschrijving: "Stef is uw aanspreekpunt in Oostermeenthe. Hij verzamelt signalen uit de wijk en brengt deze onder de aandacht van de fractie.",
      email: "stef@lijstvanandel.nl",
      socials: {
        facebook: "https://facebook.com",
        instagram: "https://instagram.com",
        linkedin: "https://linkedin.com",
        twitter: "",
        telegram: "",
        tiktok: "",
      },
    },
  },
  {
    slug: "oostwijken-de-beitel",
    naam: "Oostwijken, De Beitel",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Bedrijvige en goed ontsloten wijk aan de oostzijde van Steenwijk met gevarieerde bedrijvigheid en werkgelegenheid.",
    vertegenwoordiger: null,
  },
  {
    slug: "paddenpoel-en-kornputkwartier",
    naam: "Paddenpoel en Kornputkwartier",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Populaire jonge woonwijk met moderne architectuur, veilige speelzones en veel waterpartijen.",
    vertegenwoordiger: null,
  },
  {
    slug: "steenwijk-west",
    naam: "Steenwijk West",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Veelzijdige en karakteristieke wijk met buurthuizen, sterke sociale samenhang en betrokken bewoners.",
    vertegenwoordiger: null,
  },
  {
    slug: "steenwijkerdiep",
    naam: "Steenwijkerdiep",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Waterrijke stadszone aan het historische vaarwater tussen het centrum en de waterverbindingen naar de Kop van Overijssel.",
    vertegenwoordiger: null,
  },
  {
    slug: "torenlanden",
    naam: "Torenlanden",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Aangename woonwijk gunstig gesitueerd nabij sportfaciliteiten, scholen en op korte afstand van het centrum.",
    vertegenwoordiger: null,
  },
  {
    slug: "woldmeenthe",
    naam: "Woldmeenthe",
    type: "Wijk",
    gemeente: "Steenwijk",
    is_grouped: false,
    bannerUrl: "/assets/steenwijk-aerial.jpg",
    beschrijving: "Architectonisch hoogwaardige villawijk met royale waterpartijen, ecologische zones en rust.",
    vertegenwoordiger: null,
  },

  // =========================================================================
  // 30 Kernen en dorpen van Steenwijkerland (uit buurt_weergave)
  // =========================================================================
  {
    slug: "barsbeek-heetveld-en-kadoelen",
    naam: "Barsbeek, Heetveld en Kadoelen",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Prachtige plattelandsbuurtschappen en lintbebouwing op de glooiingen rondom Sint Jansklooster en Vollenhove.",
    vertegenwoordiger: null,
  },
  {
    slug: "belt-schutsloot",
    naam: "Belt-schutsloot",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Karakteristiek waterdorp omsloten door meren en rietlanden met actieve watersport en hechte dorpszin.",
    vertegenwoordiger: null,
  },
  {
    slug: "blankenham",
    naam: "Blankenham",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Historisch dijkdorp gelegen aan de voormalige Zuiderzeedijk met panoramische vergezichten over de polder.",
    vertegenwoordiger: null,
  },
  {
    slug: "blokzijl",
    naam: "Blokzijl",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Monumentaal vesting- en havenstadje aan de rand van de Weerribben met rijke historie en culinaire aantrekkingskracht.",
    vertegenwoordiger: null,
  },
  {
    slug: "de-pol-baars-en-de-bult",
    naam: "De Pol, Baars en de Bult",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Bosrijke buurtschappen en landelijke woonomgevingen aan de noordrand van de gemeente nabij landgoed De Eese.",
    vertegenwoordiger: null,
  },
  {
    slug: "doosje",
    naam: "Doosje",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: false,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Markante, rustieke buurtschap gelegen in het water- en weidelandschap tussen Wanneperveen en Meppel.",
    vertegenwoordiger: null,
  },
  {
    slug: "eeserwold",
    naam: "Eeserwold",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Innovatief en duurzaam woon- en werklandschap rond het meer van Eeserwold met moderne ecologische ambities.",
    vertegenwoordiger: null,
  },
  {
    slug: "eesveen",
    naam: "Eesveen",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Gemoedelijk esdorp gelegen tussen Steenwijk en de uitgestrekte bossen en heidevelden van De Eese.",
    vertegenwoordiger: null,
  },
  {
    slug: "giethoorn",
    naam: "Giethoorn",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Het wereldberoemde waterdorp van onze gemeente. Balans tussen recreatie, natuurbehoud en leefbaarheid voor de eigen inwoners staat hier voorop.",
    vertegenwoordiger: null,
  },
  {
    slug: "groot-binnenwater",
    naam: "Groot binnenwater",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: false,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Het uitgestrekte meren- en plassengebied van Nationaal Park Weerribben-Wieden met Beulaker- en Belterwijde.",
    vertegenwoordiger: null,
  },
  {
    slug: "ijsselham-paasloo-en-de-basse",
    naam: "Ijsselham, Paasloo en de Basse",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Landelijke parels met eeuwenoude kerken, boerderijen en een hechte gemeenschap in het noordelijke coulisselandschap.",
    vertegenwoordiger: null,
  },
  {
    slug: "jonen-en-dwarsgracht",
    naam: "Jonen en Dwarsgracht",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Pittoreske waterdorpen in de Weerribben-Wieden, slechts bereikbaar via het water, per fiets of over typische vonders.",
    vertegenwoordiger: null,
  },
  {
    slug: "kalenberg",
    naam: "Kalenberg",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Sfeervol lintdorp langs de Kalenbergergracht midden in Nationaal Park Weerribben-Wieden met een sterke rietcultuur.",
    vertegenwoordiger: null,
  },
  {
    slug: "kallenkote",
    naam: "Kallenkote",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Gastvrij en gemoedelijk esdorp tussen Steenwijk en Drenthe, omgeven door groen en boswachterijen.",
    vertegenwoordiger: null,
  },
  {
    slug: "klosse-roekebos-en-dinxterveen",
    naam: "Klosse, Roekebos en Dinxterveen",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Vreedzame buurtschappen in het karakteristieke veenweide- en moeraslandschap ten zuiden van Giethoorn.",
    vertegenwoordiger: null,
  },
  {
    slug: "kuinre",
    naam: "Kuinre",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Historische grens- en havenplaats met rijke zeevaarthistorie grenzend aan de Flevopolder en het Kuinderbos.",
    vertegenwoordiger: null,
  },
  {
    slug: "marijenkampen-en-willemsoord",
    naam: "Marijenkampen en Willemsoord",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Historische kolonie-omgeving van de Maatschappij van Weldadigheid met actieve gemeenschappen en cultureel erfgoed.",
    vertegenwoordiger: null,
  },
  {
    slug: "moespot-en-leeuwte",
    naam: "Moespot en Leeuwte",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Schitterende buurtschappen aan de noord- en oostzijde van Vollenhove in het waterrijke poldergebied.",
    vertegenwoordiger: null,
  },
  {
    slug: "nederland-en-baarlo",
    naam: "Nederland en Baarlo",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Iconische buurtschappen omgeven door rietpercelen, petgaten en waterwegen in het hart van de Weerribben.",
    vertegenwoordiger: null,
  },
  {
    slug: "oldemarkt",
    naam: "Oldemarkt",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Grote centrumkern met sterke voorzieningen, lokale winkeliers, bloeiend verenigingsleven en basisonderwijs.",
    vertegenwoordiger: null,
  },
  {
    slug: "onna",
    naam: "Onna",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Sfeervol en hecht dorp aan de oostkant van Steenwijk met een actieve dorpsvereniging en dorpshuis.",
    vertegenwoordiger: null,
  },
  {
    slug: "ossenzijl",
    naam: "Ossenzijl",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Toegangspoort tot De Weerribben met het buitencentrum en een geliefde aanlegplaats voor waterliefhebbers.",
    vertegenwoordiger: null,
  },
  {
    slug: "scheerwolde",
    naam: "Scheerwolde",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Polderdorp centraal gelegen in Steenwijkerland met een sterke agrarische en sociale identiteit.",
    vertegenwoordiger: null,
  },
  {
    slug: "sint-jansklooster",
    naam: "Sint Jansklooster",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Hooggelegen dorp met de iconische watertoren, het spectaculaire corso en uitzicht over het veenland.",
    vertegenwoordiger: null,
  },
  {
    slug: "steenwijkerwold-en-witte-paarden",
    naam: "Steenwijkerwold en Witte Paarden",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Grote vitale dorpskern en aansluitende buurtschap met basisonderwijs, sportvelden en actieve dorpsbelangen.",
    vertegenwoordiger: null,
  },
  {
    slug: "tuk",
    naam: "Tuk",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Sfeervol dorp direct aan Steenwijk en de bossen van de Woldberg met een rijk verenigingsleven.",
    vertegenwoordiger: null,
  },
  {
    slug: "vollenhove",
    naam: "Vollenhove",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Historische stad met havezaten, pittoreske haven en de befaamde bloemencorsocultuur.",
    vertegenwoordiger: null,
  },
  {
    slug: "wanneperveen",
    naam: "Wanneperveen",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Langgerekt water- en lintdorp met rietgedekte woonboerderijen, jachthavens en directe toegang tot de Belterwijde.",
    vertegenwoordiger: null,
  },
  {
    slug: "wetering",
    naam: "Wetering",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Karakteristiek lintdorp aan weerszijden van de Wetering in het rietland van de Weerribben.",
    vertegenwoordiger: null,
  },
  {
    slug: "zuidveen",
    naam: "Zuidveen",
    type: "Kern",
    gemeente: "Steenwijkerland",
    is_grouped: true,
    bannerUrl: "/assets/hero-banner.jpg",
    beschrijving: "Historisch lintdorp direct ten zuiden van Steenwijk met een sterke eigen identiteit en landelijke sfeer.",
    vertegenwoordiger: null,
  },
];

export const LEGACY_SLUG_MAP: Record<string, string> = {
  "steenwijk-centrum": "centrum-steenwijk",
  "tuindorp": "centrum-steenwijk",
  "nieuwe-meenthe": "oostermeenthe",
  "willemsoord": "marijenkampen-en-willemsoord",
  "marijenkampen": "marijenkampen-en-willemsoord",
  "steenwijkerwold": "steenwijkerwold-en-witte-paarden",
  "witte-paarden": "steenwijkerwold-en-witte-paarden",
  "nederland": "nederland-en-baarlo",
  "baarlo": "nederland-en-baarlo",
  "basse": "ijsselham-paasloo-en-de-basse",
  "paasloo": "ijsselham-paasloo-en-de-basse",
  "ijsselham": "ijsselham-paasloo-en-de-basse",
  "barsbeek": "barsbeek-heetveld-en-kadoelen",
  "heetveld": "barsbeek-heetveld-en-kadoelen",
  "kadoelen": "barsbeek-heetveld-en-kadoelen",
  "de-pol": "de-pol-baars-en-de-bult",
  "baars": "de-pol-baars-en-de-bult",
  "de-bult": "de-pol-baars-en-de-bult",
  "klosse": "klosse-roekebos-en-dinxterveen",
  "roekebos": "klosse-roekebos-en-dinxterveen",
  "dinxterveen": "klosse-roekebos-en-dinxterveen",
  "jonen": "jonen-en-dwarsgracht",
  "dwarsgracht": "jonen-en-dwarsgracht",
  "moespot": "moespot-en-leeuwte",
  "leeuwte": "moespot-en-leeuwte",
  "paddenpoel": "paddenpoel-en-kornputkwartier",
  "kornputkwartier": "paddenpoel-en-kornputkwartier",
  "oostwijken": "oostwijken-de-beitel",
  "de-beitel": "oostwijken-de-beitel",
};

export interface StoredWijkRecord extends Partial<DefaultWijkData> {
  slug: string;
  updatedAt?: string;
}

export function syncWijkenWithBuurtkaart(existingList: StoredWijkRecord[] = []): StoredWijkRecord[] {
  const existingMap = new Map<string, StoredWijkRecord>();
  (existingList || []).forEach((item) => {
    if (item && item.slug) {
      const lower = item.slug.toLowerCase();
      existingMap.set(lower, item);
      const mapped = LEGACY_SLUG_MAP[lower];
      if (mapped && !existingMap.has(mapped)) {
        existingMap.set(mapped, item);
      }
    }
  });

  return BUURTKAART_43_WIJKEN.map((defWijk) => {
    const existing = existingMap.get(defWijk.slug.toLowerCase());
    if (existing) {
      return {
        ...defWijk,
        naam: existing.naam || defWijk.naam,
        type: existing.type || defWijk.type,
        gemeente: existing.gemeente || defWijk.gemeente,
        bannerUrl: existing.bannerUrl || defWijk.bannerUrl,
        beschrijving: existing.beschrijving || defWijk.beschrijving,
        vertegenwoordiger: existing.vertegenwoordiger !== undefined ? existing.vertegenwoordiger : defWijk.vertegenwoordiger,
        updatedAt: existing.updatedAt || new Date().toISOString(),
      };
    }
    return {
      ...defWijk,
      updatedAt: new Date().toISOString(),
    };
  });
}
