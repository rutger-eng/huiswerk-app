# 📅 Rooster Import Handleiding

## Overzicht

De nieuwe rooster interface biedt een visueel weekrooster grid en een slimme import wizard om roosters van Magister (of andere systemen) eenvoudig te importeren.

---

## ✨ Nieuwe Features

### 1. **Visueel Rooster Grid**
- Tabel weergave met tijdslots (8:00 - 17:00) en weekdagen
- Click-to-edit: klik op een cel om les toe te voegen of te bewerken
- Kleuren per vak voor overzichtelijkheid
- Hover effecten voor betere UX
- Responsive design

### 2. **Import Wizard**
- Importeer complete roosters in één keer
- Screenshot → ChatGPT → Tekst → Import flow
- Automatische parsing van rooster data
- Preview voor verificatie
- Optie om bestaand rooster te vervangen

---

## 🚀 Hoe te Gebruiken

### Methode 1: Handmatig Lessen Toevoegen

1. Ga naar student detail pagina
2. Scroll naar "Weekrooster" sectie
3. Klik op een lege cel in het rooster
4. Vul vak, docent en lokaal in
5. Klik "Opslaan"

**Bewerken:**
- Klik op een bestaande les
- Pas gegevens aan
- Klik "Opslaan" of "Verwijderen"

---

### Methode 2: Import via Screenshot

#### Stap 1: Screenshot Maken
- Open je Magister rooster (of ander rooster systeem)
- Maak een screenshot van het weekrooster
- Zorg dat tijden, vakken en dagen duidelijk zichtbaar zijn

#### Stap 2: ChatGPT Conversie
1. Ga naar [ChatGPT](https://chat.openai.com)
2. Upload de screenshot
3. Gebruik deze prompt:

```
Converteer dit schoolrooster naar het volgende tekstformaat:

Maandag
08:00-08:50 Vak (Docent) Lokaal
09:00-09:50 Vak (Docent) Lokaal

Dinsdag
08:00-08:50 Vak (Docent) Lokaal
...etc

Belangrijke regels:
- Begin elke dag met de naam van de dag (Maandag, Dinsdag, etc.)
- Gebruik HH:MM-HH:MM formaat voor tijden
- Docent en lokaal zijn optioneel, zet tussen haakjes / na vak
- Toon alleen de lessen, geen pauzes of tussenuren
```

4. ChatGPT geeft nu een gestructureerde tekst output

#### Stap 3: Import in App
1. Klik op "📸 Rooster Importeren" knop
2. Kies voor "Tekst direct plakken"
3. Plak de output van ChatGPT
4. Klik "Parseren →"
5. **Preview:** Controleer of alle lessen correct zijn
6. ✅ Vink "Vervang bestaand rooster" aan als je het oude rooster wilt vervangen
7. Klik "✓ Importeren"

---

## 📝 Ondersteunde Formaten

De parser herkent verschillende formaten:

### Formaat 1: Standaard
```
Maandag
08:00-08:50 Nederlands (Jansen) A102
09:00-09:50 Wiskunde (De Vries) B205
```

### Formaat 2: Met scheidingstekens
```
Maandag
08:00 - 08:50 | Nederlands | Jansen | A102
09:00 - 09:50 | Wiskunde | De Vries | B205
```

### Formaat 3: Met nummering
```
Maandag
1. 08:00-08:50 Nederlands (Jansen) A102
2. 09:00-09:50 Wiskunde (De Vries) B205
```

### Minimaal vereist
```
Maandag
08:00-08:50 Nederlands
09:00-09:50 Wiskunde
```

**Belangrijke punten:**
- Dag naam moet op eigen regel staan
- Tijd in HH:MM-HH:MM formaat
- Vak is verplicht
- Docent en lokaal zijn optioneel

---

## 🎯 Best Practices

### Voor Ouders
1. **Periodieke updates:** Importeer nieuw rooster na vakantie of semester wisseling
2. **Backup eerst:** Maak een screenshot van het huidige rooster voordat je vervangt
3. **Verifieer na import:** Check of alle vakken correct zijn geïmporteerd
4. **Docenten toevoegen:** Voeg eerst docenten toe in het systeem voor betere matching

### Voor Studenten
- Check rooster via Telegram: `/rooster`
- Krijg automatisch vandaag's rooster te zien
- Zie docent info met `/docenten`

---

## ⚠️ Troubleshooting

### "Geen lessen gevonden"
- **Oorzaak:** Tekst formaat komt niet overeen
- **Oplossing:** Controleer of dag namen op eigen regel staan en tijden in HH:MM formaat

### "Parse error"
- **Oorzaak:** Onverwachte karakters of formaat
- **Oplossing:** Gebruik de ChatGPT prompt exact zoals aangegeven

### "Docent niet gevonden"
- **Info:** Docenten worden niet automatisch gekoppeld bij import
- **Oplossing:** Na import kun je handmatig per les de docent selecteren (als deze al in systeem zit)

### Verkeerde tijden
- **Oorzaak:** 24-uurs vs 12-uurs tijd formaat
- **Oplossing:** Gebruik altijd 24-uurs notatie (08:00 niet 8:00 AM)

---

## 🔮 Toekomstige Features

Mogelijke uitbreidingen:
- [ ] Directe OpenAI Vision API integratie (screenshot → tekst in één stap)
- [ ] Automatische docent matching op naam
- [ ] Rooster templates (kopieer naar meerdere studenten)
- [ ] Export functionaliteit (PDF, iCal)
- [ ] Kleuren per vak instellen
- [ ] Notities per les toevoegen
- [ ] Rooster delen met andere ouders

---

## 📞 Support

Als je problemen ondervindt:
1. Check dit document voor troubleshooting
2. Gebruik de handmatige invoer als fallback
3. Meld bugs via GitHub issues

---

## 🎓 Tips voor Optimaal Gebruik

1. **Start simpel:** Begin met een paar lessen handmatig om het systeem te leren kennen
2. **Import volledig rooster:** Gebruik import wizard voor complete weekrooster
3. **Update regelmatig:** Bij wijzigingen kun je individuele lessen aanpassen
4. **Vervang periodiek:** Bij groot roosterwijziging, vervang compleet rooster via import
5. **Backup:** Bewaar Magister screenshots als backup

**Geniet van je georganiseerde rooster! 📚**
