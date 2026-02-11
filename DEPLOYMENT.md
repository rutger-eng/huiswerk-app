# Railway Deployment Guide

Deze guide helpt je om de Huiswerk App te deployen op Railway.app.

## Waarom Railway?

- ✅ Gratis tier beschikbaar ($5 gratis credit per maand)
- ✅ Automatische PostgreSQL database
- ✅ Automatische HTTPS
- ✅ Makkelijke GitHub integratie
- ✅ Environment variables management
- ✅ Automatic deployments bij elke git push

## Voorbereiding

### 1. Maak een Railway Account

1. Ga naar [railway.app](https://railway.app)
2. Sign up met je GitHub account (aanbevolen)
3. Verifieer je email

### 2. Installeer Railway CLI (Optioneel)

```bash
npm i -g @railway/cli
railway login
```

## Deployment Stappen

### Methode 1: Via Railway Dashboard (Aanbevolen)

#### Stap 1: Push code naar GitHub

```bash
# Initialiseer git repository (als nog niet gedaan)
cd C:\Users\rutge\Claudeprojecten\huiswerk-app
git init
git add .
git commit -m "Initial commit - Huiswerk App"

# Maak een nieuwe GitHub repository en push
git remote add origin https://github.com/jouw-username/huiswerk-app.git
git branch -M main
git push -u origin main
```

#### Stap 2: Maak een nieuw Railway Project

1. Log in op [railway.app](https://railway.app/dashboard)
2. Click **"New Project"**
3. Selecteer **"Deploy from GitHub repo"**
4. Kies je `huiswerk-app` repository
5. Railway detecteert automatisch het project type

#### Stap 3: Voeg PostgreSQL Database toe

1. In je Railway project dashboard, click **"+ New"**
2. Selecteer **"Database"** → **"Add PostgreSQL"**
3. Railway maakt automatisch een database en stelt `DATABASE_URL` in
4. Wacht tot de database klaar is (groene indicator)

#### Stap 4: Configureer Environment Variables

1. Click op je **service** (niet de database)
2. Ga naar **"Variables"** tab
3. Voeg de volgende variabelen toe:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=jouw-super-geheime-key-hier-minimaal-32-characters-lang
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=jouw-telegram-bot-token-van-botfather
NOTIFICATION_CRON=0 7 * * *
```

**Belangrijk:**
- `DATABASE_URL` wordt automatisch ingesteld door Railway
- Genereer een veilige `JWT_SECRET` (min. 32 characters)
- `TELEGRAM_BOT_TOKEN` krijg je van @BotFather op Telegram

#### Stap 5: Deploy!

1. Railway start automatisch de eerste deployment
2. Check de **"Deployments"** tab voor de status
3. Wacht tot de build klaar is (kan 2-5 minuten duren)
4. Click op **"View Logs"** om de progress te volgen

#### Stap 6: Verkrijg je Public URL

1. In je service settings, ga naar **"Settings"** tab
2. Scroll naar **"Domains"**
3. Click **"Generate Domain"**
4. Railway geeft je een URL zoals: `https://jouw-app.up.railway.app`
5. Test de app door naar deze URL te gaan!

### Methode 2: Via Railway CLI

```bash
# Login
railway login

# Link project (in project directory)
cd C:\Users\rutge\Claudeprojecten\huiswerk-app
railway init

# Add PostgreSQL
railway add --database postgresql

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=jouw-geheime-key
railway variables set TELEGRAM_BOT_TOKEN=jouw-bot-token

# Deploy
railway up

# Open in browser
railway open
```

## Telegram Bot Setup voor Production

### 1. Maak Telegram Bot (als nog niet gedaan)

1. Open Telegram en zoek **@BotFather**
2. Stuur `/newbot`
3. Volg de instructies en kies een naam
4. Bewaar de **bot token** die je krijgt

### 2. Voeg Token toe aan Railway

In Railway dashboard:
1. Ga naar je service → Variables
2. Voeg toe: `TELEGRAM_BOT_TOKEN=jouw-token-hier`
3. Deploy wordt automatisch opnieuw gestart

### 3. Webhook Setup (Optioneel voor betere performance)

Voor productie is het beter om webhooks te gebruiken in plaats van polling:

```javascript
// In telegramBot.js, vervang polling met webhook:
const bot = new TelegramBot(token, {
  webHook: {
    port: process.env.PORT || 3000
  }
});

bot.setWebHook(`${process.env.RAILWAY_PUBLIC_URL}/telegram-webhook`);
```

## Database Migratie

Als je lokale data hebt die je wilt migreren:

### Export from SQLite

```bash
# Export als SQL dump
sqlite3 server/database.sqlite .dump > backup.sql
```

### Import to PostgreSQL on Railway

```bash
# Connect via Railway CLI
railway connect postgres

# Of gebruik de connection string van Railway:
psql postgresql://user:pass@host:port/db < backup.sql
```

## Monitoring & Logs

### View Logs

Via Dashboard:
- Ga naar je service → Deployments → View Logs

Via CLI:
```bash
railway logs
```

### Health Check

Je app heeft een health endpoint:
```
https://jouw-app.up.railway.app/api/health
```

## Troubleshooting

### Build Failed

**Error: "Module not found"**
```bash
# Zorg dat alle dependencies in package.json staan
cd server && npm install
cd client && npm install
git add .
git commit -m "Update dependencies"
git push
```

**Error: "Database connection failed"**
- Check of PostgreSQL database is toegevoegd aan je project
- Verifieer dat `DATABASE_URL` is ingesteld
- Check logs: `railway logs`

### App Crashes

**Check environment variables:**
```bash
railway variables
```

**Essentiële variabelen:**
- ✅ `NODE_ENV=production`
- ✅ `DATABASE_URL` (automatisch)
- ✅ `JWT_SECRET`
- ✅ `PORT` (optioneel, Railway stelt dit automatisch in)

**View detailed logs:**
```bash
railway logs --tail
```

### Telegram Bot Niet Bereikbaar

1. Verifieer `TELEGRAM_BOT_TOKEN` is correct ingesteld
2. Check of bot is gestart in logs
3. Test met `/start` command
4. Controleer of Railway service is "running"

### Frontend Toont Niet

1. Check of frontend build is geslaagd: `railway logs | grep build`
2. Verifieer dat `client/dist` folder bestaat na build
3. Check of `NODE_ENV=production` is ingesteld

## Continuous Deployment

Railway deploy automatisch bij elke push naar main branch:

```bash
# Maak een wijziging
git add .
git commit -m "Update feature X"
git push

# Railway deploy automatisch!
```

## Custom Domain (Optioneel)

1. Ga naar Service Settings → Domains
2. Click "Custom Domain"
3. Voeg je domain toe (bijv. `huiswerk.jouwdomein.nl`)
4. Update DNS records volgens Railway instructies:
   ```
   Type: CNAME
   Name: huiswerk (of @)
   Value: jouw-app.up.railway.app
   ```

## Kosten & Limieten

Railway Free Tier:
- $5 gratis credit per maand
- ~500 execution hours
- Voldoende voor kleine tot middelgrote apps
- Geen credit card nodig voor start

**Geschatte kosten voor deze app:**
- ~0.5GB RAM
- ~$3-4 per maand met normale gebruik
- Gratis tier dekt dit gemakkelijk!

## Backup & Restore

### Automatische Backups (Database)

Railway maakt automatisch backups van PostgreSQL:
1. Ga naar Database service → Backups
2. Download backup als `.sql` file

### Manual Backup

```bash
# Via Railway CLI
railway run pg_dump > backup-$(date +%Y%m%d).sql
```

### Restore

```bash
railway run psql < backup.sql
```

## Security Checklist

- ✅ Unieke JWT_SECRET (min. 32 characters)
- ✅ TELEGRAM_BOT_TOKEN niet in code
- ✅ DATABASE_URL niet hardcoded
- ✅ NODE_ENV=production gezet
- ✅ .env bestand NIET in git
- ✅ CORS correct geconfigureerd
- ✅ HTTPS enabled (automatisch via Railway)

## Support

### Railway Documentation
- https://docs.railway.app

### Railway Discord
- https://discord.gg/railway

### Issues
- Open een issue op GitHub
- Check Railway status: https://status.railway.app

## Next Steps

Na succesvolle deployment:

1. ✅ **Test de app** op je Railway URL
2. ✅ **Registreer een test account**
3. ✅ **Voeg een student toe**
4. ✅ **Koppel Telegram** met je bot
5. ✅ **Test de text parser**
6. ✅ **Verifieer dagelijkse notificaties** (wacht tot 7:00 AM)
7. ✅ **Deel de URL** met familie/vrienden!

## Production Checklist

Voordat je live gaat:

- [ ] Alle environment variables gezet
- [ ] PostgreSQL database toegevoegd
- [ ] Telegram bot werkt
- [ ] JWT_SECRET is veilig en uniek
- [ ] Test registratie en login
- [ ] Test homework toevoegen
- [ ] Test text parser
- [ ] Test calendar view
- [ ] Test Telegram commands
- [ ] Verifieer notificaties werken
- [ ] Check health endpoint
- [ ] Monitor logs voor errors
- [ ] Backup database

Gefeliciteerd! Je app draait nu op Railway! 🚀
