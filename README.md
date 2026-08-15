# Geburtstagsseite – Mainz 05 Edition

Statische Webseite mit Geburtstagsgruß und automatischer Mainz-05-Spieltags-Vorhersage
(Spieldaten von [OpenLigaDB](https://www.openligadb.de/), kein API-Key nötig).

## 1. Personalisieren

Alles Persönliche steht in `config.js`:

- `friendName` — Name deines Freundes
- `message` — Geburtstagsgruß (HTML erlaubt, z.B. `<br>`)
- `photos` — Liste von Bildpfaden, z.B. `["images/foto1.jpg"]` (Dateien vorher in `images/` legen)
- `league` — `"bl1"` für 1. Bundesliga, `"bl2"` für 2. Bundesliga (je nachdem, wo Mainz 05 aktuell spielt)

## 2. Lokal testen

```bash
python3 -m http.server 8000
```

Danach im Browser `http://localhost:8000` öffnen.

## 3. Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub anlegen (z.B. `geburtstag-mainz05`).
2. Dateien pushen:
   ```bash
   git init
   git add .
   git commit -m "Geburtstagsseite"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
3. Im Repo: **Settings → Pages → Branch: `main`, Ordner: `/root`** auswählen und speichern.
4. Seite ist nach kurzer Zeit erreichbar unter:
   `https://<username>.github.io/<repo>/`

## 4. (Optional) eigene Domain

1. Domain kaufen (z.B. bei INWX, Namecheap, ~10 €/Jahr).
2. Datei `CNAME` im Repo-Root anlegen mit Inhalt: `deine-domain.de`
3. Beim Domain-Anbieter einen DNS-Eintrag setzen:
   - `CNAME` auf `<username>.github.io`
   (oder `A`-Records auf die GitHub-Pages-IPs, siehe [GitHub-Doku](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
4. In den Pages-Settings die Domain eintragen und "Enforce HTTPS" aktivieren.

## Hinweis zur Vorhersage

Die Vorhersage ist bewusst ein witziger Zufallsgenerator (kein echtes Prognose-Modell) und
bleibt für den ganzen Spieltag gleich, da sie aus der Spiel-ID "gewürfelt" wird — bei jedem
Neuladen der Seite erscheint also derselbe Tipp.
