# SunNomad - Quick Start Guide 🚀

Diese Anleitung hilft dir, schnell mit der SunNomad App zu starten.

## ⚡ Schnellstart (5 Minuten)

### 1. Dependencies installieren

```bash
npm install
```

### 2. OpenWeatherMap API Key besorgen (kostenlos)

1. Gehe zu [openweathermap.org/api](https://openweathermap.org/api)
2. Erstelle einen kostenlosen Account
3. Gehe zu "API Keys" und kopiere deinen Key

### 3. .env Datei erstellen

Erstelle eine `.env` Datei im Root-Verzeichnis:

```bash
OPENWEATHERMAP_API_KEY=dein_api_key_hier
```

**Ohne Supabase starten**: Die App läuft sofort! Auth-Features sind optional.

### 4. App starten

```bash
npm start
```

Dann drücke:
- `i` für iOS Simulator
- `a` für Android Emulator
- Oder scanne den QR Code mit Expo Go

✅ **Fertig!** Die App läuft jetzt mit echten Wetterdaten!

---

## 🔐 Backend aktivieren (Optional - 15 Minuten)

Wenn du User-Accounts und Cloud-Sync möchtest:

### 1. Supabase Account erstellen

1. Gehe zu [supabase.com](https://supabase.com)
2. Erstelle einen kostenlosen Account
3. Erstelle ein neues Projekt (Name: "SunNomad")
4. Warte 2 Minuten bis das Projekt bereit ist

### 2. Credentials holen

1. Gehe zu **Settings** → **API**
2. Kopiere:
   - Project URL
   - anon/public key

### 3. .env erweitern

Füge zu deiner `.env` Datei hinzu:

```bash
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

### 4. Datenbank Schema einrichten

1. Öffne Supabase Dashboard → **SQL Editor**
2. Kopiere Inhalt aus `supabase/schema.sql`
3. Füge ein und klicke **RUN**

### 5. App neu starten

```bash
# Terminal schließen, dann:
npm start
```

✅ **Fertig!** Jetzt kannst du Accounts erstellen und Favoriten in der Cloud speichern!

---

## 📱 Features testen

### Ohne Login (sofort verfügbar):
- ✅ Karte mit Wetter-Markern durchsuchen
- ✅ Radius und Wetter-Filter nutzen
- ✅ Detaillierte Wetter-Infos ansehen
- ✅ Navigation zu Orten starten
- ✅ Sprache und Theme ändern

### Mit Login (nach Backend-Setup):
- 🔐 Account erstellen/Login
- ⭐ Favoriten in Cloud speichern
- 👤 Profil ansehen und bearbeiten
- 🔄 Geräte-übergreifender Sync

---

## 🐛 Häufige Probleme

### "Failed to load weather data"
- Überprüfe ob OPENWEATHERMAP_API_KEY in `.env` gesetzt ist
- Überprüfe ob der API Key korrekt ist
- Starte die App neu (`npm start`)

### "Supabase credentials not configured"
- Das ist OK! Die App funktioniert ohne Supabase
- Wenn du Auth nutzen willst, siehe "Backend aktivieren"

### App startet nicht
```bash
# Cache löschen und neu starten:
npm start --clear
```

---

## 📚 Weitere Dokumentation

- **Detailliertes Supabase Setup**: [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)
- **Geplante Features**: [`FUTURE_FEATURES.md`](./FUTURE_FEATURES.md)
- **Vollständige README**: [`README.md`](./README.md)

---

## 💡 Tipps

1. **OpenWeatherMap Free Tier**: 
   - 1,000 API Calls/Tag (mehr als genug für Tests)
   - Alle benötigten Features inklusive

2. **Supabase Free Tier**:
   - 500 MB Datenbank
   - 1 GB File Storage
   - Perfekt für Development und kleine Apps

3. **Entwicklung ohne Internet**:
   - Die App hat Fallback Mock-Daten
   - Läuft auch ohne API-Keys (für UI-Testing)

4. **Tests auf echtem Gerät**:
   - Installiere Expo Go App
   - Scanne QR Code
   - Besser als Simulator für Location-Testing!

---

Viel Spaß mit SunNomad! 🌞🏜️

Bei Fragen: Schau in die [Dokumentation](./README.md) oder öffne ein Issue auf GitHub.


