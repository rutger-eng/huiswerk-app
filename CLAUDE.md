# Huiswerk App - Claude Context

## Project Overzicht
Nederlandse huiswerk management web applicatie voor middelbare scholieren. Ouders kunnen meerdere kinderen (studenten) beheren en huiswerk tracken via een web interface + Telegram bot.

## Gebruiker Voorkeur
- **Taal**: Nederlands
- **Communicatie**: Kort en to-the-point
- **Geen emoji's** tenzij expliciet gevraagd

## Huidige Status
✅ MVP compleet en functioneel:
- Multi-user support (parent → multiple students)
- Telegram bot integratie met notificaties
- Smart text parser voor Magister/leraren tekst
- Kalender weergave (react-big-calendar)
- Rooster import functionaliteit met schoolselectie
- Authentication (JWT)
- Dashboard voor parent en per student
- CRUD operaties voor homework, students, classes, teachers

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express
- **Database**: SQLite (lokaal) / PostgreSQL (production via Railway)
  - Database adapter pattern voor beide support
- **Bot**: node-telegram-bot-api
- **Auth**: JWT + bcrypt
- **Calendar**: react-big-calendar
- **Date parsing**: chrono-node (Nederlandse datum parsing)

## Project Structuur

```
huiswerk-app/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/               # Login.jsx, Register.jsx
│   │   │   ├── parent/             # ParentDashboard.jsx
│   │   │   ├── Calendar.jsx        # Kalender view
│   │   │   ├── Dashboard.jsx       # Student detail page
│   │   │   ├── HomeworkForm.jsx    # Manual homework entry
│   │   │   ├── HomeworkList.jsx    # Homework lijst
│   │   │   ├── StudentDetail.jsx   # Student info + homework
│   │   │   ├── TextParser.jsx      # Smart Magister parser UI
│   │   │   ├── ScheduleGrid.jsx    # Rooster weergave
│   │   │   ├── ScheduleImportWizard.jsx  # Rooster import UI
│   │   │   ├── ScheduleManager.jsx # Rooster beheer
│   │   │   └── SchoolSelect.jsx    # School selectie voor rooster
│   │   ├── services/
│   │   │   └── api.js              # Axios API client (JWT bearer)
│   │   ├── App.jsx                 # React Router setup
│   │   └── main.jsx
│   └── package.json
│
├── server/                          # Node.js backend
│   ├── src/
│   │   ├── database/
│   │   │   ├── db-adapter.js       # DB adapter factory (SQLite/PostgreSQL)
│   │   │   ├── db.js               # SQLite implementation
│   │   │   └── db-postgres.js      # PostgreSQL implementation
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.js             # POST /register, /login
│   │   │   ├── students.js         # CRUD students, telegram linking
│   │   │   ├── homework.js         # CRUD homework, parser endpoint
│   │   │   ├── classes.js          # Vakken beheer
│   │   │   ├── teachers.js         # Docenten beheer
│   │   │   ├── schedule.js         # Rooster CRUD
│   │   │   ├── schools.js          # School data endpoints
│   │   │   ├── telegram.js         # Telegram webhook/commands
│   │   │   └── tests.js            # Toetsen beheer
│   │   ├── services/
│   │   │   ├── telegramBot.js      # Bot setup + student commands
│   │   │   ├── parentTelegramCommands.js  # Parent bot commands
│   │   │   ├── aiChatHandler.js    # AI chat via bot
│   │   │   ├── homeworkParser.js   # Dutch text → homework parser
│   │   │   └── scheduler.js        # Cron jobs (dagelijkse notificaties)
│   │   └── server.js               # Express app entry point
│   └── package.json
│
├── DEPLOYMENT.md                    # Railway deployment guide
├── ROOSTER_IMPORT_HANDLEIDING.md    # Rooster import instructies
├── .env.example                     # Env vars template
└── package.json                     # Root package voor Railway
```

## Database Schema

**users** (parents)
- id, username, password_hash, email, created_at

**students**
- id, parent_id (FK), name, telegram_chat_id, telegram_link_code, created_at

**homework**
- id, student_id (FK), subject, description, due_date, completed, created_at

**classes** (vakken per student)
- id, student_id (FK), name, color, teacher_id

**teachers**
- id, student_id (FK), name, subject

**schedule** (rooster)
- id, student_id (FK), day_of_week, period, subject, teacher, room

**tests** (toetsen)
- id, student_id (FK), subject, description, test_date, weight

## Belangrijke API Endpoints

### Auth
- `POST /api/auth/register` - Nieuwe parent registreren
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/auth/me` - Current user info (JWT required)

### Students
- `GET /api/students` - Alle students van parent
- `POST /api/students` - Nieuwe student toevoegen
- `PUT /api/students/:id` - Student updaten
- `GET /api/students/:id/telegram-link` - Generate Telegram link code
- `POST /api/students/:id/telegram-unlink` - Telegram ontkoppelen

### Homework
- `GET /api/students/:studentId/homework` - Alle homework van student
- `POST /api/students/:studentId/homework` - Nieuwe homework
- `PUT /api/homework/:id` - Update homework (bijv. completed status)
- `DELETE /api/homework/:id` - Verwijder homework
- `POST /api/homework/parse` - Parse tekst → homework items

### Classes, Teachers, Schedule, Tests
- Volledige CRUD voor alle entiteiten
- Zie routes/*.js voor details

## Development Commands

```bash
# Lokaal draaien (vanuit project root)
cd server && npm install && npm start        # Backend op :3000
cd client && npm install && npm run dev      # Frontend op :5173

