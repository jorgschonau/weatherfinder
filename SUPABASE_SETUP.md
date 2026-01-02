# Supabase Backend Setup für SunNomad

Dieses Dokument beschreibt, wie du das Supabase Backend für die SunNomad App einrichtest.

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Supabase Projekt erstellen](#supabase-projekt-erstellen)
3. [Datenbank Schema einrichten](#datenbank-schema-einrichten)
4. [Environment Variablen konfigurieren](#environment-variablen-konfigurieren)
5. [App testen](#app-testen)
6. [Troubleshooting](#troubleshooting)

## Voraussetzungen

- Node.js und npm installiert
- Expo CLI installiert (`npm install -g expo-cli`)
- Ein Supabase Account (kostenlos bei [supabase.com](https://supabase.com))

## Supabase Projekt erstellen

### 1. Bei Supabase anmelden

1. Gehe zu [app.supabase.com](https://app.supabase.com)
2. Melde dich an oder erstelle einen neuen Account, pw: yM4wPBsJ4SISo8EC
3. Klicke auf "New Project"

### 2. Projekt konfigurieren

1. **Organization**: Wähle deine Organization oder erstelle eine neue
2. **Name**: `SunNomad` (oder ein anderer Name deiner Wahl)
3. **Database Password**: Wähle ein sicheres Passwort (speichere es sicher!)
4. **Region**: Wähle die Region, die deinen Nutzern am nächsten ist
5. **Pricing Plan**: Wähle den kostenlosen Plan (für bis zu 500MB Datenbank + 1GB Storage)
6. Klicke auf "Create new project"

⏱️ Das Projekt wird in ca. 2 Minuten erstellt.

### 3. API Credentials holen

Nach der Erstellung des Projekts:

1. Gehe zu **Settings** (⚙️ Icon in der linken Sidebar)
2. Klicke auf **API** im Menü
3. Hier findest du:
   - **Project URL**: `https://xyz.supabase.co` 
   - **anon/public** key: `eyJhbG...` (langer String)

💾 **Wichtig**: Kopiere diese beiden Werte - du brauchst sie gleich!

## Datenbank Schema einrichten

### 1. SQL Editor öffnen

1. Gehe zum **SQL Editor** (📝 Icon in der linken Sidebar)
2. Klicke auf "+ New query"

### 2. Schema importieren

1. Öffne die Datei `supabase/schema.sql` in deinem Projektordner
2. Kopiere den kompletten Inhalt
3. Füge ihn in den SQL Editor ein
4. Klicke auf **RUN** (oder drücke Cmd/Ctrl + Enter)

✅ Du solltest jetzt die Nachricht sehen: "Success. No rows returned"

### 3. Datenbank überprüfen

1. Gehe zur **Table Editor** Ansicht (📊 Icon)
2. Du solltest jetzt folgende Tabellen sehen:
   - ✅ `profiles` (User-Profile)
   - ✅ `places` (Orte mit Wetterdaten)
   - ✅ `favourites` (User-Favoriten)
   - ✅ `weather_data` (Aktuelle Wetterdaten)
   - ✅ `weather_forecast` (16-Tage Vorhersage)
   - ✅ `daily_weather_summary` (Tägliche Zusammenfassungen)

### 4. Storage Buckets überprüfen

1. Gehe zu **Storage** (🗂️ Icon)
2. Du solltest einen Bucket sehen:
   - ✅ `avatars` (für Profilbilder)

**Hinweis:** Place-Images werden später durch externe Quellen (Scraping) integriert, nicht durch User-Uploads!

## Environment Variablen konfigurieren

### 1. .env Datei erstellen

Falls noch nicht vorhanden, erstelle eine `.env` Datei im Root-Verzeichnis deines Projekts:

```bash
# OpenWeatherMap API (bereits vorhanden)
OPENWEATHERMAP_API_KEY=dein_existing_key

# Supabase Configuration (NEU)
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJhbG...dein_anon_key_hier
```

### 2. Werte eintragen

Trage die Werte ein, die du in Schritt 3 ("API Credentials holen") kopiert hast:

- `SUPABASE_URL`: Deine Project URL
- `SUPABASE_ANON_KEY`: Dein anon/public key

### 3. App neu starten

Die `.env` Datei wird nur beim Start geladen. Starte die App neu:

```bash
# Terminal schließen und neu öffnen, dann:
npm start
```

## App testen

### 1. App starten

```bash
npm start
```

### 2. Account erstellen

1. Öffne die App im Simulator/Device
2. Gehe zu **Settings** → Klicke auf "Login"
3. Klicke auf "Sign Up"
4. Fülle das Formular aus:
   - **Username**: z.B. `testuser`
   - **Email**: Deine Test-Email
   - **Password**: Mindestens 6 Zeichen
5. Klicke auf "Sign Up"

✅ Du solltest die Nachricht sehen: "Your account has been created successfully!"

### 3. Login testen

1. Gehe zu **Settings**
2. Du solltest jetzt deinen Namen/Email sehen
3. Klicke darauf um zum Profil zu gelangen

### 4. Favoriten testen (später, wenn Places implementiert sind)

Die Favoriten-Funktion speichert jetzt in Supabase statt lokal!

## Troubleshooting

### Problem: "Supabase credentials not configured"

**Lösung**: 
1. Überprüfe, ob die `.env` Datei korrekt erstellt wurde
2. Stelle sicher, dass die Variablen `SUPABASE_URL` und `SUPABASE_ANON_KEY` gesetzt sind
3. Starte die App komplett neu (Terminal schließen und `npm start`)

### Problem: "Failed to sign up" / "Failed to sign in"

**Lösung**:
1. Überprüfe in Supabase Dashboard: **Authentication** → **Users**
2. Schaue, ob der User erstellt wurde
3. Falls ja, prüfe ob Email-Bestätigung erforderlich ist:
   - Gehe zu **Authentication** → **Settings**
   - Unter "Email Auth" kannst du "Enable email confirmations" deaktivieren für Testing

### Problem: SQL Schema kann nicht ausgeführt werden

**Lösung**:
1. Stelle sicher, dass du die komplette `schema.sql` kopiert hast
2. Falls einzelne Errors auftreten, führe die Sections einzeln aus
3. Überprüfe die Error-Message im SQL Editor

### Problem: "User not authenticated" beim Favoriten speichern

**Lösung**:
1. Stelle sicher, dass du eingeloggt bist
2. Die App funktioniert auch ohne Login, aber Favoriten werden dann nur lokal gespeichert
3. Nach dem Login werden lokale Favoriten nicht automatisch synchronisiert

## 📊 Datenbank Struktur

### Core Tables (Weather-Focused)

- **profiles**: User Profile (erweitert auth.users)
- **places**: Wichtige Orte/Städte für Wetter-Suche
- **weather_data**: 🌟 **KERN DER APP** - Gecachte/historische Wetterdaten
- **weather_forecast**: 3-5 Tage Wettervorhersage
- **favourites**: User ↔ Place Beziehungen (gespeicherte Favoriten)

### Row Level Security (RLS)

Alle Tabellen haben Row Level Security aktiviert:
- Users können nur ihre eigenen Daten sehen/bearbeiten
- Öffentliche Daten (Places, Ratings) sind für alle sichtbar
- Sensible Daten sind geschützt

## 🔐 Sicherheit

### Was du NICHT committen solltest:

- ❌ `.env` Datei (bereits in `.gitignore`)
- ❌ Supabase Database Password
- ❌ Supabase Service Role Key (nur Anon Key verwenden!)

### Was du committen kannst:

- ✅ `supabase/schema.sql` (SQL Schema)
- ✅ `.env.example` (Template ohne echte Credentials)

## 🚀 Next Steps

Jetzt, wo das Backend läuft, kannst du:

1. **Weather Caching implementieren**:
   - Wetterdaten von OpenWeatherMap in `weather_data` Tabelle speichern
   - Alte Daten wiederverwenden (Cache < 3h)
   - Historische Daten für Trends anzeigen

2. **Places System integrieren**:
   - Wenn User einen Ort favorisiert, Place in DB erstellen
   - Places mit aktuellen Wetterdaten anzeigen
   - `weatherDataService` in der App nutzen

3. **Favoriten zu Supabase migrieren**:
   - Die alte AsyncStorage-basierte Favoriten-Verwaltung durch Supabase ersetzen
   - In `FavouritesScreen.js` den neuen `favouritesService` verwenden
   - Automatische Sync bei Login

4. **Forecast Integration**:
   - 3-5 Tage Forecast in DB cachen
   - Forecast-Daten in DestinationDetailScreen anzeigen

## 📚 Weitere Ressourcen

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)

## 💡 Tipps

1. **Kostenloser Plan**: Der kostenlose Plan von Supabase ist großzügig:
   - 500 MB Datenbank
   - 1 GB File Storage
   - 2 GB Bandwidth
   - 50,000 monatliche aktive User

2. **Entwicklung vs. Produktion**: 
   - Für Entwicklung: Nutze ein separates Supabase Projekt
   - Für Produktion: Erstelle ein eigenes Production-Projekt

3. **Backups**: Supabase macht automatisch tägliche Backups (auch im Free Plan!)

4. **Monitoring**: Nutze das Supabase Dashboard für:
   - API Logs
   - User Management
   - Database Performance

---

Bei Fragen oder Problemen, schau in die [Supabase Discord Community](https://discord.supabase.com) oder öffne ein Issue auf GitHub!

