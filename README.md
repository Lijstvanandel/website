# Lijst van Andel — Productie Deployment Handleiding (Ubuntu Linux op OVH)

Deze handleiding beschrijft **in absolute volledigheid** hoe deze full-stack applicatie (React + Vite frontend en Node.js + Express backend) vanaf nul gedeployed wordt op een schone **Ubuntu Linux (24.04 / 26.04 LTS)** server bij OVH.

---

## 1. Overzicht van de Architectuur

* **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Leaflet (gecompileerd naar statische bestanden in `dist/`).
* **Backend:** Node.js Express server, gecompileerd en gebundeld naar één zelfstandig bestand `dist/server.cjs`.
* **Dataopslag:** `db.json` in de hoofdmap van het project (bevat alle fractieleden, wijken/buurten, nieuwsberichten, standpunten, contactberichten, belafspraken, evenementen, stemwijzer en accounts).
* **Media & Uploads:** `public/uploads/` (afbeeldingen, video's, documenten en campagnemateriaal).
* **Reverse Proxy:** Nginx met SSL/TLS certificaat via Let's Encrypt (Certbot) voor beveiligd HTTPS-verkeer op poort 80 en 443.
* **Process Manager:** PM2 voor continue uptime, automatisch herstarten bij crashes en automatisch starten na een server reboot.
* **Firewall:** UFW (Uncomplicated Firewall) voor het beveiligen van open poorten.

---

## 2. Vereisten voor de Start

1. Een **Ubuntu Linux (24.04 of 26.04)** Virtual Private Server (VPS) of Dedicated Server bij OVH.
2. Root- of `sudo`-toegang via SSH.
3. Een domeinnaam (bijvoorbeeld `lijstvanandel.nl` en `www.lijstvanandel.nl`).
4. **DNS-instellingen:** Voeg in het beheerpaneel van je domein twee **A-records** toe die verwijzen naar het publieke IPv4-adres van je OVH-server:
   * `@` (of `lijstvanandel.nl`) &rarr; `JE_SERVER_IP`
   * `www` (of `www.lijstvanandel.nl`) &rarr; `JE_SERVER_IP`

---

## 3. Volledige Stap-voor-Stap Installatie

### Stap 1: Inloggen en Systeem Bijwerken

Maak via je terminal verbinding met de server via SSH:

```bash
ssh root@JE_SERVER_IP
```

Werk het pakketbeheer en alle bestaande software bij naar de nieuwste versie:

```bash
apt update && apt upgrade -y
```

Installeer essentiële hulpprogramma's en bouwcomponenten:

```bash
apt install -y curl wget git ufw nginx certbot python3-certbot-nginx build-essential rsync unzip
```

---

### Stap 2: Firewall (UFW) Configureren

Beveilig de server direct zodat alleen SSH, HTTP en HTTPS toegankelijk zijn:

```bash
# SSH toestaan (voorkomt dat je buitengesloten raakt)
ufw allow OpenSSH

# HTTP (80) en HTTPS (443) toestaan voor Nginx
ufw allow 'Nginx Full'

# Firewall activeren
ufw enable
```

Controleer de status met:

```bash
ufw status
```

---

### Stap 3: Node.js (LTS v22) Installeren

Deze applicatie vereist Node.js 20 of 22 LTS. Installeer de officiële NodeSource repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

Controleer of Node.js en npm correct geïnstalleerd zijn:

```bash
node -v
npm -v
```

---

### Stap 4: PM2 Process Manager Installeren

Installeer PM2 globaal om de Node.js backend als achtergrondservice te beheren:

```bash
npm install -g pm2
```

---

### Stap 5: Toegewijde Systeemberuiker Aanmaken

Draai applicaties voor de veiligheid nooit rechtstreeks onder het `root`-account. Maak een systeemberuiker aan genaamd `deploy`:

```bash
adduser --disabled-password --gecos "" deploy
```

Maak de webdirectory aan en geef de juiste rechten:

```bash
mkdir -p /var/www/lijst-van-andel
chown -R deploy:deploy /var/www/lijst-van-andel
```

---

### Stap 6: Projectbestanden Overzetten

Schakel over naar de `deploy` gebruiker:

```bash
su - deploy
cd /var/www/lijst-van-andel
```

#### Optie A: Via Git (Aanbevolen)
Kloon je repository rechtstreeks in de map:
```bash
git clone <JOUW_GIT_REPOSITORY_URL> .
```

#### Optie B: Handmatig kopiëren vanaf je lokale machine (via Rsync of SCP)
Voer dit commando uit vanaf je eigen computer (vervang `JE_SERVER_IP`):
```bash
rsync -avz --exclude 'node_modules' --exclude 'dist' ./ root@JE_SERVER_IP:/var/www/lijst-van-andel/
# Zet vervolgens op de server de eigendomsrechten goed:
# chown -R deploy:deploy /var/www/lijst-van-andel
```

---

### Stap 7: Upload-mappen & Data (`db.json`) Controleren

Zorg dat alle vereiste uploadmappen bestaan en schrijfbaar zijn:

```bash
mkdir -p public/uploads/fractieleden
mkdir -p public/uploads/videos
mkdir -p public/uploads/news
mkdir -p public/uploads/events
mkdir -p public/uploads/wijken
mkdir -p public/uploads/documents
```

> **Belangrijk bij migratie:**  
> Als je al een `db.json` hebt met live data (nieuws, wijken, gebruikers), zorg dan dat je deze overzet naar `/var/www/lijst-van-andel/db.json`.  
> Als er nog geen `db.json` bestaat, zal de server er automatisch een aanmaken bij de eerste start.

---

### Stap 8: Omgevingsvariabelen Configureren (.env)

Maak het bestand `.env` aan in `/var/www/lijst-van-andel/.env`:

```bash
nano /var/www/lijst-van-andel/.env
```

Voeg de volgende configuratie in (genereer een veilige sleutel met `openssl rand -base64 32`):

```env
NODE_ENV=production
JWT_SECRET=genereer_hier_een_veilige_willekeurige_sleutel_van_minstens_32_tekens
```

Sla op met `CTRL + O`, druk op `Enter`, en sluit met `CTRL + X`.

Zet strikte permissies op het `.env` bestand:

```bash
chmod 600 /var/www/lijst-van-andel/.env
```

---

### Stap 9: Dependencies Installeren en Applicatie Bouwen

Voer als `deploy` gebruiker in `/var/www/lijst-van-andel` uit:

```bash
npm install
npm run build
```

Controleer of de build geslaagd is:
* `dist/index.html` en de assets map moeten aanwezig zijn.
* `dist/server.cjs` moet aanwezig zijn.

---

### Stap 10: PM2 Process Management Starten & Autostart

Start de server met het meegeleverde PM2-configuratiebestand:

```bash
pm2 start ecosystem.config.cjs
```

Controleer of de applicatie draait:

```bash
pm2 status
pm2 logs lijst-van-andel --lines 20
```

Je ziet in de logs:
```
Server running on port 3000
```

Sla de PM2-configuratie op:

```bash
pm2 save
```

Zorg dat de applicatie automatisch weer opstart na het herstarten van de Ubuntu server. Draai als `root` (typ `exit` om terug te gaan naar root):

```bash
pm2 startup systemd -u deploy --hp /home/deploy
```
*Voer het commando uit dat PM2 op het scherm toont om de systemd-service definitief te registreren.*

---

### Stap 11: Nginx Reverse Proxy Configureren

Maak een nieuw Nginx configuratiebestand aan voor jouw domein:

```bash
nano /etc/nginx/sites-available/lijst-van-andel
```

Plaats de volgende volledige configuratie (vervang `jouwdomein.nl` en `www.jouwdomein.nl` door jouw werkelijke domeinnaam):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name jouwdomein.nl www.jouwdomein.nl;

    # Maximale uploadgrootte voor video's en documenten
    client_max_body_size 100M;

    # Gzip compressie voor optimale laadtijden
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Beveiligingsheaders
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Statische uploads direct en snel uitserveren met browser-caching
    location /uploads/ {
        alias /var/www/lijst-van-andel/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files $uri =404;
    }

    # Statische frontend assets cachen
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # Alle overige routes en API calls doorsturen naar de Node.js Express server
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket en verbindingseigenschappen
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Correcte client IP-adressen doorgeven
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Buffering instellingen
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
}
```

Activeer de configuratie en test Nginx:

```bash
# Koppel het bestand aan sites-enabled
ln -s /etc/nginx/sites-available/lijst-van-andel /etc/nginx/sites-enabled/

