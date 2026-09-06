import fs from "fs";
import path from "path";

// Newsletter HTML & Text Template Generator
// Inspired by official political newsletters (clean single-column container, clear media blocks, CTAs and unsubscribe footer)

export interface NewsletterItem {
  id: string;
  type: "news" | "video" | "event" | "custom";
  sourceId?: string;
  title: string;
  subtitle?: string;
  text: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
  dateLabel?: string;
}

export interface NewsletterData {
  id?: string;
  subject: string;
  preheader?: string;
  bannerUrl?: string;
  introTitle?: string;
  introText: string;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  ctaButtonColor?: string;
  items: NewsletterItem[];
  footerNote?: string;
}

function escapeHtml(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatParagraphs(text?: string): string {
  if (!text) return "";
  // Check if it's already HTML
  if (text.includes("<p>") || text.includes("<br")) {
    return text;
  }
  return text
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map(p => `<p style="margin: 0 0 12px 0; line-height: 155%;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function resolveUrl(url: string | undefined, baseUrl: string): string {
  if (!url) return baseUrl;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:")) {
    return url;
  }
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
}

export function generateNewsletterHtml(
  newsletter: NewsletterData,
  recipientEmail: string,
  baseUrl: string,
  unsubscribeToken: string,
  options?: { imageCids?: Record<string, string> }
): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const unsubscribeUrl = `${cleanBase}/nieuwsbrief/afmelden?email=${encodeURIComponent(recipientEmail)}&token=${encodeURIComponent(unsubscribeToken)}`;
  const banner = newsletter.bannerUrl || `${cleanBase}/assets/hero-banner.jpg`;
  const resolvedBannerUrl = options?.imageCids?.["banner"]
    ? `cid:${options.imageCids["banner"]}`
    : resolveUrl(banner, cleanBase);
  const goldColor = "#c6a858";
  const primaryCtaColor = newsletter.ctaButtonColor || goldColor;

  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="nl" style="line-height: inherit;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
  <title>${escapeHtml(newsletter.subject)}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; background-color: #09110c; color: #f3efe6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table, td, tr { border-collapse: collapse; vertical-align: top; }
    p { margin: 0 0 12px 0; }
    a { color: #c6a858; text-decoration: underline; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 18px 16px !important; }
      .mobile-button { width: 100% !important; display: block !important; text-align: center !important; }
      .item-img { max-height: 220px !important; object-fit: cover !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #09110c; color: #f3efe6;">
  <!-- Preheader snippet for email client preview -->
  <div style="display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #09110c; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(newsletter.preheader || newsletter.subject)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09110c; margin: 0 auto; table-layout: fixed;">
    <tbody>
      <tr>
        <td align="center" style="padding: 20px 10px 40px 10px;">
          <!-- Main Card Container (max 580px, in signature website dark forest green #112017) -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #112017; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #273b2d;">
            <tbody>

              <!-- Header Bar with Gold Accent (Website theme) -->
              <tr>
                <td style="background-color: #0c1711; padding: 14px 24px; border-bottom: 2px solid ${goldColor};">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="color: #ffffff; font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">
                        <a href="${cleanBase}" target="_blank" style="color: #ffffff; text-decoration: none;">
                          Lijst van Andel
                        </a>
                      </td>
                      <td align="right" style="color: ${goldColor}; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold; vertical-align: middle;">
                        Steenwijkerland
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Header Hero Banner -->
              <tr>
                <td style="padding: 0; background-color: #0c1711; text-align: center;">
                  <a href="${cleanBase}" target="_blank" style="display: block; text-decoration: none;">
                    <img src="${resolvedBannerUrl}" alt="Lijst van Andel Steenwijkerland" style="display: block; width: 100%; max-width: 580px; height: auto; border: 0; margin: 0 auto;" />
                  </a>
                </td>
              </tr>

              <!-- Intro Section -->
              <tr>
                <td class="content-padding" style="padding: 28px 24px 24px 24px; background-color: #112017;">
                  ${newsletter.introTitle ? `
                    <h1 style="margin: 0 0 16px 0; font-family: Georgia, serif; font-size: 23px; font-weight: bold; color: #ffffff; line-height: 130%;">
                      ${escapeHtml(newsletter.introTitle)}
                    </h1>
                  ` : ''}

                  <div style="font-size: 15px; line-height: 165%; color: #d6ded8;">
                    ${formatParagraphs(newsletter.introText)}
                  </div>

                  ${newsletter.ctaButtonText && newsletter.ctaButtonUrl ? `
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 22px; margin-bottom: 6px;">
                      <tr>
                        <td align="center">
                          <a href="${resolveUrl(newsletter.ctaButtonUrl, cleanBase)}" target="_blank" class="mobile-button" style="display: block; box-sizing: border-box; width: 100%; background-color: ${primaryCtaColor}; color: #0a130e; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; border-radius: 4px; text-align: center; border: 1px solid ${goldColor};">
                            ${escapeHtml(newsletter.ctaButtonText)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  ` : ''}
                </td>
              </tr>

              <!-- Dynamic Content Items (Nieuws, Videos, Evenementen) -->
              ${newsletter.items && newsletter.items.length > 0 ? newsletter.items.map((item, index) => {
                const cidKey = `item_${index}`;
                const itemImg = options?.imageCids?.[cidKey]
                  ? `cid:${options.imageCids[cidKey]}`
                  : (item.imageUrl ? resolveUrl(item.imageUrl, cleanBase) : "");
                const btnLink = resolveUrl(item.buttonUrl || cleanBase, cleanBase);
                
                // Color matching the website theme
                let badgeBg = "#1a2e21";
                let badgeColor = goldColor;
                let badgeBorder = "#2b4231";
                const badgeText = item.type === "video" ? "VIDEO" : item.type === "event" ? "AGENDA EVENEMENT" : "NIEUWS";

                if (item.type === "video") {
                  badgeBg = "#2a1515";
                  badgeColor = "#f87171";
                  badgeBorder = "#4a2424";
                } else if (item.type === "event") {
                  badgeBg = "#2a2414";
                  badgeColor = "#eab308";
                  badgeBorder = "#4d3e1b";
                }

                // Default button styling matching the website: warm gold or deep green with gold border
                const isGoldBtn = !item.buttonColor || item.buttonColor === "#c6a858" || item.buttonColor.includes("gold");
                const btnBgStyle = isGoldBtn
                  ? `background-color: ${goldColor}; color: #09110c; border: 1px solid ${goldColor};`
                  : `background-color: #1c3826; color: #f5f3ec; border: 1px solid ${goldColor};`;

                return `
                  <!-- Item Divider -->
                  <tr>
                    <td style="padding: 0 24px;">
                      <div style="border-top: 1px solid #233527; margin: 8px 0 22px 0;"></div>
                    </td>
                  </tr>

                  <!-- Item ${index + 1} Content -->
                  <tr>
                    <td class="content-padding" style="padding: 0 24px 26px 24px;">
                      ${itemImg ? `
                        <div style="margin-bottom: 16px; text-align: center;">
                          <a href="${btnLink}" target="_blank" style="display: block; text-decoration: none;">
                            <img src="${itemImg}" alt="${escapeHtml(item.title)}" class="item-img" style="display: block; width: 100%; max-width: 532px; height: auto; border-radius: 6px; border: 1px solid #273b2d; margin: 0 auto;" />
                          </a>
                        </div>
                      ` : ''}

                      <div style="margin-bottom: 8px;">
                        <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-right: 8px;">
                          ${badgeText}
                        </span>
                        ${(item.dateLabel || item.subtitle) ? `
                          <span style="font-size: 11px; font-weight: 600; color: ${goldColor}; letter-spacing: 0.3px;">
                            ${escapeHtml(item.dateLabel || item.subtitle)}
                          </span>
                        ` : ''}
                      </div>

                      <h2 style="margin: 0 0 10px 0; font-family: Georgia, serif; font-size: 20px; font-weight: bold; color: #ffffff; line-height: 135%;">
                        <a href="${btnLink}" target="_blank" style="color: #ffffff; text-decoration: none;">
                          ${escapeHtml(item.title)}
                        </a>
                      </h2>

                      <div style="font-size: 14.5px; line-height: 160%; color: #c5d2c8; margin-bottom: 16px;">
                        ${formatParagraphs(item.text)}
                      </div>

                      ${item.buttonText ? `
                        <table role="presentation" cellpadding="0" cellspacing="0">
                          <tr>
                            <td>
                              <a href="${btnLink}" target="_blank" style="display: inline-block; ${btnBgStyle} text-decoration: none; padding: 11px 22px; font-size: 13px; font-weight: 700; border-radius: 4px; letter-spacing: 0.3px;">
                                ${escapeHtml(item.buttonText)} &rarr;
                              </a>
                            </td>
                          </tr>
                        </table>
                      ` : ''}
                    </td>
                  </tr>
                `;
              }).join("") : ''}

              <!-- Social Media & Website Navigation -->
              <tr>
                <td style="background-color: #0c1711; padding: 26px 24px; text-align: center; border-top: 1px solid #233527;">
                  <div style="font-family: Georgia, serif; font-size: 17px; color: #ffffff; margin-bottom: 4px; font-weight: bold;">
                    Lijst van Andel Steenwijkerland
                  </div>
                  <div style="font-size: 12px; color: #8fa195; margin-bottom: 18px;">
                    Dichtbij de inwoner van Steenwijkerland
                  </div>

                  <!-- Quick Links in signature theme -->
                  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 18px auto;">
                    <tr>
                      <td style="padding: 0 5px;">
                        <a href="${cleanBase}" target="_blank" style="display: inline-block; background-color: #17291d; color: #e2ede6; border: 1px solid #283e2e; padding: 7px 14px; border-radius: 4px; font-size: 12px; text-decoration: none; font-weight: 600;">
                          Website
                        </a>
                      </td>
                      <td style="padding: 0 5px;">
                        <a href="${cleanBase}/nieuws" target="_blank" style="display: inline-block; background-color: #17291d; color: #e2ede6; border: 1px solid #283e2e; padding: 7px 14px; border-radius: 4px; font-size: 12px; text-decoration: none; font-weight: 600;">
                          Nieuws
                        </a>
                      </td>
                      <td style="padding: 0 5px;">
                        <a href="${cleanBase}/agenda" target="_blank" style="display: inline-block; background-color: #17291d; color: #e2ede6; border: 1px solid #283e2e; padding: 7px 14px; border-radius: 4px; font-size: 12px; text-decoration: none; font-weight: 600;">
                          Agenda
                        </a>
                      </td>
                      <td style="padding: 0 5px;">
                        <a href="${cleanBase}/doneren" target="_blank" style="display: inline-block; background-color: ${goldColor}; color: #09110c; border: 1px solid ${goldColor}; padding: 7px 14px; border-radius: 4px; font-size: 12px; text-decoration: none; font-weight: bold;">
                          Doneren
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer divider -->
                  <div style="border-top: 1px solid #1f3123; margin: 18px auto; max-width: 480px;"></div>

                  <!-- Unsubscribe and Legal Text -->
                  <p style="font-size: 11px; line-height: 150%; color: #8fa195; margin: 0 0 10px 0;">
                    U ontvangt deze e-mail op <strong>${escapeHtml(recipientEmail)}</strong> als abonnee van Lijst van Andel Steenwijkerland.
                  </p>

                  <p style="font-size: 12px; margin: 0; color: #c5d2c8;">
                    Wilt u deze nieuwsbrief niet meer ontvangen? 
                    <a href="${unsubscribeUrl}" target="_blank" style="color: ${goldColor}; text-decoration: underline; font-weight: bold;">
                      Meld u hier direct af
                    </a>.
                  </p>
                </td>
              </tr>

            </tbody>
          </table>
          <!-- End Inner Card -->
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

export function generateNewsletterText(
  newsletter: NewsletterData,
  recipientEmail: string,
  baseUrl: string,
  unsubscribeToken: string
): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const unsubscribeUrl = `${cleanBase}/nieuwsbrief/afmelden?email=${encodeURIComponent(recipientEmail)}&token=${encodeURIComponent(unsubscribeToken)}`;

  let text = `LIJST VAN ANDEL STEENWIJKERLAND\n`;
  text += `${newsletter.subject}\n`;
  text += `===============================================\n\n`;

  if (newsletter.introTitle) {
    text += `${newsletter.introTitle}\n\n`;
  }

  text += `${newsletter.introText.replace(/<[^>]+>/g, "")}\n\n`;

  if (newsletter.ctaButtonText && newsletter.ctaButtonUrl) {
    text += `>> ${newsletter.ctaButtonText}: ${resolveUrl(newsletter.ctaButtonUrl, cleanBase)}\n\n`;
  }

  if (newsletter.items && newsletter.items.length > 0) {
    newsletter.items.forEach((item, idx) => {
      text += `-----------------------------------------------\n`;
      text += `${idx + 1}. ${item.title.toUpperCase()}\n`;
      if (item.dateLabel || item.subtitle) {
        text += `[${item.dateLabel || item.subtitle}]\n`;
      }
      text += `\n${item.text.replace(/<[^>]+>/g, "")}\n\n`;
      if (item.buttonText) {
        text += `>> ${item.buttonText}: ${resolveUrl(item.buttonUrl || cleanBase, cleanBase)}\n\n`;
      }
    });
  }

  text += `===============================================\n`;
  text += `U ontvangt deze e-mail (${recipientEmail}) als abonnee van Lijst van Andel.\n`;
  text += `Afmelden kan direct via deze link:\n${unsubscribeUrl}\n\n`;
  text += `Lijst van Andel Steenwijkerland - Vendelweg 1, 8331 XE Steenwijk\n`;

  return text;
}

