/*
 * Die App-Seite des Wetter-Wächters (eine Datei; externe Dienste – Ortssuche,
 * Reverse-Geocoding, Karte – spricht der Browser des Nutzers direkt an).
 * Wird vom Worker unter "/" ausgeliefert; der öffentliche VAPID-Schlüssel und
 * der App-Stand werden beim Ausliefern eingesetzt.
 *
 * Aufbau: Übersicht (Himmel, Wetter jetzt, „Heute passt's“, Wochenplan) ·
 * Wetter · Einstellungen. Wünsche werden in einem Blatt von unten bearbeitet.
 *
 * Datenschutz: Orte werden auf dem Gerät genau gespeichert (Anzeige, Karte).
 * Alles, was das Gerät verlässt, ist auf 1 Nachkommastelle (~11 km) gerundet –
 * siehe grob(); der Dienst rundet zusätzlich selbst.
 *
 * Hinweis: Das Seiten-JavaScript nutzt bewusst KEINE Backticks/Template-Literale,
 * weil die ganze Seite in einem Template-Literal steckt.
 */

import { BAUSTEINE_CSS, BAUSTEINE_JS } from "./bausteine_ui.js";

export function appSeite(vapidPublic, appStand = "") {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#3d8fe6">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Wetter-Wächter">
<link rel="manifest" href="/manifest.json">
<link rel="icon" href="/icon.svg">
<link rel="apple-touch-icon" href="/icon.svg">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<title>Wetter-Wächter</title>
<style>
  :root, :root[data-theme="light"] {
    --hg:#eef3f8; --karte:#ffffff; --text:#0f2238; --text2:#5a6f86;
    --linie:#dbe3ec; --akzent:#1d6fd1; --akzent-hell:#e3eefb;
    --gruen:#15803d; --gruen-hell:#e6f4ea; --rot:#b91c1c; --rot-hell:#fdeaea;
    --gelb-hell:#fdf4e3; --gelb:#8a6414;
    --passt:#1fa463; --knapp:#e3a51f; --leer:rgba(90,111,134,.15);
    --glas:rgba(255,255,255,.72); --glas-linie:rgba(255,255,255,.75);
    --blatt:rgba(248,251,254,.97); --nav:rgba(255,255,255,.86);
    --held:rgba(10,42,86,.22); --held-linie:rgba(255,255,255,.38);
    --schatten:0 10px 30px rgba(15,34,56,.13);
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --hg:#0f1722; --karte:#18222e; --text:#e9eef4; --text2:#98a8ba;
      --linie:#2a3747; --akzent:#5b9cf5; --akzent-hell:#1b2b43;
      --gruen:#4ade80; --gruen-hell:#12291a; --rot:#f87171; --rot-hell:#331616;
      --gelb-hell:#2b2416; --gelb:#e3b95f;
      --passt:#34c27a; --knapp:#e8b33a; --leer:rgba(255,255,255,.1);
      --glas:rgba(17,26,39,.62); --glas-linie:rgba(255,255,255,.1);
      --blatt:rgba(19,27,39,.97); --nav:rgba(17,25,37,.86);
      --held:rgba(255,255,255,.08); --held-linie:rgba(255,255,255,.16);
      --schatten:0 10px 30px rgba(0,0,0,.35);
    }
  }
  :root[data-theme="dark"] {
    --hg:#0f1722; --karte:#18222e; --text:#e9eef4; --text2:#98a8ba;
    --linie:#2a3747; --akzent:#5b9cf5; --akzent-hell:#1b2b43;
    --gruen:#4ade80; --gruen-hell:#12291a; --rot:#f87171; --rot-hell:#331616;
    --gelb-hell:#2b2416; --gelb:#e3b95f;
    --passt:#34c27a; --knapp:#e8b33a; --leer:rgba(255,255,255,.1);
    --glas:rgba(17,26,39,.62); --glas-linie:rgba(255,255,255,.1);
    --blatt:rgba(19,27,39,.97); --nav:rgba(17,25,37,.86);
    --held:rgba(255,255,255,.08); --held-linie:rgba(255,255,255,.16);
    --schatten:0 10px 30px rgba(0,0,0,.35);
  }

  /* ---- Himmel-Hintergrund (Verlauf + gezeichnetes Wetter) ---- */
  #himmel { position:fixed; inset:0; z-index:-1; overflow:hidden; background:#5fa8e6; transition:background .8s ease; }
  #himmel-deko { position:absolute; inset:0; }
  #himmel-deko svg { position:absolute; inset:0; width:100%; height:100%; }
  @keyframes fallen { to { transform:translateY(12px); } }
  @keyframes rieseln { to { transform:translateY(12px); } }
  @keyframes funkeln { 50% { opacity:.15; } }
  @keyframes ziehen { to { transform:translateX(8px); } }
  .niederschlag { animation:fallen .62s linear infinite; }
  .schneefall { animation:rieseln 5.5s linear infinite; }
  .sterne circle { animation:funkeln 4s ease-in-out infinite; }
  .wolkenzug { animation:ziehen 34s ease-in-out infinite alternate; }

  * { box-sizing:border-box; }
  html { -webkit-tap-highlight-color:transparent; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,"Segoe UI",Roboto,sans-serif;
    background:transparent; color:var(--text); line-height:1.45; -webkit-text-size-adjust:100%; -webkit-font-smoothing:antialiased; }
  main { max-width:560px; margin:0 auto; padding:calc(env(safe-area-inset-top) + 14px) 16px calc(112px + env(safe-area-inset-bottom)); }
  button { font:inherit; color:inherit; }
  .reiter { display:none; } .reiter.sichtbar { display:block; animation:einblenden .25s ease; }
  @keyframes einblenden { from { opacity:0; transform:translateY(6px); } }
  svg.ic { width:1.25em; height:1.25em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0; }

  /* ---- Kopf über dem Himmel ---- */
  .kopf { display:flex; align-items:center; gap:10px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.18); min-height:44px; }
  .ort-knopf { display:flex; align-items:center; gap:6px; border:0; background:none; cursor:pointer; padding:6px 0;
    font-weight:650; font-size:.95rem; min-width:0; color:#fff; }
  .ort-knopf .nam { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ort-knopf .stadt { opacity:.8; font-weight:500; white-space:nowrap; }
  .rund { margin-left:auto; width:42px; height:42px; border-radius:50%; border:1px solid var(--held-linie);
    background:var(--held); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;
    -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); flex-shrink:0; }
  .jetzt { color:#fff; text-shadow:0 1px 4px rgba(0,0,0,.15); margin:2px 0 18px; }
  .jetzt .grad { font-size:4.6rem; font-weight:200; letter-spacing:-.04em; line-height:1; }
  .jetzt .lage { font-size:1.05rem; font-weight:500; opacity:.95; margin-top:2px; }

  /* ---- „Heute passt's“ ---- */
  .held { position:relative; overflow:hidden; display:flex; align-items:center; gap:14px; color:#fff;
    background:var(--held); border:1px solid var(--held-linie); border-radius:24px; padding:16px 18px; margin-bottom:14px;
    -webkit-backdrop-filter:blur(18px) saturate(1.3); backdrop-filter:blur(18px) saturate(1.3); text-shadow:0 1px 2px rgba(0,0,0,.12); }
  .held .em { font-size:2.5rem; line-height:1; flex-shrink:0; }
  .held .txt { flex:1; min-width:0; }
  .held b { display:block; font-size:1.15rem; line-height:1.25; }
  .held .sub { font-size:.92rem; opacity:.95; }
  .held .knopf { margin-top:10px; background:#fff; color:#1d6fd1; text-shadow:none; }
  .held.feier .em { animation:wackeln 1.1s ease 2; }
  @keyframes wackeln { 20% { transform:rotate(-12deg) scale(1.1); } 40% { transform:rotate(10deg) scale(1.15); } 60% { transform:rotate(-6deg); } 80% { transform:rotate(3deg); } }
  .funke { position:absolute; width:8px; height:8px; border-radius:50%; left:42px; top:50%; pointer-events:none;
    animation:funke 1.2s cubic-bezier(.2,.7,.3,1) forwards; opacity:0; }
  @keyframes funke { 0% { opacity:1; transform:translate(0,0) scale(.4); } 100% { opacity:0; transform:translate(var(--x),var(--y)) scale(1); } }

  /* ---- Karten (Glas) ---- */
  .karte { background:var(--glas); border:1px solid var(--glas-linie); border-radius:22px; padding:16px; margin-bottom:14px;
    -webkit-backdrop-filter:blur(20px) saturate(1.4); backdrop-filter:blur(20px) saturate(1.4); box-shadow:var(--schatten); }
  h2 { font-size:1.05rem; margin:0; letter-spacing:-.01em; }
  .karte > h2 { margin-bottom:10px; }
  .hinweis { font-size:.82rem; color:var(--text2); }
  .knopf { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:0; border-radius:14px; cursor:pointer;
    padding:12px 18px; font-size:.95rem; font-weight:650; background:var(--akzent); color:#fff; }
  .knopf.zart { background:var(--akzent-hell); color:var(--akzent); }
  .knopf.rot { background:var(--rot-hell); color:var(--rot); }
  .knopf.breit { width:100%; }
  .knopf.gross { padding:15px 18px; font-size:1rem; border-radius:16px; }
  .knopf:disabled { opacity:.45; cursor:default; }
  .knopf:active:not(:disabled), .chip:active, .zelle:active { transform:scale(.97); }
  .warnung { background:var(--rot-hell); color:var(--rot); border-radius:10px; padding:8px 10px; font-size:.86rem; margin-top:8px; }
  .erfolg { background:var(--gruen-hell); color:var(--gruen); border-radius:10px; padding:8px 10px; font-size:.86rem; margin-top:8px; font-weight:600; }
  input[type=text], input[type=search] { width:100%; padding:12px 14px; border:1px solid var(--linie); border-radius:14px;
    background:var(--hg); color:var(--text); font-size:max(16px,1rem); font-family:inherit; }
  input[type=number] { width:100%; padding:7px 8px; border:1px solid var(--linie); border-radius:10px;
    background:var(--hg); color:var(--text); font-size:max(16px,1rem); text-align:right; }
  select { width:100%; padding:10px 12px; border:1px solid var(--linie); border-radius:12px;
    background:var(--hg); color:var(--text); font-size:max(16px,1rem); font-family:inherit; }
  label { font-size:.82rem; color:var(--text2); display:block; margin-bottom:4px; }

  /* ---- Wochenplan ---- */
  .plan-kopf { display:flex; align-items:baseline; gap:8px; margin-bottom:6px; }
  .plan-kopf .momente { margin-left:auto; font-size:.8rem; color:var(--text2); font-weight:600; white-space:nowrap; }
  .plan-kopf .momente b { color:var(--passt); }
  .pz { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); align-items:center; column-gap:6px; }
  .pz.tage-reihe { font-size:.74rem; color:var(--text2); text-align:center; font-weight:650; padding:2px 0 2px; }
  .pz.tage-reihe .heute { color:var(--text); }
  .pz.tage-reihe .heute::after { content:""; display:block; width:4px; height:4px; border-radius:50%; background:var(--akzent); margin:2px auto 0; }
  .pz.zeile { border-top:1px solid var(--linie); padding:6px 0 10px; row-gap:6px; }
  .wname { grid-column:1 / -1; display:flex; align-items:center; gap:8px; border:0; background:none; padding:4px 0 0; cursor:pointer; text-align:left; min-width:0; }
  .wname .em { font-size:1.2rem; line-height:1; flex-shrink:0; }
  .wname .t { min-width:0; font-weight:650; font-size:.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .wname small { font-weight:500; font-size:.78rem; color:var(--text2); white-space:nowrap; }
  .wname .mehr { margin-left:auto; color:var(--text2); opacity:.7; display:flex; }
  .zelle { width:100%; height:30px; border:0; border-radius:9px; cursor:pointer; padding:0;
    background:var(--leer); transition:transform .12s; }
  .zelle.ja { background:var(--passt); box-shadow:0 2px 6px rgba(31,164,99,.35); }
  .zelle.fast { background:var(--knapp); opacity:.85; }
  .zelle.aus { background:transparent; position:relative; cursor:default; }
  .zelle.aus::after { content:""; position:absolute; left:50%; top:50%; width:4px; height:4px; margin:-2px; border-radius:50%; background:var(--leer); }
  .zelle.vorbei { opacity:.45; }
  .zelle.laedt { animation:schimmer 1.2s ease-in-out infinite; }
  .zelle.gewaehlt { outline:2px solid var(--akzent); outline-offset:2px; }
  @keyframes schimmer { 50% { opacity:.4; } }
  .zelle.neu { animation:plopp .4s cubic-bezier(.3,1.5,.5,1) backwards; animation-delay:calc(var(--i) * 22ms); }
  @keyframes plopp { from { transform:scale(.3); opacity:0; } }
  .pz.zeile.inaktiv .wname, .pz.zeile.inaktiv .zelle { opacity:.4; }
  .pz.zeile.frisch { animation:aufleuchten 1.6s ease; border-radius:12px; }
  @keyframes aufleuchten { 0%, 40% { background:var(--akzent-hell); } }
  .zell-info { grid-column:1 / -1; font-size:.84rem; color:var(--text2); padding:6px 2px 0; animation:einblenden .2s ease; }
  .zell-info b { color:var(--text); }
  .legende { display:flex; gap:14px; font-size:.74rem; color:var(--text2); margin-top:10px; flex-wrap:wrap; }
  .legende i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:5px; vertical-align:-1px; }

  /* ---- Hinweis-Karte Benachrichtigungen ---- */
  .nudge { display:flex; align-items:center; gap:12px; }
  .nudge .ic-kreis { width:40px; height:40px; border-radius:50%; background:var(--akzent-hell); color:var(--akzent);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .nudge .txt { flex:1; font-size:.92rem; font-weight:600; min-width:0; line-height:1.3; }
  .karte.nudge { padding:12px 14px; }
  .nudge .weg { border:0; background:none; color:var(--text2); cursor:pointer; padding:6px; font-size:1.1rem; }

  /* ---- Untere Leiste ---- */
  nav { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(14px + env(safe-area-inset-bottom)); z-index:20;
    width:min(340px, calc(100% - 32px)); height:64px; border-radius:32px; background:var(--nav);
    -webkit-backdrop-filter:blur(20px) saturate(1.5); backdrop-filter:blur(20px) saturate(1.5);
    box-shadow:0 10px 30px rgba(15,34,56,.2); display:flex; align-items:center; justify-content:space-around; }
  nav .tab { border:0; background:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;
    font-size:.72rem; font-weight:650; color:var(--text2); padding:6px 14px; }
  nav .tab.aktiv { color:var(--akzent); }
  nav .plus { width:58px; height:58px; border-radius:50%; border:0; background:var(--akzent); color:#fff; cursor:pointer;
    margin-top:-28px; box-shadow:0 8px 20px rgba(29,111,209,.45); display:flex; align-items:center; justify-content:center; }
  nav .plus svg { width:28px; height:28px; stroke-width:2.4; }

  /* ---- Blatt von unten ---- */
  .blatt-hg { position:fixed; inset:0; z-index:25; background:rgba(8,15,25,.38); opacity:0; transition:opacity .25s; }
  .blatt-hg.offen { opacity:1; }
  .blatt { position:fixed; left:0; right:0; bottom:0; margin:0 auto; max-width:560px; z-index:26;
    max-height:calc(100% - 28px - env(safe-area-inset-top)); display:flex; flex-direction:column;
    background:var(--blatt); border-radius:26px 26px 0 0; box-shadow:0 -10px 40px rgba(0,0,0,.2);
    transform:translateY(100%); transition:transform .3s cubic-bezier(.2,.85,.25,1); }
  .blatt.offen { transform:none; }
  .blatt-kopf { padding:8px 16px 4px; touch-action:none; }
  .blatt-kopf .griffleiste { width:40px; height:5px; border-radius:3px; background:var(--linie); margin:0 auto 6px; }
  .blatt-kopf .zeile1 { display:flex; align-items:center; gap:8px; min-height:36px; }
  .blatt-kopf h3 { margin:0; font-size:1.15rem; flex:1; min-width:0; }
  .zu { width:34px; height:34px; border-radius:50%; border:0; background:var(--leer); cursor:pointer; color:var(--text2);
    display:flex; align-items:center; justify-content:center; margin-left:auto; flex-shrink:0; }
  .rollbereich { overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
    padding:4px 20px calc(26px + env(safe-area-inset-bottom)); }
  .abschnitt { font-size:.74rem; font-weight:750; text-transform:uppercase; letter-spacing:.07em; color:var(--text2); margin:20px 0 8px; }
  .wahl { display:flex; flex-wrap:wrap; gap:8px; }
  .chip { border:1px solid var(--linie); background:var(--karte); color:var(--text); border-radius:999px; cursor:pointer;
    padding:9px 15px; font-size:.92rem; font-weight:600; transition:transform .1s, background .15s; }
  .chip.an { background:var(--akzent); border-color:var(--akzent); color:#fff; }
  .chip.neu-ort { border-style:dashed; color:var(--akzent); }
  .zeitfein { display:flex; align-items:center; gap:8px; margin-top:10px; font-size:.88rem; color:var(--text2); }
  .zeitfein select { width:auto; padding:7px 10px; }

  /* Wunsch bearbeiten */
  .ed-kopf { display:flex; align-items:center; gap:12px; margin-top:4px; }
  .ed-emoji { width:58px; height:58px; border-radius:18px; border:0; background:var(--akzent-hell); font-size:2rem; cursor:pointer; flex-shrink:0; }
  .ed-name { flex:1; min-width:0; font-size:1.15rem !important; font-weight:750; border-color:transparent !important; background:transparent !important; padding:8px 6px !important; }
  .ed-name:focus { border-color:var(--linie) !important; background:var(--hg) !important; }
  .emoji-gitter { display:grid; grid-template-columns:repeat(8,1fr); gap:4px; margin-top:10px; }
  .emoji-gitter button { border:1px solid var(--linie); background:var(--hg); border-radius:10px; font-size:1.25rem; padding:6px 0; cursor:pointer; }
  .emoji-gitter button.an { border-color:var(--akzent); background:var(--akzent-hell); }
  .blatt .regel { border:0; padding:0; background:none; }
  .modus-aus { background:var(--akzent-hell); border-radius:14px; padding:10px 12px; font-size:.84rem; margin-bottom:8px;
    display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .modus-aus > div { flex:1; min-width:170px; }
  .loesch-zeile { margin-top:26px; text-align:center; }

  /* Vorlagen */
  .vorlagen { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(8rem, 100%), 1fr)); grid-auto-rows:1fr; gap:8px; }
  .vorlagen button { display:flex; align-items:center; gap:9px; min-height:52px; text-align:left; border:1px solid var(--linie);
    background:var(--karte); color:var(--text); border-radius:16px; padding:9px 11px; font-size:.9rem; font-weight:600; line-height:1.2; cursor:pointer; }
  .vorlagen .v-emoji { font-size:1.35rem; width:1.4em; flex-shrink:0; text-align:center; }
  .vorlagen .v-name { min-width:0; overflow-wrap:break-word; -webkit-hyphens:manual; hyphens:manual; }
  .vorlagen button:disabled { opacity:.45; cursor:default; }
  .vorlagen button.an { border-color:var(--akzent); background:var(--akzent-hell); box-shadow:inset 0 0 0 1px var(--akzent); }
  .vorlagen button.eigene { grid-column:1 / -1; justify-content:center; border-style:dashed; color:var(--akzent); }

  /* Orte */
  .ort-liste { display:flex; flex-direction:column; }
  .ort-eintrag { display:flex; align-items:center; gap:10px; padding:11px 0; border-top:1px solid var(--linie); }
  .ort-eintrag:first-child { border-top:0; }
  .ort-eintrag .pin { width:36px; height:36px; border-radius:12px; background:var(--akzent-hell); color:var(--akzent);
    display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ort-eintrag .txt { flex:1; min-width:0; }
  .ort-eintrag b { display:block; font-size:.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ort-eintrag small { color:var(--text2); font-size:.78rem; }
  .schild { font-size:.68rem; font-weight:750; background:var(--akzent-hell); color:var(--akzent); padding:2px 7px; border-radius:99px; margin-left:4px; vertical-align:1px; }
  .klein-knopf { border:1px solid var(--linie); background:var(--karte); border-radius:10px; padding:6px 10px; font-size:.8rem; font-weight:600; cursor:pointer; white-space:nowrap; }
  #ort-ergebnisse button { display:block; width:100%; text-align:left; background:var(--karte); border:1px solid var(--linie);
    border-radius:12px; padding:10px 12px; margin-top:6px; color:var(--text); font-size:.92rem; cursor:pointer; }
  .ortskarte { height:240px; border-radius:16px; margin-top:12px; overflow:hidden; z-index:0; background:var(--hg); }
  .leaflet-container { font:inherit; }
  .datenschutz { display:flex; gap:8px; align-items:flex-start; font-size:.8rem; color:var(--text2); margin-top:10px; }

  /* Schalter */
  .schalter { position:relative; width:50px; height:30px; flex-shrink:0; }
  .schalter input { opacity:0; width:100%; height:100%; position:absolute; margin:0; cursor:pointer; z-index:2; }
  .schalter .bahn { position:absolute; inset:0; border-radius:15px; background:var(--leer); transition:background .2s; }
  .schalter .bahn::after { content:""; position:absolute; top:3px; left:3px; width:24px; height:24px;
    border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:left .2s cubic-bezier(.3,1.4,.5,1); }
  .schalter input:checked + .bahn { background:var(--passt); }
  .schalter input:checked + .bahn::after { left:23px; }
  .schalter-zeile { display:flex; align-items:center; gap:12px; }
  .schalter-zeile .txt { flex:1; font-weight:600; }

  /* Einstellungen */
  .seitenkopf { display:flex; align-items:center; gap:10px; color:#fff; text-shadow:0 1px 3px rgba(0,0,0,.18); margin:4px 0 14px; }
  .seitenkopf h1 { margin:0; font-size:1.6rem; letter-spacing:-.02em; flex:1; }
  .zurueck { border:0; background:var(--held); border:1px solid var(--held-linie); color:#fff; border-radius:999px; padding:8px 14px 8px 10px;
    cursor:pointer; display:flex; align-items:center; gap:4px; font-weight:650; -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); }
  .info-feld > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:1.05rem; font-weight:700; margin-bottom:10px; }
  .info-feld > summary::-webkit-details-marker { display:none; }
  .info-feld .i-kreis { width:20px; height:20px; border-radius:50%; border:1.5px solid var(--akzent); color:var(--akzent); font-size:.76rem;
    font-weight:700; font-style:italic; flex-shrink:0; display:flex; align-items:center; justify-content:center; line-height:1; }
  .info-feld[open] .i-kreis { background:var(--akzent); color:#fff; }
  .info-feld > p { margin:0 0 12px; }
  .groessen { display:flex; gap:6px; }
  .groessen button { flex:1; border:1px solid var(--linie); background:var(--karte); color:var(--text); border-radius:12px; padding:9px 4px; cursor:pointer; line-height:1.2; }
  .groessen button.an { background:var(--akzent); color:#fff; border-color:var(--akzent); }
  .groessen button .a { display:block; font-weight:700; }
  .groessen button .b { display:block; font-size:.7rem; opacity:.8; }
  .app-stand { font-size:.78rem; color:var(--text2); text-align:center; margin:6px 0 8px; font-variant-numeric:tabular-nums; }

  /* ---- Wetter ---- */
  .ort-chips { display:flex; gap:8px; overflow-x:auto; padding:2px 0 12px; scrollbar-width:none; }
  .ort-chips .chip { background:var(--held); border-color:var(--held-linie); color:#fff; white-space:nowrap;
    -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); }
  .ort-chips .chip.an { background:#fff; color:#1d6fd1; border-color:#fff; }
  .tag { background:var(--glas); border:1px solid var(--glas-linie); border-radius:18px; padding:12px 14px; margin-top:10px;
    -webkit-backdrop-filter:blur(20px) saturate(1.4); backdrop-filter:blur(20px) saturate(1.4); }
  .tag-kopf { display:flex; align-items:center; gap:8px; cursor:pointer; }
  .tag-kopf .wt { font-weight:700; min-width:58px; }
  .tag-kopf .icon { font-size:1.2rem; }
  .tag-kopf .werte { margin-left:auto; text-align:right; font-size:.8rem; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .tag-kopf .werte .min { color:var(--text2); }
  .tag-kopf .pfeil { color:var(--text2); transition:transform .15s; }
  .tag.offen .tag-kopf .pfeil { transform:rotate(90deg); }
  .details { display:none; margin-top:10px; } .tag.offen .details { display:block; }
  .stundenreihe { display:flex; gap:9px; overflow-x:auto; padding-bottom:4px; }
  .stunde { flex:0 0 auto; text-align:center; font-size:.74rem; color:var(--text2); min-width:46px; }
  .stunde .h { font-weight:700; color:var(--text); font-size:.8rem; }
  .stunde .i { font-size:1.1rem; margin:2px 0; }
  .stunde .t { color:var(--text); font-weight:650; font-size:.86rem; }
  .diagramm { margin-top:12px; }
  .diagramm .titel { font-size:.8rem; color:var(--text2); margin-bottom:2px; display:flex; justify-content:space-between; }
  .diagramm svg { width:100%; height:auto; display:block; }
  .dia-box { position:relative; touch-action:none; }
  .dia-box .xline { position:absolute; top:0; bottom:0; width:1px; background:var(--text); opacity:.4; display:none; pointer-events:none; }
  .tag.gross { padding:16px; }
  .tag.gross .tag-kopf .wt { font-size:1.15rem; }

  /* Modal (z. B. vergrößertes Diagramm) */
  .modal-hg { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:30; display:flex; align-items:center; justify-content:center; padding:18px; }

  /* Rückmeldung */
  .toast { position:fixed; left:0; right:0; margin:0 auto; width:fit-content; bottom:calc(92px + env(safe-area-inset-bottom)); transform:translateY(20px); z-index:40;
    background:rgba(15,34,56,.92); color:#fff; padding:10px 16px; border-radius:18px; font-size:.9rem; font-weight:600; line-height:1.3;
    opacity:0; transition:opacity .2s, transform .25s cubic-bezier(.3,1.4,.5,1); pointer-events:none; max-width:calc(100% - 40px); text-align:center; }
  .toast.da { opacity:1; transform:none; }

  /* ---- Erster Start ---- */
  .start { position:fixed; inset:0; z-index:35; display:flex; flex-direction:column; justify-content:flex-end; }
  body.start-modus main, body.start-modus nav { visibility:hidden; }
  /* eigener Kartenpunkt statt Bild-Stecknadel */
  .ww-marker span { display:block; width:22px; height:22px; border-radius:50%; background:var(--akzent);
    border:3px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,.35); }
  .start-karte { background:var(--blatt); border-radius:28px 28px 0 0; padding:26px 22px calc(26px + env(safe-area-inset-bottom));
    max-height:88%; overflow-y:auto; box-shadow:0 -10px 40px rgba(0,0,0,.2); animation:hochfahren .45s cubic-bezier(.2,.85,.25,1); max-width:560px; width:100%; margin:0 auto; }
  @keyframes hochfahren { from { transform:translateY(60%); opacity:0; } }
  .start-karte h2 { font-size:1.6rem; letter-spacing:-.02em; line-height:1.2; margin:0 0 8px; }
  .start-karte p { margin:0 0 16px; color:var(--text2); font-size:.98rem; }
  .schritte { display:flex; gap:6px; margin-bottom:18px; }
  .schritte i { height:4px; flex:1; border-radius:2px; background:var(--leer); }
  .schritte i.an { background:var(--akzent); }
  .start-titel { color:#fff; text-shadow:0 2px 8px rgba(0,0,0,.18); padding:0 26px; margin-bottom:auto; padding-top:calc(env(safe-area-inset-top) + 70px); }
  .start-titel .marke { font-size:2.4rem; font-weight:800; letter-spacing:-.03em; line-height:1.05; }
  .start-titel .claim { font-size:1.1rem; opacity:.95; margin-top:8px; max-width:20em; }
  .leise { border:0; background:none; color:var(--text2); cursor:pointer; padding:12px; width:100%; font-weight:600; }

${BAUSTEINE_CSS}

  @media (prefers-reduced-motion: reduce) {
    .niederschlag, .schneefall, .sterne circle, .wolkenzug, .zelle.neu, .held.feier .em, .funke,
    .reiter.sichtbar, .pz.zeile.frisch, .start-karte { animation:none !important; }
    .blatt, .blatt-hg, .toast { transition:none; }
  }
</style>
</head>
<body>
<div id="himmel"><div id="himmel-deko"></div></div>
<main>
  <!-- ===== Übersicht ===== -->
  <section id="reiter-start" class="reiter sichtbar">
    <div class="kopf">
      <button class="ort-knopf" id="ort-knopf" type="button" aria-label="Orte"></button>
      <button class="rund" type="button" data-zu-einstellungen aria-label="Einstellungen"></button>
    </div>
    <div class="jetzt" id="jetzt"></div>
    <div id="held"></div>
    <div id="nudge"></div>
    <section class="karte" id="plan-karte" style="display:none">
      <div class="plan-kopf"><h2>Diese Woche</h2><span class="momente" id="momente"></span></div>
      <div id="plan"></div>
      <div class="legende"><span><i style="background:var(--passt)"></i>passt</span><span><i style="background:var(--knapp)"></i>knapp daneben</span><span><i style="background:var(--leer)"></i>passt nicht</span></div>
    </section>
  </section>

  <!-- ===== Wetter ===== -->
  <section id="reiter-wetter" class="reiter">
    <div class="seitenkopf"><h1>Wetter</h1><button class="rund" type="button" data-zu-einstellungen aria-label="Einstellungen"></button></div>
    <div class="ort-chips" id="wetter-orte"></div>
    <p class="hinweis" id="wetter-hinweis" style="color:#fff;display:none"></p>
    <div id="wetter-tage"></div>
  </section>

  <!-- ===== Einstellungen ===== -->
  <section id="reiter-einstellungen" class="reiter">
    <div class="seitenkopf"><button class="zurueck" type="button" id="zurueck"></button><h1>Einstellungen</h1></div>
    <section class="karte">
      <details class="info-feld">
        <summary><span>Benachrichtigungen</span><span class="i-kreis" aria-hidden="true">i</span></summary>
        <p class="hinweis">An = dein Handy fragt nach Erlaubnis; danach meldet sich der Wächter, sobald ein Wunsch zutrifft.
        <b>iPhone/iPad:</b> Seite zuerst über das Teilen-Symbol „Zum Home-Bildschirm“ hinzufügen und von dort öffnen.</p>
      </details>
      <div class="schalter-zeile">
        <span class="txt">Push-Benachrichtigungen</span>
        <label class="schalter"><input type="checkbox" id="push-schalter"><span class="bahn"></span></label>
      </div>
      <div id="push-status"></div>
    </section>
    <section class="karte">
      <h2>Meine Orte</h2>
      <div class="ort-liste" id="einst-orte"></div>
    </section>
    <section class="karte">
      <h2>Bausteine</h2>
      <div class="schalter-zeile">
        <span class="txt">Erweiterte Regeln (und/oder)</span>
        <label class="schalter"><input type="checkbox" id="erweitert-schalter"><span class="bahn"></span></label>
      </div>
      <p class="hinweis" id="erweitert-erklaerung" style="margin:8px 0 0"></p>
    </section>
    <section class="karte">
      <h2>Darstellung</h2>
      <label>Schriftgröße</label>
      <div class="groessen" id="schrift-wahl"></div>
    </section>
    <section class="karte">
      <h2>Daten</h2>
      <p class="hinweis" style="margin-top:0">Alles auf diesem Gerät löschen und vom Wächter abmelden.</p>
      <button class="knopf rot" id="loeschen" type="button">Alles löschen</button>
    </section>
    <section class="karte">
      <details><summary style="cursor:pointer;font-weight:700;font-size:1.05rem">Was diese App kann</summary>
        <ul style="font-size:.88rem;padding-left:20px;margin:10px 0 0">
          <li><b>Übersicht</b> – oben das Wetter jetzt und was heute passt, darunter der Wochenplan: grün = passt, gelb = knapp daneben. Ein Tipp auf ein Feld zeigt, warum.</li>
          <li><b>Wünsche</b> – mit dem großen + aus Vorlagen wählen oder einen eigenen bauen. Ein Tipp auf den Namen öffnet ihn zum Bearbeiten.</li>
          <li><b>Ort je Wunsch</b> – bis zu 5 Orte (z. B. Zuhause, Garten); jeder Wunsch prüft das Wetter an seinem Ort.</li>
          <li><b>Bausteine</b> – Temperatur, Wind, Böen, Windrichtung, Regen, Bewölkung, Luftfeuchte und UV. Alle Bausteine müssen passen; mit „+ oder“ genügt eine von mehreren Zeilen.</li>
          <li><b>Benachrichtigung</b> – einmal am Tag oder stündlich (z. B. Sturm-Warnung). Nachrichten nennen nie einen Ort.</li>
          <li><b>Wetter</b> – 7 Tage mit Stundenwerten für jeden deiner Orte.</li>
          <li><b>Datenschutz</b> – der genaue Ort bleibt auf diesem Gerät. Zum Dienst und zum Wetteranbieter geht nur ein auf ~11 km gerundeter Wert.</li>
        </ul>
        <p class="hinweis" style="margin:8px 0 0">Kostenlos · Wetterdaten: Open-Meteo · Karte: OpenStreetMap · Ortsname: BigDataCloud</p>
      </details>
    </section>
    <p class="app-stand" id="app-stand"></p>
  </section>
</main>

<nav>
  <button class="tab aktiv" type="button" data-reiter="start" id="tab-start"></button>
  <button class="plus" type="button" id="plus" aria-label="Neuer Wunsch"></button>
  <button class="tab" type="button" data-reiter="wetter" id="tab-wetter"></button>
</nav>

<div id="blatt-ziel"></div>
<div id="modal-ziel"></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
"use strict";
var VAPID_PUBLIC = "${vapidPublic}";
var APP_STAND = "${appStand}";   // Veröffentlichungszeitpunkt dieser Fassung (leer, wenn unbekannt)

/* ---------- Symbole (Linien-Icons statt Emojis in der Bedienung) ---------- */
var IC = {
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  zahnrad: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plan: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M8 14h2M14 14h2M8 17.5h2"/>',
  wetter: '<path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M17 7l1.4-1.4"/><path d="M8.5 12.5a4 4 0 0 1 7.6-1.8A3.5 3.5 0 1 1 17 18H9a3 3 0 0 1-.5-5.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  zu: '<path d="M6 6l12 12M18 6L6 18"/>',
  links: '<path d="M15 18l-6-6 6-6"/>',
  rechts: '<path d="M9 18l6-6-6-6"/>',
  runter: '<path d="M6 9l6 6 6-6"/>',
  glocke: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  ziel: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  schloss: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
};
function ic(name) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + IC[name] + '</svg>'; }

var FENSTER_OPTIONEN = [ [24,"1 Tag"], [48,"2 Tage"], [72,"3 Tage"], [120,"5 Tage"], [168,"7 Tage"] ];
var TAGESZEITEN = [ ["Morgens", 6, 12], ["Mittags", 12, 17], ["Abends", 17, 22] ];
var DAUERN = [1, 2, 3, 4, 6];
var MAX_ORTE = 5;
var EMOJI_AUSWAHL = ["🍕","🌱","🧺","🏃","🔥","🧴","⛈️","☀️","🌤️","⛅","☁️","🌧️","❄️","🌈","💨","🌊",
  "🏖️","⛱️","🚴","🥾","🎣","⛳","🎿","🏂","🏕️","🌻","🍄","🐝","🦋","📸","🚗","✈️","🍺","☕","🧗","🏊",
  "🛶","🪁","🌙","⭐","🌡️","💧","🌪️","🌫️","🍇","🐟","🎪","🎈"];
function VB(art, min, max) {
  var t = { art: art };
  if (min !== null && min !== undefined) t.min = min;
  if (max !== null && max !== undefined) t.max = max;
  return { teile: [t] };
}
var VORLAGEN = [
  { name:"Pizza am Balkon", emoji:"🍕", nurVonUhr:11, nurBisUhr:22, mindestdauerStunden:2,
    bausteine:[ VB("temp",18,28), VB("regen",null,0),
                { teile:[{ art:"wind", max:10 }, { art:"windrichtung", sektoren:["N","NO","NW"] }] } ] },
  { name:"Pizzatag", emoji:"🍕", nurVonUhr:11, nurBisUhr:21, mindestdauerStunden:3,
    bausteine:[ VB("temp",18,28), VB("wind",null,10), VB("regen",null,0) ] },
  { name:"Pflanztag", emoji:"🌱", nurVonUhr:8, nurBisUhr:20, mindestdauerStunden:4,
    bausteine:[ VB("temp",15,24), VB("bewoelkung",30,70), VB("regen",null,0.2) ] },
  { name:"Wäschetag", emoji:"🧺", nurVonUhr:9, nurBisUhr:19, mindestdauerStunden:4,
    bausteine:[ VB("temp",15,null), VB("wind",5,30), VB("regen",null,0), VB("feuchte",null,65) ] },
  { name:"Lauf-Wetter", emoji:"🏃", nurVonUhr:6, nurBisUhr:21, mindestdauerStunden:1,
    bausteine:[ VB("temp",5,20), VB("wind",null,20), VB("regen",null,0.2) ] },
  { name:"Fahrrad-Wetter", emoji:"🚲", nurVonUhr:6, nurBisUhr:20, mindestdauerStunden:1,
    bausteine:[ VB("temp",8,28), VB("wind",null,20), VB("boe",null,35), VB("regen",null,0.1) ] },
  { name:"Sonnencreme", emoji:"🧴", nurVonUhr:9, nurBisUhr:18, mindestdauerStunden:2,
    bausteine:[ VB("uv",6,null) ] },
  { name:"Sturm-Warnung", emoji:"⛈️", nurVonUhr:0, nurBisUhr:24, mindestdauerStunden:1, haeufigkeit:"stuendlich",
    bausteine:[ { teile:[{ art:"wind", min:60 }, { art:"boe", min:90 }] } ] }
];

/* ---------- Zustand ---------- */
var SPEICHER = "wetterWaechterApp_v2";
var zustand = { orte:null, standardOrt:null, ort:null, regeln:[], aktiviert:false, willkommenGesehen:false,
                nudgeWeg:false, schrift:16, erweitert:true, gefeiert:"" };
try { var roh = localStorage.getItem(SPEICHER); if (roh) { var g = JSON.parse(roh); if (g && typeof g === "object") zustand = Object.assign(zustand, g); } } catch (e) {}
if (!Array.isArray(zustand.regeln)) zustand.regeln = [];
var regeln = zustand.regeln;             // vom Baustein-Editor erwartet
var erweitert = zustand.erweitert !== false;

/* Bisher gab es genau einen (gerundeten) Ort. Er wird zum ersten Eintrag in
   „Meine Orte“; alle Wünsche nutzen ihn, bis man etwas anderes wählt. */
function migriere() {
  if (!Array.isArray(zustand.orte)) {
    zustand.orte = [];
    if (zustand.ort && isFinite(zustand.ort.lat) && isFinite(zustand.ort.lon)) {
      zustand.orte.push({ id:"o1", name:"Zuhause", stadt:String(zustand.ort.name || ""), lat:zustand.ort.lat, lon:zustand.ort.lon });
      zustand.standardOrt = "o1";
      zustand.willkommenGesehen = true;
    }
  }
  if (!ortMitId(zustand.standardOrt) && zustand.orte.length) zustand.standardOrt = zustand.orte[0].id;
  zustand.regeln.forEach(function (r) {
    if (!Array.isArray(r.bausteine) || !r.bausteine.length) r.bausteine = bausteineAusAltForm(r.bedingungen);
    if (r.ortId && !ortMitId(r.ortId)) delete r.ortId;
  });
  speichere();
}

function speichere() {
  // Spiegel für die Demo-Seite und die bisherige Oberfläche: nur gerundet
  var s = standardOrt();
  zustand.ort = s ? { name: s.stadt || s.name, lat: grob(s.lat), lon: grob(s.lon) } : null;
  try { localStorage.setItem(SPEICHER, JSON.stringify(zustand)); } catch (e) {}
}
function $(id) { return document.getElementById(id); }
function sicher(t) { return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
/* Alles, was das Gerät verlässt, wird hierüber auf ~11 km gerundet. */
function grob(w) { return Math.round(parseFloat(w) * 10) / 10; }
function genau(w) { return Math.round(parseFloat(w) * 100000) / 100000; }
function tick() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }
var toastTimer = null;
function toast(text) {
  var t = $("toast"); t.textContent = text; t.classList.add("da");
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("da"); }, 2200);
}

/* ---------- Orte ---------- */
function ortMitId(id) { var o = null; (zustand.orte || []).forEach(function (x) { if (x.id === id) o = x; }); return o; }
function standardOrt() { return ortMitId(zustand.standardOrt) || (zustand.orte && zustand.orte[0]) || null; }
function ortVon(regel) { return ortMitId(regel.ortId) || standardOrt(); }
function neueOrtId() { var n = 1; while (ortMitId("o" + n)) n++; return "o" + n; }
function wuenscheAnOrt(id) { return zustand.regeln.filter(function (r) { return ortVon(r) && ortVon(r).id === id; }).length; }
function mehrereOrte() {
  var ids = {}; zustand.regeln.forEach(function (r) { var o = ortVon(r); if (o) ids[o.id] = 1; });
  return Object.keys(ids).length > 1;
}
/* Regeln so, wie der Dienst sie bekommt: mit dem gerundeten Ort des Wunsches */
function regelnFuerDienst() {
  return zustand.regeln.map(function (r) {
    var o = ortVon(r), kopie = JSON.parse(JSON.stringify(r));
    delete kopie.ortId;
    if (o) { kopie.lat = grob(o.lat); kopie.lon = grob(o.lon); }
    return kopie;
  });
}

/* ---------- Schrift + App-Stand ---------- */
var SCHRIFTGROESSEN = [[15, "Klein"], [16, "Normal"], [18, "Groß"], [21, "Sehr groß"]];
function wendeSchriftAn() {
  var px = Number(zustand.schrift);
  if (!SCHRIFTGROESSEN.some(function (g) { return g[0] === px; })) px = 16;
  document.documentElement.style.fontSize = px + "px";
}
wendeSchriftAn();
function zeichneSchriftwahl() {
  var ziel = $("schrift-wahl"); ziel.innerHTML = "";
  SCHRIFTGROESSEN.forEach(function (g) {
    var knopf = document.createElement("button"); knopf.type = "button";
    if (Number(zustand.schrift) === g[0]) knopf.className = "an";
    knopf.innerHTML = '<span class="a" style="font-size:' + g[0] + 'px">Aa</span><span class="b">' + g[1] + '</span>';
    knopf.addEventListener("click", function () { zustand.schrift = g[0]; speichere(); wendeSchriftAn(); zeichneSchriftwahl(); });
    ziel.appendChild(knopf);
  });
}
function zeichneAppStand() {
  var d = APP_STAND ? new Date(APP_STAND) : null;
  $("app-stand").textContent = (!d || isNaN(d.getTime())) ? "App-Stand: unbekannt"
    : "App-Stand: " + d.toLocaleString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) + " Uhr";
}

/* ---------- Reiter ---------- */
var reiterVorher = "start";
function zeigeReiter(name) {
  var aktuell = document.querySelector(".reiter.sichtbar");
  if (aktuell && aktuell.id !== "reiter-einstellungen") reiterVorher = aktuell.id.replace("reiter-", "");
  Array.prototype.forEach.call(document.querySelectorAll(".reiter"), function (r) { r.classList.remove("sichtbar"); });
  $("reiter-" + name).classList.add("sichtbar");
  Array.prototype.forEach.call(document.querySelectorAll("nav .tab"), function (k) { k.classList.toggle("aktiv", k.dataset.reiter === name); });
  if (name === "wetter") zeichneWetterReiter();
  if (name === "einstellungen") zeichneEinstellungen();
  window.scrollTo(0, 0);
}
Array.prototype.forEach.call(document.querySelectorAll("nav .tab"), function (k) {
  k.addEventListener("click", function () { zeigeReiter(k.dataset.reiter); });
});
Array.prototype.forEach.call(document.querySelectorAll("[data-zu-einstellungen]"), function (k) {
  k.innerHTML = ic("zahnrad"); k.addEventListener("click", function () { zeigeReiter("einstellungen"); });
});
$("tab-start").innerHTML = ic("plan") + "Übersicht";
$("tab-wetter").innerHTML = ic("wetter") + "Wetter";
$("plus").innerHTML = ic("plus");
$("plus").addEventListener("click", function () { tick(); oeffneNeuerWunsch(); });
$("zurueck").innerHTML = ic("links") + "Zurück";
$("zurueck").addEventListener("click", function () { zeigeReiter(reiterVorher); });

/* ---------- Himmel-Hintergrund + Tag/Nacht nach Sonnenauf-/-untergang ---------- */
/* Daten des Standard-Orts: bestimmen Himmel, „Wetter jetzt“ und Übersicht */
var hStunden = null, hSonne = null, hVersatz = 0, hTage = [];
var letzteTreffer = null, letzteKnapp = null, letzteStand = null;
function zeitZuMinuten(iso) { return parseInt(iso.slice(11, 13), 10) * 60 + parseInt(iso.slice(14, 16), 10); }
function lokalJetzt() { return new Date(Date.now() + (hVersatz || 0) * 1000); }
function heuteIso() { return lokalJetzt().toISOString().slice(0, 10); }
function stundeIndex(stunden, lokal) {
  if (!stunden) return null;
  var p = lokal.toISOString().slice(0, 13);
  for (var i = 0; i < stunden.time.length; i++) if (stunden.time[i].slice(0, 13) === p) return i;
  return null;
}
function wetterArt(code) {
  if (code === null || code === undefined) return "klar";
  if (code >= 95) return "gewitter";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "schnee";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "regen";
  if (code === 45 || code === 48) return "nebel";
  if (code === 3) return "wolkig";
  if (code >= 1) return "leicht";
  return "klar";
}
var HIMMEL_FARBEN = {
  tag: { klar:["#3d8fe6","#77b5f0","#cfe6fb"], leicht:["#4a93e0","#86bbee","#d3e7f8"],
         wolkig:["#7f9bb8","#a9bdd1","#d5e0ea"], nebel:["#8e9dab","#b9c4ce","#dfe4e9"],
         regen:["#5f7590","#8aa0b6","#b6c5d3"], gewitter:["#434f63","#65748a","#929fb0"],
         schnee:["#8aa0b8","#bccad8","#e6ecf2"] },
  daemmerung: { klar:["#ff9e6d","#ef8fa3","#6f6fa6"], leicht:["#fb9d75","#e78fa4","#6d6ea6"],
         wolkig:["#d99177","#b98c9c","#66688c"], nebel:["#c6a094","#b0a0a8","#6c7089"],
         regen:["#a8846f","#95818f","#5c6180"], gewitter:["#8a6c62","#7a6c7c","#4e5470"],
         schnee:["#c49a8c","#ada0ac","#6a6d8c"] },
  nacht: { klar:["#0b1a38","#152744","#1e3357"], leicht:["#0b1a38","#152744","#1e3357"],
         wolkig:["#0d1626","#182338","#26344c"], nebel:["#111a26","#1c2734","#2b3644"],
         regen:["#0a1220","#141d2e","#212c40"], gewitter:["#080e19","#111827","#1c2637"],
         schnee:["#0c1524","#182234","#28334a"] }
};
var WOLKEN_FARBEN = {
  tag: { klar:["#ffffff",".85"], leicht:["#ffffff",".88"], wolkig:["#e4ebf2",".95"], nebel:["#dde4ea",".85"],
         regen:["#9fb0c0",".95"], gewitter:["#6b7a8c",".95"], schnee:["#d3dde6",".95"] },
  daemmerung: { klar:["#ffe0cc",".85"], leicht:["#ffe0cc",".88"], wolkig:["#e5cbc2",".92"], nebel:["#dbc9c3",".85"],
         regen:["#9e8b90",".95"], gewitter:["#6f6169",".95"], schnee:["#d6c8cb",".92"] },
  nacht: { klar:["#26364e",".9"], leicht:["#26364e",".9"], wolkig:["#243254",".95"], nebel:["#2c3a4c",".85"],
         regen:["#1b2739",".95"], gewitter:["#131b29",".97"], schnee:["#2d3d57",".95"] }
};
function himmelPhase() {
  var lokal = lokalJetzt();
  var nowMin = lokal.getUTCHours() * 60 + lokal.getUTCMinutes();
  var srMin = 7 * 60, ssMin = 20 * 60;
  if (hSonne && hSonne.sunrise && hSonne.sunset && hSonne.sunrise.length) {
    var heute = lokal.toISOString().slice(0, 10), i = 0;
    for (var k = 0; k < hSonne.sunrise.length; k++) if (hSonne.sunrise[k].slice(0, 10) === heute) { i = k; break; }
    srMin = zeitZuMinuten(hSonne.sunrise[i]); ssMin = zeitZuMinuten(hSonne.sunset[i]);
  }
  var d = 35, phase;
  if (nowMin < srMin - d || nowMin > ssMin + d) phase = "nacht";
  else if (Math.abs(nowMin - srMin) <= d || Math.abs(nowMin - ssMin) <= d) phase = "daemmerung";
  else phase = "tag";
  var wetter = "klar";
  if (hStunden && hStunden.weather_code) {
    var idx = stundeIndex(hStunden, lokal);
    if (idx !== null) wetter = wetterArt(hStunden.weather_code[idx]);
  }
  return { phase: phase, wetter: wetter, nacht: phase === "nacht" };
}
function himmelVerlauf(z) {
  var f = HIMMEL_FARBEN[z.phase][z.wetter];
  return "linear-gradient(180deg," + f[0] + " 0%," + f[1] + " 50%," + f[2] + " 100%)";
}
function svgWolke(x, y, s) {
  return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">'
    + '<ellipse cx="0" cy="0" rx="10" ry="6.2"/><ellipse cx="-7.6" cy="2.2" rx="8" ry="5"/>'
    + '<ellipse cx="8.4" cy="2.6" rx="7.2" ry="4.4"/><rect x="-15" y="1.4" width="30" height="5.4" rx="2.7"/></g>';
}
function svgWolken(z, gross) {
  var f = WOLKEN_FARBEN[z.phase][z.wetter], teile;
  if (gross === 1) teile = [[30, 46, 0.8]];
  else if (gross === 2) teile = [[24, 40, 1.05], [71, 70, 0.8], [46, 14, 0.62]];
  else teile = [[27, 42, 1.2], [73, 74, 0.92], [48, 14, 0.72]];
  var s = '<g class="wolkenzug" fill="' + f[0] + '" opacity="' + f[1] + '" filter="url(#weich)">';
  for (var i = 0; i < teile.length; i++) s += svgWolke(teile[i][0], teile[i][1], teile[i][2]);
  return s + '</g>';
}
function svgRegenKachel() {
  var s = "";
  for (var i = 0; i < 14; i++) {
    var x = (i * 27.7) % 100, y = (i * 5.3) % 12;
    s += '<line x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (x - 0.9).toFixed(1) + '" y2="' + (y + 3.2).toFixed(1) + '"/>';
  }
  return s;
}
function svgSchneeKachel() {
  var s = "";
  for (var i = 0; i < 16; i++) {
    var x = (i * 23.9) % 100, y = (i * 4.7) % 12;
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.4 + (i % 3) * 0.14).toFixed(2) + '"/>';
  }
  return s;
}
function svgNiederschlag(art, nacht) {
  var kachel = art === "schnee" ? svgSchneeKachel() : svgRegenKachel();
  var inhalt = "";
  for (var y = -12; y < 232; y += 12) inhalt += '<g transform="translate(0,' + y + ')">' + kachel + '</g>';
  var gruppe = art === "schnee"
    ? '<g class="schneefall" fill="' + (nacht ? "#cfdcec" : "#ffffff") + '" opacity="' + (nacht ? ".5" : ".75") + '">' + inhalt + '</g>'
    : '<g class="niederschlag" stroke="' + (nacht ? "#8fa6c0" : "#eef4fa") + '" stroke-width=".45" stroke-linecap="round"'
      + ' opacity="' + (nacht ? ".5" : ".6") + '">' + inhalt + '</g>';
  return '<svg viewBox="0 0 100 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + gruppe + '</svg>';
}
function svgSterne() {
  var s = '<g class="sterne" fill="#ffffff">';
  for (var i = 0; i < 44; i++) {
    var x = (i * 29.7 + 3) % 100, y = (i * 13.7) % 96;
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.22 + (i % 4) * 0.08).toFixed(2)
      + '" opacity="' + (0.3 + (i % 5) * 0.12).toFixed(2) + '" style="animation-delay:' + ((i % 7) * 0.55).toFixed(2) + 's"></circle>';
  }
  return s + '</g>';
}
function svgSonne(cx, cy, r, mitte, kranz) {
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#sonnenschein)"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + kranz + '" fill="' + mitte + '" opacity=".97"/>';
}
function svgMond() {
  return '<circle cx="75" cy="20" r="16" fill="url(#mondschein)"/>'
    + '<rect width="100" height="130" fill="#eef4ff" mask="url(#mondmaske)"/>';
}
function himmelDeko(z) {
  var w = z.wetter, offen = (w === "klar" || w === "leicht"), teile = "";
  var warm = z.phase === "daemmerung";
  var farben = warm
    ? '<stop offset="0" stop-color="#fff1d6" stop-opacity=".78"/><stop offset=".35" stop-color="#ffc98a" stop-opacity=".42"/><stop offset="1" stop-color="#ff9e6d" stop-opacity="0"/>'
    : '<stop offset="0" stop-color="#fffbe8" stop-opacity=".62"/><stop offset=".35" stop-color="#ffeaa0" stop-opacity=".3"/><stop offset="1" stop-color="#ffd979" stop-opacity="0"/>';
  var defs = '<defs><radialGradient id="sonnenschein">' + farben + '</radialGradient>'
    + '<radialGradient id="mondschein"><stop offset="0" stop-color="#dce8ff" stop-opacity=".26"/>'
    + '<stop offset=".45" stop-color="#cfdcf5" stop-opacity=".12"/>'
    + '<stop offset="1" stop-color="#dce8ff" stop-opacity="0"/></radialGradient>'
    + '<mask id="mondmaske"><rect width="100" height="130" fill="#000"/>'
    + '<circle cx="75" cy="20" r="7" fill="#fff"/><circle cx="71.2" cy="17.2" r="6.2" fill="#000"/></mask>'
    + '<filter id="weich" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation=".6"/></filter></defs>';
  if (z.nacht) { if (offen) teile += svgSterne() + svgMond(); }
  else if (warm) { teile += svgSonne(74, 68, 38, "#ffdba0", 7.5); }
  else if (offen) { teile += svgSonne(79, 17, 34, "#fffcea", 6.4); }
  else if (w === "wolkig" || w === "nebel") { teile += '<g opacity=".4">' + svgSonne(79, 17, 30, "#fff8dc", 5.6) + '</g>'; }
  if (w === "leicht") teile += svgWolken(z, 1);
  else if (w === "wolkig" || w === "nebel") teile += svgWolken(z, 2);
  else if (w !== "klar") teile += svgWolken(z, 3);
  var himmelskoerper = '<svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMin meet" aria-hidden="true">' + defs + teile + '</svg>';
  var nass = "";
  if (w === "regen" || w === "gewitter") nass = svgNiederschlag("regen", z.nacht);
  else if (w === "schnee") nass = svgNiederschlag("schnee", z.nacht);
  return { schluessel: z.phase + "|" + w, svg: himmelskoerper + nass };
}
function setzeHintergrund() {
  var z = himmelPhase();
  document.documentElement.dataset.theme = z.nacht ? "dark" : "light";
  $("himmel").style.background = himmelVerlauf(z);
  var deko = $("himmel-deko"), neu = himmelDeko(z);
  if (deko.dataset.stand !== neu.schluessel) { deko.dataset.stand = neu.schluessel; deko.innerHTML = neu.svg; }
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", HIMMEL_FARBEN[z.phase][z.wetter][0]);
}
function wetterIcon(code) {
  if (code === 0) return "☀️"; if (code === 1 || code === 2) return "🌤️"; if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️"; if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️"; if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️"; if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️"; return "🌡️";
}
var LAGE_TEXT = { klar:"Klar", leicht:"Leicht bewölkt", wolkig:"Bewölkt", nebel:"Neblig", regen:"Regen", gewitter:"Gewitter", schnee:"Schnee" };

/* ---------- Übersicht ---------- */
var TAGKURZ = ["So","Mo","Di","Mi","Do","Fr","Sa"];
var TAGLANG = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
function plusTage(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function wochentag(iso) { return new Date(iso + "T12:00:00Z").getUTCDay(); }
function tagWort(iso) {
  var h = heuteIso();
  if (iso === h) return "Heute"; if (iso === plusTage(h, 1)) return "Morgen"; if (iso === plusTage(h, 2)) return "Übermorgen";
  return TAGLANG[wochentag(iso)];
}
function zeichneKopf() {
  var s = standardOrt();
  $("ort-knopf").innerHTML = ic("pin") + (s
    ? '<span class="nam">' + sicher(s.name) + '</span>' + (s.stadt && s.stadt !== s.name ? '<span class="stadt">· ' + sicher(s.stadt) + '</span>' : "")
    : '<span class="nam">Ort wählen</span>') + ic("runter");
  var j = $("jetzt");
  var idx = stundeIndex(hStunden, lokalJetzt());
  if (!hStunden || idx === null) { j.innerHTML = s ? '<div class="lage">Lade Wetter …</div>' : ""; return; }
  var heute = null; hTage.forEach(function (t) { if (t.datum === heuteIso()) heute = t; });
  var z = himmelPhase(), lage = LAGE_TEXT[z.wetter];
  if (z.wetter === "klar" && !z.nacht) lage = "Sonnig";
  j.innerHTML = '<div class="grad">' + Math.round(hStunden.temperature_2m[idx]) + '°</div>'
    + '<div class="lage">' + lage + (heute ? " · " + heute.tempMin + "° bis " + heute.tempMax + "°" : "") + '</div>';
}
$("ort-knopf").addEventListener("click", function () { if (standardOrt()) oeffneOrteListe(); else oeffneOrtBlatt(null); });

function trefferAm(i, datum) {
  var st = letzteStand && letzteStand[i]; if (!st) return null;
  for (var k = 0; k < st.length; k++) if (st[k].datum === datum) return st[k];
  return null;
}
/* Zustand eines Feldes im Wochenplan */
function zellZustand(regel, i, datum, nr) {
  if (!regel.aktiv) return "aus";
  if (!letzteStand) return "laedt";
  var e = trefferAm(i, datum);
  if (e && e.treffer) return "ja";
  if (e && e.knapp) return istKnapp(e.knapp) ? "fast" : "nein";
  return nr * 24 < (regel.zeitfensterStunden || 48) ? "vorbei" : "aus";
}
function zellText(regel, i, datum, art) {
  var e = trefferAm(i, datum), wann = "<b>" + tagWort(datum) + "</b> · ";
  if (art === "ja") return wann + e.von + "–" + e.bis + " Uhr passt alles, ca. " + e.temp + " °C";
  if (art === "fast" || art === "nein") return wann + grundKurz(e.knapp) + (e.knapp.uhr != null ? " (am ehesten um " + e.knapp.uhr + " Uhr)" : "");
  if (art === "vorbei") return wann + "heute keine passende Stunde mehr";
  if (!regel.aktiv) return wann + "Wunsch ist ausgeschaltet";
  return wann + "liegt außerhalb des Vorschau-Fensters (" + fensterText(regel.zeitfensterStunden || 48) + ")";
}
function fensterText(h) { for (var k = 0; k < FENSTER_OPTIONEN.length; k++) if (FENSTER_OPTIONEN[k][0] === h) return FENSTER_OPTIONEN[k][1]; return h + " Std."; }

var geoeffneteZelle = null, planAnimiert = false, frischeRegel = null;
function zeichnePlan() {
  var karte = $("plan-karte"), ziel = $("plan");
  if (!zustand.regeln.length || !standardOrt()) { karte.style.display = "none"; return; }
  karte.style.display = "";
  var h = heuteIso(), tage = [];
  for (var n = 0; n < 7; n++) tage.push(plusTage(h, n));
  var animieren = letzteStand && !planAnimiert;
  var html = '<div class="pz tage-reihe">' + tage.map(function (d, n) {
    return '<span class="' + (n === 0 ? "heute" : "") + '">' + (n === 0 ? "Heute" : TAGKURZ[wochentag(d)]) + '</span>';
  }).join("") + '</div>';
  var momente = 0, zelle = 0, zeigeOrt = mehrereOrte();
  zustand.regeln.forEach(function (regel, i) {
    var o = ortVon(regel);
    html += '<div class="pz zeile' + (regel.aktiv ? "" : " inaktiv") + (frischeRegel === i ? " frisch" : "") + '">'
      + '<button class="wname" type="button" data-oeffne="' + i + '"><span class="em">' + sicher(regel.emoji) + '</span>'
      + '<span class="t">' + sicher(regel.name) + '</span>'
      + (regel.aktiv ? (zeigeOrt && o ? "<small>· " + sicher(o.name) + "</small>" : "") : "<small>· aus</small>")
      + '<span class="mehr">' + ic("rechts") + '</span></button>';
    tage.forEach(function (d, n) {
      var art = zellZustand(regel, i, d, n);
      if (art === "ja") momente++;
      var gewaehlt = geoeffneteZelle && geoeffneteZelle.i === i && geoeffneteZelle.d === d;
      html += '<button class="zelle ' + art + (animieren ? " neu" : "") + (gewaehlt ? " gewaehlt" : "") + '" type="button" style="--i:' + (zelle++) + '"'
        + ' data-zelle="' + i + '|' + d + '|' + n + '" aria-label="' + sicher(regel.name) + ", " + TAGLANG[wochentag(d)] + ": "
        + ({ ja:"passt", fast:"knapp daneben", nein:"passt nicht", vorbei:"vorbei", aus:"nicht geprüft", laedt:"wird geprüft" })[art] + '"></button>';
    });
    if (geoeffneteZelle && geoeffneteZelle.i === i) {
      html += '<div class="zell-info">' + zellText(regel, i, geoeffneteZelle.d, zellZustand(regel, i, geoeffneteZelle.d, geoeffneteZelle.n)) + '</div>';
    }
    html += '</div>';
  });
  ziel.innerHTML = html;
  if (animieren) planAnimiert = true;
  frischeRegel = null;
  $("momente").innerHTML = letzteStand ? "<b>" + momente + "</b> " + (momente === 1 ? "guter Moment" : "gute Momente") : "";
  Array.prototype.forEach.call(ziel.querySelectorAll("[data-oeffne]"), function (b) {
    b.addEventListener("click", function () { oeffneEditor(parseInt(b.dataset.oeffne, 10)); });
  });
  Array.prototype.forEach.call(ziel.querySelectorAll("[data-zelle]"), function (b) {
    b.addEventListener("click", function () {
      var t = b.dataset.zelle.split("|"), i = parseInt(t[0], 10);
      if (geoeffneteZelle && geoeffneteZelle.i === i && geoeffneteZelle.d === t[1]) geoeffneteZelle = null;
      else geoeffneteZelle = { i: i, d: t[1], n: parseInt(t[2], 10) };
      tick(); zeichnePlan();
    });
  });
}

/* „Heute passt's“ – die eine Antwort, die man beim Öffnen sucht */
function zeichneHeld() {
  var ziel = $("held");
  if (!standardOrt()) {
    ziel.innerHTML = '<div class="held"><div class="txt"><b>Wo soll ich nach dem Wetter schauen?</b>'
      + '<button class="knopf" type="button" id="held-ort">' + ic("pin") + 'Ort wählen</button></div></div>';
    $("held-ort").addEventListener("click", function () { oeffneOrtBlatt(null); });
    return;
  }
  if (!zustand.regeln.length) {
    ziel.innerHTML = '<div class="held"><div class="txt"><b>Was wünschst du dir vom Wetter?</b>'
      + '<span class="sub">Ich sage dir Bescheid, sobald es passt.</span><br>'
      + '<button class="knopf" type="button" id="held-neu">' + ic("plus") + 'Ersten Wunsch anlegen</button></div></div>';
    $("held-neu").addEventListener("click", oeffneNeuerWunsch);
    return;
  }
  if (!letzteStand) { ziel.innerHTML = '<div class="held"><div class="txt"><b>Ich schaue nach …</b><span class="sub">Gleich weißt du, wann es passt.</span></div></div>'; return; }
  var h = heuteIso(), heute = [], naechste = null, knappste = null;
  zustand.regeln.forEach(function (r, i) {
    if (!r.aktiv) return;
    (letzteStand[i] || []).forEach(function (e) {
      if (e.treffer && e.datum === h) heute.push({ r: r, e: e });
      if (e.treffer && (!naechste || e.datum < naechste.e.datum)) naechste = { r: r, e: e };
      if (e.knapp && istKnapp(e.knapp) && !knappste) knappste = { r: r, e: e };
    });
  });
  var em, titel, sub, feiern = false;
  if (heute.length) {
    em = heute[0].r.emoji; feiern = true;
    titel = "Heute passt's: " + heute[0].r.name;
    sub = heute[0].e.von + "–" + heute[0].e.bis + " Uhr · " + heute[0].e.temp + " °C"
      + (heute.length > 1 ? " · +" + (heute.length - 1) + (heute.length === 2 ? " weiterer" : " weitere") : "");
  } else if (naechste) {
    em = naechste.r.emoji; titel = "Als Nächstes: " + naechste.r.name;
    sub = tagWort(naechste.e.datum) + ", " + naechste.e.von + "–" + naechste.e.bis + " Uhr · " + naechste.e.temp + " °C";
  } else if (knappste) {
    em = knappste.r.emoji; titel = "Gerade passt nichts – aber knapp";
    sub = knappste.r.name + " am " + TAGLANG[wochentag(knappste.e.datum)] + ": " + grundKurz(knappste.e.knapp);
  } else {
    em = "🔭"; titel = "Gerade passt nichts"; sub = "Ich halte weiter Ausschau und melde mich.";
  }
  ziel.innerHTML = '<div class="held' + (feiern ? " feier-bereit" : "") + '"><span class="em">' + sicher(em) + '</span>'
    + '<div class="txt"><b>' + sicher(titel) + '</b><span class="sub">' + sicher(sub) + '</span></div></div>';
  // Einmal am Tag gibt es eine kleine Feier, wenn ein Wunsch heute wahr wird
  if (feiern && zustand.gefeiert !== h) { zustand.gefeiert = h; speichere(); feiere(ziel.firstChild); }
}
function feiere(el) {
  if (!el) return;
  el.classList.add("feier");
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var farben = ["#ffd54a", "#ff8a65", "#7ee0a6", "#8cc8ff", "#ffffff"];
  for (var k = 0; k < 14; k++) {
    var f = document.createElement("span"); f.className = "funke";
    var w = (k / 14) * Math.PI * 2, r = 46 + (k % 3) * 18;
    f.style.setProperty("--x", Math.round(Math.cos(w) * r) + "px");
    f.style.setProperty("--y", Math.round(Math.sin(w) * r * 0.7) + "px");
    f.style.background = farben[k % farben.length];
    f.style.animationDelay = (k % 4) * 40 + "ms";
    el.appendChild(f);
  }
  tick();
}

function zeichneNudge() {
  var ziel = $("nudge");
  var bereit = standardOrt() && zustand.regeln.some(function (r) { return r.aktiv; });
  if (!bereit || zustand.aktiviert || zustand.nudgeWeg) { ziel.innerHTML = ""; return; }
  ziel.innerHTML = '<div class="karte nudge"><span class="ic-kreis">' + ic("glocke") + '</span>'
    + '<span class="txt">Bescheid sagen, wenn es passt?</span>'
    + '<button class="knopf" type="button" id="nudge-an" style="padding:9px 14px">Ja</button>'
    + '<button class="weg" type="button" id="nudge-weg" aria-label="Später">' + ic("zu") + '</button></div>';
  $("nudge-an").addEventListener("click", function () { $("push-schalter").checked = true; benachrichtigungAn(); });
  $("nudge-weg").addEventListener("click", function () { zustand.nudgeWeg = true; speichere(); zeichneNudge(); });
}

function zeichneUebersicht() { zeichneKopf(); zeichneHeld(); zeichneNudge(); zeichnePlan(); }

/* ---------- Blatt von unten (Bearbeiten, Auswahl, Orte) ---------- */
var blatt = null;   // { el, hg, inhalt, beimSchliessen }
function oeffneBlatt(titel, beimSchliessen) {
  schliesseBlatt(true);
  var hg = document.createElement("div"); hg.className = "blatt-hg";
  var el = document.createElement("div"); el.className = "blatt"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = '<div class="blatt-kopf"><div class="griffleiste"></div><div class="zeile1"><h3></h3>'
    + '<button class="zu" type="button" aria-label="Schließen">' + ic("zu") + '</button></div></div><div class="rollbereich"></div>';
  el.querySelector("h3").innerHTML = titel || "";
  $("blatt-ziel").appendChild(hg); $("blatt-ziel").appendChild(el);
  blatt = { el: el, hg: hg, inhalt: el.querySelector(".rollbereich"), beimSchliessen: beimSchliessen };
  hg.addEventListener("click", function () { schliesseBlatt(); });
  el.querySelector(".zu").addEventListener("click", function () { schliesseBlatt(); });
  // Nach unten ziehen am Kopf schließt das Blatt
  var kopf = el.querySelector(".blatt-kopf"), startY = null, dy = 0;
  kopf.addEventListener("pointerdown", function (e) { if (e.target.closest("button")) return; startY = e.clientY; dy = 0; el.style.transition = "none"; kopf.setPointerCapture(e.pointerId); });
  kopf.addEventListener("pointermove", function (e) { if (startY === null) return; dy = Math.max(0, e.clientY - startY); el.style.transform = "translateY(" + dy + "px)"; });
  var los = function () { if (startY === null) return; startY = null; el.style.transition = ""; el.style.transform = ""; if (dy > 90) schliesseBlatt(); };
  kopf.addEventListener("pointerup", los); kopf.addEventListener("pointercancel", los);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(function () { requestAnimationFrame(function () { hg.classList.add("offen"); el.classList.add("offen"); }); });
  return blatt.inhalt;
}
function schliesseBlatt(sofort) {
  if (!blatt) return;
  var b = blatt; blatt = null; editorIndex = null;
  if (b.beimSchliessen) b.beimSchliessen();
  document.body.style.overflow = "";
  if (sofort) { b.el.remove(); b.hg.remove(); return; }
  b.el.classList.remove("offen"); b.hg.classList.remove("offen");
  setTimeout(function () { b.el.remove(); b.hg.remove(); }, 320);
}
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && blatt && !document.getElementById("zieh-geist")) schliesseBlatt(); });

