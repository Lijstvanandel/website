const fs = require("fs");
const path = require("path");

// Try loading dotenv if present
try {
  require("dotenv").config();
} catch (e) {}

const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) {
  try {
    const dotenv = require("dotenv");
    dotenv.config({ path: envFile });
  } catch (e) {}
}

const nodemailer = require("nodemailer");

console.log("==================================================");
console.log("     LIJST VAN ANDEL - SMTP DIAGNOSE TOOL");
console.log("==================================================");
console.log("Huidige map (cwd):", process.cwd());
console.log(".env bestand aanwezig:", fs.existsSync(envFile) ? "JA (" + envFile + ")" : "NEE! (Zorg dat .env in deze map staat!)");

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "465", 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const secure = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "ssl" || port === 465;
const from = process.env.SMTP_FROM || process.env.SMTP_USER || '"Lijst van Andel" <info@lijstvanandel.nl>';

console.log("\nConfiguratie uit omgevingsvariabelen:");
console.log(" - SMTP_HOST  :", host || "(NIET INGESTELD!)");
console.log(" - SMTP_PORT  :", port);
console.log(" - SMTP_SECURE:", secure, `(SMTP_SECURE in env is: '${process.env.SMTP_SECURE}')`);
console.log(" - SMTP_USER  :", user || "(NIET INGESTELD!)");
console.log(" - SMTP_PASS  :", pass ? `[INGESTELD, lengte ${pass.length} tekens]` : "(NIET INGESTELD!)");
console.log(" - SMTP_FROM  :", from);

if (!host || !user || !pass) {
  console.error("\n[CRITIEKE FOUT] SMTP_HOST, SMTP_USER of SMTP_PASS ontbreekt in uw .env bestand!");
  console.error("Voeg deze variabelen toe aan /var/www/lijst-van-andel/.env");
  process.exit(1);
}

console.log("\nVerbinding maken met de SMTP server...");
const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

transporter.verify(async (err, success) => {
  if (err) {
    console.error("\n[VERBINDING MISLUKT]:");
    console.error(err.message);
    console.error("\nTips:");
    console.error(" 1. Controleer of poort 465 of 587 niet geblokkeerd is door de firewall (ufw of OVH panel).");
    console.error(" 2. Als u poort 587 gebruikt, zet dan in .env: SMTP_PORT=587 en SMTP_SECURE=false");
    console.error(" 3. Als u poort 465 gebruikt, zet dan in .env: SMTP_PORT=465 en SMTP_SECURE=true");
    console.error(" 4. Controleer of het wachtwoord voor", user, "100% klopt.");
    process.exit(1);
  }

  console.log("\n[SUCCES] SMTP server accepteert inloggegevens en is gereed!");

  const targetEmail = process.argv[2] || user;
  console.log(`\nVersturen van een werkelijke test-e-mail naar: ${targetEmail}...`);

  try {
    const info = await transporter.sendMail({
      from,
      to: targetEmail,
      subject: "Testmail vanuit OVH Diagnosetool - Lijst van Andel",
      text: "Dit is een rechtstreekse testmail vanaf de server om te verifiëren dat SMTP 100% werkt.",
      html: `<div style="font-family: sans-serif; padding: 20px; background: #0a0a0a; color: #f5f5f5;">
        <h2 style="color: #4ade80;">SMTP Verbinding Werkt!</h2>
        <p>Deze e-mail is succesvol verzonden vanaf de server via <strong>${host}:${port}</strong>.</p>
        <p>Tijdstip: ${new Date().toLocaleString("nl-NL")}</p>
      </div>`
    });

    console.log("\n[VERZONDEN!] E-mail succesvol verzonden!");
    console.log("Message ID:", info.messageId);
    console.log("Server response:", info.response);
    console.log(`\nControleer nu de inbox (en evt. spambox) van ${targetEmail}!`);
    process.exit(0);
  } catch (sendErr) {
    console.error("\n[FOUT BIJ VERZENDEN]:", sendErr.message);
    process.exit(1);
  }
});