# Verwijder de standaard Nginx welkomstpagina indien aanwezig
rm -f /etc/nginx/sites-enabled/default

# Test op syntaxfouten
nginx -t

# Herlaad Nginx
systemctl reload nginx
```

---

### Stap 12: Gratis SSL / HTTPS Installeren (Certbot)

Vraag met Certbot automatisch een gratis Let's Encrypt SSL-certificaat aan:

```bash
certbot --nginx -d jouwdomein.nl -d www.jouwdomein.nl
```

Volg de korte instructies op het scherm:
* Vul je e-mailadres in voor eventuele verlengingsmeldingen.
* Ga akkoord met de voorwaarden.
* Kies ervoor om HTTP automatisch te redirecten naar HTTPS.

Controleer of de automatische vernieuwing goed staat ingesteld:

```bash
certbot renew --dry-run
```

---

### Stap 13: Automatische Dagelijkse Back-ups Configureren

Alle pagina's, wijken, standpunten en formulieren zitten in `db.json` en `public/uploads/`. Maak een geautomatiseerd back-upscript:

```bash
nano /usr/local/bin/backup-lijst-van-andel.sh
```

Plak het volgende script erin:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/lijst-van-andel"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DEST="$BACKUP_DIR/backup_$TIMESTAMP"

mkdir -p "$DEST"

# Kopieer database en mediabestanden
cp /var/www/lijst-van-andel/db.json "$DEST/db.json"
cp /var/www/lijst-van-andel/.env "$DEST/.env"
rsync -a /var/www/lijst-van-andel/public/uploads "$DEST/"

# Maak een gecomprimeerd archief
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "backup_$TIMESTAMP"
rm -rf "$DEST"

# Verwijder back-ups ouder dan 30 dagen
find "$BACKUP_DIR" -type f -name "backup_*.tar.gz" -mtime +30 -delete

echo "Backup voltooid: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
```

