# Huiswerk Management Web App

Een web applicatie om huiswerk van middelbare scholieren te beheren met multi-user support, kalender interface en Telegram integratie.

**🚀 [Deployment Guide voor Railway](./DEPLOYMENT.md)** - Stap voor stap instructies om de app te hosten!

## Features

- **Multi-user support**: Ouders kunnen meerdere kinderen (students) toevoegen en beheren
- **Telegram Bot**: Elke student kan hun eigen Telegram account koppelen voor notificaties en updates
- **Smart Text Parser**: Plak tekst van Magister of leraren en de app parseert automatisch vakken, deadlines en opdrachten
- **Kalender View**: Visualiseer al het huiswerk per student in een overzichtelijke kalender
- **Dagelijkse Notificaties**: Automatische herinneringen via Telegram voor elke student
- **Parent Dashboard**: Overzicht van alle kinderen en hun huiswerk status

## Quick Start

### Lokaal Draaien

```bash
# 1. Installeer dependencies
cd server && npm install
cd ../client && npm install

# 2. Start de app (in twee terminals)
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Frontend
cd client && npm run dev

# 3. Open http://localhost:5173 en registreer een account!
```

### Deployen op Railway

```bash
# 1. Push naar GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# 2. Ga naar railway.app
# 3. Deploy from GitHub repo
# 4. Add PostgreSQL database
# 5. Set environment variables (zie DEPLOYMENT.md)
# 6. Generate domain en je app is live! 🚀
```

👉 **Volledige instructies**: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Bot**: Telegram Bot API
- **Calendar**: React Big Calendar

## Setup

### Prerequisites

- Node.js 18 of hoger
- npm of yarn
- Telegram account voor bot setup

### Installation

1. Clone de repository en navigeer naar de project folder

2. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
   Bewerk `.env` en vul je Telegram Bot Token in (verkrijgbaar via @BotFather op Telegram)

3. Installeer backend dependencies:
   ```bash
   cd server
   npm install
   ```

4. Installeer frontend dependencies:
   ```bash
   cd ../client
   npm install
   ```

### Telegram Bot Setup (Optioneel maar aanbevolen)

1. Open Telegram en zoek naar **@BotFather**
2. Stuur `/newbot` om een nieuwe bot aan te maken
3. Volg de instructies en kies een naam en username voor je bot
4. BotFather geeft je een **token** - bewaar deze goed!
5. Voeg de token toe aan `server/.env`:
   ```
   TELEGRAM_BOT_TOKEN=jouw-bot-token-hier
   ```

### Running the Application

1. Start de backend server (vanaf project root):
   ```bash
   cd server
   npm start
   ```
   Server draait op http://localhost:3000

2. In een nieuwe terminal, start de frontend (vanaf project root):
   ```bash
   cd client
   npm run dev
   ```
   Frontend draait op http://localhost:5173

3. Open http://localhost:5173 in je browser

**Note**: De app werkt ook zonder Telegram bot configuratie, maar dan zijn notificaties en Telegram commands uitgeschakeld.

## Usage

### Voor Ouders

1. **Registreer een account** op de login pagina
2. **Voeg students toe** (je kinderen) via het parent dashboard
3. **Koppel Telegram** voor elke student:
   - Genereer een link code in de app
   - Laat je kind `/start [code]` sturen naar de bot
4. **Voeg huiswerk toe**:
   - Manual: via het formulier
   - Smart: plak tekst van Magister/leraren in de text parser
5. **Bekijk overzicht** per student via dashboard of kalender

### Voor Students (via Telegram)

- `/start [code]` - Koppel je Telegram account
- `/today` - Bekijk huiswerk voor vandaag
- `/week` - Bekijk huiswerk voor deze week
- `/done [vak]` - Markeer huiswerk als afgerond
- Of stuur gewoon: "huiswerk voor engels af"

## Project Structure