/* ---------- Neuer Wunsch ---------- */
function trennbar(name) { return name.replace(/\\B(tag|creme|wetter|warnung)\\b/gi, "&shy;$1"); }
function vorlageZuRegel(v) {
  return { name:v.name, emoji:v.emoji, aktiv:true, zeitfensterStunden:168,
    nurVonUhr:v.nurVonUhr, nurBisUhr:v.nurBisUhr, mindestdauerStunden:v.mindestdauerStunden,
    haeufigkeit:v.haeufigkeit || "taeglich", ortId: zustand.standardOrt,
    bausteine:JSON.parse(JSON.stringify(v.bausteine)), bedingungen:{} };
}
function oeffneNeuerWunsch() {
  if (!standardOrt()) { oeffneOrtBlatt(null); return; }
  var ziel = oeffneBlatt("Neuer Wunsch");
  var gitter = document.createElement("div"); gitter.className = "vorlagen";
  VORLAGEN.forEach(function (v) {
    var b = document.createElement("button"); b.type = "button";
    b.innerHTML = '<span class="v-emoji">' + sicher(v.emoji) + '</span><span class="v-name">' + trennbar(sicher(v.name)) + '</span>';
    b.disabled = zustand.regeln.some(function (r) { return r.name === v.name; });
    b.addEventListener("click", function () { legeWunschAn(vorlageZuRegel(v)); });
    gitter.appendChild(b);
  });
  var eigene = document.createElement("button"); eigene.type = "button"; eigene.className = "eigene"; eigene.textContent = "+ Eigener Wunsch";
  eigene.addEventListener("click", function () { zeigeEigenenWunsch(ziel); });
  gitter.appendChild(eigene);
  ziel.appendChild(gitter);
}
function zeigeEigenenWunsch(ziel) {
  var gewaehlt = "⭐";
  ziel.innerHTML = '<label>Name</label><input type="text" id="ew-name" placeholder="z. B. Grillabend" maxlength="40">'
    + '<div class="abschnitt">Symbol</div><div class="emoji-gitter" id="ew-gitter">'
    + EMOJI_AUSWAHL.map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join("") + '</div>'
    + '<button class="knopf breit gross" type="button" id="ew-ok" style="margin-top:18px">Weiter</button>';
  function markiere() { Array.prototype.forEach.call(ziel.querySelectorAll("#ew-gitter button"), function (b) { b.classList.toggle("an", b.dataset.e === gewaehlt); }); }
  markiere();
  Array.prototype.forEach.call(ziel.querySelectorAll("#ew-gitter button"), function (b) {
    b.addEventListener("click", function () { gewaehlt = b.dataset.e; markiere(); tick(); });
  });
  blatt.el.querySelector("h3").textContent = "Eigener Wunsch";
  $("ew-name").focus();
  $("ew-ok").addEventListener("click", function () {
    legeWunschAn({ name:($("ew-name").value || "").trim() || "Mein Wunsch", emoji:gewaehlt, aktiv:true, zeitfensterStunden:168,
      nurVonUhr:8, nurBisUhr:22, mindestdauerStunden:2, haeufigkeit:"taeglich", ortId: zustand.standardOrt, bedingungen:{},
      bausteine:[{ teile:[{ art:"temp", min:15, max:25 }] }] });
  });
}
function legeWunschAn(regel) {
  zustand.regeln.push(regel); speichere();
  var i = zustand.regeln.length - 1;
  frischeRegel = i; tick();
  toast(regel.emoji + " " + regel.name + " angelegt");
  zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv();
  oeffneEditor(i);
}

