/*
 * Wetter-Wächter-Dienst – Phase 1: Grundgerüst + Browser-Push-Beweis
 * ==================================================================
 * Läuft als Cloudflare Worker (Gratis-Stufe).
 *   GET  /                  -> Test-Seite (Browser-Push ausprobieren)
 *   GET  /sw.js             -> Service Worker (empfängt Push im Browser)
 *   GET  /api/status        -> Lebenszeichen als JSON
 *   GET  /api/vapid-public  -> öffentlicher VAPID-Schlüssel (zum Abonnieren)
 *   POST /api/test-push-web -> schickt sofort einen Browser-Push an das Abo
 *   Zeitplan (stündlich)    -> Platzhalter; Wetter-Prüfung folgt in Phase 2/3
 *
 * Datenschutz-Grundsätze (gelten für alle Ausbaustufen):
 *   - Koordinaten nur grob (1 Nachkommastelle)
 *   - Push-Nachrichten enthalten nie Ortsangaben
 *   - geheime Schlüssel stehen nur als Cloudflare-Secret, nie im Code/Log
 */

import { sendeWebPush } from "./webpush.js";

// Öffentlicher VAPID-Schlüssel (darf öffentlich sein). Der zugehörige private
// Schlüssel liegt ausschließlich als Cloudflare-Secret VAPID_PRIVATE.
const VAPID_PUBLIC = "BGGFfZkFxEpdcdg4xMGoR3VOqtmFQ4PQJ368iRL7q6oGBISDRvSUhzdorcwaVbdQIHg7kq5dXGa_pYJmGpZ2JXk";
const VAPID_SUBJECT = "mailto:wetter-waechter@users.noreply.github.com";

const JSON_KOPF = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonAntwort(daten, status = 200) {
  return new Response(JSON.stringify(daten), { status, headers: JSON_KOPF });
}

/* Nur echte Push-Dienste zulassen (Schutz gegen Missbrauch als Weiterleitung). */
function erlaubterPushEndpunkt(endpunkt) {
  let host;
  try { host = new URL(endpunkt).host; } catch { return false; }
  return host === "fcm.googleapis.com"
      || host === "web.push.apple.com"
      || host.endsWith(".push.apple.com")
      || host.endsWith(".push.services.mozilla.com")
      || host.endsWith(".notify.windows.com");
}

