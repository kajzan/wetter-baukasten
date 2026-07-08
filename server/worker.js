/*
 * Wetter-Wächter-Dienst (Cloudflare Worker, Gratis-Stufe)
 * =======================================================
 *   GET  /                  -> die App (Ort wählen, Regeln, Aktivieren)
 *   GET  /sw.js             -> Service Worker (empfängt Push im Browser)
 *   GET  /manifest.json     -> PWA-Manifest ("Zum Startbildschirm")
 *   GET  /icon.svg          -> App-Symbol
 *   GET  /api/status        -> Lebenszeichen
 *   GET  /api/vapid-public  -> öffentlicher VAPID-Schlüssel
 *   POST /api/vorschau      -> Regel-Treffer + 4-Tage-Wetter (dieselbe Logik wie der Wächter)
 *   POST /api/aktivieren    -> Abo + Ort + Regeln speichern, Bestätigungs-Push
 *   POST /api/deaktivieren  -> Abo austragen
 *   Zeitplan (stündlich)    -> Wetter prüfen, bei Treffern Push senden (mit Doppel-Schutz)
 *
 * Bausteine:  logik.js  (Regel-Logik, 1:1 aus waechter.py, paritätsgetestet)
 *             webpush.js (Web-Push-Verschlüsselung + VAPID, referenzgetestet)
 *             seite.js  (die App-Oberfläche)
 *
 * Speicher (KV-Binding SPEICHER, optional bis eingerichtet):
 *   nutzer:<kennung>                    -> { abo, lat, lon, regeln, angelegt }
 *   gesendet:<kennung>:<regel>:<datum>  -> "1" (läuft nach 3 Tagen automatisch ab)
 *
 * Datenschutz: Koordinaten nur grob (Rundung zusätzlich serverseitig),
 * Push-Texte ohne Ortsangaben, keine Namen/Konten, Kennung = Prüfsumme des
 * Push-Endpunkts (keine frei erfundenen Nutzerdaten).
 */

import { findeTreffer, holeVorhersage, blockZuText, tagesZusammenfassung,
         normalisiereRegeln, rundeKoordinate } from "./logik.js";
import { sendeWebPush } from "./webpush.js";
import { appSeite } from "./seite.js";

// Öffentlicher VAPID-Schlüssel (darf öffentlich sein). Der private liegt
// ausschließlich als Cloudflare-Secret VAPID_PRIVATE.
const VAPID_PUBLIC = "BGGFfZkFxEpdcdg4xMGoR3VOqtmFQ4PQJ368iRL7q6oGBISDRvSUhzdorcwaVbdQIHg7kq5dXGa_pYJmGpZ2JXk";
const VAPID_SUBJECT = "mailto:wetter-waechter@users.noreply.github.com";

const MAX_NUTZER = 500;            // Missbrauchs-Bremse der Vorschau-Version
const GESENDET_ABLAUF_SEK = 3 * 24 * 3600;

const JSON_KOPF = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const jsonAntwort = (daten, status = 200) =>
  new Response(JSON.stringify(daten), { status, headers: JSON_KOPF });

/* Nur echte Push-Dienste zulassen (Schutz gegen Missbrauch als Weiterleitung). */
function erlaubterPushEndpunkt(endpunkt) {
  if (typeof endpunkt !== "string" || endpunkt.length > 1024) return false;
  let host;
  try { host = new URL(endpunkt).host; } catch { return false; }
  return host === "fcm.googleapis.com"
      || host === "web.push.apple.com"
      || host.endsWith(".push.apple.com")
      || host.endsWith(".push.services.mozilla.com")
      || host.endsWith(".notify.windows.com");
}

function aboGueltig(abo) {
  return abo && erlaubterPushEndpunkt(abo.endpoint)
      && abo.keys && typeof abo.keys.p256dh === "string" && typeof abo.keys.auth === "string"
      && abo.keys.p256dh.length < 200 && abo.keys.auth.length < 100;
}

/* Anonyme Kennung: Prüfsumme des Push-Endpunkts. */
async function kennungVon(endpunkt) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpunkt));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function sendeNachricht(abo, titel, text, env) {
  const inhalt = JSON.stringify({ title: titel, body: text, tag: "wetter-waechter" });
  return sendeWebPush(abo, inhalt, VAPID_PUBLIC, env.VAPID_PRIVATE, VAPID_SUBJECT);
}