# Of via root package.json
npm run dev:server                           # Server
npm run dev:client                           # Client
npm run install:all                          # Install beide

# Database reset (SQLite)
cd server && rm database.sqlite && npm start

# Build voor production
npm run build                                # Client build → client/dist
npm start                                    # Serve via Express static
```

## Environment Variables

**server/.env**:
```bash
JWT_SECRET=<random-string>
TELEGRAM_BOT_TOKEN=<from @BotFather>
PORT=3000
NODE_ENV=development

# Voor PostgreSQL (Railway):
DATABASE_URL=postgresql://...
```

## Telegram Bot Functionaliteit

### Student Commands (via bot DM)
- `/start [code]` - Koppel Telegram aan student account
- `/today` - Huiswerk voor vandaag
- `/week` - Huiswerk voor deze week
- `/done [vak]` of "huiswerk voor [vak] af" - Markeer als done
- `/help` - Help tekst

### Parent Commands (via bot DM)
- Parent kan ook bot gebruiken om overzicht te krijgen van alle studenten
- AI chat ondersteuning voor natuurlijke taal queries

### Notificaties
- Dagelijkse notificaties om 18:00 via cron job (scheduler.js)
- Kan per student uitgeschakeld worden

## Parser Functionaliteit

**homeworkParser.js** parseert Nederlandse tekst zoals:
```
Engels: Werkblad 5 - morgen
Wiskunde: Hoofdstuk 3 oefeningen - vrijdag
```

Ondersteunt:
- Nederlandse datums ("morgen", "vrijdag", "15 maart", "volgende week dinsdag")
- Verschillende formaten (bullets, nummering, vak: beschrijving)
- Chrono-node voor datum parsing

## Rooster Import

- Import rooster via JSON format
- Schoolselectie (verschillende middelbare scholen)
- Drag & drop interface (ScheduleImportWizard)
- Wekelijks rooster (ma-vr, periodes 1-8)
- Export/import functionaliteit

## Deployment (Railway)

1. Push naar GitHub
2. Connect Railway project
3. Add PostgreSQL database (automatisch DATABASE_URL)
4. Set environment variables (JWT_SECRET, TELEGRAM_BOT_TOKEN)
5. Deploy - Railway build via `npm run build` + `npm start`
6. Domain genereren

Zie DEPLOYMENT.md voor volledige instructies.

## Belangrijke Aandachtspunten

### Database Adapter
- Gebruik `db-adapter.js` voor alle DB calls
- Ondersteunt zowel SQLite (lokaal) als PostgreSQL (production)
- Automatische detectie via DATABASE_URL env var

### Authentication Flow
1. Frontend: api.js voegt `Authorization: Bearer <token>` header toe
2. Backend: auth.js middleware valideert JWT
3. req.user bevat decoded user data

### Telegram Bot Lifecycle
- Bot start automatisch bij server start (server.js)
- Webhook vs polling: gebruik polling voor lokaal, webhook voor production
- Telegram commands zijn case-insensitive

### Date Handling
- Frontend: JavaScript Date objects
- Backend: ISO strings in database
- Parser: chrono-node voor Nederlandse datum parsing
- Timezone: Gebruik lokale tijd (nl-NL)

## Known Issues / Tech Debt

- [ ] Geen student login (alleen parent login)
- [ ] Telegram bot gebruikt polling (kan webhook voor production)
- [ ] Geen OCR voor screenshots (Tesseract.js toe te voegen)
- [ ] Geen Magister API integratie (alleen text parsing)
- [ ] Geen recurring homework support
- [ ] Geen dark mode
- [ ] Database backups handmatig (geen auto backup)

## Toekomstige Features (backlog)

- Screenshot upload + OCR (Tesseract.js)
- Directe Magister API integratie
- Student eigen login mogelijkheid
- Recurring homework (wekelijkse opdrachten)
- Statistieken en progress tracking
- Export naar iCal/Google Calendar
- Mobile app (React Native)
- Dark mode
- Email notificaties als alternatief voor Telegram
- Meerdere parents per student (shared access)
- Homework templates
- Study timer / pomodoro
- Grade tracking per vak

## Development Tips

- **Port conflicts**: Als :3000 of :5173 bezet is: `netstat -ano | findstr :3000` + `taskkill /PID xxx /F`
- **Database inspect**: Gebruik DB Browser for SQLite voor database.sqlite
- **Telegram testen**: Gebruik @BotFather /mybots om bot te beheren
- **API testen**: REST client extensie of Postman
- **Logs**: console.log in server.js, browser devtools voor client

## Wat Werkt Nu

✅ Complete CRUD voor homework, students, classes, teachers, schedule, tests
✅ Authentication + JWT tokens
✅ Telegram bot met commands en notificaties
✅ Smart text parser voor Magister tekst
✅ Kalender interface
✅ Rooster import en beheer
✅ Parent dashboard met overzicht alle kinderen
✅ Student detail pagina met homework lijst
✅ Dagelijkse Telegram notificaties (cron)
✅ Railway deployment ready

## Working Directory
Als je me opstart, ga naar: `cd C:/Users/rutge/Claudeprojecten/huiswerk-app`

---

**Last Updated**: 2026-02-12
**Status**: MVP compleet, in gebruik, klaar voor uitbreidingen
