/*
 * Wetter-Wächter-Dienst – Phase 1: Grundgerüst + Push-Test
 * ========================================================
 * Läuft als Cloudflare Worker (Gratis-Stufe). Aufgaben in dieser Phase:
 *   GET  /               -> freundliche Test-Seite (Push aufs Handy ausprobieren)
 *   GET  /api/status     -> Lebenszeichen als JSON (für Technik/Überwachung)
 *   POST /api/test-push  -> schickt eine Test-Nachricht über ntfy.sh
 *   Zeitplan (stündlich) -> Platzhalter; die Wetter-Prüfung folgt in Phase 2/3
 *
 * Datenschutz-Grundsätze (gelten für alle Ausbaustufen):
 *   - Koordinaten nur grob (1 Nachkommastelle), Rundung zusätzlich serverseitig
 *   - Push-Nachrichten enthalten nie Ortsangaben
 *   - Geheime ntfy-Themen werden nicht gespeichert und nicht protokolliert
 *   - Datensparsamkeit: es wird nur gespeichert, was der Dienst wirklich braucht
 */

const JSON_KOPF = {
  "Content-Type": "application/json; charset=utf-8",
  // Vorläufig offen für Tests; wird in Phase 3 mit der Anmeldung verschärft.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonAntwort(daten, status = 200) {
  return new Response(JSON.stringify(daten), { status, headers: JSON_KOPF });
}

/* ntfy-Themen: nur harmlose Zeichen, damit nichts in die URL geschmuggelt wird */
function themaGueltig(thema) {
  return typeof thema === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(thema);
}

async function sendePush(thema, titel, text, token) {
  const kopf = { "Content-Type": "application/json" };
  // Mit Zugangs-Schlüssel zählt die ntfy-Grenze pro Konto statt pro Sammel-Adresse
  // (behebt die "429"-Drosselung beim Senden aus Cloudflare heraus).
  if (token) kopf["Authorization"] = "Bearer " + token;
  const versuch = await fetch("https://ntfy.sh/", {
    method: "POST",
    headers: kopf,
    body: JSON.stringify({ topic: thema, title: titel, message: text }),
  });
  if (!versuch.ok) throw new Error("ntfy antwortete mit Status " + versuch.status);
}

