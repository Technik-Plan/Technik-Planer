# CGH Technik Planer

Webbasierte, build-freie Planungsanwendung für Technik-Einsätze (HTML/CSS/JS + Supabase).

## Start
1. Projektdateien auf GitHub Pages oder statischen Webserver legen (`index.html` im Root).
2. Supabase-Projekt anlegen und SQL aus `supabase-schema.sql` ausführen.
3. Anwendung öffnen, Supabase URL + Anon Key eintragen und speichern.
4. Admin-Account per Supabase Auth erstellen und in `profiles` mit `role='admin'` pflegen.

## Funktionen
- Login + Registrierung (Supabase Auth)
- Rollen: Admin / Techniker
- Planerstellung von Sonntags-Serien (Entwurf/Freigabe)
- Verfügbarkeiten (Ampel grün/gelb/rot)
- Auto-Zuweisung nach Spezialisierung mit Fallback
- Admin-Dashboard mit KPIs und Übersicht pro Sonntag
- Techniker-Ansicht „Meine Verfügbarkeit“ + „Meine Termine“
- Export: iCal (ICS) und CSV
- Session bleibt durch Supabase Session + lokale Konfiguration erhalten

## Hinweise
- Die mitgelieferten RLS-Policies sind absichtlich offen, damit die App schnell testbar ist.
  Für Produktion bitte auf Benutzerrollen und JWT-Claims absichern.