/* ---------- Wunsch bearbeiten ---------- */
var editorIndex = null, emojiOffen = false;
function oeffneEditor(i) {
  var regel = zustand.regeln[i]; if (!regel) return;
  emojiOffen = false;
  oeffneBlatt("", function () { zeichneUebersicht(); });
  editorIndex = i;
  baueEditor();
}
function baueEditor() {
  if (!blatt || editorIndex === null) return;
  var i = editorIndex, regel = zustand.regeln[i], ziel = blatt.inhalt, scroll = ziel.scrollTop;
  ziel.innerHTML = "";
  var huelle = document.createElement("div"); huelle.className = "regel"; huelle.dataset.regelkarte = i;

  // Kopf: Symbol, Name, an/aus
  var kopf = document.createElement("div"); kopf.className = "ed-kopf";
  kopf.innerHTML = '<button class="ed-emoji" type="button" aria-label="Symbol ändern">' + sicher(regel.emoji) + '</button>'
    + '<input type="text" class="ed-name" maxlength="40" value="' + sicher(regel.name) + '" aria-label="Name">'
    + '<label class="schalter" title="Wunsch an/aus"><input type="checkbox" ' + (regel.aktiv ? "checked" : "") + '><span class="bahn"></span></label>';
  kopf.querySelector(".ed-emoji").addEventListener("click", function () { emojiOffen = !emojiOffen; baueEditor(); });
  kopf.querySelector(".ed-name").addEventListener("change", function () {
    regel.name = this.value.trim() || "Mein Wunsch"; speichere(); zeichneUebersicht(); syncWennAktiv();
  });
  kopf.querySelector(".schalter input").addEventListener("change", function () {
    regel.aktiv = this.checked; tick(); speichere(); zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
    toast(regel.aktiv ? "Wunsch ist an" : "Wunsch ist aus");
  });
  huelle.appendChild(kopf);
  if (emojiOffen) {
    var eg = document.createElement("div"); eg.className = "emoji-gitter";
    eg.innerHTML = EMOJI_AUSWAHL.map(function (e) { return '<button type="button" data-e="' + e + '" class="' + (e === regel.emoji ? "an" : "") + '">' + e + '</button>'; }).join("");
    Array.prototype.forEach.call(eg.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () { regel.emoji = b.dataset.e; emojiOffen = false; tick(); speichere(); zeichneUebersicht(); syncWennAktiv(); baueEditor(); });
    });
    huelle.appendChild(eg);
  }

  // Diese Woche
  abschnitt(huelle, "Diese Woche");
  var woche = document.createElement("div"); woche.id = "ed-woche"; woche.innerHTML = wocheHtml(i);
  huelle.appendChild(woche);

  // Wo?
  abschnitt(huelle, "Wo?");
  var wo = document.createElement("div"); wo.className = "wahl";
  var aktuellerOrt = ortVon(regel);
  zustand.orte.forEach(function (o) {
    wo.appendChild(chip(o.name, aktuellerOrt && aktuellerOrt.id === o.id, function () {
      regel.ortId = o.id; speichere(); zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
    }));
  });
  if (zustand.orte.length < MAX_ORTE) {
    var neu = chip("+ Neuer Ort", false, function () { oeffneOrtBlatt(null, i); });
    neu.classList.add("neu-ort"); wo.appendChild(neu);
  }
  huelle.appendChild(wo);

  // Wann?
  abschnitt(huelle, "Wann?");
  var von = regel.nurVonUhr != null ? regel.nurVonUhr : 0, bis = regel.nurBisUhr != null ? regel.nurBisUhr : 24;
  var wann = document.createElement("div"); wann.className = "wahl";
  TAGESZEITEN.forEach(function (tz, k) {
    var an = von <= tz[1] && bis >= tz[2];
    wann.appendChild(chip(tz[0], an && !(von === 0 && bis === 24), function () {
      var gewaehlt = TAGESZEITEN.map(function (x) { return von <= x[1] && bis >= x[2] && !(von === 0 && bis === 24); });
      gewaehlt[k] = !gewaehlt[k];
      var erste = gewaehlt.indexOf(true), letzte = gewaehlt.lastIndexOf(true);
      // Tageszeiten bilden einen zusammenhängenden Zeitraum
      if (erste < 0) { regel.nurVonUhr = 0; regel.nurBisUhr = 24; }
      else { regel.nurVonUhr = TAGESZEITEN[erste][1]; regel.nurBisUhr = TAGESZEITEN[letzte][2]; }
      tick(); speichere(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
    }));
  });
  wann.appendChild(chip("Ganzer Tag", von === 0 && bis === 24, function () {
    regel.nurVonUhr = 0; regel.nurBisUhr = 24; tick(); speichere(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
  }));
  huelle.appendChild(wann);
  var fein = document.createElement("div"); fein.className = "zeitfein";
  var uhrOpt = function (wert, ab, bisZ) { var s = ""; for (var u = ab; u <= bisZ; u++) s += '<option value="' + u + '"' + (u === wert ? " selected" : "") + '>' + u + '</option>'; return s; };
  fein.innerHTML = 'Genau: von <select data-f="nurVonUhr">' + uhrOpt(von, 0, 23) + '</select> bis <select data-f="nurBisUhr">' + uhrOpt(bis, 1, 24) + '</select> Uhr';
  Array.prototype.forEach.call(fein.querySelectorAll("select"), function (sel) {
    sel.addEventListener("change", function () {
      regel[sel.dataset.f] = parseInt(sel.value, 10);
      if (regel.nurBisUhr <= regel.nurVonUhr) { if (sel.dataset.f === "nurVonUhr") regel.nurBisUhr = Math.min(24, regel.nurVonUhr + 1); else regel.nurVonUhr = Math.max(0, regel.nurBisUhr - 1); }
      speichere(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
    });
  });
  huelle.appendChild(fein);

  // Wie lange am Stück?
  abschnitt(huelle, "Wie lange am Stück?");
  var dauer = document.createElement("div"); dauer.className = "wahl";
  var md = regel.mindestdauerStunden || 2;
  DAUERN.forEach(function (d) {
    dauer.appendChild(chip(d + (d === 1 ? " Stunde" : " Std."), md === d, function () {
      regel.mindestdauerStunden = d; tick(); speichere(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
    }));
  });
  if (DAUERN.indexOf(md) < 0) dauer.appendChild(chip(md + " Std.", true, function () {}));
  huelle.appendChild(dauer);

  // Wetter (Bausteine)
  abschnitt(huelle, "Welches Wetter?");
  if (!erweitert) {
    var mh = document.createElement("div"); mh.className = "modus-aus";
    mh.innerHTML = '<div><b>Erweiterte Regeln sind aus</b> – alle Bausteine sind mit „und“ verknüpft, „+ oder“ und Ziehen fehlen.</div>'
      + '<button class="knopf" type="button" style="padding:8px 12px">Einschalten</button>';
    mh.querySelector("button").addEventListener("click", function () { erweitert = true; zustand.erweitert = true; speichere(); zeichneModusSchalter(); baueEditor(); });
    huelle.appendChild(mh);
  }
  baueBausteinBereich(huelle, regel, i);
  baueSatzUndWarnung(huelle, regel);

  // Mehr
  abschnitt(huelle, "Wie weit vorausschauen?");
  var fw = document.createElement("div"); fw.className = "wahl";
  FENSTER_OPTIONEN.forEach(function (o) {
    fw.appendChild(chip(o[1], (regel.zeitfensterStunden || 48) === o[0], function () {
      regel.zeitfensterStunden = o[0]; tick(); speichere(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
    }));
  });
  huelle.appendChild(fw);
  abschnitt(huelle, "Benachrichtigen");
  var hf = document.createElement("div"); hf.className = "wahl";
  var haeuf = regel.haeufigkeit || "taeglich";
  hf.appendChild(chip("Einmal am Tag", haeuf === "taeglich", function () { regel.haeufigkeit = "taeglich"; tick(); speichere(); syncWennAktiv(); baueEditor(); }));
  hf.appendChild(chip("Stündlich, solange es passt", haeuf === "stuendlich", function () { regel.haeufigkeit = "stuendlich"; tick(); speichere(); syncWennAktiv(); baueEditor(); }));
  huelle.appendChild(hf);

  var loesch = document.createElement("div"); loesch.className = "loesch-zeile";
  loesch.innerHTML = '<button class="knopf rot" type="button">Wunsch löschen</button>';
  loesch.querySelector("button").addEventListener("click", function () {
    if (!confirm("„" + regel.name + "“ wirklich löschen?")) return;
    zustand.regeln.splice(i, 1); geoeffneteZelle = null; speichere();
    // Ergebnisse der übrigen Wünsche bleiben an ihrem Platz, bis die neue Vorschau da ist
    [letzteStand, letzteTreffer, letzteKnapp].forEach(function (l) { if (l) l.splice(i, 1); });
    schliesseBlatt(); toast("Gelöscht"); zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
  });
  huelle.appendChild(loesch);

  ziel.appendChild(huelle);
  ziel.scrollTop = scroll;
}
function abschnitt(ziel, text) { var a = document.createElement("div"); a.className = "abschnitt"; a.textContent = text; ziel.appendChild(a); }
function chip(text, an, beiKlick) {
  var b = document.createElement("button"); b.type = "button"; b.className = "chip" + (an ? " an" : ""); b.textContent = text;
  b.addEventListener("click", beiKlick); return b;
}
function wocheHtml(i) {
  var regel = zustand.regeln[i];
  if (!regel.aktiv) return '<p class="hinweis" style="margin:0">Ausgeschaltet – wird nicht geprüft.</p>';
  if (!letzteStand) return '<p class="hinweis" style="margin:0">Prüfe …</p>';
  var st = letzteStand[i];
  if (!st || !st.length) return '<p class="hinweis" style="margin:0">Im Vorschau-Fenster gibt es keine prüfbare Stunde mehr.</p>';
  return standHtml(st);
}
/* Vom Baustein-Editor erwartet */
function zeichneAlles() { zeichneUebersicht(); baueEditor(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge(); }
var vorschauTimer = null;
function vorschauLangsam() { clearTimeout(vorschauTimer); vorschauTimer = setTimeout(aktualisiereVorschau, 700); syncWennAktiv(); }

/* ---------- Orte: Liste, anlegen, bearbeiten ---------- */
function ortEintraege(ziel, beiAuswahl) {
  ziel.innerHTML = "";
  zustand.orte.forEach(function (o) {
    var z = document.createElement("div"); z.className = "ort-eintrag";
    var n = wuenscheAnOrt(o.id);
    z.innerHTML = '<span class="pin">' + ic("pin") + '</span><div class="txt"><b>' + sicher(o.name)
      + (o.id === zustand.standardOrt ? '<span class="schild">Standard</span>' : "") + '</b>'
      + '<small>' + sicher(o.stadt || "") + (o.stadt ? " · " : "") + n + (n === 1 ? " Wunsch" : " Wünsche") + '</small></div>'
      + (o.id !== zustand.standardOrt ? '<button class="klein-knopf" type="button" data-std>Als Standard</button>' : "")
      + '<button class="klein-knopf" type="button" data-bearb>Ändern</button>';
    if (z.querySelector("[data-std]")) z.querySelector("[data-std]").addEventListener("click", function () {
      zustand.standardOrt = o.id; speichere(); tick(); toast(o.name + " ist jetzt Standard");
      planAnimiert = false; zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); beiAuswahl();
    });
    z.querySelector("[data-bearb]").addEventListener("click", function () { oeffneOrtBlatt(o.id); });
    ziel.appendChild(z);
  });
  if (zustand.orte.length < MAX_ORTE) {
    var neu = document.createElement("button"); neu.type = "button"; neu.className = "knopf zart breit"; neu.style.marginTop = "10px";
    neu.innerHTML = ic("plus") + "Ort hinzufügen";
    neu.addEventListener("click", function () { oeffneOrtBlatt(null); });
    ziel.appendChild(neu);
  } else {
    var p = document.createElement("p"); p.className = "hinweis"; p.textContent = "Höchstens " + MAX_ORTE + " Orte."; ziel.appendChild(p);
  }
}
function oeffneOrteListe() {
  var ziel = oeffneBlatt("Meine Orte");
  var liste = document.createElement("div"); liste.className = "ort-liste"; ziel.appendChild(liste);
  ortEintraege(liste, function () { ortEintraege(liste, function () {}); });
}

var ortsKarte = null;
/* Ort anlegen (id = null) oder bearbeiten. fuerRegel: diesen Wunsch danach dem neuen Ort zuordnen. */
function oeffneOrtBlatt(id, fuerRegel) {
  var vorhanden = id ? ortMitId(id) : null, gespeichert = false;
  var punkt = vorhanden ? { lat: vorhanden.lat, lon: vorhanden.lon } : null;
  var stadt = vorhanden ? (vorhanden.stadt || "") : "", nameAuto = !vorhanden;
  var ziel = oeffneBlatt(vorhanden ? "Ort ändern" : "Neuer Ort", function () {
    if (ortsKarte) { ortsKarte.remove(); ortsKarte = null; }
    // Kam man aus einem Wunsch, geht es nach „Abbrechen“ dorthin zurück
    if (fuerRegel != null && !gespeichert) setTimeout(function () { if (!blatt) oeffneEditor(fuerRegel); }, 330);
  });
  ziel.innerHTML = '<label for="ob-name">Name</label>'
    + '<input type="text" id="ob-name" maxlength="30" placeholder="z. B. Zuhause, Garten, Ferienhaus" value="' + sicher(vorhanden ? vorhanden.name : (zustand.orte.length ? "" : "Zuhause")) + '">'
    + '<button class="knopf breit gross" type="button" id="ob-gps" style="margin-top:14px">' + ic("ziel") + 'Meinen Standort verwenden</button>'
    + '<div class="abschnitt">oder suchen</div>'
    + '<input type="search" id="ob-suche" placeholder="Ort oder Stadt, z. B. Düsseldorf" autocomplete="off">'
    + '<div id="ort-ergebnisse"></div>'
    + '<div class="ortskarte" id="ob-karte"></div>'
    + '<p class="hinweis" id="ob-punkt" style="margin:6px 2px 0"></p>'
    + '<div class="datenschutz">' + ic("schloss") + '<span>Der genaue Punkt bleibt auf diesem Gerät. Zum Wetterdienst geht nur ein auf ~11 km gerundeter Wert. Die Kartenbilder lädt dein Gerät von OpenStreetMap.</span></div>'
    + '<button class="knopf breit gross" type="button" id="ob-ok" style="margin-top:16px">Speichern</button>'
    + (vorhanden && zustand.orte.length > 1 ? '<div class="loesch-zeile" style="margin-top:14px"><button class="knopf rot" type="button" id="ob-weg">Ort löschen</button></div>' : "");
  if (!zustand.orte.length) $("ob-name").value = "Zuhause";
  $("ob-name").addEventListener("input", function () { nameAuto = false; });
  function zeigePunkt() {
    $("ob-ok").disabled = !punkt;
    $("ob-punkt").textContent = punkt ? (stadt ? stadt + " · " : "") + "Punkt gesetzt – auf der Karte tippen zum Verschieben." : "Wähle einen Punkt: Standort, Suche oder ein Tipp auf die Karte.";
    if (ortsKarte && punkt) {
      var p = [punkt.lat, punkt.lon];
      if (ortsKarte._wwMarker) ortsKarte._wwMarker.setLatLng(p);
      else ortsKarte._wwMarker = L.marker(p, { icon: L.divIcon({ className:"ww-marker", html:"<span></span>", iconSize:[22, 22] }) }).addTo(ortsKarte);
    }
  }
  function setzePunkt(lat, lon, name, zoom) {
    punkt = { lat: genau(lat), lon: genau(lon) };
    if (name) { stadt = name; if (nameAuto || !$("ob-name").value.trim()) { $("ob-name").value = zustand.orte.length ? name : "Zuhause"; } }
    else namensVorschlag();
    if (ortsKarte) ortsKarte.setView([punkt.lat, punkt.lon], zoom || Math.max(ortsKarte.getZoom(), 13));
    zeigePunkt(); tick();
  }
  // Ortsname nur aus dem GERUNDETEN Punkt ermitteln – der genaue bleibt hier
  function namensVorschlag() {
    fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + grob(punkt.lat) + "&longitude=" + grob(punkt.lon) + "&localityLanguage=de")
      .then(function (a) { return a.json(); }).then(function (d) {
        stadt = d.city || d.locality || d.principalSubdivision || "";
        if (stadt && (nameAuto || !$("ob-name").value.trim()) && zustand.orte.length) $("ob-name").value = stadt;
        zeigePunkt();
      }).catch(function () {});
  }
  $("ob-gps").addEventListener("click", function () {
    var k = this;
    if (!navigator.geolocation) { toast("Dieses Gerät kann den Standort nicht abfragen."); return; }
    k.disabled = true; k.lastChild.textContent = "Suche Standort …";
    navigator.geolocation.getCurrentPosition(function (pos) {
      k.disabled = false; k.lastChild.textContent = "Meinen Standort verwenden";
      setzePunkt(pos.coords.latitude, pos.coords.longitude, null, 15);
    }, function () { k.disabled = false; k.lastChild.textContent = "Meinen Standort verwenden"; toast("Standort nicht verfügbar – bitte suchen."); },
    { enableHighAccuracy:true, timeout:12000 });
  });
  var suchTimer = null;
  $("ob-suche").addEventListener("input", function () {
    clearTimeout(suchTimer); var text = this.value.trim();
    if (text.length < 2) { $("ort-ergebnisse").innerHTML = ""; return; }
    suchTimer = setTimeout(function () { sucheOrt(text, function (f) { $("ob-suche").value = ""; $("ort-ergebnisse").innerHTML = ""; setzePunkt(f.latitude, f.longitude, f.name, 12); }); }, 400);
  });
  if (window.L) {
    setTimeout(function () {
      if (!document.getElementById("ob-karte")) return;
      var start = punkt ? [punkt.lat, punkt.lon] : (standardOrt() ? [standardOrt().lat, standardOrt().lon] : [51, 10]);
      ortsKarte = L.map("ob-karte", { zoomControl:true }).setView(start, punkt ? 13 : (standardOrt() ? 10 : 5));
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap" }).addTo(ortsKarte);
      ortsKarte.on("click", function (e) { setzePunkt(e.latlng.lat, e.latlng.lng, null, ortsKarte.getZoom()); });
      zeigePunkt();
    }, 340);
  } else { $("ob-karte").innerHTML = '<p class="hinweis" style="padding:12px">Karte konnte nicht geladen werden (keine Verbindung?).</p>'; }
  zeigePunkt();
  $("ob-ok").addEventListener("click", function () {
    if (!punkt) return;
    gespeichert = true;
    var name = ($("ob-name").value || "").trim() || stadt || "Ort";
    var o = vorhanden;
    if (!o) { o = { id: neueOrtId() }; zustand.orte.push(o); if (!zustand.standardOrt) zustand.standardOrt = o.id; }
    o.name = name.slice(0, 30); o.stadt = stadt.slice(0, 60); o.lat = punkt.lat; o.lon = punkt.lon;
    if (fuerRegel != null && zustand.regeln[fuerRegel]) zustand.regeln[fuerRegel].ortId = o.id;
    speichere(); toast(vorhanden ? "Ort gespeichert" : name + " hinzugefügt");
    planAnimiert = false; zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv();
    if (sichtbarerReiter() === "einstellungen") zeichneEinstellungen();
    if (fuerRegel != null) oeffneEditor(fuerRegel);
    else schliesseBlatt();
  });
  if ($("ob-weg")) $("ob-weg").addEventListener("click", function () {
    var n = wuenscheAnOrt(vorhanden.id);
    var rest = zustand.orte.filter(function (x) { return x.id !== vorhanden.id; });
    var ersatz = vorhanden.id === zustand.standardOrt ? rest[0] : standardOrt();
    if (!confirm("„" + vorhanden.name + "“ löschen?" + (n ? " " + n + (n === 1 ? " Wunsch nutzt" : " Wünsche nutzen") + " dann „" + ersatz.name + "“." : ""))) return;
    zustand.regeln.forEach(function (r) { if (r.ortId === vorhanden.id) r.ortId = ersatz.id; });
    zustand.orte = rest; if (zustand.standardOrt === vorhanden.id) zustand.standardOrt = ersatz.id;
    speichere(); schliesseBlatt(); toast("Ort gelöscht"); planAnimiert = false;
    zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); if (sichtbarerReiter() === "einstellungen") zeichneEinstellungen();
  });
}
function sichtbarerReiter() { var r = document.querySelector(".reiter.sichtbar"); return r ? r.id.replace("reiter-", "") : ""; }
function sucheOrt(text, beiWahl, zielId) {
  var ziel = $(zielId || "ort-ergebnisse");
  fetch("https://geocoding-api.open-meteo.com/v1/search?count=5&language=de&format=json&name=" + encodeURIComponent(text))
  .then(function (a) { return a.json(); }).then(function (d) {
    ziel.innerHTML = "";
    var funde = (d && d.results) || [];
    if (!funde.length) { ziel.innerHTML = '<p class="hinweis">Nichts gefunden – anders schreiben?</p>'; return; }
    funde.forEach(function (f) {
      var knopf = document.createElement("button"); knopf.type = "button";
      var zusatz = [f.admin1, f.country].filter(Boolean).join(", ");
      knopf.textContent = f.name + (zusatz ? " – " + zusatz : "");
      knopf.addEventListener("click", function () { beiWahl(f); });
      ziel.appendChild(knopf);
    });
  }).catch(function () { ziel.innerHTML = '<p class="warnung">Ortssuche gerade nicht erreichbar.</p>'; });
}

/* ---------- Vorschau vom Dienst ---------- */
function cacheSchluessel() { var s = standardOrt(); return s ? "wwCache_" + grob(s.lat) + "," + grob(s.lon) : null; }
function anwendeVorschau(d) {
  letzteTreffer = d.treffer; letzteKnapp = d.knapp || null; letzteStand = d.stand || null;
  hTage = d.tage || []; hStunden = d.stunden || null;
  if (d.sonne) hSonne = d.sonne;
  if (d.versatz != null) hVersatz = d.versatz;
  setzeHintergrund();
  zeichneUebersicht();
  if (blatt && editorIndex !== null && $("ed-woche")) $("ed-woche").innerHTML = wocheHtml(editorIndex);
  if (sichtbarerReiter() === "wetter") zeichneWetterReiter();
}
var vorschauNr = 0;
function aktualisiereVorschau() {
  clearTimeout(vorschauTimer);
  var s = standardOrt(); if (!s) return;
  var nr = ++vorschauNr;
  fetch("/api/vorschau", { method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ lat:grob(s.lat), lon:grob(s.lon), regeln:regelnFuerDienst() }) })
  .then(function (a) { return a.json(); }).then(function (d) {
    if (!d || !d.ok) throw new Error((d && d.fehler) || "unbekannt");
    if (nr !== vorschauNr) return;   // eine neuere Anfrage ist unterwegs
    try { localStorage.setItem(cacheSchluessel(), JSON.stringify({ zeit: Date.now(), treffer: d.treffer, knapp: d.knapp, stand: d.stand, tage: d.tage, stunden: d.stunden, sonne: d.sonne, versatz: d.versatz })); } catch (e) {}
    anwendeVorschau(d);
  }).catch(function (f) {
    if (nr !== vorschauNr) return;
    var roh = null; try { roh = localStorage.getItem(cacheSchluessel()); } catch (e) {}
    if (roh) { var c = JSON.parse(roh); anwendeVorschau(c); toast("Wetterdienst nicht erreichbar – zeige Stand von vor " + Math.max(1, Math.round((Date.now() - c.zeit) / 60000)) + " Min."); }
    else { toast("Wetterdaten gerade nicht verfügbar – ich versuche es gleich noch einmal."); setTimeout(function () { if (nr === vorschauNr) aktualisiereVorschau(); }, 30000); }
  });
}