/* Kleine, in sich geschlossene Test-Seite (kein externer Code, kein Tracking). */
const TEST_SEITE = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wetter-Wächter-Dienst</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
         line-height:1.5; background:#f4f6f8; color:#1c2733; }
  @media (prefers-color-scheme: dark){ body{ background:#10161d; color:#e8edf2; } .karte{ background:#1a232e; border-color:#2c3947; } code{ background:#0d1218; } }
  main { max-width:560px; margin:0 auto; padding:20px 16px 60px; }
  h1 { font-size:1.3rem; }
  .karte { background:#fff; border:1px solid #dde4ea; border-radius:12px; padding:16px; margin:14px 0; }
  .ok { color:#15803d; font-weight:600; }
  ol { padding-left:20px; } li { margin:8px 0; }
  code { background:#eef2f6; padding:2px 6px; border-radius:6px; font-size:.95em; word-break:break-all; }
  button { border:0; border-radius:10px; padding:12px 16px; font-size:1rem; font-weight:600;
           background:#2563eb; color:#fff; cursor:pointer; width:100%; }
  button.zart { background:#e8effd; color:#2563eb; }
  a.knopf { display:inline-block; text-decoration:none; text-align:center; }
  .reihe { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
  .reihe > * { flex:1; min-width:140px; }
  #ergebnis { margin-top:12px; font-weight:600; }
  .hinweis { font-size:.86rem; color:#5b6b7b; }
</style>
</head>
<body>
<main>
  <h1>🌦️ Wetter-Wächter-Dienst</h1>
  <p><span class="ok">✅ Der Dienst läuft.</span> Diese Seite ist nur zum Testen der Push-Nachrichten
  gedacht – die richtige App entsteht in den nächsten Schritten.</p>

  <div class="karte">
    <h2 style="font-size:1.05rem;margin-top:0">Push aufs Handy testen</h2>
    <p>Für den Test benutzen wir ein <b>frisches Zufalls-Thema</b> – dein bestehendes geheimes Thema bleibt unberührt.</p>
    <ol>
      <li><b>ntfy-App öffnen</b> (die du schon hast), auf <b>+</b> tippen und dieses Thema abonnieren:<br>
        <code id="thema">…</code>
        <div class="reihe">
          <button class="zart" id="kopieren" type="button">📋 Thema kopieren</button>
          <a class="knopf zart" id="ntfylink" href="#" target="_blank" rel="noopener">🔗 In ntfy öffnen</a>
        </div>
      </li>
      <li><b>Test-Nachricht senden:</b>
        <div style="margin-top:8px"><button id="senden" type="button">📤 Test-Nachricht senden</button></div>
        <div id="ergebnis"></div>
      </li>
      <li>Aufs Handy schauen – die Nachricht sollte innerhalb weniger Sekunden ankommen. 🎉</li>
    </ol>
    <p class="hinweis">Danach kannst du das Test-Thema in der ntfy-App wieder entfernen.</p>
  </div>
</main>
<script>
  // Zufälliges, nicht erratbares Test-Thema erzeugen (nur im Browser)
  const zufall = crypto.getRandomValues(new Uint8Array(9));
  const thema = "wetter-test-" + Array.from(zufall, b => b.toString(36)).join("").slice(0, 12);
  document.getElementById("thema").textContent = thema;
  document.getElementById("ntfylink").href = "https://ntfy.sh/" + thema;

  document.getElementById("kopieren").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(thema);
      document.getElementById("kopieren").textContent = "✔️ Kopiert!";
    } catch { alert("Bitte das Thema von Hand markieren und kopieren."); }
  });

  document.getElementById("senden").addEventListener("click", async () => {
    const ausgabe = document.getElementById("ergebnis");
    ausgabe.textContent = "Sende …"; ausgabe.style.color = "";
    try {
      const antwort = await fetch("/api/test-push", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thema }),
      });
      const daten = await antwort.json();
      if (antwort.ok && daten.ok) {
        ausgabe.textContent = "✅ Gesendet! Schau jetzt auf dein Handy.";
        ausgabe.style.color = "#15803d";
      } else {
        ausgabe.textContent = "⚠️ " + (daten.fehler || "Unbekannter Fehler.");
        ausgabe.style.color = "#b91c1c";
      }
    } catch (fehler) {
      ausgabe.textContent = "⚠️ Netzwerkfehler: " + fehler.message;
      ausgabe.style.color = "#b91c1c";
    }
  });
</script>
</body>
</html>`;

export default {
  async fetch(anfrage, env, ctx) {
    const url = new URL(anfrage.url);

    if (anfrage.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_KOPF });
    }

    if (anfrage.method === "GET" && url.pathname === "/") {
      return new Response(TEST_SEITE, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (anfrage.method === "GET" && url.pathname === "/api/status") {
      return jsonAntwort({
        dienst: "wetter-waechter",
        phase: 1,
        status: "ok",
        zeit: new Date().toISOString(),
      });
    }

    if (anfrage.method === "POST" && url.pathname === "/api/test-push") {
      let daten;
      try {
        daten = await anfrage.json();
      } catch {
        return jsonAntwort({ fehler: "Bitte JSON mit dem Feld 'thema' senden." }, 400);
      }
      if (!themaGueltig(daten.thema)) {
        return jsonAntwort({ fehler: "Ungültiges Thema (4-64 Zeichen: Buchstaben, Zahlen, - und _)." }, 400);
      }
      try {
        await sendePush(daten.thema, "✅ Wetter-Wächter-Dienst",
          "Der neue Dienst läuft und kann Push-Nachrichten senden!", env.NTFY_TOKEN);
        return jsonAntwort({ ok: true });
      } catch (fehler) {
        return jsonAntwort({ fehler: "Senden fehlgeschlagen: " + fehler.message }, 502);
      }
    }

    return jsonAntwort({ fehler: "Unbekannter Pfad." }, 404);
  },

  async scheduled(ereignis, env, ctx) {
    // Platzhalter: hier zieht in Phase 2/3 die stündliche Wetter-Prüfung ein
    // (mit derselben Regel-Logik, die bereits gegen waechter.py getestet wurde).
    console.log("Zeitplan-Lauf ohne Aufgaben (Phase 1):", new Date().toISOString());
  },
};