export interface NewsletterDispatchPackage {
  html: string;
  text: string;
  attachments: Array<{
    filename: string;
    path: string;
    cid: string;
    contentType?: string;
  }>;
}

/**
 * Prepares the newsletter for email sending.
 * Embedded images are attached as CID (Content-ID) inline attachments,
 * ensuring they render immediately and reliably in Yahoo Mail, Gmail, Outlook,
 * Apple Mail and other email clients without requiring external server network calls
 * or being blocked by authentication/firewalls/mixed-content policies.
 */
export function prepareNewsletterForDispatch(
  newsletter: NewsletterData,
  recipientEmail: string,
  baseUrl: string,
  unsubscribeToken: string,
  publicDir: string
): NewsletterDispatchPackage {
  const attachments: Array<{ filename: string; path: string; cid: string; contentType?: string }> = [];
  const imageCids: Record<string, string> = {};

  const resolveLocalFile = (urlOrPath?: string): string | null => {
    if (!urlOrPath) return null;
    let rel: string | null = null;
    if (urlOrPath.includes("/assets/")) {
      rel = "assets/" + urlOrPath.split("/assets/")[1];
    } else if (urlOrPath.includes("/uploads/")) {
      rel = "uploads/" + urlOrPath.split("/uploads/")[1];
    } else if (urlOrPath.startsWith("/")) {
      rel = urlOrPath.replace(/^\/+/, "");
    }
    if (rel) {
      const full = path.join(publicDir, rel);
      if (fs.existsSync(full)) return full;
    }
    return null;
  };

  // 1. Header Banner
  const bannerRaw = newsletter.bannerUrl || "/assets/hero-banner.jpg";
  const bannerLocal = resolveLocalFile(bannerRaw) || path.join(publicDir, "assets", "hero-banner.jpg");
  if (bannerLocal && fs.existsSync(bannerLocal)) {
    const bannerCid = "banner_header@lijstvanandel.nl";
    attachments.push({
      filename: path.basename(bannerLocal),
      path: bannerLocal,
      cid: bannerCid,
    });
    imageCids["banner"] = bannerCid;
  } else if (bannerRaw.startsWith("http://") || bannerRaw.startsWith("https://")) {
    const bannerCid = "banner_header@lijstvanandel.nl";
    attachments.push({
      filename: "hero-banner.jpg",
      path: bannerRaw,
      cid: bannerCid,
    });
    imageCids["banner"] = bannerCid;
  }

  // 2. Newsletter items
  if (newsletter.items && newsletter.items.length > 0) {
    newsletter.items.forEach((item, index) => {
      if (!item.imageUrl) return;
      const cid = `item_${index}_thumb@lijstvanandel.nl`;
      const localPath = resolveLocalFile(item.imageUrl);
      if (localPath && fs.existsSync(localPath)) {
        attachments.push({
          filename: path.basename(localPath),
          path: localPath,
          cid,
        });
        imageCids[`item_${index}`] = cid;
      } else if (item.imageUrl.startsWith("http://") || item.imageUrl.startsWith("https://")) {
        // Remote images (e.g. YouTube thumbnail or CDN URL) - Nodemailer will fetch & inline with CID
        attachments.push({
          filename: `item-${index}-thumb.jpg`,
          path: item.imageUrl,
          cid,
        });
        imageCids[`item_${index}`] = cid;
      }
    });
  }

  const html = generateNewsletterHtml(newsletter, recipientEmail, baseUrl, unsubscribeToken, { imageCids });
  const text = generateNewsletterText(newsletter, recipientEmail, baseUrl, unsubscribeToken);

  return { html, text, attachments };
}
