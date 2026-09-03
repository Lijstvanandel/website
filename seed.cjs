const fs = require('fs');

const db = {
  "users": [
    {
      "id": "1788365405085",
      "salutation": "De heer",
      "fullName": "Admin Gebruiker",
      "address": "",
      "city": "Steenwijk",
      "username": "admin",
      "password": "$2a$10$C8H1cO/2Oq5R59n.V.pG/.T6tL/9D8J.o/uH9u8T6tL/9D8J.o/uH", // password123
      "role": "admin",
      "isActive": true
    }
  ],
  "fractieleden": [
    {
      "id": "1",
      "name": "Sammy van Andel",
      "firstName": "sammy",
      "role": "Fractievoorzitter",
      "type": "Raadslid",
      "bio": "26 jaar, geboren en getogen in Steenwijk. Werkt als informatiearchitect na zijn HBO-ICT opleiding. Zet zich met een frisse, analytische blik in voor Steenwijkerland.",
      "speerpunten": [
        "Voorrang voor eigen inwoners",
        "Behoud van de natuur",
        "Slimmer & digitaal bestuur"
      ],
      "email": "sammy@lijstvanandel.nl",
      "socials": {
        "facebook": "#",
        "instagram": "#",
        "linkedin": "#"
      },
      "imgUrl": "/assets/sammy.png"
    },
    {
      "id": "2",
      "name": "Lisa Mars",
      "firstName": "lisa",
      "role": "Raadslid",
      "type": "Raadslid",
      "bio": "Als raadslid zet Lisa zich dagelijks in voor de inwoners van Steenwijkerland. Bevlogen, benaderbaar en met oog voor het persoonlijke verhaal achter beleid.",
      "speerpunten": [
        "Sociale samenhang",
        "Veilige leefomgeving",
        "Aandacht voor jongeren"
      ],
      "email": "lisa@lijstvanandel.nl",
      "socials": {},
      "imgUrl": "/assets/lisa.png"
    }
  ],
  "videos": [
    {
      "id": "1001",
      "title": "Bijdrage over woningbouw Oostermeenthe",
      "category": "Raadsdebat",
      "date": "2024-05-15",
      "videoUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
      "fractieledenIds": ["1"],
      "wijkSlug": "oostermeenthe"
    }
  ],
  "categories": [
    { "id": "cat-1", "name": "Politiek", "slug": "politiek", "description": "Standpunten, moties en raadsdebatten van de fractie", "color": "#c6a858" },
    { "id": "cat-2", "name": "Media", "slug": "media", "description": "Interviews, artikelen en optredens in de media", "color": "#2d6a4f" },
    { "id": "cat-3", "name": "Wijken & Kernen", "slug": "wijken-en-kernen", "description": "Lokaal nieuws uit de wijken en dorpen in Steenwijkerland", "color": "#3d5a80" },
    { "id": "cat-4", "name": "Woningbouw", "slug": "woningbouw", "description": "Huisvesting, woningmarkt en nieuwbouw voor inwoners", "color": "#d4a373" },
    { "id": "cat-5", "name": "Evenementen", "slug": "evenementen", "description": "Inloopavonden, bijeenkomsten en acties", "color": "#e76f51" },
    { "id": "cat-6", "name": "Algemeen", "slug": "algemeen", "description": "Algemene mededelingen van Lijst van Andel", "color": "#6c757d" }
  ],
  "news": [
    {
      "id": "kopwijzer-rtv-slos",
      "title": "Sammy van Andel te gast bij Kopwijzer (RTV SLOS)",
      "excerpt": "In de uitzending van Kopwijzer sprak Sammy met de presentator over de speerpunten van Lijst van Andel en de lokale agenda.",
      "description": "In de uitzending van Kopwijzer sprak Sammy met de presentator over de speerpunten van Lijst van Andel en de lokale agenda.",
      "content": "<p>Tijdens de uitzending van Kopwijzer op RTV SLOS ging Sammy van Andel uitgebreid in op de lokale prioriteiten van Lijst van Andel.</p><p>Onderwerpen die voorbijkwamen waren onder meer voorrang voor eigen inwoners op de woningmarkt, het behoud van de Weerribben-Wieden en een bestuurscultuur die dichter bij de inwoner staat. Sammy benadrukte het belang van een lokale, onafhankelijke stem in de raad — vrij van Haagse invloeden.</p>",
      "date": "2026-04-18",
      "createdAt": "2026-04-18T10:00:00.000Z",
      "author": "Redactie",
      "thumbnailUrl": "/assets/news-kopwijzer.jpg",
      "headerUrl": "/assets/news-kopwijzer.jpg",
      "category": "Media"
    },
    {
      "id": "nieuwe-impulsen-binnenstad",
      "title": "Lijst van Andel pleit voor nieuwe impulsen in de binnenstad",
      "excerpt": "De fractie dient een motie in om leegstand op de Markt actief aan te pakken en lokale ondernemers ruimte te geven.",
      "description": "De fractie dient een motie in om leegstand op de Markt actief aan te pakken en lokale ondernemers ruimte te geven.",
      "content": "<p>In de komende raadsvergadering dient Lijst van Andel een motie in die het college oproept met een concreet plan te komen om leegstand in het centrum van Steenwijk te bestrijden.</p><p>Volgens de fractie verdient de binnenstad een impuls die past bij de identiteit van de gemeente: ruimte voor lokale ondernemers, sfeer op de Markt en een aantrekkelijk verblijfsklimaat voor inwoners én bezoekers.</p>",
      "date": "2026-05-02",
      "createdAt": "2026-05-02T14:30:00.000Z",
      "author": "Lijst van Andel",
      "thumbnailUrl": "/assets/markt-steenwijk.jpg",
      "headerUrl": "/assets/markt-steenwijk.jpg",
      "category": "Politiek",
      "wijkSlug": "steenwijk-centrum",
      "wijkNaam": "Steenwijk Centrum / Binnenstad"
    }
  ],
  "events": [
    {
      "id": "1788383596955",
      "title": "Inloopavond en Ideeëncafé Steenwijkerland",
      "date": "2026-09-15",
      "address": "Markt 1, Steenwijk",
      "startTime": "19:30",
      "endTime": "21:30",
      "description": "Praat mee over de toekomst van onze gemeente. Iedereen is welkom voor een open gesprek met fractieleden.",
      "isPublic": true,
      "isPublished": true,
      "isCancelled": false,
      "thumbnailUrl": "",
      "attendees": [],
      "createdAt": "2026-09-02T21:13:16.955Z"
    }
  ]
};

fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
console.log('Database seeded with users, fractieleden, videos, categories, news and events!');