/* ---------- Wetter-Reiter (je Ort) ---------- */
var wetterOrtId = null, wetterDaten = {}, wStunden = null, wTage = [];
var offeneTage = {}, tagCache = {};
function zeichneWetterReiter() {
  var chips = $("wetter-orte"); chips.innerHTML = "";
  if (!standardOrt()) { $("wetter-hinweis").textContent = "Wähle zuerst einen Ort."; $("wetter-hinweis").style.display = ""; return; }
  if (!ortMitId(wetterOrtId)) wetterOrtId = standardOrt().id;
  if (zustand.orte.length > 1) zustand.orte.forEach(function (o) {
    chips.appendChild(chip(o.name, o.id === wetterOrtId, function () { wetterOrtId = o.id; offeneTage = {}; zeichneWetterReiter(); }));
  });
  var o = ortMitId(wetterOrtId);
  var daten = o.id === standardOrt().id && hStunden ? { tage: hTage, stunden: hStunden } : wetterDaten[o.id];
  if (!daten) {
    $("wetter-hinweis").textContent = "Lade Wetter für " + o.name + " …"; $("wetter-hinweis").style.display = ""; $("wetter-tage").innerHTML = "";
    fetch("/api/vorschau", { method:"POST", headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ lat:grob(o.lat), lon:grob(o.lon), regeln:[] }) })
      .then(function (a) { return a.json(); }).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.fehler) || "unbekannt");
        wetterDaten[o.id] = { tage: d.tage || [], stunden: d.stunden || null };
        if (wetterOrtId === o.id) zeichneWetterReiter();
      }).catch(function () { $("wetter-hinweis").textContent = "Wetterdaten gerade nicht verfügbar."; });
    return;
  }
  $("wetter-hinweis").style.display = "none";
  wStunden = daten.stunden; wTage = daten.tage || [];
  zeichneWetter();
}
function heuteIsoLokal() { var h = new Date(); return h.getFullYear() + "-" + ("0" + (h.getMonth() + 1)).slice(-2) + "-" + ("0" + h.getDate()).slice(-2); }
function zeichneWetter() {
  var ziel = $("wetter-tage"); ziel.innerHTML = "";
  var heute = heuteIsoLokal(), heuteTag = null, rest = [];
  wTage.forEach(function (t) { if (t.datum === heute && !heuteTag) heuteTag = t; else rest.push(t); });
  if (heuteTag) ziel.appendChild(baueTag(heuteTag, true));
  rest.forEach(function (t) { ziel.appendChild(baueTag(t, false)); });
}
function baueTag(t, gross) {
  var tag = document.createElement("div");
  var offen = gross || offeneTage[t.datum];
  tag.className = "tag" + (gross ? " gross" : "") + (offen ? " offen" : "");
  var label = gross ? "Heute" : (t.wochentag.slice(0, 2) + ", " + t.datum.slice(8, 10) + "." + t.datum.slice(5, 7) + ".");
  var kopf = document.createElement("div"); kopf.className = "tag-kopf";
  kopf.innerHTML = '<span class="wt">' + label + '</span><span class="icon">' + tagIcon(t.datum) + '</span>'
    + '<span class="werte"><span class="min">' + t.tempMin + '°</span> / <b>' + t.tempMax + '°</b> · Wind ' + t.windMax
    + (t.windRichtung ? " " + t.windRichtung : "") + '</span>' + (gross ? "" : '<span class="pfeil">›</span>');
  var det = document.createElement("div"); det.className = "details";
  function fuelle() { det.innerHTML = detailHtml(t.datum, gross); det.dataset.gefuellt = "1"; verdrahteInteraktion(det); }
  if (offen) fuelle();
  if (!gross) kopf.addEventListener("click", function () {
    offeneTage[t.datum] = !offeneTage[t.datum]; tag.classList.toggle("offen");
    if (offeneTage[t.datum] && !det.dataset.gefuellt) fuelle();
  });
  tag.appendChild(kopf); tag.appendChild(det);
  return tag;
}
function verdrahteInteraktion(container, keinTap) {
  Array.prototype.forEach.call(container.querySelectorAll(".dia-box"), function (box) {
    var svg = box.querySelector(".tw-svg"); if (!svg) return;
    var xline = box.querySelector(".xline");
    var legendeEl = box.parentNode.querySelector(".tw-legende");
    var standard = legendeEl ? legendeEl.innerHTML : "";
    var W = +svg.dataset.w, l = +svg.dataset.l, r = +svg.dataset.r, n = +svg.dataset.n, datum = box.dataset.datum;
    var balken = svg.dataset.art === "balken", breite = W - l - r;
    var mitte = function (i) { return balken ? l + (i + 0.5) * (breite / n) : l + i * (breite / (n - 1)); };
    var nurRegen = box.dataset.feld === "regen";
    function bei(clientX) {
      var rect = svg.getBoundingClientRect(); if (!rect.width) return;
      var svgX = (clientX - rect.left) / rect.width * W;
      var i = balken ? Math.floor((svgX - l) / (breite / n)) : Math.round((svgX - l) / (breite / (n - 1)));
      if (i < 0) i = 0; if (i > n - 1) i = n - 1;
      xline.style.left = (mitte(i) / W * rect.width) + "px"; xline.style.display = "block";
      var d = tagCache[datum]; if (!d || !legendeEl) return;
      legendeEl.innerHTML = nurRegen
        ? '<b>' + d.std[i] + ' Uhr</b> · Regen ' + (Math.round(d.regen[i] * 10) / 10) + ' mm'
        : '<b>' + d.std[i] + ' Uhr</b> · ' + Math.round(d.temp[i]) + '° · Wind ' + Math.round(d.wind[i])
          + (d.boen ? ' (Böen ' + Math.round(d.boen[i]) + ')' : "") + (d.dir ? ' ' + d.dir[i] : "")
          + (d.uv ? ' · UV ' + Math.round(d.uv[i]) : "");
    }
    function raus() { xline.style.display = "none"; if (legendeEl) legendeEl.innerHTML = standard; }
    var startX = 0, startY = 0, bewegt = false;
    box.addEventListener("pointerdown", function (e) { startX = e.clientX; startY = e.clientY; bewegt = false; });
    box.addEventListener("pointermove", function (e) { if (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6) bewegt = true; bei(e.clientX); });
    box.addEventListener("pointerup", function () { if (!keinTap && !nurRegen && !bewegt) { raus(); zeigeDiagrammGross(datum); } });
    box.addEventListener("pointerleave", raus);
  });
}
function zeigeDiagrammGross(datum) {
  var d = tagCache[datum]; if (!d) return;
  var jetztIndex = null;
  if (datum === heuteIsoLokal() && d.std.length) {
    var heute = new Date(), jh = heute.getHours() + heute.getMinutes() / 60 - d.std[0];
    if (jh >= 0 && jh <= d.std.length - 1) jetztIndex = jh;
  }
  var titel = datum === heuteIsoLokal() ? "Heute" : (datum.slice(8, 10) + "." + datum.slice(5, 7) + ".");
  var chart = tempWindDiagramm(d.std, d.temp, d.wind, d.boen, d.uv, jetztIndex, true, datum, true);
  var hg = document.createElement("div"); hg.className = "modal-hg"; hg.style.padding = "10px";
  hg.innerHTML = '<div style="width:100%;max-width:760px;background:var(--karte);border-radius:20px;padding:12px 8px 14px">'
    + '<div style="display:flex;align-items:center;margin:0 6px 4px"><b style="flex:1">' + titel + '</b>'
    + '<button class="zu" type="button" id="dg-zu" aria-label="Schließen">' + ic("zu") + '</button></div>'
    + chart + '<p class="hinweis" style="margin:6px 6px 0">Über das Diagramm streichen für die Werte einzelner Stunden.</p></div>';
  $("modal-ziel").appendChild(hg);
  verdrahteInteraktion(hg, true);
  $("dg-zu").addEventListener("click", function () { $("modal-ziel").innerHTML = ""; });
  hg.addEventListener("click", function (e) { if (e.target === hg) $("modal-ziel").innerHTML = ""; });
}
function tagIcon(datum) {
  if (!wStunden || !wStunden.weather_code) return "";
  for (var i = 0; i < wStunden.time.length; i++)
    if (wStunden.time[i].slice(0,10) === datum && wStunden.time[i].slice(11,13) === "12") return wetterIcon(wStunden.weather_code[i]);
  return "";
}
function tagIndizes(datum) {
  var idx = []; if (!wStunden) return idx;
  for (var i = 0; i < wStunden.time.length; i++) if (wStunden.time[i].slice(0,10) === datum) idx.push(i);
  return idx;
}
function detailHtml(datum, gross) {
  var idx = tagIndizes(datum); if (!idx.length) return "";
  var s = wStunden, stunden = [];
  idx.forEach(function (i) {
    stunden.push('<div class="stunde"><div class="h">' + s.time[i].slice(11,13) + '</div>'
      + '<div class="i">' + (s.weather_code ? wetterIcon(s.weather_code[i]) : "") + '</div>'
      + '<div class="t">' + Math.round(s.temperature_2m[i]) + '°</div>'
      + '<div>' + Math.round(s.wind_speed_10m[i]) + ' km/h</div>'
      + (s.precipitation[i] > 0 ? '<div>' + (Math.round(s.precipitation[i] * 10) / 10) + ' mm</div>' : '<div>&nbsp;</div>') + '</div>');
  });
  var std = idx.map(function (i) { return parseInt(s.time[i].slice(11,13), 10); });
  var temp = idx.map(function (i) { return s.temperature_2m[i]; });
  var wind = idx.map(function (i) { return s.wind_speed_10m[i]; });
  var boen = s.wind_gusts_10m ? idx.map(function (i) { return s.wind_gusts_10m[i]; }) : null;
  var regen = idx.map(function (i) { return s.precipitation[i]; });
  var dirNamen = s.wind_direction_10m ? idx.map(function (i) { return SEKTOREN[Math.round(s.wind_direction_10m[i] / 45) % 8]; }) : null;
  var uvArr = s.uv_index ? idx.map(function (i) { return s.uv_index[i]; }) : null;
  tagCache[datum] = { std: std, temp: temp, wind: wind, boen: boen, regen: regen, dir: dirNamen, uv: uvArr };
  var heute = new Date(), jetztIndex = null;
  if (datum === heuteIsoLokal() && std.length) {
    var jh = heute.getHours() + heute.getMinutes() / 60 - std[0];
    if (jh >= 0 && jh <= std.length - 1) jetztIndex = jh;
  }
  var regenSumme = regen.reduce(function (a, b) { return a + b; }, 0);
  return '<div class="stundenreihe">' + stunden.join("") + '</div>'
    + tempWindDiagramm(std, temp, wind, boen, uvArr, jetztIndex, gross, datum)
    + (regenSumme > 0 ? balkenDiagramm("Regen", "mm", std, regen, "#3b82f6", jetztIndex, gross, datum) : "");
}
function jetztLinie(jetztIndex, px, o, H, u) {
  if (jetztIndex == null) return "";
  var x = px(jetztIndex).toFixed(1);
  return '<line x1="' + x + '" y1="' + o + '" x2="' + x + '" y2="' + (H - u) + '" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".4"/>'
    + '<text x="' + x + '" y="' + (o + 6) + '" font-size="8" fill="currentColor" text-anchor="middle" opacity=".6">jetzt</text>';
}
function tempWindDiagramm(std, temp, wind, boen, uv, jetztIndex, gross, datum, riesig) {
  var n = temp.length; if (n < 2) return "";
  var W = 320, H = riesig ? 200 : (gross ? 150 : 100), l = riesig ? 10 : 26, r = riesig ? 12 : 30, o = 12, u = 20;
  var tmin = Math.min.apply(null, temp), tmax = Math.max.apply(null, temp); if (tmin === tmax) { tmin -= 1; tmax += 1; }
  var wmax = Math.max.apply(null, wind.concat(boen || [])); if (wmax <= 0) wmax = 1;
  var uvSpitze = uv ? Math.max.apply(null, uv) : 0;
  var uvMax = uvSpitze > 10 ? 15 : 10;
  var px = function (i) { return l + i * (W - l - r) / (n - 1); };
  var yT = function (v) { return o + (1 - (v - tmin) / (tmax - tmin)) * (H - o - u); };
  var yW = function (v) { return o + (1 - v / wmax) * (H - o - u); };
  var yU = function (v) { return o + (1 - v / uvMax) * (H - o - u); };
  var tempFarbe = "#e0687a", windFarbe = "#4f9bb0", uvFarbe = "#d8a24f";
  var sw = riesig ? 3.2 : (gross ? 2.8 : 2.2), basis = (H - u).toFixed(1);
  var linie = function (werte, f, mapy, extra) { return '<polyline fill="none" stroke="' + f + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round" ' + (extra || "") + ' points="'
    + werte.map(function (v, i) { return px(i).toFixed(1) + "," + mapy(v).toFixed(1); }).join(" ") + '"/>'; };
  var flaeche = function (werte, f, mapy, op) { var pts = werte.map(function (v, i) { return px(i).toFixed(1) + "," + mapy(v).toFixed(1); }).join(" ");
    return '<polygon fill="' + f + '" opacity="' + op + '" stroke="none" points="' + px(0).toFixed(1) + "," + basis + " " + pts + " " + px(n - 1).toFixed(1) + "," + basis + '"/>'; };
  var achsen = riesig ? "" : (
      '<text x="2" y="' + (yT(tmax) + 3).toFixed(1) + '" font-size="9" fill="' + tempFarbe + '">' + Math.round(tmax) + '°</text>'
    + '<text x="2" y="' + (yT(tmin) + 3).toFixed(1) + '" font-size="9" fill="' + tempFarbe + '">' + Math.round(tmin) + '°</text>'
    + '<text x="' + (W - 2) + '" y="' + (yW(wmax) + 6).toFixed(1) + '" font-size="9" fill="' + windFarbe + '" text-anchor="end">' + Math.round(wmax) + '</text>'
    + '<text x="' + (W - 2) + '" y="' + (yW(0) - 1).toFixed(1) + '" font-size="9" fill="' + windFarbe + '" text-anchor="end">0</text>');
  var svg = '<svg class="tw-svg" data-w="' + W + '" data-l="' + l + '" data-r="' + r + '" data-n="' + n + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Temperatur, Wind und UV">'
    + achsen + jetztLinie(jetztIndex, px, o, H, u)
    + (uv ? flaeche(uv, uvFarbe, yU, ".13") : "") + flaeche(wind, windFarbe, yW, ".10") + flaeche(temp, tempFarbe, yT, ".10")
    + (boen ? linie(boen, windFarbe, yW, 'stroke-dasharray="3 3" opacity=".55"') : "")
    + linie(wind, windFarbe, yW) + linie(temp, tempFarbe, yT)
    + xBeschriftung(std).map(function (p) { return '<text x="' + px(p[0]).toFixed(1) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" text-anchor="middle" opacity=".55">' + p[1] + '</text>'; }).join("")
    + '</svg>';
  var legende = '<b style="color:' + tempFarbe + '">Temperatur</b> · <b style="color:' + windFarbe + '">Wind</b>' + (boen ? " · Böen" : "") + (uv ? ' · <b style="color:' + uvFarbe + '">UV</b>' : "");
  return '<div class="diagramm"><div class="titel"><span class="tw-legende">' + legende + '</span></div>'
    + '<div class="dia-box" data-datum="' + datum + '">' + svg + '<div class="xline"></div></div></div>';
}
function xBeschriftung(std) {
  var t = [];
  for (var k = 0; k < std.length; k++) if (std[k] % 6 === 0) t.push([k, std[k]]);
  return t;
}
function balkenDiagramm(titel, einheit, std, werte, farbe, jetztIndex, gross, datum) {
  var n = werte.length; if (!n) return "";
  var max = Math.max.apply(null, werte); if (max <= 0) max = 1;
  var W = 320, H = gross ? 90 : 70, l = 6, r = 6, o = 10, u = 20;
  var bw = (W - l - r) / n;
  var pxBar = function (idx) { return l + (idx + 0.5) * bw; };
  var summe = Math.round(werte.reduce(function (a, b) { return a + b; }, 0) * 10) / 10;
  var balken = werte.map(function (v, i) {
    var hh = (v / max) * (H - o - u); return '<rect x="' + (l + i * bw + 0.5).toFixed(1) + '" y="' + (H - u - hh).toFixed(1)
      + '" width="' + (bw - 1).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="1.5" fill="' + farbe + '" opacity=".85"/>';
  }).join("");
  var ticks = xBeschriftung(std).map(function (p) { return '<text x="' + pxBar(p[0]).toFixed(1) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" text-anchor="middle" opacity=".55">' + p[1] + '</text>'; }).join("");
  var svg = '<svg class="tw-svg" data-art="balken" data-w="' + W + '" data-l="' + l + '" data-r="' + r + '" data-n="' + n + '"'
    + ' viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + titel + '">' + balken + jetztLinie(jetztIndex, pxBar, o, H, u) + ticks + '</svg>';
  return '<div class="diagramm"><div class="titel"><span class="tw-legende">' + titel + '</span><span>' + String(summe).replace(".", ",") + ' ' + einheit + ' gesamt</span></div>'
    + '<div class="dia-box" data-datum="' + datum + '" data-feld="regen">' + svg + '<div class="xline"></div></div></div>';
}

/* ---------- Einstellungen ---------- */
function zeichneEinstellungen() {
  ortEintraege($("einst-orte"), zeichneEinstellungen);
  zeichneSchriftwahl(); zeichneModusSchalter(); zeichneAppStand();
}
function zeichneModusSchalter() {
  $("erweitert-schalter").checked = erweitert;
  $("erweitert-erklaerung").innerHTML = erweitert
    ? "An: Bausteine lassen sich mit „+ oder“ kombinieren – dann genügt eine der Zeilen – und mit dem Finger ziehen."
    : "Aus: Alle Bausteine werden mit <b>und</b> verknüpft. Einfacher, aber ohne Alternativen.";
}
$("erweitert-schalter").addEventListener("change", function () { erweitert = this.checked; zustand.erweitert = erweitert; speichere(); zeichneModusSchalter(); });

/* ---------- Benachrichtigungen ---------- */
function b64urlZuBytes(s) {
  var pad = (4 - (s.length % 4)) % 4; var b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "====".slice(0, pad);
  var r = atob(b64); return Uint8Array.from(r, function (c) { return c.charCodeAt(0); });
}
function zeigePushStatus(text, art) { $("push-status").innerHTML = text ? '<div class="' + (art || "erfolg") + '">' + sicher(text) + "</div>" : ""; }
function holeAbo() {
  return navigator.serviceWorker.register("/sw.js").then(function () { return navigator.serviceWorker.ready; })
    .then(function (reg) { return reg.pushManager.getSubscription().then(function (abo) {
      return abo || reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64urlZuBytes(VAPID_PUBLIC) }); }); });
}
function istIosOhneHomescreen() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window.navigator.standalone || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches));
}
function benachrichtigungAn(fertig) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    var t = istIosOhneHomescreen()
      ? "Auf dem iPhone geht das erst, wenn die App auf dem Home-Bildschirm liegt: Teilen-Symbol → „Zum Home-Bildschirm“, dann von dort öffnen."
      : "Dieser Browser unterstützt keine Push-Nachrichten.";
    zeigePushStatus(t, "warnung"); $("push-schalter").checked = false; toast("Push geht in diesem Browser nicht"); if (fertig) fertig(false, t); return;
  }
  zeigePushStatus("Richte ein …", "erfolg");
  Notification.requestPermission().then(function (erlaubnis) {
    if (erlaubnis !== "granted") throw new Error("Ohne Erlaubnis geht es nicht (Status: " + erlaubnis + ").");
    return holeAbo();
  }).then(function (abo) {
    zustand.aktiviert = true; zustand.nudgeWeg = true; speichere(); zeichneNudge(); $("push-schalter").checked = true;
    var bereit = standardOrt() && zustand.regeln.some(function (r) { return r.aktiv; });
    if (bereit) return sendeAnDienst(abo, true).then(function (d) {
      zeigePushStatus(d.gespeichert ? "Aktiv! Eine Bestätigung ist unterwegs. Der Wächter prüft ab jetzt stündlich." : "Test-Nachricht unterwegs! (Speicher wird noch eingerichtet.)", "erfolg");
      toast("Benachrichtigungen sind an"); if (fertig) fertig(true);
    });
    zeigePushStatus("Eingeschaltet. Sobald du einen aktiven Wunsch hast, wache ich für dich.", "erfolg");
    toast("Benachrichtigungen sind an"); if (fertig) fertig(true);
  }).catch(function (f) { zustand.aktiviert = false; speichere(); $("push-schalter").checked = false; zeigePushStatus(f.message, "warnung"); if (fertig) fertig(false, f.message); });
}
function benachrichtigungAus() {
  zustand.aktiviert = false; speichere();
  zeigePushStatus("Benachrichtigungen sind aus.", "erfolg");
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (abo) {
      if (!abo) return; return fetch("/api/deaktivieren", { method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ endpoint:abo.endpoint }) }).then(function () { return abo.unsubscribe(); });
    }).catch(function () {});
  }
}
$("push-schalter").addEventListener("change", function () { if (this.checked) benachrichtigungAn(); else benachrichtigungAus(); });
function sendeAnDienst(abo, bestaetigen) {
  var s = standardOrt();
  return fetch("/api/aktivieren", { method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ abo:abo.toJSON ? abo.toJSON() : abo, lat:grob(s.lat), lon:grob(s.lon), regeln:regelnFuerDienst(), bestaetigen: !!bestaetigen }) })
    .then(function (a) { return a.json().then(function (d) { if (!a.ok || !d.ok) throw new Error((d && d.fehler) || "Dienst nicht erreichbar."); return d; }); });
}
var syncTimer = null;
function syncWennAktiv() {
  if (!zustand.aktiviert || !standardOrt() || !zustand.regeln.some(function (r) { return r.aktiv; })) return;
  if (!("serviceWorker" in navigator)) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function () {
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); })
      .then(function (abo) { if (abo) return sendeAnDienst(abo, false); }).catch(function () {});
  }, 1200);
}
$("loeschen").addEventListener("click", function () {
  if (!confirm("Wirklich alles löschen? Wünsche, Orte und die Abmeldung vom Wächter.")) return;
  var fertig = function () { localStorage.removeItem(SPEICHER); location.reload(); };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (abo) {
      if (!abo) return null;
      return fetch("/api/deaktivieren", { method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ endpoint:abo.endpoint }) }).then(function () { return abo.unsubscribe(); });
    }).then(fertig, fertig);
    setTimeout(fertig, 2500);
  } else { fertig(); }
});