const SERVICE_WORKER = `
self.addEventListener("push", (event) => {
  let daten = { title: "Wetter-Wächter", body: "" };
  try { daten = event.data.json(); } catch (e) { if (event.data) daten.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(daten.title || "Wetter-Wächter", {
    body: daten.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: daten,
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(self.registration.scope));
});
`;

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="20" fill="#2563eb"/>
<text x="50" y="50" font-size="58" text-anchor="middle" dominant-baseline="central">🌦️</text></svg>`;

const MANIFEST = JSON.stringify({
  name: "Wetter-Wächter",
  short_name: "Wetter-Wächter",
  description: "Meldet sich, wenn dein Wunsch-Wetter kommt.",
  start_url: "/",
  display: "standalone",
  background_color: "#f4f6f8",
  theme_color: "#2563eb",
  icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
});

export default {
  async fetch(anfrage, env, ctx) {
    const url = new URL(anfrage.url);
    const pfad = url.pathname;

    if (anfrage.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_KOPF });

    if (anfrage.method === "GET") {
      if (pfad === "/") return new Response(appSeite(VAPID_PUBLIC), {
        headers: { "Content-Type": "text/html; charset=utf-8" } });
      if (pfad === "/sw.js") return new Response(SERVICE_WORKER, {
        headers: { "Content-Type": "application/javascript; charset=utf-8" } });
      if (pfad === "/manifest.json") return new Response(MANIFEST, {
        headers: { "Content-Type": "application/manifest+json" } });
      if (pfad === "/icon.svg") return new Response(ICON_SVG, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
      if (pfad === "/api/status") return jsonAntwort({
        dienst: "wetter-waechter", phase: 2, status: "ok",
        speicher: Boolean(env.SPEICHER), zeit: new Date().toISOString() });
      if (pfad === "/api/vapid-public") return jsonAntwort({ vapidPublic: VAPID_PUBLIC });
    }

    if (anfrage.method === "POST" && pfad === "/api/vorschau") {
      let daten;
      try { daten = await anfrage.json(); } catch { return jsonAntwort({ ok: false, fehler: "Ungültige Anfrage." }, 400); }
      const lat = rundeKoordinate(daten.lat), lon = rundeKoordinate(daten.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return jsonAntwort({ ok: false, fehler: "Ungültige Koordinaten." }, 400);
      }
      let regeln;
      try { regeln = normalisiereRegeln(daten.regeln); } catch (f) { return jsonAntwort({ ok: false, fehler: f.message }, 400); }
      try {
        const vorhersage = await holeVorhersage(lat, lon);
        const jetztLokalMs = Date.now() + (vorhersage.utc_offset_seconds ?? 0) * 1000;
        const treffer = regeln.map((regel) => {
          if (!regel.aktiv) return [];
          const gefunden = findeTreffer(regel, vorhersage, jetztLokalMs);
          return Object.keys(gefunden).sort().map((datum) => ({
            datum, text: blockZuText(datum, gefunden[datum]),
          }));
        });
        return jsonAntwort({ ok: true, treffer, tage: tagesZusammenfassung(vorhersage),
          stunden: vorhersage.hourly });
      } catch (f) {
        return jsonAntwort({ ok: false, fehler: "Wetterdaten gerade nicht verfügbar (" + f.message + ")." }, 502);
      }
    }

    if (anfrage.method === "POST" && pfad === "/api/aktivieren") {
      if (!env.VAPID_PRIVATE) return jsonAntwort({ ok: false, fehler: "Dienst noch nicht fertig eingerichtet (VAPID_PRIVATE fehlt)." }, 500);
      let daten;
      try { daten = await anfrage.json(); } catch { return jsonAntwort({ ok: false, fehler: "Ungültige Anfrage." }, 400); }
      if (!aboGueltig(daten.abo)) return jsonAntwort({ ok: false, fehler: "Ungültiges Push-Abo." }, 400);
      const lat = rundeKoordinate(daten.lat), lon = rundeKoordinate(daten.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return jsonAntwort({ ok: false, fehler: "Ungültige Koordinaten." }, 400);
      }
      let regeln;
      try { regeln = normalisiereRegeln(daten.regeln); } catch (f) { return jsonAntwort({ ok: false, fehler: f.message }, 400); }

      let gespeichert = false;
      if (env.SPEICHER) {
        const kennung = await kennungVon(daten.abo.endpoint);
        const schluessel = "nutzer:" + kennung;
        const schonDa = await env.SPEICHER.get(schluessel);
        if (!schonDa) {
          const bestand = await env.SPEICHER.list({ prefix: "nutzer:", limit: MAX_NUTZER });
          if (bestand.keys.length >= MAX_NUTZER) {
            return jsonAntwort({ ok: false, fehler: "Der Dienst ist momentan voll – bitte später erneut versuchen." }, 503);
          }
        }
        await env.SPEICHER.put(schluessel, JSON.stringify({
          abo: { endpoint: daten.abo.endpoint, keys: { p256dh: daten.abo.keys.p256dh, auth: daten.abo.keys.auth } },
          lat, lon, regeln,
          angelegt: schonDa ? JSON.parse(schonDa).angelegt : new Date().toISOString(),
        }));
        gespeichert = true;
      }

      // Bestätigung nur beim ersten Mal bzw. bei fehlendem Speicher als Test
      try {
        const text = gespeichert
          ? "Alles eingerichtet! Ich prüfe ab jetzt stündlich, ob dein Wunsch-Wetter kommt."
          : "Der Push-Weg funktioniert! (Die stündliche Überwachung startet, sobald der Speicher eingerichtet ist.)";
        const antwort = await sendeNachricht(daten.abo, "🔔 Wetter-Wächter", text, env);
        if (!antwort.ok && antwort.status !== 201) {
          let grund = ""; try { grund = (await antwort.text()).slice(0, 200); } catch { /* egal */ }
          return jsonAntwort({ ok: false, gespeichert, fehler: "Push-Dienst Status " + antwort.status + (grund ? " – " + grund : "") }, 502);
        }
      } catch (f) {
        return jsonAntwort({ ok: false, gespeichert, fehler: "Senden fehlgeschlagen: " + f.message }, 502);
      }
      return jsonAntwort({ ok: true, gespeichert });
    }

    if (anfrage.method === "POST" && pfad === "/api/deaktivieren") {
      let daten;
      try { daten = await anfrage.json(); } catch { return jsonAntwort({ ok: false, fehler: "Ungültige Anfrage." }, 400); }
      if (typeof daten.endpoint !== "string") return jsonAntwort({ ok: false, fehler: "endpoint fehlt." }, 400);
      if (env.SPEICHER) {
        const kennung = await kennungVon(daten.endpoint);
        await env.SPEICHER.delete("nutzer:" + kennung);
      }
      return jsonAntwort({ ok: true });
    }

    return jsonAntwort({ ok: false, fehler: "Unbekannter Pfad." }, 404);
  },

  /* Stündlicher Wächter-Lauf: alle Nutzer prüfen, bei Treffern Push senden. */
  async scheduled(ereignis, env, ctx) {
    if (!env.SPEICHER || !env.VAPID_PRIVATE) {
      console.log("Zeitplan: Speicher/Schlüssel noch nicht eingerichtet – nichts zu tun.");
      return;
    }
    const liste = await env.SPEICHER.list({ prefix: "nutzer:", limit: 1000 });
    if (!liste.keys.length) { console.log("Zeitplan: keine Nutzer."); return; }

    // Nutzer laden und nach (grobem) Ort gruppieren -> eine Wetterabfrage pro Ort
    const nachOrt = new Map();
    for (const eintrag of liste.keys) {
      const roh = await env.SPEICHER.get(eintrag.name);
      if (!roh) continue;
      let nutzer;
      try { nutzer = JSON.parse(roh); } catch { continue; }
      nutzer._schluessel = eintrag.name;
      const ort = nutzer.lat + "," + nutzer.lon;
      if (!nachOrt.has(ort)) nachOrt.set(ort, []);
      nachOrt.get(ort).push(nutzer);
    }

    let pushs = 0, fehler = 0;
    for (const [ort, nutzerliste] of nachOrt) {
      let vorhersage;
      try {
        const [lat, lon] = ort.split(",").map(Number);
        vorhersage = await holeVorhersage(lat, lon);
      } catch (f) {
        console.log("Zeitplan: Wetter für", ort, "nicht verfügbar:", f.message);
        continue;
      }
      const jetztLokalMs = Date.now() + (vorhersage.utc_offset_seconds ?? 0) * 1000;

      for (const nutzer of nutzerliste) {
        const kennung = nutzer._schluessel.slice("nutzer:".length);
        for (const regel of nutzer.regeln ?? []) {
          if (!regel.aktiv) continue;
          const gefunden = findeTreffer(regel, vorhersage, jetztLokalMs);
          for (const datum of Object.keys(gefunden).sort()) {
            const merker = "gesendet:" + kennung + ":" + regel.name + ":" + datum;
            if (await env.SPEICHER.get(merker)) continue;   // schon gemeldet
            try {
              const antwort = await sendeNachricht(nutzer.abo,
                (regel.emoji || "🔔") + " " + regel.name,
                blockZuText(datum, gefunden[datum]), env);
              if (antwort.status === 404 || antwort.status === 410) {
                // Abo existiert nicht mehr (App gelöscht o. ä.) -> austragen
                await env.SPEICHER.delete(nutzer._schluessel);
                fehler++;
                break;
              }
              if (antwort.ok || antwort.status === 201) {
                pushs++;
                await env.SPEICHER.put(merker, "1", { expirationTtl: GESENDET_ABLAUF_SEK });
              } else { fehler++; }
            } catch { fehler++; }
          }
        }
      }
    }
    console.log("Zeitplan fertig:", nachOrt.size, "Orte,", liste.keys.length, "Nutzer,", pushs, "Pushs,", fehler, "Fehler.");
  },
};