```
huiswerk-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI componenten
│   │   ├── services/      # API integratie
│   │   └── App.jsx       # Main app
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data models
│   │   └── database/      # SQLite setup
│   └── package.json
└── .env                    # Configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Registreer parent account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Students
- `POST /api/students` - Voeg student toe
- `GET /api/students` - Get alle students van parent
- `PUT /api/students/:id` - Update student
- `GET /api/students/:id/telegram-link` - Genereer Telegram link code

### Homework
- `POST /api/students/:studentId/homework` - Voeg huiswerk toe voor student
- `GET /api/students/:studentId/homework` - Get alle huiswerk van student
- `POST /api/homework/parse` - Parse tekst voor huiswerk
- `PUT /api/homework/:id` - Update huiswerk
- `DELETE /api/homework/:id` - Verwijder huiswerk

## Troubleshooting

### Port already in use

Als je de error krijgt dat port 3000 of 5173 al in gebruik is:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

### Database issues

Als er problemen zijn met de database:

```bash
# Verwijder de database en herstart de server
cd server
rm database.sqlite
npm start
```

De database wordt automatisch opnieuw aangemaakt met de juiste schema's.

### Telegram bot reageert niet

1. Check of `TELEGRAM_BOT_TOKEN` correct is ingevuld in `server/.env`
2. Herstart de server na het toevoegen van de token
3. Zorg dat de bot niet al door een andere instantie wordt gebruikt
4. Test de bot met `/start` voordat je een link code gebruikt

## Tips

- **Text Parser**: De parser werkt het beste met gestructureerde tekst (bullets, nummering, of vak: beschrijving formaat)
- **Deadlines**: Gebruik Nederlandse datums ("morgen", "vrijdag", "15 maart") voor de beste resultaten
- **Telegram**: Elke student kan maar één Telegram account koppelen. Wil je een nieuwe koppeling? Genereer een nieuwe link code.
- **Data Backup**: De database staat in `server/database.sqlite` - backup dit bestand regelmatig!

## Development

### Project Structure Details

```
server/src/
├── database/db.js          # SQLite setup + CRUD operations
├── middleware/auth.js      # JWT authentication middleware
├── routes/
│   ├── auth.js            # User registration & login
│   ├── students.js        # Student management
│   └── homework.js        # Homework CRUD + parser API
├── services/
│   ├── homeworkParser.js  # Dutch text parser
│   ├── telegramBot.js     # Bot commands & notifications
│   └── scheduler.js       # Cron job for daily notifications
└── server.js              # Express app entry point

client/src/
├── components/
│   ├── auth/              # Login & Register
│   ├── parent/            # Parent Dashboard
│   ├── Calendar.jsx       # Kalender view met react-big-calendar
│   ├── Dashboard.jsx      # Student detail page
│   ├── HomeworkForm.jsx   # Manual homework entry
│   ├── HomeworkList.jsx   # Homework lijst met filters
│   └── TextParser.jsx     # Smart text parsing UI
├── services/api.js        # Axios API client
└── App.jsx                # React Router setup
```

### Testing the Parser

Test de homework parser functionaliteit:

```bash
cd server
node -e "
const parser = require('./src/services/homeworkParser.js');
const result = parser.parseHomeworkText('Engels: Werkblad 5 - morgen\nWiskunde: Hoofdstuk 3 - vrijdag');
console.log(JSON.stringify(result, null, 2));
"
```

## Future Enhancements

- Screenshot upload + OCR (Tesseract.js)
- Directe Magister API integratie
- Student eigen login mogelijkheid
- Recurring homework support (wekelijkse opdrachten)
- Statistieken en progress tracking per student
- Export naar iCal/Google Calendar
- Mobile app (React Native)
- Dark mode
- Notifications via email als alternatief voor Telegram
- Meerdere parents per student (gedeelde toegang)

## Contributing

Dit is een MVP project. Suggesties en verbeteringen zijn welkom!

## License

MIT
