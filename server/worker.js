/*
 * Wetter-Wächter-Dienst – Phase 1: Grundgerüst
 * =============================================
 * Läuft als Cloudflare Worker (Gratis-Stufe). Aufgaben in dieser Phase:
 *   GET  /              -> Lebenszeichen (Status als JSON)
 *   POST /api/test-push -> schickt eine Test-Nachricht über ntfy.sh
 *   Zeitplan (stündlich) -> Platzhalter; die Wetter-Prüfung folgt in Phase 2/3
 *
 * Datenschutz-Grundsätze (gelten für alle Ausbaustufen):
 *   - Koordinaten nur grob (1 Nachkommastelle), Rundung zusätzlich serverseitig
 *   - Push-Nachrichten enthalten nie Ortsangaben
 *   - Datensparsamkeit: es wird nur gespeichert, was der Dienst wirklich braucht
 */

const ANTWORT_KOPF = {
  "Content-Type": "application/json; charset=utf-8",
  // Vorläufig offen für Tests; wird in Phase 3 mit der Anmeldung verschärft.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function antwort(daten, status = 200) {
  return new Response(JSON.stringify(daten), { status, headers: ANTWORT_KOPF });
}

/* ntfy-Themen: nur harmlose Zeichen, damit nichts in die URL geschmuggelt wird */
function themaGueltig(thema) {
  return typeof thema === "string" && /^[A-Za-z0-9_-]{4,64}$/.test(thema);
}

async function sendePush(thema, titel, text) {
  const versuch = await fetch("https://ntfy.sh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: thema, title: titel, message: text }),
  });
  if (!versuch.ok) throw new Error("ntfy antwortete mit Status " + versuch.status);
}

export default {
  async fetch(anfrage, env, ctx) {
    const url = new URL(anfrage.url);

    if (anfrage.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: ANTWORT_KOPF });
    }

    if (anfrage.method === "GET" && url.pathname === "/") {
      return antwort({
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
        return antwort({ fehler: "Bitte JSON mit dem Feld 'thema' senden." }, 400);
      }
      if (!themaGueltig(daten.thema)) {
        return antwort({ fehler: "Ungültiges Thema (4-64 Zeichen: Buchstaben, Zahlen, - und _)." }, 400);
      }
      try {
        await sendePush(daten.thema, "✅ Wetter-Wächter-Dienst",
          "Der neue Dienst läuft und kann Push-Nachrichten senden!");
        return antwort({ ok: true });
      } catch (fehler) {
        return antwort({ fehler: "Senden fehlgeschlagen: " + fehler.message }, 502);
      }
    }

    return antwort({ fehler: "Unbekannter Pfad." }, 404);
  },

  async scheduled(ereignis, env, ctx) {
    // Platzhalter: hier zieht in Phase 2/3 die stündliche Wetter-Prüfung ein
    // (mit derselben Regel-Logik, die bereits gegen waechter.py getestet wurde).
    console.log("Zeitplan-Lauf ohne Aufgaben (Phase 1):", new Date().toISOString());
  },
};
