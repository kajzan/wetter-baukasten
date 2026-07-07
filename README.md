# 🌦️ Wetter-Baukasten

Regel-Baukasten für den Wetter-Wächter: Wetter-Regeln im Browser zusammenklicken,
live gegen die Open-Meteo-Vorhersage prüfen und als `regeln.json` exportieren.

- **Statische Web-App** – eine einzige HTML-Datei, kein Server, keine Anmeldung
- **Privat by design** – alle Eingaben bleiben im Browser (localStorage);
  gesendet wird nur die Wetter-Abfrage an [Open-Meteo](https://open-meteo.com/) (ohne API-Schlüssel)
- **Bewusst aktivieren** – die erzeugte `regeln.json` wird von Hand in das
  (private) Wächter-Repo übernommen; diese Seite hat keinerlei Repo-Zugriff

Die Seite läuft über GitHub Pages direkt aus diesem Repository.