/* ---------- Erster Start: Ort, Wünsche, Benachrichtigung ---------- */
function zeigeStart(schritt) {
  var alt = document.querySelector(".start"); if (alt) alt.remove();
  var el = document.createElement("div"); el.className = "start";
  var punkte = '<div class="schritte">' + [1, 2, 3].map(function (k) { return '<i class="' + (k <= schritt ? "an" : "") + '"></i>'; }).join("") + '</div>';
  var titel = '<div class="start-titel"><div class="marke">Wetter-Wächter</div><div class="claim">Ich sage dir Bescheid, wenn dein Wunsch-Wetter kommt.</div></div>';
  var karte = document.createElement("div"); karte.className = "start-karte";
  if (schritt === 0) {
    karte.innerHTML = '<h2>Pizza auf dem Balkon, Wäsche draußen, Laufen im Trockenen?</h2>'
      + '<p>Sag mir, was du vorhast – ich prüfe jede Stunde das Wetter und melde mich, sobald es passt.</p>'
      + '<button class="knopf breit gross" type="button" id="st-los">Los geht’s</button>'
      + '<p class="hinweis" style="margin:12px 0 0;text-align:center">Kostenlos · ohne Konto · dein genauer Ort bleibt auf dem Gerät</p>';
  } else if (schritt === 1) {
    karte.innerHTML = punkte + '<h2>Wo bist du zu Hause?</h2><p>Dort schaue ich nach dem Wetter. Weitere Orte kannst du später anlegen.</p>'
      + '<button class="knopf breit gross" type="button" id="st-gps">' + ic("ziel") + 'Meinen Standort verwenden</button>'
      + '<div class="abschnitt">oder suchen</div><input type="search" id="st-suche" placeholder="Ort oder Stadt" autocomplete="off"><div id="st-ergebnisse"></div>'
      + '<div class="datenschutz">' + ic("schloss") + '<span>Der genaue Punkt bleibt auf diesem Gerät. Zum Wetterdienst geht nur ein auf ~11 km gerundeter Wert.</span></div>';
  } else if (schritt === 2) {
    karte.innerHTML = punkte + '<h2>Was wünschst du dir?</h2><p>Tippe an, was zu dir passt. Alles lässt sich später anpassen.</p>'
      + '<div class="vorlagen" id="st-vorlagen"></div>'
      + '<button class="knopf breit gross" type="button" id="st-weiter" style="margin-top:16px">Weiter</button>';
  } else {
    karte.innerHTML = punkte + '<h2>Soll ich dir Bescheid sagen?</h2><p>Dann bekommst du eine Nachricht, sobald einer deiner Wünsche wahr wird. Die Nachricht nennt nie deinen Ort.</p>'
      + (istIosOhneHomescreen() ? '<div class="modus-aus" style="margin-bottom:14px"><div><b>iPhone/iPad:</b> Benachrichtigungen gehen erst, wenn die App auf dem Home-Bildschirm liegt – Teilen-Symbol → „Zum Home-Bildschirm“.</div></div>' : "")
      + '<button class="knopf breit gross" type="button" id="st-push">' + ic("glocke") + 'Ja, Bescheid sagen</button>'
      + '<div id="st-push-status"></div><button class="leise" type="button" id="st-fertig">Später</button>';
  }
  el.innerHTML = titel; el.appendChild(karte);
  document.body.appendChild(el); document.body.classList.add("start-modus");
  if (schritt === 0) $("st-los").addEventListener("click", function () { tick(); zeigeStart(1); });
  if (schritt === 1) {
    var ortGesetzt = function (lat, lon, stadt) {
      zustand.orte = [{ id:"o1", name:"Zuhause", stadt:stadt || "", lat:genau(lat), lon:genau(lon) }];
      zustand.standardOrt = "o1"; speichere(); tick(); aktualisiereVorschau(); zeigeStart(2);
      if (!stadt) fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + grob(lat) + "&longitude=" + grob(lon) + "&localityLanguage=de")
        .then(function (a) { return a.json(); }).then(function (d) { var o = ortMitId("o1"); if (o) { o.stadt = d.city || d.locality || d.principalSubdivision || ""; speichere(); zeichneKopf(); } }).catch(function () {});
    };
    $("st-gps").addEventListener("click", function () {
      var k = this;
      if (!navigator.geolocation) { toast("Standort nicht verfügbar – bitte suchen."); return; }
      k.disabled = true; k.lastChild.textContent = "Suche Standort …";
      navigator.geolocation.getCurrentPosition(function (pos) { ortGesetzt(pos.coords.latitude, pos.coords.longitude, ""); },
        function () { k.disabled = false; k.lastChild.textContent = "Meinen Standort verwenden"; toast("Standort nicht verfügbar – bitte suchen."); },
        { enableHighAccuracy:true, timeout:12000 });
    });
    var t = null;
    $("st-suche").addEventListener("input", function () {
      clearTimeout(t); var text = this.value.trim();
      if (text.length < 2) { $("st-ergebnisse").innerHTML = ""; return; }
      t = setTimeout(function () { sucheOrt(text, function (f) { ortGesetzt(f.latitude, f.longitude, f.name); }, "st-ergebnisse"); }, 400);
    });
  }
  if (schritt === 2) {
    var gewaehlt = {};
    var g = $("st-vorlagen");
    VORLAGEN.forEach(function (v) {
      var b = document.createElement("button"); b.type = "button";
      b.innerHTML = '<span class="v-emoji">' + sicher(v.emoji) + '</span><span class="v-name">' + trennbar(sicher(v.name)) + '</span>';
      b.addEventListener("click", function () {
        gewaehlt[v.name] = !gewaehlt[v.name]; b.classList.toggle("an", gewaehlt[v.name]); tick();
        var n = Object.keys(gewaehlt).filter(function (k) { return gewaehlt[k]; }).length;
        $("st-weiter").textContent = n ? "Weiter mit " + n + (n === 1 ? " Wunsch" : " Wünschen") : "Weiter";
      });
      g.appendChild(b);
    });
    $("st-weiter").addEventListener("click", function () {
      VORLAGEN.forEach(function (v) { if (gewaehlt[v.name]) zustand.regeln.push(vorlageZuRegel(v)); });
      speichere(); planAnimiert = false; zeichneUebersicht(); aktualisiereVorschau(); zeigeStart(3);
    });
  }
  if (schritt === 3) {
    var ende = function () { zustand.willkommenGesehen = true; speichere(); el.remove(); document.body.classList.remove("start-modus"); zeichneUebersicht(); };
    $("st-fertig").addEventListener("click", function () { zustand.nudgeWeg = false; ende(); });
    $("st-push").addEventListener("click", function () {
      benachrichtigungAn(function (ok, grund) {
        if (ok) { ende(); return; }
        $("st-push-status").innerHTML = '<div class="warnung">' + sicher(grund || "Hat nicht geklappt.") + '</div>';
      });
    });
  }
}

${BAUSTEINE_JS}

/* ---------- Start ---------- */
migriere();
$("push-schalter").checked = !!zustand.aktiviert;
zeichneUebersicht();
setzeHintergrund(); setInterval(function () { setzeHintergrund(); zeichneKopf(); }, 5 * 60 * 1000);
aktualisiereVorschau();
if (!zustand.willkommenGesehen || !standardOrt()) zeigeStart(standardOrt() ? 2 : 0);
</script>
</body>
</html>`;
}