Maak het script uitvoerbaar:

```bash
chmod +x /usr/local/bin/backup-lijst-van-andel.sh
```

Stel een cronjob in die elke nacht om 03:00 uur een back-up maakt:

```bash
crontab -e
```

Voeg de volgende regel onderaan toe:

```cron
0 3 * * * /usr/local/bin/backup-lijst-van-andel.sh > /dev/null 2>&1
```

---

## 4. Toekomstige Updates Uitrollen (Update Workflow)

Wanneer je in de toekomst updates wilt publiceren op de productieserver:

```bash
su - deploy
cd /var/www/lijst-van-andel

# Haal de nieuwste wijzigingen op
git pull

# Werk dependencies bij indien nodig
npm install

# Bouw zowel de frontend als de backend opnieuw
npm run build

# Herstart de server zonder downtime
pm2 reload lijst-van-andel
```

---

## 5. Beheer en Probleemoplossing (Troubleshooting)

| Actie | Commando |
| :--- | :--- |
| **Status van applicatie controleren** | `pm2 status` |
| **Realtime serverlogs bekijken** | `pm2 logs lijst-van-andel` |
| **Applicatie geforceerd herstarten** | `pm2 restart lijst-van-andel` |
| **Geheugengebruik en CPU monitoren** | `pm2 monit` |
| **Nginx status controleren** | `systemctl status nginx` |
| **Nginx configuratie testen** | `nginx -t` |
| **Nginx foutenlogboek bekijken** | `tail -f /var/log/nginx/error.log` |
| **Rechten herstellen op mappen** | `chown -R deploy:deploy /var/www/lijst-van-andel` |

---

## 6. Veelgestelde Vragen

#### Waarom toont Nginx een "502 Bad Gateway"?
Dit betekent dat Node.js niet draait op poort 3000. Controleer met `pm2 status` of de app de status `online` heeft en controleer `pm2 logs lijst-van-andel` op foutmeldingen.

#### Hoe herstel ik een back-up?
Pak het archief uit en overschrijf `db.json` en de map `public/uploads`:
```bash
tar -xzf /var/backups/lijst-van-andel/backup_DATUM.tar.gz -C /tmp/
cp /tmp/backup_DATUM/db.json /var/www/lijst-van-andel/db.json
rsync -av /tmp/backup_DATUM/uploads/ /var/www/lijst-van-andel/public/uploads/
chown -R deploy:deploy /var/www/lijst-van-andel
pm2 restart lijst-van-andel
```
