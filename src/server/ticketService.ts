import QRCode from "qrcode";

export interface EventTicket {
  id: string;
  ticketCode: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  userId?: string | null;
  fullName: string;
  email: string;
  phone?: string;
  isMember: boolean;
  registeredAt: string;
  price: number;
  paid: boolean;
  paymentMethod?: string;
  stripeSessionId?: string;
  status: "active" | "cancelled" | "attended";
  cancelledAt?: string;
  cancelReason?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}

export interface EventCancellation {
  id: string;
  ticketId?: string;
  eventId: string;
  eventTitle: string;
  userId?: string | null;
  fullName: string;
  email: string;
  isMember: boolean;
  registeredAt: string;
  cancelledAt: string;
  hoursBeforeEvent: number;
  hoursAfterRegistration: number;
  reason?: string;
}

/**
 * Bepaalt of de exacte locatie vrijgegeven mag worden:
 * "Locatie wordt pas ter beschikking gesteld na 12 uur na aanmelding van evenement, tenzij het korter dan 12 uur van te voren is."
 */
export function evaluateLocationRelease(
  registeredAt: string,
  eventDate: string,
  eventStartTime?: string,
  locationHiddenUntil12h: boolean = true
): {
  isReleased: boolean;
  isShortNotice: boolean;
  releaseDate: Date;
  hoursUntilEvent: number;
  hoursSinceRegistration: number;
  message: string;
} {
  const regDateObj = new Date(registeredAt);
  const now = new Date();

  // Bereken startmoment van het evenement
  const timeStr = eventStartTime && eventStartTime.trim() ? eventStartTime.trim() : "19:00";
  const [hours, minutes] = timeStr.split(":").map((n) => parseInt(n, 10) || 0);
  const eventStartObj = new Date(eventDate);
  eventStartObj.setHours(hours, minutes, 0, 0);

  // Uren tot evenement start
  const hoursUntilEvent = (eventStartObj.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Uren sinds registratie
  const hoursSinceRegistration = (now.getTime() - regDateObj.getTime()) / (1000 * 60 * 60);

  // Datum waarop 12 uur na aanmelding verstreken is
  const releaseDate = new Date(regDateObj.getTime() + 12 * 60 * 60 * 1000);

  if (!locationHiddenUntil12h) {
    return {
      isReleased: true,
      isShortNotice: false,
      releaseDate,
      hoursUntilEvent,
      hoursSinceRegistration,
      message: "Locatie is openbaar vrijgegeven.",
    };
  }

  // Uitzondering: als het evenement binnen 12 uur plaatsvindt
  if (hoursUntilEvent <= 12) {
    return {
      isReleased: true,
      isShortNotice: true,
      releaseDate,
      hoursUntilEvent,
      hoursSinceRegistration,
      message: "Direct vrijgegeven omdat het evenement binnen 12 uur aanvangt.",
    };
  }

  // Regel: 12 uur na aanmelding
  if (hoursSinceRegistration >= 12) {
    return {
      isReleased: true,
      isShortNotice: false,
      releaseDate,
      hoursUntilEvent,
      hoursSinceRegistration,
      message: "Locatie vrijgegeven (12 uur na aanmelding verstreken).",
    };
  }

  const hoursRemaining = Math.max(0.1, (releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  return {
    isReleased: false,
    isShortNotice: false,
    releaseDate,
    hoursUntilEvent,
    hoursSinceRegistration,
    message: `Locatiebeveiliging actief: Het exacte adres wordt over circa ${Math.ceil(hoursRemaining)} uur vrijgegeven.`,
  };
}

export function extractCityFromAddress(address?: string): string {
  if (!address) return "Steenwijkerland";
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    const cleaned = lastPart.replace(/^\d{4}\s*[A-Z]{2}\s*/i, "").trim();
    if (cleaned) return cleaned;
  }
  return address;
}

export async function generateTicketQRCodeBuffer(payloadUrl: string): Promise<Buffer> {
  return QRCode.toBuffer(payloadUrl, {
    width: 480,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

export async function generateTicketQRCodeDataUrl(payloadUrl: string): Promise<string> {
  return QRCode.toDataURL(payloadUrl, {
    width: 480,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

function formatDutchDate(d: Date): string {
  try {
    return d.toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_e) {
    return d.toISOString();
  }
}

/**
 * Genereert de HTML e-mail voor het ticket, gemodelleerd naar het verstrekte voorbeeld.
 */
export function buildTicketEmailHtml(params: {
  ticket: EventTicket;
  event: any;
  isLocationReleased: boolean;
  releaseDate: Date;
  origin: string;
  qrCodeCidOrDataUrl: string;
}): string {
  const { ticket, event, isLocationReleased, releaseDate, origin, qrCodeCidOrDataUrl } = params;

  const ticketUrl = `${origin}/ticket/${ticket.ticketCode}`;
  const cancelUrl = `${origin}/ticket/${ticket.ticketCode}?action=cancel`;

  const bannerImg = event.thumbnailUrl
    ? (event.thumbnailUrl.startsWith("http") ? event.thumbnailUrl : `${origin}${event.thumbnailUrl}`)
    : `${origin}/assets/markt-steenwijk-tbv65eVk.jpg`;

  const eventCity = extractCityFromAddress(event.address);

  const locationSection = isLocationReleased
    ? `
      <p style="font-size: 14px; line-height: 140%;">
        <strong>Locatie:</strong><br/>
        ${event.address ? event.address.replace(/,\s*/g, "<br/>") : eventCity}<br/>
        Nederland
      </p>
    `
    : `
      <p style="font-size: 14px; line-height: 140%;">
        <strong>Locatie:</strong><br/>
        Plaats: ${eventCity}<br/>
        <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 6px 10px; border-radius: 6px; font-size: 12px; margin-top: 6px; border: 1px solid #fde68a;">
          🔒 <strong>Veiligheidsprotocol:</strong> Het exacte adres wordt op <strong>${formatDutchDate(releaseDate)}</strong> (12 uur na uw aanmelding) automatisch zichtbaar op uw digitale ticket.
        </span>
      </p>
    `;

  const ticketNoteSection = event.ticketNotes
    ? `<p style="font-size: 14px; line-height: 140%;"><strong>Ticket:</strong> ${event.ticketNotes}</p>`
    : `<p style="font-size: 14px; line-height: 140%;"><strong>Ticket:</strong> Toegangsbewijs voor bijeenkomst Lijst van Andel</p>`;

  const priceNote = ticket.price && ticket.price > 0
    ? `<p style="font-size: 12px; color: #64748b; margin-top: 4px;">Toegangsprijs niet-lid: €${ticket.price.toFixed(2)} (voldaan via iDEAL/kaart, geen cashback bij afmelding)</p>`
    : `<p style="font-size: 12px; color: #16a34a; margin-top: 4px;">Toegang: Gratis ${ticket.isMember ? "(inbegrepen bij lidmaatschap)" : "(openbaar evenement)"}</p>`;

  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket: ${event.title} #${ticket.ticketCode}</title>
  <style type="text/css">
    @media only screen and (min-width: 520px) {
      .u-row { width: 500px !important; }
      .u-row .u-col { vertical-align: top; }
      .u-row .u-col-100 { width: 500px !important; }
    }
    @media (max-width: 520px) {
      .u-row-container { max-width: 100% !important; padding: 0px !important; }
      .u-row .u-col { min-width: 320px !important; max-width: 100% !important; display: block !important; }
      .u-row { width: calc(100% - 20px) !important; }
      .u-col { width: 100% !important; }
    }
    body { margin: 0; padding: 0; font-family: verdana, geneva, sans-serif; background-color: #e7e7e7; color: #000000; }
    table, tr, td { vertical-align: top; border-collapse: collapse; }
    p { margin: 0; margin-bottom: 8px; }
    a { color: #0d9488; text-decoration: underline; }
  </style>
</head>
<body class="clean-body u_body" style="margin: 0; padding: 0; background-color: #e7e7e7; color: #000000">
  <table style="border-collapse: collapse; width: 100%; min-width: 320px; margin: 0 auto; background-color: #e7e7e7;" cellpadding="0" cellspacing="0">
    <tbody>
      <tr>
        <td style="display:none !important; visibility:hidden; font-size:1px; color:#ffffff; line-height:1px; max-height:0px; opacity:0; overflow:hidden;">
          Uw toegangscode voor ${event.title} #${ticket.ticketCode}
        </td>
      </tr>
      <tr>
        <td style="padding: 20px 10px;" align="center">
          <div class="u-row" style="margin: 0 auto; max-width: 500px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            
            <!-- Hero banner afbeelding -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background-color: #0f172a;">
                  <a href="${ticketUrl}" target="_blank">
                    <img src="${bannerImg}" alt="${event.title}" style="width: 100%; max-width: 500px; height: auto; display: block; border: 0;" />
                  </a>
                </td>
              </tr>
            </table>

            <!-- Evenement Informatie -->
            <div style="padding: 24px; text-align: left;">
              <p style="font-size: 17px; line-height: 140%; margin-bottom: 12px;">
                <strong>${event.title}</strong>
              </p>

              ${ticketNoteSection}
              ${priceNote}

              <p style="font-size: 14px; line-height: 140%; margin-top: 14px;">
                <strong>${event.date} &bull; ${event.startTime || "19:30"} ${event.endTime ? `tot ${event.endTime}` : ""}</strong>
              </p>

              <div style="margin: 16px 0; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                ${locationSection}
              </div>

              <!-- Ticket Code & QR Sectie -->
              <div style="margin-top: 20px; padding-top: 16px; border-top: 2px dashed #e2e8f0; text-align: center;">
                <p style="font-size: 15px; line-height: 140%; color: #0f172a; margin-bottom: 14px;">
                  <strong>Uw toegangscode voor het event</strong>
                </p>

                <div style="display: inline-block; padding: 12px; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px;">
                  <img src="${qrCodeCidOrDataUrl}" alt="QR Ticket Code #${ticket.ticketCode}" width="320" style="max-width: 100%; width: 280px; height: auto; display: block; margin: 0 auto;" />
                  <div style="margin-top: 10px; font-family: monospace; font-size: 16px; font-weight: bold; color: #0f172a; letter-spacing: 2px;">
                    #${ticket.ticketCode}
                  </div>
                </div>
                
                <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
                  Toon deze QR-code bij binnenkomst vanaf uw telefoon of print deze e-mail.
                </p>
              </div>

              <!-- Actieknoppen -->
              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #f1f5f9; text-align: center;">
                <a href="${ticketUrl}" style="display: inline-block; background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: bold; font-size: 13px;">
                  Bekijk Live Ticket & Exacte Locatie
                </a>

                <div style="margin-top: 16px; font-size: 12px; color: #64748b;">
                  Verhinderd? U kunt zich eenvoudig afmelden via:
                  <br/>
                  <a href="${cancelUrl}" style="color: #ef4444; text-decoration: underline; font-size: 11px;">
                    Meld u hier af voor deze bijeenkomst
                  </a>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding: 16px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
              Lijst van Andel Steenwijkerland &bull; info@lijstvanandel.nl &bull; www.lijstvanandel.nl
            </div>

          </div>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}