/* Service Worker: empfängt den Push und zeigt die Benachrichtigung an. */
const SERVICE_WORKER = `
self.addEventListener("push", (event) => {
  let daten = { title: "Wetter-Wächter", body: "" };
  try { daten = event.data.json(); } catch (e) { if (event.data) daten.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(daten.title || "Wetter-Wächter", {
    body: daten.body || "",
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8C%A6%EF%B8%8F%3C/text%3E%3C/svg%3E",
    tag: daten.tag || undefined,
    data: daten,
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(self.registration.scope));
});
`;

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
  button { border:0; border-radius:10px; padding:14px 16px; font-size:1rem; font-weight:600;
           background:#2563eb; color:#fff; cursor:pointer; width:100%; }
  #ergebnis { margin-top:12px; font-weight:600; white-space:pre-wrap; }
  .hinweis { font-size:.86rem; color:#5b6b7b; }
</style>
</head>
<body>
<main>
  <h1>🌦️ Wetter-Wächter-Dienst</h1>
  <p><span class="ok">✅ Der Dienst läuft.</span> Diese Seite testet den Versand von
  <b>Browser-Push</b> – die richtige App entsteht in den nächsten Schritten.</p>

  <div class="karte">
    <h2 style="font-size:1.05rem;margin-top:0">Browser-Push testen</h2>
    <p>Ein Tipp genügt: Der Browser fragt nach Erlaubnis, danach kommt sofort eine Test-Nachricht.
    <b>Keine Zusatz-App nötig.</b></p>
    <p class="hinweis">📱 <b>iPhone/iPad:</b> vorher über das Teilen-Symbol „Zum Home-Bildschirm“ hinzufügen
    und die Seite von dort öffnen – sonst erlaubt Apple keinen Push.</p>
    <button id="anmelden" type="button">🔔 Benachrichtigungen erlauben & testen</button>
    <div id="ergebnis"></div>
  </div>
</main>
<script>
const VAPID_PUBLIC = "${VAPID_PUBLIC}";

function b64urlZuBytes(s) {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const roh = atob(b64);
  return Uint8Array.from(roh, (c) => c.charCodeAt(0));
}

function zeige(text, gut) {
  const e = document.getElementById("ergebnis");
  e.textContent = text; e.style.color = gut ? "#15803d" : "#b91c1c";
}

document.getElementById("anmelden").addEventListener("click", async () => {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return zeige("Dieser Browser unterstützt leider keine Push-Nachrichten.", false);
    }
    zeige("Registriere …", true);
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const erlaubnis = await Notification.requestPermission();
    if (erlaubnis !== "granted") {
      return zeige("Ohne Erlaubnis können keine Nachrichten kommen. (Erlaubnis: " + erlaubnis + ")", false);
    }

    let abo = await reg.pushManager.getSubscription();
    if (!abo) {
      abo = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64urlZuBytes(VAPID_PUBLIC),
      });
    }

    zeige("Sende Test-Nachricht …", true);
    const antwort = await fetch("/api/test-push-web", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(abo),
    });
    const daten = await antwort.json();
    if (antwort.ok && daten.ok) {
      zeige("✅ Gesendet! Innerhalb weniger Sekunden sollte die Benachrichtigung erscheinen. 🎉", true);
    } else {
      zeige("⚠️ " + (daten.fehler || "Unbekannter Fehler."), false);
    }
  } catch (fehler) {
    zeige("⚠️ Fehler: " + fehler.message, false);
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

    if (anfrage.method === "GET" && url.pathname === "/sw.js") {
      return new Response(SERVICE_WORKER, {
        status: 200,
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    }

    if (anfrage.method === "GET" && url.pathname === "/api/status") {
      return jsonAntwort({ dienst: "wetter-waechter", phase: 1, status: "ok", zeit: new Date().toISOString() });
    }

    if (anfrage.method === "GET" && url.pathname === "/api/vapid-public") {
      return jsonAntwort({ vapidPublic: VAPID_PUBLIC });
    }

    if (anfrage.method === "POST" && url.pathname === "/api/test-push-web") {
      if (!env.VAPID_PRIVATE) {
        return jsonAntwort({ fehler: "Der Schlüssel VAPID_PRIVATE ist im Dienst noch nicht hinterlegt." }, 500);
      }
      let abo;
      try { abo = await anfrage.json(); } catch { return jsonAntwort({ fehler: "Ungültige Anfrage." }, 400); }
      if (!abo || !abo.endpoint || !abo.keys || !abo.keys.p256dh || !abo.keys.auth) {
        return jsonAntwort({ fehler: "Unvollständiges Abo (endpoint/keys fehlen)." }, 400);
      }
      if (!erlaubterPushEndpunkt(abo.endpoint)) {
        return jsonAntwort({ fehler: "Unbekannter Push-Dienst – abgelehnt." }, 400);
      }
      try {
        const inhalt = JSON.stringify({
          title: "✅ Browser-Push funktioniert",
          body: "Der Wetter-Wächter kann dir jetzt direkt aufs Handy schreiben – ganz ohne Zusatz-App.",
          tag: "wetter-test",
        });
        const antwort = await sendeWebPush(abo, inhalt, VAPID_PUBLIC, env.VAPID_PRIVATE, VAPID_SUBJECT);
        if (antwort.ok || antwort.status === 201) return jsonAntwort({ ok: true });
        let grund = "";
        try { grund = (await antwort.text()).slice(0, 300); } catch { /* egal */ }
        return jsonAntwort({ fehler: "Push-Dienst Status " + antwort.status + (grund ? " – " + grund : "") }, 502);
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
