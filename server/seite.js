/*
 * Die App-Seite des Wetter-Wächters (eine Datei; externe Dienste – Ortssuche,
 * Karte – spricht der Browser des Nutzers direkt an).
 * Wird vom Worker unter "/" ausgeliefert; VAPID-Schlüssel, App-Stand und die
 * Fassung der Nutzungsbedingungen werden beim Ausliefern eingesetzt.
 *
 * Gestaltung nach dem Vorbild aktueller iPhone-Apps:
 *  - Übersicht und Wetter im Stil der Wetter-App: lebendiger Himmel, getönte
 *    Glas-Kacheln mit weißer Schrift.
 *  - Einstellungen und alle Blätter (Wunsch bearbeiten, Orte …) wie die
 *    iPhone-Einstellungen: gruppierte Listen, Schalter, Segmente, Häkchen.
 *  - Schwebende Tab-Leiste mit eigenem +-Knopf.
 *  - Hell/Dunkel folgt der Einstellung des Geräts.
 *
 * Datenschutz: Orte werden auf dem Gerät genau gespeichert (Anzeige, Karte).
 * Alles, was das Gerät verlässt, ist auf 1 Nachkommastelle (~11 km) gerundet –
 * siehe grob(); der Dienst rundet zusätzlich selbst.
 *
 * Hinweis: Das Seiten-JavaScript nutzt bewusst KEINE Backticks/Template-Literale,
 * weil die ganze Seite in einem Template-Literal steckt.
 */

import { BAUSTEINE_CSS, BAUSTEINE_JS } from "./bausteine_ui.js";

export function appSeite(vapidPublic, appStand = "", bedingungenVersion = "") {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2f7fd8">
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
  /* ---- Farben wie die iPhone-Systemfarben ---- */
  :root, :root[data-theme="light"] {
    --blau:#007aff; --gruen-voll:#34c759; --orange:#ff9500; --rot-voll:#ff3b30; --grau:#8e8e93; --indigo:#5856d6;
    --text:#000000; --text2:rgba(60,60,67,.6); --text3:rgba(60,60,67,.3);
    --linie:rgba(60,60,67,.18); --fuell:rgba(118,118,128,.12); --fuell2:rgba(118,118,128,.2);
    --seite:#f2f2f7; --zelle:#ffffff; --blatt:#f2f2f7; --blatt-zelle:#ffffff;
    /* Namen, die der gemeinsame Baustein-Editor erwartet */
    --hg:rgba(118,118,128,.12); --karte:#ffffff; --akzent:#007aff; --akzent-hell:rgba(0,122,255,.12);
    --gruen:#248a3d; --gruen-hell:rgba(52,199,89,.14); --rot:#d70015; --rot-hell:rgba(255,59,48,.12);
    --gelb:#c93400; --gelb-hell:rgba(255,149,0,.14);
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --blau:#0a84ff; --gruen-voll:#30d158; --orange:#ff9f0a; --rot-voll:#ff453a; --grau:#8e8e93; --indigo:#5e5ce6;
      --text:#ffffff; --text2:rgba(235,235,245,.6); --text3:rgba(235,235,245,.3);
      --linie:rgba(84,84,88,.6); --fuell:rgba(118,118,128,.24); --fuell2:rgba(118,118,128,.32);
      --seite:#000000; --zelle:#1c1c1e; --blatt:#1c1c1e; --blatt-zelle:#2c2c2e;
      --hg:rgba(118,118,128,.24); --karte:#2c2c2e; --akzent:#0a84ff; --akzent-hell:rgba(10,132,255,.2);
      --gruen:#30d158; --gruen-hell:rgba(48,209,88,.16); --rot:#ff453a; --rot-hell:rgba(255,69,58,.16);
      --gelb:#ff9f0a; --gelb-hell:rgba(255,159,10,.16);
    }
  }
  :root[data-theme="dark"] {
    --blau:#0a84ff; --gruen-voll:#30d158; --orange:#ff9f0a; --rot-voll:#ff453a; --grau:#8e8e93; --indigo:#5e5ce6;
    --text:#ffffff; --text2:rgba(235,235,245,.6); --text3:rgba(235,235,245,.3);
    --linie:rgba(84,84,88,.6); --fuell:rgba(118,118,128,.24); --fuell2:rgba(118,118,128,.32);
    --seite:#000000; --zelle:#1c1c1e; --blatt:#1c1c1e; --blatt-zelle:#2c2c2e;
    --hg:rgba(118,118,128,.24); --karte:#2c2c2e; --akzent:#0a84ff; --akzent-hell:rgba(10,132,255,.2);
    --gruen:#30d158; --gruen-hell:rgba(48,209,88,.16); --rot:#ff453a; --rot-hell:rgba(255,69,58,.16);
    --gelb:#ff9f0a; --gelb-hell:rgba(255,159,10,.16);
  }
  /* Tönung der Glas-Kacheln auf dem Himmel (setzt setzeHintergrund je nach Helligkeit) */
  :root { --kachel:rgba(18,42,78,.22); --kachel-linie:rgba(255,255,255,.16); --weiss2:rgba(255,255,255,.72); --weiss3:rgba(255,255,255,.22); }

  /* ---- Himmel ---- */
  #himmel { position:fixed; inset:0; z-index:-1; overflow:hidden; background:#2f7fd8; transition:background .8s ease, opacity .35s ease; }
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
  body.flach #himmel { opacity:0; }
  body.flach { background:var(--seite); }

  /* ---- Grundlagen ---- */
  * { box-sizing:border-box; }
  html { -webkit-tap-highlight-color:transparent; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",system-ui,"Segoe UI",Roboto,sans-serif;
    font-size:1rem; line-height:1.3; letter-spacing:-.01em; color:var(--text); background:transparent;
    -webkit-text-size-adjust:100%; -webkit-font-smoothing:antialiased; transition:background .35s ease; }
  main { max-width:560px; margin:0 auto; padding:calc(env(safe-area-inset-top) + 8px) 16px calc(118px + env(safe-area-inset-bottom)); }
  button { font:inherit; color:inherit; letter-spacing:inherit; }
  a { color:var(--blau); }
  .reiter { display:none; } .reiter.sichtbar { display:block; animation:einblenden .3s cubic-bezier(.32,.72,0,1); }
  @keyframes einblenden { from { opacity:0; transform:translateY(8px); } }
  svg.ic { width:1.2em; height:1.2em; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0; }
  svg.ic.voll { fill:currentColor; stroke:none; }
  :focus-visible { outline:2px solid var(--blau); outline-offset:2px; border-radius:6px; }

  /* ---- Kompakte Kopfzeile beim Scrollen ---- */
  .kompakt { position:fixed; top:0; left:0; right:0; z-index:15; height:calc(env(safe-area-inset-top) + 44px);
    padding-top:env(safe-area-inset-top); display:flex; align-items:center; justify-content:center;
    font-weight:600; font-size:1rem; color:#fff; opacity:0; pointer-events:none; transition:opacity .2s;
    background:rgba(24,52,92,.6); -webkit-backdrop-filter:blur(30px) saturate(1.6); backdrop-filter:blur(30px) saturate(1.6);
    border-bottom:.5px solid rgba(255,255,255,.12); }
  .kompakt.da { opacity:1; }
  body.flach .kompakt { color:var(--text); background:color-mix(in srgb, var(--seite) 82%, transparent); border-bottom-color:var(--linie); }

  /* ---- Kopf im Stil der Wetter-App ---- */
  .wetterkopf { text-align:center; color:#fff; padding:18px 0 22px; text-shadow:0 1px 6px rgba(0,0,0,.12); }
  .ort-knopf { display:inline-flex; align-items:center; gap:4px; border:0; background:none; cursor:pointer; color:#fff;
    font-size:1.75rem; font-weight:500; letter-spacing:-.02em; padding:2px 6px; max-width:100%; }
  .ort-knopf .nam { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ort-knopf svg.ic { width:.75em; height:.75em; opacity:.8; stroke-width:2.6; }
  .wetterkopf .grad { font-size:6rem; font-weight:200; letter-spacing:-.04em; line-height:1; margin:2px 0 0 .25em; }
  .wetterkopf .lage { font-size:1.15rem; font-weight:500; }
  .wetterkopf .ht { font-size:1.15rem; font-weight:500; font-variant-numeric:tabular-nums; }
  .wetterkopf .laden { font-size:1rem; opacity:.85; margin-top:14px; }

  /* ---- Glas-Kacheln auf dem Himmel ---- */
  .kachel { position:relative; color:#fff; background:var(--kachel); border:.5px solid var(--kachel-linie); border-radius:22px;
    padding:12px 16px 14px; margin-bottom:12px; -webkit-backdrop-filter:blur(30px) saturate(1.6); backdrop-filter:blur(30px) saturate(1.6); }
  .kachel-kopf { display:flex; align-items:center; gap:6px; font-size:.76rem; font-weight:600; letter-spacing:.02em; text-transform:uppercase;
    color:var(--weiss2); padding-bottom:9px; margin-bottom:8px; border-bottom:.5px solid var(--weiss3); }
  .kachel-kopf svg.ic { width:1.1em; height:1.1em; }
  .kachel-kopf .rechts { margin-left:auto; text-transform:none; letter-spacing:0; font-size:.8rem; }
  .kachel-kopf .rechts b { color:#fff; }

  /* „Heute passt's“ */
  .held { display:flex; align-items:center; gap:14px; }
  .held .em { font-size:2.6rem; line-height:1; flex-shrink:0; }
  .held .txt { flex:1; min-width:0; }
  .held b { display:block; font-size:1.3rem; font-weight:700; letter-spacing:-.02em; line-height:1.2; }
  .held .sub { display:block; font-size:.95rem; color:var(--weiss2); margin-top:2px; font-variant-numeric:tabular-nums; }
  .held-knopf { margin-top:12px; display:inline-flex; align-items:center; gap:6px; border:0; border-radius:999px; cursor:pointer;
    padding:10px 16px; background:#fff; color:#0b5cd5; font-weight:600; font-size:.95rem; }
  .kachel.feier .em { animation:wackeln 1.1s ease 2; }
  @keyframes wackeln { 20% { transform:rotate(-12deg) scale(1.12); } 40% { transform:rotate(10deg) scale(1.16); } 60% { transform:rotate(-6deg); } 80% { transform:rotate(3deg); } }
  .funke { position:absolute; width:8px; height:8px; border-radius:2px; left:44px; top:58%; pointer-events:none;
    animation:funke 1.3s cubic-bezier(.2,.7,.3,1) forwards; opacity:0; }
  @keyframes funke { 0% { opacity:1; transform:translate(0,0) rotate(0) scale(.4); } 100% { opacity:0; transform:translate(var(--x),var(--y)) rotate(200deg) scale(1); } }

  /* Wochenplan */
  .pz { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); align-items:center; column-gap:6px; }
  .pz.tage-reihe { font-size:.78rem; font-weight:600; color:var(--weiss2); text-align:center; padding:0 0 2px; }
  .pz.tage-reihe .heute { color:#fff; }
  .pz.reihe { border-top:.5px solid var(--weiss3); padding:8px 0 11px; row-gap:7px; }
  .wname { grid-column:1 / -1; display:flex; align-items:center; gap:8px; border:0; background:none; padding:2px 0 0; cursor:pointer;
    text-align:left; min-width:0; color:#fff; }
  .wname .em { font-size:1.25rem; line-height:1; flex-shrink:0; }
  .wname .t { min-width:0; font-weight:600; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .wname small { font-size:.85rem; color:var(--weiss2); white-space:nowrap; }
  .wname .mehr { margin-left:auto; color:var(--weiss2); display:flex; }
  .zelle { width:100%; height:32px; border:0; border-radius:9px; cursor:pointer; padding:0; background:var(--weiss3);
    transition:transform .15s cubic-bezier(.3,1.5,.5,1); }
  .zelle.ja { background:#34c759; box-shadow:0 2px 8px rgba(52,199,89,.35); }
  .zelle.fast { background:#ff9f0a; }
  .zelle.aus { background:transparent; position:relative; cursor:default; }
  .zelle.aus::after { content:""; position:absolute; left:50%; top:50%; width:4px; height:4px; margin:-2px; border-radius:50%; background:var(--weiss3); }
  .zelle.vorbei { opacity:.5; }
  .zelle.laedt { animation:schimmer 1.2s ease-in-out infinite; }
  .zelle.gewaehlt { box-shadow:0 0 0 2px #fff; }
  .zelle:active { transform:scale(.9); }
  @keyframes schimmer { 50% { opacity:.4; } }
  .zelle.neu { animation:plopp .45s cubic-bezier(.3,1.6,.5,1) backwards; animation-delay:calc(var(--i) * 20ms); }
  @keyframes plopp { from { transform:scale(.2); opacity:0; } }
  .pz.reihe.inaktiv .wname, .pz.reihe.inaktiv .zelle { opacity:.45; }
  .pz.reihe.frisch { animation:aufleuchten 1.8s ease; border-radius:12px; }
  @keyframes aufleuchten { 0%, 45% { background:rgba(255,255,255,.18); } }
  .zell-info { grid-column:1 / -1; font-size:.9rem; color:var(--weiss2); padding:2px 2px 0; animation:einblenden .25s ease; }
  .zell-info b { color:#fff; font-weight:600; }
  .legende { display:flex; gap:14px; font-size:.75rem; color:var(--weiss2); padding-top:8px; border-top:.5px solid var(--weiss3); flex-wrap:wrap; }
  .legende i { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:5px; vertical-align:0; }
  .nudge { display:flex; align-items:center; gap:12px; }
  .nudge .ic-kreis { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .nudge .txt { flex:1; font-size:.98rem; font-weight:600; min-width:0; }
  .nudge .ja { border:0; border-radius:999px; background:#fff; color:#0b5cd5; font-weight:600; padding:8px 14px; cursor:pointer; }
  .nudge .weg { border:0; background:none; color:var(--weiss2); cursor:pointer; padding:6px; display:flex; }

  /* ---- Wetter-Reiter ---- */
  .ort-chips { display:flex; gap:8px; overflow-x:auto; padding:8px 0 0; scrollbar-width:none; justify-content:center; }
  .ort-chips::-webkit-scrollbar { display:none; }
  .ort-chips button { border:0; border-radius:999px; padding:7px 14px; font-weight:600; font-size:.9rem; cursor:pointer; white-space:nowrap;
    color:#fff; background:var(--kachel); -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px); }
  .ort-chips button.an { background:#fff; color:#0b5cd5; }
  .stunden { display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; margin:0 -6px; padding:0 6px; }
  .stunden::-webkit-scrollbar { display:none; }
  .std { flex:0 0 auto; width:50px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:7px; font-variant-numeric:tabular-nums; }
  .std .h { font-size:.88rem; font-weight:600; }
  .std .i { font-size:1.4rem; line-height:1; height:1.6rem; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .std .i small { font-size:.62rem; color:#5ac8fa; font-weight:700; margin-top:1px; }
  .std .t { font-size:1.05rem; font-weight:600; }
  .tag { border-top:.5px solid var(--weiss3); }
  .tag:first-child { border-top:0; }
  .tag-kopf { display:grid; grid-template-columns:3.6rem 2rem 2.4rem 1fr 2.4rem; align-items:center; gap:8px; min-height:46px; cursor:pointer;
    font-variant-numeric:tabular-nums; }
  .tag-kopf .wt { font-weight:600; font-size:1.05rem; }
  .tag-kopf .icon { font-size:1.3rem; text-align:center; }
  .tag-kopf .min { color:var(--weiss2); text-align:right; font-weight:600; font-size:1.05rem; }
  .tag-kopf .max { text-align:left; font-weight:600; font-size:1.05rem; }
  .spanne { position:relative; height:5px; border-radius:3px; background:rgba(0,0,0,.18); }
  .spanne i { position:absolute; top:0; bottom:0; border-radius:3px; background:linear-gradient(90deg,#5ac8fa,#a3e36b,#ffd60a,#ff9f0a); background-size:var(--bw) 100%; background-position:var(--bx) 0; }
  .spanne b { position:absolute; top:50%; width:9px; height:9px; margin:-4.5px 0 0 -4.5px; border-radius:50%; background:#fff; box-shadow:0 0 0 2px rgba(0,0,0,.25); }
  .details { display:none; padding:2px 0 12px; } .tag.offen .details { display:block; animation:einblenden .25s ease; }
  .tagwerte { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:6px; }
  .tagwerte div { background:rgba(255,255,255,.1); border-radius:12px; padding:8px 6px; text-align:center; font-size:.72rem; color:var(--weiss2); }
  .tagwerte b { display:block; color:#fff; font-size:1rem; margin-top:2px; font-variant-numeric:tabular-nums; }
  .diagramm { margin-top:8px; }
  .diagramm .titel { font-size:.78rem; color:var(--weiss2); margin-bottom:2px; display:flex; justify-content:space-between; }
  .diagramm svg { width:100%; height:auto; display:block; color:#fff; }
  .dia-box { position:relative; touch-action:none; }
  .dia-box .xline { position:absolute; top:0; bottom:0; width:1px; background:#fff; opacity:.5; display:none; pointer-events:none; }
  .quelle { text-align:center; font-size:.72rem; color:var(--weiss2); margin:4px 0 0; }

  /* ---- Tab-Leiste (schwebend, Glas) ---- */
  nav.tabbar { position:fixed; left:0; right:0; bottom:calc(12px + env(safe-area-inset-bottom)); z-index:20; display:flex; gap:10px;
    justify-content:center; padding:0 16px; pointer-events:none; }
  .tabs { pointer-events:auto; display:flex; padding:4px; border-radius:999px; flex:0 1 330px;
    background:rgba(255,255,255,.72); border:.5px solid rgba(255,255,255,.6);
    -webkit-backdrop-filter:blur(24px) saturate(1.8); backdrop-filter:blur(24px) saturate(1.8); box-shadow:0 8px 28px rgba(0,0,0,.16); }
  .tab { flex:1; border:0; background:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:1px;
    font-size:.66rem; font-weight:600; color:#3c3c43; padding:6px 4px; border-radius:999px; transition:background .25s, color .25s; }
  .tab svg.ic { width:1.55rem; height:1.55rem; }
  .tab.aktiv { color:var(--blau); background:rgba(118,118,128,.14); }
  .plus { pointer-events:auto; flex-shrink:0; width:60px; height:60px; border-radius:50%; border:.5px solid rgba(255,255,255,.6); cursor:pointer;
    background:rgba(255,255,255,.72); color:var(--blau); display:flex; align-items:center; justify-content:center;
    -webkit-backdrop-filter:blur(24px) saturate(1.8); backdrop-filter:blur(24px) saturate(1.8); box-shadow:0 8px 28px rgba(0,0,0,.16);
    transition:transform .2s cubic-bezier(.3,1.5,.5,1); }
  .plus svg.ic { width:1.75rem; height:1.75rem; stroke-width:2.4; }
  .plus:active, .tab:active { transform:scale(.92); }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .tabs, :root:not([data-theme="light"]) .plus { background:rgba(30,30,32,.72); border-color:rgba(255,255,255,.12); }
    :root:not([data-theme="light"]) .tab { color:rgba(235,235,245,.7); }
    :root:not([data-theme="light"]) .tab.aktiv { color:var(--blau); background:rgba(118,118,128,.28); }
  }

  /* ---- Gruppierte Listen (Einstellungen, Blätter) ---- */
  .grosstitel { font-size:2.1rem; font-weight:700; letter-spacing:-.025em; margin:14px 4px 6px; }
  .gruppe-titel { font-size:.8rem; text-transform:uppercase; letter-spacing:.01em; color:var(--text2); margin:22px 16px 7px; min-height:.5em; }
  .gruppe { background:var(--zelle); border-radius:14px; overflow:hidden; }
  .gruppe-fuss { font-size:.8rem; color:var(--text2); margin:7px 16px 0; line-height:1.35; }
  .gruppe-fuss svg.ic { width:1em; height:1em; vertical-align:-2px; }
  .gruppe-fuss a { color:var(--blau); }
  .zeile { display:flex; align-items:center; gap:12px; min-height:46px; padding:6px 16px; position:relative; width:100%;
    border:0; background:none; text-align:left; color:var(--text); text-decoration:none; font-size:1rem; }
  button.zeile, a.zeile { cursor:pointer; }
  button.zeile:active, a.zeile:active { background:var(--fuell); }
  .zeile + .zeile::before { content:""; position:absolute; top:0; right:0; left:16px; border-top:.5px solid var(--linie); }
  .gruppe.mit-symbol .zeile + .zeile::before { left:58px; }
  .zeile .txt { flex:1; min-width:0; padding:5px 0; }
  .zeile .txt small { display:block; font-size:.82rem; color:var(--text2); margin-top:1px; }
  .zeile .wert { color:var(--text2); white-space:nowrap; }
  .zeile .chev { color:var(--text3); display:flex; } .zeile .chev svg.ic { width:.95em; height:.95em; stroke-width:2.6; }
  .zeile .haken { color:var(--blau); display:flex; } .zeile .haken svg.ic { stroke-width:2.6; }
  .zeile.blau { color:var(--blau); } .zeile.rot { color:var(--rot-voll); justify-content:center; }
  .symbol { width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
  .symbol svg.ic { width:1.05rem; height:1.05rem; stroke-width:2.2; }
  .info-knopf { border:0; background:none; color:var(--blau); cursor:pointer; padding:6px; display:flex; margin-right:-6px; }
  .info-knopf svg.ic { width:1.4rem; height:1.4rem; }
  .app-stand { font-size:.78rem; color:var(--text2); text-align:center; margin:18px 0 0; font-variant-numeric:tabular-nums; }

  /* Schalter wie auf dem iPhone */
  .schalter { position:relative; width:51px; height:31px; flex-shrink:0; }
  .schalter input { opacity:0; width:100%; height:100%; position:absolute; margin:0; cursor:pointer; z-index:2; }
  .schalter .bahn { position:absolute; inset:0; border-radius:16px; background:var(--fuell2); transition:background .25s; }
  .schalter .bahn::after { content:""; position:absolute; top:2px; left:2px; width:27px; height:27px; border-radius:50%; background:#fff;
    box-shadow:0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.16); transition:left .3s cubic-bezier(.3,1.4,.5,1); }
  .schalter input:checked + .bahn { background:var(--gruen-voll); }
  .schalter input:checked + .bahn::after { left:22px; }

  /* Segmente */
  .segment { display:flex; background:var(--fuell); border-radius:9px; padding:2px; gap:2px; width:100%; }
  .segment button { flex:1; border:0; background:none; border-radius:7px; padding:7px 4px; font-size:.86rem; font-weight:500; cursor:pointer;
    color:var(--text); white-space:nowrap; transition:background .2s; min-width:0; overflow:hidden; text-overflow:ellipsis; }
  .segment button.an { background:var(--blatt-zelle); font-weight:600; box-shadow:0 3px 8px rgba(0,0,0,.12), 0 0 0 .5px rgba(0,0,0,.04); }
  .zelle-block { padding:12px 16px; }
  .zelle-block + .zelle-block { border-top:.5px solid var(--linie); }
  .zelle-block > .lbl { font-size:.86rem; color:var(--text2); margin-bottom:8px; display:block; }
  .kapseln { display:flex; flex-wrap:wrap; gap:8px; }
  .chip { border:0; background:var(--fuell); color:var(--text); border-radius:999px; cursor:pointer; padding:8px 14px; font-size:.92rem; font-weight:500;
    transition:background .2s, color .2s, transform .15s; }
  .chip.an { background:var(--blau); color:#fff; font-weight:600; }
  .chip:active { transform:scale(.95); }
  .zeitfein { display:flex; align-items:center; gap:8px; margin-top:10px; font-size:.92rem; color:var(--text2); flex-wrap:wrap; }
  .zeitfein select { width:auto; }
  input[type=text], input[type=search] { width:100%; padding:10px 12px; border:0; border-radius:10px; background:var(--fuell);
    color:var(--text); font-size:max(16px,1rem); font-family:inherit; }
  input[type=number] { width:100%; padding:6px 8px; border:0; border-radius:8px; background:var(--fuell); color:var(--text); font-size:max(16px,1rem); text-align:right; }
  select { padding:6px 10px; border:0; border-radius:8px; background:var(--fuell); color:var(--text); font-size:max(16px,1rem); font-family:inherit; }
  .feld-zeile { display:flex; align-items:center; gap:12px; padding:4px 16px; min-height:46px; }
  .feld-zeile label { width:4.5rem; flex-shrink:0; color:var(--text); }
  .feld-zeile input { background:transparent; padding:10px 0; border-radius:0; }
  .suchfeld { position:relative; }
  .suchfeld svg.ic { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text2); width:1.05rem; height:1.05rem; }
  .suchfeld input { padding-left:34px; }
  .knopf { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:0; border-radius:14px; cursor:pointer;
    padding:14px 18px; font-size:1.02rem; font-weight:600; background:var(--blau); color:#fff; }
  .knopf.breit { width:100%; }
  .knopf.zart { background:var(--akzent-hell); color:var(--blau); }
  .knopf.rot { background:var(--rot-hell); color:var(--rot-voll); }
  .knopf:disabled { opacity:.4; cursor:default; }
  .knopf:active:not(:disabled) { transform:scale(.97); }
  .hinweis { font-size:.86rem; color:var(--text2); }
  .warnung { background:var(--rot-hell); color:var(--rot); border-radius:10px; padding:9px 12px; font-size:.88rem; margin-top:8px; }
  .erfolg { background:var(--gruen-hell); color:var(--gruen); border-radius:10px; padding:9px 12px; font-size:.88rem; margin-top:8px; font-weight:600; }

  /* ---- Blatt von unten ---- */
  .blatt-hg { position:fixed; inset:0; z-index:25; background:rgba(0,0,0,.32); opacity:0; transition:opacity .3s; }
  .blatt-hg.offen { opacity:1; }
  .blatt { position:fixed; left:0; right:0; bottom:0; margin:0 auto; max-width:560px; z-index:26;
    height:calc(100% - 12px - env(safe-area-inset-top)); display:flex; flex-direction:column;
    background:var(--blatt); border-radius:20px 20px 0 0; box-shadow:0 -8px 40px rgba(0,0,0,.22);
    transform:translateY(100%); transition:transform .45s cubic-bezier(.32,.72,0,1); --zelle:var(--blatt-zelle); --karte:var(--blatt-zelle); }
  .blatt.offen { transform:none; }
  .blatt-kopf { padding:6px 8px 8px; touch-action:none; flex-shrink:0; }
  .blatt-kopf .griffleiste { width:36px; height:5px; border-radius:3px; background:var(--text3); margin:0 auto 6px; }
  .blatt-kopf .zeile1 { position:relative; display:flex; align-items:center; justify-content:space-between; min-height:38px; }
  .blatt-kopf h3 { position:absolute; left:50%; transform:translateX(-50%); margin:0; font-size:1.02rem; font-weight:600; text-align:center;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:52%; pointer-events:none; }
  .nav-knopf { border:0; background:none; color:var(--blau); font-size:1.02rem; cursor:pointer; padding:8px; justify-self:start; }
  .nav-knopf.rechts { margin-left:auto; font-weight:600; }
  .nav-knopf:disabled { color:var(--text3); cursor:default; }
  .rollbereich { overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; flex:1;
    padding:0 16px calc(30px + env(safe-area-inset-bottom)); }

  /* Wunsch bearbeiten */
  .ed-kopf { display:flex; flex-direction:column; align-items:center; gap:8px; padding:6px 0 2px; }
  .ed-emoji { width:84px; height:84px; border-radius:24px; border:0; background:var(--zelle); font-size:2.9rem; cursor:pointer;
    box-shadow:0 4px 14px rgba(0,0,0,.08); transition:transform .2s cubic-bezier(.3,1.5,.5,1); }
  .ed-emoji:active { transform:scale(.92); }
  .ed-name { text-align:center; font-size:1.5rem !important; font-weight:700; background:transparent !important; padding:4px 8px !important; letter-spacing:-.02em; }
  .ed-name:focus { background:var(--fuell) !important; }
  .emoji-gitter { display:grid; grid-template-columns:repeat(8,1fr); gap:2px; padding:8px; }
  .emoji-gitter button { border:0; background:none; border-radius:10px; font-size:1.5rem; padding:5px 0; cursor:pointer; }
  .emoji-gitter button.an { background:var(--akzent-hell); }
  .blatt .regel { border:0; padding:0; background:none; }
  .blatt .bausteine { margin-top:0; }
  .blatt .baustein { background:var(--zelle); border:0; border-radius:14px; padding:8px 12px 10px; margin-top:6px; }
  .blatt .baustein.mehrfach { box-shadow:inset 0 0 0 1.5px var(--blau); }
  .blatt .palette .p-chip, .blatt .auswahl button { background:var(--zelle); border-style:solid; border-color:transparent; padding:7px 12px; font-size:.86rem; }
  .blatt .satz { border-radius:14px; padding:10px 12px; margin-top:10px; font-size:.88rem; }
  .blatt .tage { border-top:0; }
  .blatt .tz { padding:8px 16px; border-bottom:.5px solid var(--linie); }
  .blatt .tz:last-child { border-bottom:0; }
  .blatt .tage-zahl { display:none; }
  .modus-aus { background:var(--akzent-hell); border-radius:14px; padding:10px 12px; font-size:.88rem; margin-bottom:8px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .modus-aus > div { flex:1; min-width:170px; }
  .modus-aus button { border:0; border-radius:999px; background:var(--blau); color:#fff; font-weight:600; padding:7px 12px; cursor:pointer; }

  /* Vorlagen */
  .vorlagen { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(9rem, 100%), 1fr)); grid-auto-rows:1fr; gap:10px; }
  .vorlagen button { position:relative; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; gap:10px; min-height:96px; text-align:left;
    border:0; background:var(--zelle); color:var(--text); border-radius:18px; padding:14px; font-size:.98rem; font-weight:600; line-height:1.2; cursor:pointer;
    transition:transform .15s cubic-bezier(.3,1.5,.5,1), box-shadow .2s; }
  .vorlagen button:active:not(:disabled) { transform:scale(.96); }
  .vorlagen .v-emoji { font-size:2rem; line-height:1; }
  .vorlagen .v-name { min-width:0; overflow-wrap:break-word; -webkit-hyphens:manual; hyphens:manual; }
  .vorlagen button:disabled { opacity:.4; cursor:default; }
  .vorlagen button.an { box-shadow:inset 0 0 0 2.5px var(--blau); }
  .vorlagen button.an::after { content:""; position:absolute; top:12px; right:12px; width:22px; height:22px; border-radius:50%;
    background:var(--blau) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5l4 4L18 8'/%3E%3C/svg%3E") center/14px no-repeat; }

  /* Orte */
  .ortskarte { height:220px; border-radius:14px; overflow:hidden; z-index:0; background:var(--fuell); margin-top:16px; }
  .leaflet-container { font:inherit; }
  .ww-marker span { display:block; width:22px; height:22px; border-radius:50%; background:var(--blau); border:3px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,.35); }
  #ort-ergebnisse:empty, #st-ergebnisse:empty { display:none; }

  /* Rückmeldung oben, wie eine Mitteilung */
  .toast { position:fixed; left:0; right:0; margin:0 auto; width:fit-content; max-width:calc(100% - 32px); top:calc(env(safe-area-inset-top) + 10px); z-index:40;
    display:flex; align-items:center; gap:8px; background:rgba(28,28,30,.92); color:#fff; padding:11px 18px; border-radius:22px; font-size:.92rem; font-weight:600; line-height:1.3;
    transform:translateY(-140%) scale(.7); opacity:0; transition:transform .45s cubic-bezier(.32,1.4,.5,1), opacity .25s; pointer-events:none;
    -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px); box-shadow:0 10px 30px rgba(0,0,0,.25); }
  .toast.da { transform:none; opacity:1; }

  /* Modal (vergrößertes Diagramm) */
  .modal-hg { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:30; display:flex; align-items:center; justify-content:center; padding:14px; }

  /* ---- Erster Start ---- */
  .start { position:fixed; inset:0; z-index:35; display:flex; flex-direction:column; justify-content:flex-end; }
  body.start-modus main, body.start-modus nav { visibility:hidden; }
  .start-titel { color:#fff; text-align:center; text-shadow:0 2px 10px rgba(0,0,0,.15); padding:calc(env(safe-area-inset-top) + 56px) 24px 0; margin-bottom:auto; }
  .start-titel .marke { font-size:2.3rem; font-weight:800; letter-spacing:-.03em; }
  .start-titel .claim { font-size:1.1rem; font-weight:500; opacity:.95; margin-top:6px; }
  .start-karte { background:var(--blatt); --zelle:var(--blatt-zelle); border-radius:28px 28px 0 0; padding:24px 20px calc(22px + env(safe-area-inset-bottom));
    max-height:86%; overflow-y:auto; box-shadow:0 -10px 40px rgba(0,0,0,.2); animation:hochfahren .55s cubic-bezier(.32,.72,0,1); max-width:560px; width:100%; margin:0 auto; }
  @keyframes hochfahren { from { transform:translateY(70%); } }
  .start-karte h2 { font-size:1.7rem; font-weight:700; letter-spacing:-.025em; line-height:1.15; margin:0 0 8px; text-align:center; }
  .start-karte > p { margin:0 0 18px; color:var(--text2); font-size:1rem; text-align:center; line-height:1.4; }
  .merkmale { display:flex; flex-direction:column; gap:16px; margin:18px 4px 24px; }
  .merkmal { display:flex; gap:14px; align-items:flex-start; }
  .merkmal .symbol { width:42px; height:42px; border-radius:12px; }
  .merkmal .symbol svg.ic { width:1.4rem; height:1.4rem; }
  .merkmal b { display:block; font-size:1rem; }
  .merkmal span { color:var(--text2); font-size:.92rem; line-height:1.35; }
  .schritte { display:flex; gap:6px; margin:0 auto 18px; width:96px; }
  .schritte i { height:5px; flex:1; border-radius:3px; background:var(--fuell2); }
  .schritte i.an { background:var(--blau); }
  .zustimmung { font-size:.82rem; color:var(--text2); text-align:center; margin:12px 0 0; line-height:1.4; }
  .leise { border:0; background:none; color:var(--blau); cursor:pointer; padding:14px; width:100%; font-size:1rem; }

${BAUSTEINE_CSS}

  @media (prefers-reduced-motion: reduce) {
    .niederschlag, .schneefall, .sterne circle, .wolkenzug, .zelle.neu, .kachel.feier .em, .funke,
    .reiter.sichtbar, .pz.reihe.frisch, .start-karte, .tag.offen .details { animation:none !important; }
    .blatt, .blatt-hg, .toast, #himmel { transition:none; }
  }
</style>
</head>
<body>
<div id="himmel"><div id="himmel-deko"></div></div>
<div class="kompakt" id="kompakt" aria-hidden="true"></div>
<main>
  <!-- ===== Übersicht ===== -->
  <section id="reiter-start" class="reiter sichtbar">
    <header class="wetterkopf" id="start-kopf">
      <button class="ort-knopf" id="ort-knopf" type="button" aria-label="Orte"></button>
      <div id="jetzt"></div>
    </header>
    <div id="held"></div>
    <div id="nudge"></div>
    <section class="kachel" id="plan-karte" style="display:none">
      <div class="kachel-kopf" id="plan-kopf"></div>
      <div id="plan"></div>
      <div class="legende"><span><i style="background:#34c759"></i>passt</span><span><i style="background:#ff9f0a"></i>knapp daneben</span><span><i style="background:rgba(255,255,255,.3)"></i>passt nicht</span></div>
    </section>
  </section>

  <!-- ===== Wetter ===== -->
  <section id="reiter-wetter" class="reiter">
    <div class="ort-chips" id="wetter-orte"></div>
    <header class="wetterkopf" id="wetter-kopf"></header>
    <section class="kachel" id="wetter-stunden-karte" style="display:none"><div class="kachel-kopf" id="wetter-stunden-kopf"></div><div class="stunden" id="wetter-stunden"></div></section>
    <section class="kachel" id="wetter-woche-karte" style="display:none"><div class="kachel-kopf" id="wetter-woche-kopf"></div><div id="wetter-tage"></div></section>
    <p class="quelle" id="wetter-hinweis"></p>
  </section>

  <!-- ===== Einstellungen ===== -->
  <section id="reiter-einstellungen" class="reiter">
    <h1 class="grosstitel" id="einst-titel">Einstellungen</h1>

    <div class="gruppe-titel">Benachrichtigungen</div>
    <div class="gruppe mit-symbol">
      <div class="zeile"><span class="symbol" style="background:var(--rot-voll)" data-ic="glocke"></span><span class="txt">Mitteilungen</span>
        <label class="schalter"><input type="checkbox" id="push-schalter" aria-label="Mitteilungen"><span class="bahn"></span></label></div>
    </div>
    <div id="push-status"></div>
    <p class="gruppe-fuss">Ich melde mich, sobald einer deiner Wünsche zutrifft. <b>iPhone/iPad:</b> zuerst über Teilen → „Zum Home-Bildschirm“ hinzufügen und von dort öffnen.</p>

    <div class="gruppe-titel">Meine Orte</div>
    <div class="gruppe mit-symbol" id="einst-orte"></div>
    <p class="gruppe-fuss">Bis zu 5 Orte. Jeder Wunsch kann einen eigenen Ort haben. Der genaue Punkt bleibt auf diesem Gerät.</p>

    <div class="gruppe-titel">Bausteine</div>
    <div class="gruppe mit-symbol">
      <div class="zeile"><span class="symbol" style="background:var(--gruen-voll)" data-ic="bausteine"></span><span class="txt">Erweiterte Regeln</span>
        <label class="schalter"><input type="checkbox" id="erweitert-schalter" aria-label="Erweiterte Regeln"><span class="bahn"></span></label></div>
    </div>
    <p class="gruppe-fuss" id="erweitert-erklaerung"></p>

    <div class="gruppe-titel">Darstellung</div>
    <div class="gruppe"><div class="zelle-block"><span class="lbl">Textgröße</span><div class="segment" id="schrift-wahl"></div></div></div>

    <div class="gruppe-titel">Rechtliches</div>
    <div class="gruppe mit-symbol">
      <a class="zeile" href="/nutzungsbedingungen"><span class="symbol" style="background:var(--grau)" data-ic="dokument"></span><span class="txt">Nutzungsbedingungen</span><span class="chev" data-ic="rechts"></span></a>
      <a class="zeile" href="/terms" lang="en"><span class="symbol" style="background:var(--grau)" data-ic="dokument"></span><span class="txt">Terms of Use (English)</span><span class="chev" data-ic="rechts"></span></a>
    </div>
    <p class="gruppe-fuss" id="zustimmung-stand"></p>

    <div class="gruppe-titel">Über die App</div>
    <div class="gruppe mit-symbol">
      <button class="zeile" type="button" id="ueber-knopf"><span class="symbol" style="background:var(--blau)" data-ic="info"></span><span class="txt">Was diese App kann</span><span class="chev" data-ic="rechts"></span></button>
    </div>
    <p class="gruppe-fuss">Kostenlos · Wetterdaten: Open-Meteo (CC BY 4.0) · Karte: © OpenStreetMap-Mitwirkende</p>

    <div class="gruppe-titel"></div>
    <div class="gruppe"><button class="zeile rot" type="button" id="loeschen">Alles löschen</button></div>
    <p class="gruppe-fuss">Löscht alles auf diesem Gerät und meldet es vom Wächter ab.</p>
    <p class="app-stand" id="app-stand"></p>
  </section>
</main>

<nav class="tabbar">
  <div class="tabs" role="tablist">
    <button class="tab aktiv" type="button" data-reiter="start" id="tab-start" role="tab"></button>
    <button class="tab" type="button" data-reiter="wetter" id="tab-wetter" role="tab"></button>
    <button class="tab" type="button" data-reiter="einstellungen" id="tab-einst" role="tab"></button>
  </div>
  <button class="plus" type="button" id="plus" aria-label="Neuer Wunsch"></button>
</nav>

<div id="blatt-ziel"></div>
<div id="modal-ziel"></div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
"use strict";
var VAPID_PUBLIC = "${vapidPublic}";
var APP_STAND = "${appStand}";   // Veröffentlichungszeitpunkt dieser Fassung (leer, wenn unbekannt)
var BEDINGUNGEN = "${bedingungenVersion}";   // Fassung der Nutzungsbedingungen, der zugestimmt werden muss

/* ---------- Symbole (angelehnt an die iPhone-Symbole) ---------- */
var IC = {
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  pinVoll: '<path d="M12 2a7.5 7.5 0 0 0-7.5 7.5C4.5 15.2 12 22 12 22s7.5-6.8 7.5-12.5A7.5 7.5 0 0 0 12 2zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4z"/>',
  zahnrad: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plan: '<rect x="3" y="4.5" width="18" height="16" rx="3.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><circle cx="8" cy="14" r=".6" fill="currentColor"/><circle cx="12" cy="14" r=".6" fill="currentColor"/><circle cx="16" cy="14" r=".6" fill="currentColor"/>',
  wetter: '<path d="M12 2.5v2M5.6 5.1l1.4 1.4M3 11.5h2M18.4 5.1L17 6.5"/><path d="M8 13a4.5 4.5 0 0 1 8.6-1.9A3.8 3.8 0 1 1 17.2 19H8.5A3.2 3.2 0 0 1 8 13z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  zu: '<path d="M6 6l12 12M18 6L6 18"/>',
  rechts: '<path d="M9 5l7 7-7 7"/>',
  runter: '<path d="M6 9l6 6 6-6"/>',
  haken: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  glocke: '<path d="M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15 6 8.5"/><path d="M10.2 20.5a2 2 0 0 0 3.6 0"/>',
  ort: '<path d="M3.5 11.2l16.8-7.5-7.5 16.8-1.9-7.4z"/>',
  schloss: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  lupe: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".7" fill="currentColor"/>',
  dokument: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  bausteine: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  stern: '<path d="M12 3.5l2.4 5.6 6.1.5-4.6 4 1.4 5.9L12 16.4l-5.3 3.1 1.4-5.9-4.6-4 6.1-.5z"/>',
  uhr: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  kalender: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
};
function ic(name, voll) { return '<svg class="ic' + (voll ? " voll" : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + IC[name] + '</svg>'; }
Array.prototype.forEach.call(document.querySelectorAll("[data-ic]"), function (el) { el.innerHTML = ic(el.dataset.ic); });

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
                nudgeWeg:false, schrift:17, erweitert:true, gefeiert:"" };
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
function toast(text, symbol) {
  var t = $("toast"); t.innerHTML = (symbol ? ic(symbol) : "") + "<span>" + sicher(text) + "</span>"; t.classList.add("da");
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("da"); }, 2300);
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
var SCHRIFTGROESSEN = [[15, "Klein"], [17, "Normal"], [19, "Groß"], [22, "Sehr groß"]];
function wendeSchriftAn() {
  var px = Number(zustand.schrift);
  if (!SCHRIFTGROESSEN.some(function (g) { return g[0] === px; })) px = 17;
  document.documentElement.style.fontSize = px + "px";
}
wendeSchriftAn();
function zeichneSchriftwahl() {
  var ziel = $("schrift-wahl"); ziel.innerHTML = "";
  var px = SCHRIFTGROESSEN.some(function (g) { return g[0] === Number(zustand.schrift); }) ? Number(zustand.schrift) : 17;
  SCHRIFTGROESSEN.forEach(function (g) {
    var knopf = document.createElement("button"); knopf.type = "button"; knopf.textContent = g[1];
    if (px === g[0]) knopf.className = "an";
    knopf.addEventListener("click", function () { zustand.schrift = g[0]; tick(); speichere(); wendeSchriftAn(); zeichneSchriftwahl(); });
    ziel.appendChild(knopf);
  });
}
function zeichneAppStand() {
  var d = APP_STAND ? new Date(APP_STAND) : null;
  $("app-stand").textContent = (!d || isNaN(d.getTime())) ? "App-Stand: unbekannt"
    : "App-Stand: " + d.toLocaleString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) + " Uhr";
}

/* ---------- Reiter + kompakte Kopfzeile ---------- */
function sichtbarerReiter() { var r = document.querySelector(".reiter.sichtbar"); return r ? r.id.replace("reiter-", "") : ""; }
function zeigeReiter(name) {
  Array.prototype.forEach.call(document.querySelectorAll(".reiter"), function (r) { r.classList.remove("sichtbar"); });
  $("reiter-" + name).classList.add("sichtbar");
  Array.prototype.forEach.call(document.querySelectorAll("nav .tab"), function (k) {
    var an = k.dataset.reiter === name; k.classList.toggle("aktiv", an); k.setAttribute("aria-selected", an ? "true" : "false");
  });
  document.body.classList.toggle("flach", name === "einstellungen");
  if (name === "wetter") zeichneWetterReiter();
  if (name === "einstellungen") zeichneEinstellungen();
  window.scrollTo(0, 0); pruefeKompakt();
}
[["tab-start", "plan", "Übersicht"], ["tab-wetter", "wetter", "Wetter"], ["tab-einst", "zahnrad", "Einstellungen"]].forEach(function (t) {
  var k = $(t[0]); k.innerHTML = ic(t[1]) + t[2];
  k.addEventListener("click", function () { tick(); zeigeReiter(k.dataset.reiter); });
});
$("plus").innerHTML = ic("plus");
$("plus").addEventListener("click", function () { tick(); oeffneNeuerWunsch(); });
var kompaktStartText = "", kompaktWetterText = "";
function pruefeKompakt() {
  var r = sichtbarerReiter(), k = $("kompakt"), grenze = r === "einstellungen" ? 40 : 170;
  var text = r === "einstellungen" ? "Einstellungen" : (r === "wetter" ? kompaktWetterText : kompaktStartText);
  k.textContent = text || "";
  k.classList.toggle("da", window.scrollY > grenze && !!text);
}
window.addEventListener("scroll", pruefeKompakt, { passive: true });

/* ---------- Himmel-Hintergrund + Tag/Nacht nach Sonnenauf-/-untergang ---------- */
/* Daten des Standard-Orts: bestimmen Himmel, Kopf und Übersicht */
var hStunden = null, hSonne = null, hVersatz = 0, hTage = [];
var letzteTreffer = null, letzteKnapp = null, letzteStand = null;
function zeitZuMinuten(iso) { return parseInt(iso.slice(11, 13), 10) * 60 + parseInt(iso.slice(14, 16), 10); }
function lokalJetzt(versatz) { return new Date(Date.now() + ((versatz == null ? hVersatz : versatz) || 0) * 1000); }
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
  tag: { klar:["#2f7fd8","#5b9fe3","#8fc0ec"], leicht:["#3a85d6","#6aa5e0","#9dc5ea"],
         wolkig:["#6f8aa6","#8aa2bb","#a9bccf"], nebel:["#7d8b99","#98a5b2","#b3bdc7"],
         regen:["#4f6580","#6a8099","#8698ae"], gewitter:["#38435a","#55637a","#717f94"],
         schnee:["#7890aa","#94a8bd","#b4c3d2"] },
  daemmerung: { klar:["#f08a5d","#d77d97","#5d5f9c"], leicht:["#ec8c66","#d27e98","#5c5e9b"],
         wolkig:["#c4806a","#a77d8f","#585b80"], nebel:["#b38f84","#9e8f98","#5d6280"],
         regen:["#937462","#847382","#4f5574"], gewitter:["#785e56","#6b5e6e","#424862"],
         schnee:["#b0897d","#9b8f9c","#5d6082"] },
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
  return "linear-gradient(180deg," + f[0] + " 0%," + f[1] + " 55%," + f[2] + " 100%)";
}
function svgWolke(x, y, s) {
  return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">'
    + '<ellipse cx="0" cy="0" rx="10" ry="6.2"/><ellipse cx="-7.6" cy="2.2" rx="8" ry="5"/>'
    + '<ellipse cx="8.4" cy="2.6" rx="7.2" ry="4.4"/><rect x="-15" y="1.4" width="30" height="5.4" rx="2.7"/></g>';
}
function svgWolken(z, gross) {
  var f = WOLKEN_FARBEN[z.phase][z.wetter], teile;
  // Wolken oben am Rand: hinter dem Kopf mit weißer Schrift wären sie störend
  if (gross === 1) teile = [[14, 9, 0.75]];
  else if (gross === 2) teile = [[12, 10, 0.95], [92, 34, 0.7], [56, 3, 0.6]];
  else teile = [[14, 9, 1.1], [90, 32, 0.85], [55, 2, 0.75]];
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
      + ' opacity="' + (nacht ? ".5" : ".55") + '">' + inhalt + '</g>';
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
  return '<circle cx="82" cy="14" r="14" fill="url(#mondschein)"/>'
    + '<rect width="100" height="130" fill="#eef4ff" mask="url(#mondmaske)"/>';
}
function himmelDeko(z) {
  var w = z.wetter, offen = (w === "klar" || w === "leicht"), teile = "";
  var warm = z.phase === "daemmerung";
  var farben = warm
    ? '<stop offset="0" stop-color="#fff1d6" stop-opacity=".7"/><stop offset=".35" stop-color="#ffc98a" stop-opacity=".38"/><stop offset="1" stop-color="#ff9e6d" stop-opacity="0"/>'
    : '<stop offset="0" stop-color="#fffbe8" stop-opacity=".5"/><stop offset=".35" stop-color="#ffeaa0" stop-opacity=".24"/><stop offset="1" stop-color="#ffd979" stop-opacity="0"/>';
  var defs = '<defs><radialGradient id="sonnenschein">' + farben + '</radialGradient>'
    + '<radialGradient id="mondschein"><stop offset="0" stop-color="#dce8ff" stop-opacity=".26"/>'
    + '<stop offset=".45" stop-color="#cfdcf5" stop-opacity=".12"/>'
    + '<stop offset="1" stop-color="#dce8ff" stop-opacity="0"/></radialGradient>'
    + '<mask id="mondmaske"><rect width="100" height="130" fill="#000"/>'
    + '<circle cx="82" cy="14" r="5.5" fill="#fff"/><circle cx="79" cy="11.8" r="4.9" fill="#000"/></mask>'
    + '<filter id="weich" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation=".6"/></filter></defs>';
  if (z.nacht) { if (offen) teile += svgSterne() + svgMond(); }
  else if (warm) { teile += svgSonne(80, 70, 38, "#ffdba0", 7); }
  else if (offen) { teile += svgSonne(86, 8, 30, "#fffcea", 5.6); }
  else if (w === "wolkig" || w === "nebel") { teile += '<g opacity=".35">' + svgSonne(86, 8, 26, "#fff8dc", 5) + '</g>'; }
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
  $("himmel").style.background = himmelVerlauf(z);
  var deko = $("himmel-deko"), neu = himmelDeko(z);
  if (deko.dataset.stand !== neu.schluessel) { deko.dataset.stand = neu.schluessel; deko.innerHTML = neu.svg; }
  // Auf hellem Himmel brauchen die Kacheln mehr Tönung, damit die weiße Schrift lesbar bleibt
  var hell = !z.nacht && (z.wetter === "wolkig" || z.wetter === "nebel" || z.wetter === "schnee");
  document.documentElement.style.setProperty("--kachel", z.nacht ? "rgba(255,255,255,.08)" : (hell ? "rgba(20,32,52,.3)" : "rgba(18,42,78,.22)"));
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
/* Kopf wie in der Wetter-App: große Temperatur, Lage, Höchst-/Tiefstwert */
function kopfHtml(stunden, tage, versatz, laden) {
  var idx = stundeIndex(stunden, lokalJetzt(versatz));
  if (!stunden || idx === null) return '<div class="laden">' + (laden || "") + '</div>';
  var heute = null, h = lokalJetzt(versatz).toISOString().slice(0, 10);
  (tage || []).forEach(function (t) { if (t.datum === h) heute = t; });
  var art = wetterArt(stunden.weather_code ? stunden.weather_code[idx] : null);
  var lage = LAGE_TEXT[art];
  var stunde = lokalJetzt(versatz).getUTCHours();
  if (art === "klar" && stunde >= 7 && stunde <= 19) lage = "Sonnig";
  return '<div class="grad">' + Math.round(stunden.temperature_2m[idx]) + '°</div><div class="lage">' + lage + '</div>'
    + (heute ? '<div class="ht">H: ' + heute.tempMax + '°  T: ' + heute.tempMin + '°</div>' : "");
}

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
  $("ort-knopf").innerHTML = '<span class="nam">' + (s ? sicher(s.name) : "Ort wählen") + '</span>' + ic("runter");
  $("jetzt").innerHTML = s ? kopfHtml(hStunden, hTage, hVersatz, "Lade Wetter …") : "";
  var idx = stundeIndex(hStunden, lokalJetzt());
  kompaktStartText = s ? s.name + (idx !== null ? " · " + Math.round(hStunden.temperature_2m[idx]) + "°" : "") : "";
}
$("ort-knopf").addEventListener("click", function () { tick(); if (standardOrt()) oeffneOrteListe(); else oeffneOrtBlatt(null); });

function trefferAm(i, datum) {
  var st = letzteStand && letzteStand[i]; if (!st) return null;
  for (var k = 0; k < st.length; k++) if (st[k].datum === datum) return st[k];
  return null;
}
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
  if (art === "ja") return wann + e.von + "–" + e.bis + " Uhr passt alles, ca. " + e.temp + "°";
  if (art === "fast" || art === "nein") return wann + grundKurz(e.knapp) + (e.knapp.uhr != null ? " (am ehesten um " + e.knapp.uhr + " Uhr)" : "");
  if (art === "vorbei") return wann + "heute keine passende Stunde mehr";
  if (!regel.aktiv) return wann + "Wunsch ist ausgeschaltet";
  return wann + "außerhalb des Vorschau-Fensters (" + fensterText(regel.zeitfensterStunden || 48) + ")";
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
    html += '<div class="pz reihe' + (regel.aktiv ? "" : " inaktiv") + (frischeRegel === i ? " frisch" : "") + '">'
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
  $("plan-kopf").innerHTML = ic("kalender") + "Diese Woche" + '<span class="rechts" id="momente">'
    + (letzteStand ? "<b>" + momente + "</b> " + (momente === 1 ? "guter Moment" : "gute Momente") : "") + '</span>';
  Array.prototype.forEach.call(ziel.querySelectorAll("[data-oeffne]"), function (b) {
    b.addEventListener("click", function () { tick(); oeffneEditor(parseInt(b.dataset.oeffne, 10)); });
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
    ziel.innerHTML = '<div class="kachel"><div class="held"><div class="txt"><b>Wo soll ich nach dem Wetter schauen?</b>'
      + '<button class="held-knopf" type="button" id="held-ort">' + ic("pin") + 'Ort wählen</button></div></div></div>';
    $("held-ort").addEventListener("click", function () { oeffneOrtBlatt(null); });
    return;
  }
  if (!zustand.regeln.length) {
    ziel.innerHTML = '<div class="kachel"><div class="kachel-kopf">' + ic("stern") + 'Los geht’s</div><div class="held"><div class="txt"><b>Was wünschst du dir vom Wetter?</b>'
      + '<span class="sub">Ich sage dir Bescheid, sobald es passt.</span>'
      + '<button class="held-knopf" type="button" id="held-neu">' + ic("plus") + 'Ersten Wunsch anlegen</button></div></div></div>';
    $("held-neu").addEventListener("click", oeffneNeuerWunsch);
    return;
  }
  if (!letzteStand) { ziel.innerHTML = '<div class="kachel"><div class="kachel-kopf">' + ic("stern") + 'Heute</div><div class="held"><div class="txt"><b>Ich schaue nach …</b><span class="sub">Gleich weißt du, wann es passt.</span></div></div></div>'; return; }
  var h = heuteIso(), heute = [], naechste = null, knappste = null;
  zustand.regeln.forEach(function (r, i) {
    if (!r.aktiv) return;
    (letzteStand[i] || []).forEach(function (e) {
      if (e.treffer && e.datum === h) heute.push({ r: r, e: e });
      if (e.treffer && (!naechste || e.datum < naechste.e.datum)) naechste = { r: r, e: e };
      if (e.knapp && istKnapp(e.knapp) && !knappste) knappste = { r: r, e: e };
    });
  });
  var em, kopf, titel, sub, feiern = false;
  if (heute.length) {
    em = heute[0].r.emoji; feiern = true; kopf = "Heute passt’s";
    titel = heute[0].r.name;
    sub = heute[0].e.von + "–" + heute[0].e.bis + " Uhr · " + heute[0].e.temp + "°"
      + (heute.length > 1 ? " · +" + (heute.length - 1) + (heute.length === 2 ? " weiterer" : " weitere") : "");
  } else if (naechste) {
    em = naechste.r.emoji; kopf = "Als Nächstes"; titel = naechste.r.name;
    sub = tagWort(naechste.e.datum) + ", " + naechste.e.von + "–" + naechste.e.bis + " Uhr · " + naechste.e.temp + "°";
  } else if (knappste) {
    em = knappste.r.emoji; kopf = "Knapp daneben"; titel = "Gerade passt nichts";
    sub = knappste.r.name + " am " + TAGLANG[wochentag(knappste.e.datum)] + ": " + grundKurz(knappste.e.knapp);
  } else {
    em = "🔭"; kopf = "Diese Woche"; titel = "Gerade passt nichts"; sub = "Ich halte weiter Ausschau und melde mich.";
  }
  ziel.innerHTML = '<div class="kachel"><div class="kachel-kopf">' + ic("stern") + sicher(kopf) + '</div><div class="held"><span class="em">' + sicher(em) + '</span>'
    + '<div class="txt"><b>' + sicher(titel) + '</b><span class="sub">' + sicher(sub) + '</span></div></div></div>';
  // Einmal am Tag gibt es eine kleine Feier, wenn ein Wunsch heute wahr wird
  if (feiern && zustand.gefeiert !== h) { zustand.gefeiert = h; speichere(); feiere(ziel.firstChild); }
}
function feiere(el) {
  if (!el) return;
  el.classList.add("feier");
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var farben = ["#ffd60a", "#ff9f0a", "#30d158", "#64d2ff", "#ffffff", "#ff375f"];
  for (var k = 0; k < 16; k++) {
    var f = document.createElement("span"); f.className = "funke";
    var w = (k / 16) * Math.PI * 2, r = 50 + (k % 3) * 22;
    f.style.setProperty("--x", Math.round(Math.cos(w) * r) + "px");
    f.style.setProperty("--y", Math.round(Math.sin(w) * r * 0.65) + "px");
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
  ziel.innerHTML = '<div class="kachel nudge"><span class="ic-kreis">' + ic("glocke") + '</span>'
    + '<span class="txt">Bescheid sagen, wenn es passt?</span>'
    + '<button class="ja" type="button" id="nudge-an">Ja</button>'
    + '<button class="weg" type="button" id="nudge-weg" aria-label="Später">' + ic("zu") + '</button></div>';
  $("nudge-an").addEventListener("click", function () { $("push-schalter").checked = true; benachrichtigungAn(); });
  $("nudge-weg").addEventListener("click", function () { zustand.nudgeWeg = true; speichere(); zeichneNudge(); });
}
function zeichneUebersicht() { zeichneKopf(); zeichneHeld(); zeichneNudge(); zeichnePlan(); pruefeKompakt(); }

/* ---------- Blatt von unten ---------- */
var blatt = null;   // { el, hg, inhalt, beimSchliessen }
/* opts: { links:"Abbrechen", rechts:"Fertig", rechtsAktion:fn } */
function oeffneBlatt(titel, beimSchliessen, opts) {
  opts = opts || {};
  schliesseBlatt(true);
  var hg = document.createElement("div"); hg.className = "blatt-hg";
  var el = document.createElement("div"); el.className = "blatt"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  el.innerHTML = '<div class="blatt-kopf"><div class="griffleiste"></div><div class="zeile1">'
    + (opts.links ? '<button class="nav-knopf links" type="button">' + opts.links + '</button>' : "<span></span>")
    + '<h3></h3><button class="nav-knopf rechts zu" type="button">' + (opts.rechts || "Fertig") + '</button></div></div><div class="rollbereich"></div>';
  el.querySelector("h3").innerHTML = titel || "";
  $("blatt-ziel").appendChild(hg); $("blatt-ziel").appendChild(el);
  blatt = { el: el, hg: hg, inhalt: el.querySelector(".rollbereich"), beimSchliessen: beimSchliessen };
  hg.addEventListener("click", function () { schliesseBlatt(); });
  if (opts.links) el.querySelector(".nav-knopf.links").addEventListener("click", function () { schliesseBlatt(); });
  el.querySelector(".nav-knopf.rechts").addEventListener("click", function () { if (opts.rechtsAktion) opts.rechtsAktion(); else schliesseBlatt(); });
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
  setTimeout(function () { b.el.remove(); b.hg.remove(); }, 450);
}
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && blatt && !document.getElementById("zieh-geist")) schliesseBlatt(); });
/* Bausteine für gruppierte Listen */
function gruppenTitel(ziel, text) { var t = document.createElement("div"); t.className = "gruppe-titel"; t.textContent = text; ziel.appendChild(t); return t; }
function gruppe(ziel, klasse) { var g = document.createElement("div"); g.className = "gruppe" + (klasse ? " " + klasse : ""); ziel.appendChild(g); return g; }
function fuss(ziel, html) { var p = document.createElement("p"); p.className = "gruppe-fuss"; p.innerHTML = html; ziel.appendChild(p); return p; }
function zeile(ziel, html, beiKlick, klasse) {
  var z = document.createElement(beiKlick ? "button" : "div"); if (beiKlick) z.type = "button";
  z.className = "zeile" + (klasse ? " " + klasse : ""); z.innerHTML = html;
  if (beiKlick) z.addEventListener("click", beiKlick);
  ziel.appendChild(z); return z;
}
function segment(werte, aktuell, beiWahl) {
  var s = document.createElement("div"); s.className = "segment"; s.setAttribute("role", "radiogroup");
  werte.forEach(function (w) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = w[1]; b.setAttribute("role", "radio");
    var an = w[0] === aktuell; b.className = an ? "an" : ""; b.setAttribute("aria-checked", an ? "true" : "false");
    b.addEventListener("click", function () { tick(); beiWahl(w[0]); });
    s.appendChild(b);
  });
  return s;
}
function chip(text, an, beiKlick) {
  var b = document.createElement("button"); b.type = "button"; b.className = "chip" + (an ? " an" : ""); b.textContent = text;
  b.addEventListener("click", beiKlick); return b;
}

/* ---------- Neuer Wunsch ---------- */
function trennbar(name) { return name.replace(/\\B(tag|creme|wetter|warnung)\\b/gi, "&shy;$1"); }
function vorlageZuRegel(v) {
  return { name:v.name, emoji:v.emoji, aktiv:true, zeitfensterStunden:168,
    nurVonUhr:v.nurVonUhr, nurBisUhr:v.nurBisUhr, mindestdauerStunden:v.mindestdauerStunden,
    haeufigkeit:v.haeufigkeit || "taeglich", ortId: zustand.standardOrt,
    bausteine:JSON.parse(JSON.stringify(v.bausteine)), bedingungen:{} };
}
function vorlagenGitter(beiWahl, gesperrt) {
  var gitter = document.createElement("div"); gitter.className = "vorlagen";
  VORLAGEN.forEach(function (v) {
    var b = document.createElement("button"); b.type = "button";
    b.innerHTML = '<span class="v-emoji">' + sicher(v.emoji) + '</span><span class="v-name">' + trennbar(sicher(v.name)) + '</span>';
    b.disabled = !!(gesperrt && gesperrt(v));
    b.addEventListener("click", function () { beiWahl(v, b); });
    gitter.appendChild(b);
  });
  return gitter;
}
function oeffneNeuerWunsch() {
  if (!standardOrt()) { oeffneOrtBlatt(null); return; }
  var ziel = oeffneBlatt("Neuer Wunsch", null, { links: "Abbrechen", rechts: "Weiter" });
  var rechts = blatt.el.querySelector(".nav-knopf.rechts"); rechts.style.visibility = "hidden";
  gruppenTitel(ziel, "Vorlagen");
  ziel.appendChild(vorlagenGitter(function (v) { legeWunschAn(vorlageZuRegel(v)); },
    function (v) { return zustand.regeln.some(function (r) { return r.name === v.name; }); }));
  gruppenTitel(ziel, "");
  zeile(gruppe(ziel, "mit-symbol"), '<span class="symbol" style="background:var(--indigo)">' + ic("stern") + '</span><span class="txt">Eigener Wunsch</span><span class="chev">' + ic("rechts") + '</span>',
    function () { zeigeEigenenWunsch(ziel); }, "eigene");
}
function zeigeEigenenWunsch(ziel) {
  var gewaehlt = "⭐";
  ziel.innerHTML = "";
  blatt.el.querySelector("h3").textContent = "Eigener Wunsch";
  var alt = blatt.el.querySelector(".nav-knopf.rechts"), rechts = alt.cloneNode(true);
  alt.parentNode.replaceChild(rechts, alt);
  rechts.style.visibility = ""; rechts.id = "ew-ok";
  gruppenTitel(ziel, "Name");
  var g = gruppe(ziel);
  g.innerHTML = '<div class="zelle-block"><input type="text" id="ew-name" placeholder="z. B. Grillabend" maxlength="40"></div>';
  gruppenTitel(ziel, "Symbol");
  var eg = gruppe(ziel, "emoji-gitter"); eg.id = "ew-gitter";
  eg.innerHTML = EMOJI_AUSWAHL.map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join("");
  function markiere() { Array.prototype.forEach.call(eg.querySelectorAll("button"), function (b) { b.classList.toggle("an", b.dataset.e === gewaehlt); }); }
  markiere();
  Array.prototype.forEach.call(eg.querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () { gewaehlt = b.dataset.e; markiere(); tick(); });
  });
  $("ew-name").focus();
  rechts.addEventListener("click", function () {
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
  oeffneBlatt(sicher(regel.name), function () { zeichneUebersicht(); });
  editorIndex = i;
  baueEditor();
}
function baueEditor() {
  if (!blatt || editorIndex === null) return;
  var i = editorIndex, regel = zustand.regeln[i], ziel = blatt.inhalt, scroll = ziel.scrollTop;
  blatt.el.querySelector("h3").textContent = regel.name;
  ziel.innerHTML = "";
  var huelle = document.createElement("div"); huelle.className = "regel"; huelle.dataset.regelkarte = i;

  // Kopf: großes Symbol, Name
  var kopf = document.createElement("div"); kopf.className = "ed-kopf";
  kopf.innerHTML = '<button class="ed-emoji" type="button" aria-label="Symbol ändern">' + sicher(regel.emoji) + '</button>'
    + '<input type="text" class="ed-name" maxlength="40" value="' + sicher(regel.name) + '" aria-label="Name">';
  kopf.querySelector(".ed-emoji").addEventListener("click", function () { emojiOffen = !emojiOffen; tick(); baueEditor(); });
  kopf.querySelector(".ed-name").addEventListener("change", function () {
    regel.name = this.value.trim() || "Mein Wunsch"; speichere(); zeichneUebersicht(); syncWennAktiv(); blatt.el.querySelector("h3").textContent = regel.name;
  });
  huelle.appendChild(kopf);
  if (emojiOffen) {
    var eg = gruppe(huelle, "emoji-gitter"); eg.style.marginTop = "10px";
    eg.innerHTML = EMOJI_AUSWAHL.map(function (e) { return '<button type="button" data-e="' + e + '" class="' + (e === regel.emoji ? "an" : "") + '">' + e + '</button>'; }).join("");
    Array.prototype.forEach.call(eg.querySelectorAll("button"), function (b) {
      b.addEventListener("click", function () { regel.emoji = b.dataset.e; emojiOffen = false; tick(); speichere(); zeichneUebersicht(); syncWennAktiv(); baueEditor(); });
    });
  }
  gruppenTitel(huelle, "");
  var an = gruppe(huelle, "mit-symbol");
  zeile(an, '<span class="symbol" style="background:var(--gruen-voll)">' + ic("glocke") + '</span><span class="txt">Wunsch ist aktiv</span>'
    + '<label class="schalter"><input type="checkbox" id="ed-aktiv" ' + (regel.aktiv ? "checked" : "") + ' aria-label="Wunsch ist aktiv"><span class="bahn"></span></label>');
  an.querySelector("#ed-aktiv").addEventListener("change", function () {
    regel.aktiv = this.checked; tick(); speichere(); zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
    toast(regel.aktiv ? "Wunsch ist an" : "Wunsch ist aus"); $("ed-woche").innerHTML = wocheHtml(i);
  });

  // Diese Woche
  gruppenTitel(huelle, "Diese Woche");
  var woche = gruppe(huelle); woche.id = "ed-woche"; woche.innerHTML = wocheHtml(i);

  // Ort
  gruppenTitel(huelle, "Ort");
  var wo = gruppe(huelle); wo.id = "ed-orte";
  var aktuellerOrt = ortVon(regel);
  zustand.orte.forEach(function (o) {
    var gew = aktuellerOrt && aktuellerOrt.id === o.id;
    var z = zeile(wo, '<span class="txt">' + sicher(o.name) + (o.stadt && o.stadt !== o.name ? "<small>" + sicher(o.stadt) + "</small>" : "") + '</span>'
      + (gew ? '<span class="haken">' + ic("haken") + '</span>' : ""), function () {
      regel.ortId = o.id; tick(); speichere(); zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
    }, gew ? "gewaehlt" : "");
    z.dataset.ort = o.id;
  });
  if (zustand.orte.length < MAX_ORTE) zeile(wo, '<span class="txt">Neuer Ort …</span>', function () { oeffneOrtBlatt(null, i); }, "blau neu-ort");

  // Zeit
  gruppenTitel(huelle, "Zeit");
  var zeitG = gruppe(huelle);
  var von = regel.nurVonUhr != null ? regel.nurVonUhr : 0, bis = regel.nurBisUhr != null ? regel.nurBisUhr : 24;
  var block = document.createElement("div"); block.className = "zelle-block";
  block.innerHTML = '<span class="lbl">Tageszeit</span>';
  var wann = document.createElement("div"); wann.className = "kapseln"; wann.id = "ed-wann";
  TAGESZEITEN.forEach(function (tz, k) {
    var gew = von <= tz[1] && bis >= tz[2] && !(von === 0 && bis === 24);
    wann.appendChild(chip(tz[0], gew, function () {
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
  block.appendChild(wann);
  var fein = document.createElement("div"); fein.className = "zeitfein";
  var uhrOpt = function (wert, ab, bisZ) { var s = ""; for (var u = ab; u <= bisZ; u++) s += '<option value="' + u + '"' + (u === wert ? " selected" : "") + '>' + u + ' Uhr</option>'; return s; };
  fein.innerHTML = 'von <select data-f="nurVonUhr" aria-label="von">' + uhrOpt(von, 0, 23) + '</select> bis <select data-f="nurBisUhr" aria-label="bis">' + uhrOpt(bis, 1, 24) + '</select>';
  Array.prototype.forEach.call(fein.querySelectorAll("select"), function (sel) {
    sel.addEventListener("change", function () {
      regel[sel.dataset.f] = parseInt(sel.value, 10);
      if (regel.nurBisUhr <= regel.nurVonUhr) { if (sel.dataset.f === "nurVonUhr") regel.nurBisUhr = Math.min(24, regel.nurVonUhr + 1); else regel.nurVonUhr = Math.max(0, regel.nurBisUhr - 1); }
      speichere(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
    });
  });
  block.appendChild(fein);
  zeitG.appendChild(block);
  var dauerBlock = document.createElement("div"); dauerBlock.className = "zelle-block"; dauerBlock.id = "ed-dauer";
  dauerBlock.innerHTML = '<span class="lbl">Mindestens am Stück</span>';
  var md = regel.mindestdauerStunden || 2;
  var dauerWerte = DAUERN.map(function (d) { return [d, d + " Std."]; });
  if (DAUERN.indexOf(md) < 0) dauerWerte.push([md, md + " Std."]);
  dauerBlock.appendChild(segment(dauerWerte, md, function (d) {
    regel.mindestdauerStunden = d; speichere(); aktualisiereVorschau(); syncWennAktiv(); baueEditor();
  }));
  zeitG.appendChild(dauerBlock);

  // Wetter (Bausteine)
  gruppenTitel(huelle, "Wetter");
  if (!erweitert) {
    var mh = document.createElement("div"); mh.className = "modus-aus";
    mh.innerHTML = '<div><b>Erweiterte Regeln sind aus</b> – alle Bausteine sind mit „und“ verknüpft, „+ oder“ und Ziehen fehlen.</div>'
      + '<button type="button">Einschalten</button>';
    mh.querySelector("button").addEventListener("click", function () { erweitert = true; zustand.erweitert = true; speichere(); zeichneModusSchalter(); baueEditor(); });
    huelle.appendChild(mh);
  }
  baueBausteinBereich(huelle, regel, i);
  baueSatzUndWarnung(huelle, regel);

  // Benachrichtigung
  gruppenTitel(huelle, "Benachrichtigung");
  var bg = gruppe(huelle);
  var fw = document.createElement("div"); fw.className = "zelle-block"; fw.id = "ed-fenster";
  fw.innerHTML = '<span class="lbl">Vorausschauen</span>';
  fw.appendChild(segment(FENSTER_OPTIONEN.map(function (o) { return [o[0], o[1].replace(" Tage", " T.").replace(" Tag", " T.")]; }),
    regel.zeitfensterStunden || 48, function (h) { regel.zeitfensterStunden = h; speichere(); aktualisiereVorschau(); syncWennAktiv(); baueEditor(); }));
  bg.appendChild(fw);
  var hf = document.createElement("div"); hf.className = "zelle-block"; hf.id = "ed-haeufigkeit";
  hf.innerHTML = '<span class="lbl">Wie oft</span>';
  hf.appendChild(segment([["taeglich", "Einmal am Tag"], ["stuendlich", "Stündlich"]], regel.haeufigkeit || "taeglich",
    function (w) { regel.haeufigkeit = w; speichere(); syncWennAktiv(); baueEditor(); }));
  bg.appendChild(hf);
  fuss(huelle, (regel.haeufigkeit || "taeglich") === "stuendlich" ? "Jede Stunde eine Mitteilung, solange es passt – gut für Warnungen." : "Höchstens eine Mitteilung pro Tag, an dem es passt.");

  gruppenTitel(huelle, "");
  zeile(gruppe(huelle, "loesch-zeile"), "Wunsch löschen", function () {
    if (!confirm("„" + regel.name + "“ wirklich löschen?")) return;
    zustand.regeln.splice(i, 1); geoeffneteZelle = null; speichere();
    // Ergebnisse der übrigen Wünsche bleiben an ihrem Platz, bis die neue Vorschau da ist
    [letzteStand, letzteTreffer, letzteKnapp].forEach(function (l) { if (l) l.splice(i, 1); });
    schliesseBlatt(); toast("Gelöscht"); zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
  }, "rot");

  ziel.appendChild(huelle);
  ziel.scrollTop = scroll;
}
function wocheHtml(i) {
  var regel = zustand.regeln[i];
  var p = function (t) { return '<div class="zelle-block hinweis">' + t + '</div>'; };
  if (!regel.aktiv) return p("Ausgeschaltet – wird nicht geprüft.");
  if (!letzteStand) return p("Prüfe …");
  var st = letzteStand[i];
  if (!st || !st.length) return p("Im Vorschau-Fenster gibt es keine prüfbare Stunde mehr.");
  return standHtml(st);
}
/* Vom Baustein-Editor erwartet */
function zeichneAlles() { zeichneUebersicht(); baueEditor(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge(); }
var vorschauTimer = null;
function vorschauLangsam() { clearTimeout(vorschauTimer); vorschauTimer = setTimeout(aktualisiereVorschau, 700); syncWennAktiv(); }

/* ---------- Orte ---------- */
function ortUntertitel(o) {
  var n = wuenscheAnOrt(o.id);
  return [o.id === zustand.standardOrt ? "Standard" : "", o.stadt && o.stadt !== o.name ? o.stadt : "", n + (n === 1 ? " Wunsch" : " Wünsche")].filter(Boolean).join(" · ");
}
function zeichneEinstOrte() {
  var ziel = $("einst-orte"); ziel.innerHTML = "";
  zustand.orte.forEach(function (o) {
    var z = zeile(ziel, '<span class="symbol" style="background:var(--blau)">' + ic("pinVoll", true) + '</span><span class="txt">' + sicher(o.name)
      + '<small>' + sicher(ortUntertitel(o)) + '</small></span><span class="chev">' + ic("rechts") + '</span>', function () { oeffneOrtBlatt(o.id); }, "ort-eintrag");
    z.dataset.ort = o.id;
  });
  if (zustand.orte.length < MAX_ORTE) zeile(ziel, '<span class="symbol" style="background:var(--fuell2);color:var(--blau)">' + ic("plus") + '</span><span class="txt">Ort hinzufügen</span>',
    function () { oeffneOrtBlatt(null); }, "blau ort-neu");
}
/* Ort-Auswahl aus dem Kopf: Häkchen = Ort der Übersicht, (i) = bearbeiten */
function oeffneOrteListe() {
  var ziel = oeffneBlatt("Orte");
  function zeichne() {
    ziel.innerHTML = "";
    gruppenTitel(ziel, "Die Übersicht zeigt");
    var g = gruppe(ziel);
    zustand.orte.forEach(function (o) {
      var std = o.id === zustand.standardOrt;
      var z = zeile(g, '<span class="haken" style="width:1.2em">' + (std ? ic("haken") : "") + '</span><span class="txt">' + sicher(o.name)
        + '<small>' + sicher(ortUntertitel(o)) + '</small></span><button class="info-knopf" type="button" aria-label="' + sicher(o.name) + ' bearbeiten">' + ic("info") + '</button>',
        null, "ort-eintrag");
      z.dataset.ort = o.id; z.style.cursor = "pointer";
      z.addEventListener("click", function (e) {
        if (e.target.closest(".info-knopf")) { oeffneOrtBlatt(o.id); return; }
        if (std) return;
        zustand.standardOrt = o.id; speichere(); tick(); toast(o.name + " auf der Übersicht", "pin");
        planAnimiert = false; zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); zeichne();
      });
    });
    if (zustand.orte.length < MAX_ORTE) zeile(g, '<span class="txt">Ort hinzufügen …</span>', function () { oeffneOrtBlatt(null); }, "blau");
    fuss(ziel, "Jeder Wunsch kann einen eigenen Ort haben – einstellbar beim Wunsch.");
  }
  zeichne();
}

var ortsKarte = null;
/* Ort anlegen (id = null) oder bearbeiten. fuerRegel: diesen Wunsch danach dem neuen Ort zuordnen. */
function oeffneOrtBlatt(id, fuerRegel) {
  var vorhanden = id ? ortMitId(id) : null, gespeichert = false;
  var punkt = vorhanden ? { lat: vorhanden.lat, lon: vorhanden.lon } : null;
  var stadt = vorhanden ? (vorhanden.stadt || "") : "", nameAuto = !vorhanden;
  var ziel = oeffneBlatt(vorhanden ? "Ort bearbeiten" : "Neuer Ort", function () {
    if (ortsKarte) { ortsKarte.remove(); ortsKarte = null; }
    // Kam man aus einem Wunsch, geht es nach „Abbrechen“ dorthin zurück
    if (fuerRegel != null && !gespeichert) setTimeout(function () { if (!blatt) oeffneEditor(fuerRegel); }, 330);
  }, { links: "Abbrechen", rechts: "Sichern", rechtsAktion: function () { sichern(); } });
  var okKnopf = blatt.el.querySelector(".nav-knopf.rechts"); okKnopf.id = "ob-ok";
  gruppenTitel(ziel, "");
  var ng = gruppe(ziel);
  ng.innerHTML = '<div class="feld-zeile"><label for="ob-name">Name</label><input type="text" id="ob-name" maxlength="30" placeholder="z. B. Zuhause, Garten" value="'
    + sicher(vorhanden ? vorhanden.name : (zustand.orte.length ? "" : "Zuhause")) + '"></div>';
  gruppenTitel(ziel, "Punkt");
  var pg = gruppe(ziel, "mit-symbol");
  var gps = zeile(pg, '<span class="symbol" style="background:var(--blau)">' + ic("ort") + '</span><span class="txt">Aktuellen Standort verwenden</span>', function () {
    if (!navigator.geolocation) { toast("Dieses Gerät kann den Standort nicht abfragen."); return; }
    gps.disabled = true; gps.querySelector(".txt").textContent = "Suche Standort …";
    navigator.geolocation.getCurrentPosition(function (pos) {
      gps.disabled = false; gps.querySelector(".txt").textContent = "Aktuellen Standort verwenden";
      setzePunkt(pos.coords.latitude, pos.coords.longitude, null, 15);
    }, function () { gps.disabled = false; gps.querySelector(".txt").textContent = "Aktuellen Standort verwenden"; toast("Standort nicht verfügbar – bitte suchen."); },
    { enableHighAccuracy:true, timeout:12000 });
  }, "blau");
  gps.id = "ob-gps";
  var such = document.createElement("div"); such.className = "zelle-block"; such.style.borderTop = ".5px solid var(--linie)";
  such.innerHTML = '<div class="suchfeld">' + ic("lupe") + '<input type="search" id="ob-suche" placeholder="Ort oder Stadt suchen" autocomplete="off"></div>';
  pg.appendChild(such);
  var erg = gruppe(ziel); erg.id = "ort-ergebnisse"; erg.style.marginTop = "8px";
  var karte = document.createElement("div"); karte.className = "ortskarte"; karte.id = "ob-karte"; ziel.appendChild(karte);
  var punktText = fuss(ziel, ""); punktText.id = "ob-punkt";
  fuss(ziel, ic("schloss") + " Der genaue Punkt bleibt auf diesem Gerät. Zum Wetterdienst geht nur ein auf ~11 km gerundeter Wert. Kartenbilder lädt dein Gerät von OpenStreetMap.");
  if (vorhanden) {
    gruppenTitel(ziel, "");
    var ag = gruppe(ziel);
    if (vorhanden.id !== zustand.standardOrt) zeile(ag, '<span class="txt">Auf der Übersicht zeigen</span>', function () {
      zustand.standardOrt = vorhanden.id; speichere(); tick(); toast(vorhanden.name + " auf der Übersicht", "pin");
      planAnimiert = false; zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); if (sichtbarerReiter() === "einstellungen") zeichneEinstellungen(); schliesseBlatt();
    }, "blau als-standard");
    if (zustand.orte.length > 1) zeile(ag, "Ort löschen", loeschen, "rot ort-weg");
  }
  $("ob-name").addEventListener("input", function () { nameAuto = false; });
  function zeigePunkt() {
    okKnopf.disabled = !punkt;
    punktText.textContent = punkt ? (stadt ? stadt + " · " : "") + "Punkt gesetzt – auf die Karte tippen zum Verschieben." : "Wähle einen Punkt: Standort, Suche oder ein Tipp auf die Karte.";
    if (ortsKarte && punkt) {
      var p = [punkt.lat, punkt.lon];
      if (ortsKarte._wwMarker) ortsKarte._wwMarker.setLatLng(p);
      else ortsKarte._wwMarker = L.marker(p, { icon: L.divIcon({ className:"ww-marker", html:"<span></span>", iconSize:[22, 22] }) }).addTo(ortsKarte);
    }
  }
  function setzePunkt(lat, lon, name, zoom) {
    punkt = { lat: genau(lat), lon: genau(lon) };
    // Den Namen gibt die Suche mit; bei Standort und Karte vergibst du ihn selbst
    stadt = name || "";
    if (name && (nameAuto || !$("ob-name").value.trim())) $("ob-name").value = zustand.orte.length ? name : "Zuhause";
    if (!name && !$("ob-name").value.trim()) $("ob-name").focus();
    if (ortsKarte) ortsKarte.setView([punkt.lat, punkt.lon], zoom || Math.max(ortsKarte.getZoom(), 13));
    zeigePunkt(); tick();
  }
  var suchTimer = null;
  $("ob-suche").addEventListener("input", function () {
    clearTimeout(suchTimer); var text = this.value.trim();
    if (text.length < 2) { erg.innerHTML = ""; return; }
    suchTimer = setTimeout(function () { sucheOrt(text, function (f) { $("ob-suche").value = ""; erg.innerHTML = ""; setzePunkt(f.latitude, f.longitude, f.name, 12); }, erg); }, 400);
  });
  if (window.L) {
    setTimeout(function () {
      if (!document.getElementById("ob-karte")) return;
      var start = punkt ? [punkt.lat, punkt.lon] : (standardOrt() ? [standardOrt().lat, standardOrt().lon] : [51, 10]);
      ortsKarte = L.map("ob-karte", { zoomControl:true }).setView(start, punkt ? 13 : (standardOrt() ? 10 : 5));
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap" }).addTo(ortsKarte);
      ortsKarte.on("click", function (e) { setzePunkt(e.latlng.lat, e.latlng.lng, null, ortsKarte.getZoom()); });
      zeigePunkt();
    }, 460);
  } else { karte.innerHTML = '<p class="hinweis" style="padding:12px">Karte konnte nicht geladen werden (keine Verbindung?).</p>'; }
  zeigePunkt();
  function sichern() {
    if (!punkt) return;
    gespeichert = true;
    var name = ($("ob-name").value || "").trim() || stadt || "Mein Ort";
    var o = vorhanden;
    if (!o) { o = { id: neueOrtId() }; zustand.orte.push(o); if (!zustand.standardOrt) zustand.standardOrt = o.id; }
    o.name = name.slice(0, 30); o.stadt = stadt.slice(0, 60); o.lat = punkt.lat; o.lon = punkt.lon;
    if (fuerRegel != null && zustand.regeln[fuerRegel]) zustand.regeln[fuerRegel].ortId = o.id;
    speichere(); toast(vorhanden ? "Ort gesichert" : name + " hinzugefügt", "pin");
    planAnimiert = false; zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv();
    if (sichtbarerReiter() === "einstellungen") zeichneEinstellungen();
    if (fuerRegel != null) oeffneEditor(fuerRegel); else schliesseBlatt();
  }
  function loeschen() {
    var n = wuenscheAnOrt(vorhanden.id);
    var rest = zustand.orte.filter(function (x) { return x.id !== vorhanden.id; });
    var ersatz = vorhanden.id === zustand.standardOrt ? rest[0] : standardOrt();
    if (!confirm("„" + vorhanden.name + "“ löschen?" + (n ? " " + n + (n === 1 ? " Wunsch nutzt" : " Wünsche nutzen") + " dann „" + ersatz.name + "“." : ""))) return;
    gespeichert = true;
    zustand.regeln.forEach(function (r) { if (r.ortId === vorhanden.id) r.ortId = ersatz.id; });
    zustand.orte = rest; if (zustand.standardOrt === vorhanden.id) zustand.standardOrt = ersatz.id;
    speichere(); schliesseBlatt(); toast("Ort gelöscht"); planAnimiert = false;
    zeichneUebersicht(); aktualisiereVorschau(); syncWennAktiv(); if (sichtbarerReiter() === "einstellungen") zeichneEinstellungen();
  }
}
function sucheOrt(text, beiWahl, ziel) {
  fetch("https://geocoding-api.open-meteo.com/v1/search?count=5&language=de&format=json&name=" + encodeURIComponent(text))
  .then(function (a) { return a.json(); }).then(function (d) {
    ziel.innerHTML = "";
    var funde = (d && d.results) || [];
    if (!funde.length) { ziel.innerHTML = '<div class="zelle-block hinweis">Nichts gefunden – anders schreiben?</div>'; return; }
    funde.forEach(function (f) {
      var zusatz = [f.admin1, f.country].filter(Boolean).join(", ");
      zeile(ziel, '<span class="txt">' + sicher(f.name) + (zusatz ? "<small>" + sicher(zusatz) + "</small>" : "") + '</span>', function () { beiWahl(f); });
    });
  }).catch(function () { ziel.innerHTML = '<div class="zelle-block warnung" style="margin:0">Ortssuche gerade nicht erreichbar.</div>'; });
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
  }).catch(function () {
    if (nr !== vorschauNr) return;
    var roh = null; try { roh = localStorage.getItem(cacheSchluessel()); } catch (e) {}
    if (roh) { var c = JSON.parse(roh); anwendeVorschau(c); toast("Offline – Stand von vor " + Math.max(1, Math.round((Date.now() - c.zeit) / 60000)) + " Min."); }
    else { toast("Wetterdaten gerade nicht verfügbar – ich versuche es gleich noch einmal."); setTimeout(function () { if (nr === vorschauNr) aktualisiereVorschau(); }, 30000); }
  });
}

/* ---------- Wetter-Reiter (je Ort) ---------- */
var wetterOrtId = null, wetterDaten = {}, wStunden = null, wTage = [], wVersatz = 0;
var offeneTage = {}, tagCache = {};
function zeichneWetterReiter() {
  var chips = $("wetter-orte"); chips.innerHTML = "";
  if (!standardOrt()) { $("wetter-kopf").innerHTML = '<div class="laden">Wähle zuerst einen Ort.</div>'; return; }
  if (!ortMitId(wetterOrtId)) wetterOrtId = standardOrt().id;
  if (zustand.orte.length > 1) zustand.orte.forEach(function (o) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = o.name; b.className = o.id === wetterOrtId ? "an" : "";
    b.addEventListener("click", function () { wetterOrtId = o.id; offeneTage = {}; tick(); zeichneWetterReiter(); });
    chips.appendChild(b);
  });
  var o = ortMitId(wetterOrtId);
  var daten = o.id === standardOrt().id && hStunden ? { tage: hTage, stunden: hStunden, versatz: hVersatz } : wetterDaten[o.id];
  var kopf = '<div class="ort-knopf" style="cursor:default"><span class="nam">' + sicher(o.name) + '</span></div>';
  if (!daten) {
    $("wetter-kopf").innerHTML = kopf + '<div class="laden">Lade Wetter …</div>';
    $("wetter-stunden-karte").style.display = "none"; $("wetter-woche-karte").style.display = "none";
    fetch("/api/vorschau", { method:"POST", headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ lat:grob(o.lat), lon:grob(o.lon), regeln:[] }) })
      .then(function (a) { return a.json(); }).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.fehler) || "unbekannt");
        wetterDaten[o.id] = { tage: d.tage || [], stunden: d.stunden || null, versatz: d.versatz || 0 };
        if (wetterOrtId === o.id) zeichneWetterReiter();
      }).catch(function () { $("wetter-kopf").innerHTML = kopf + '<div class="laden">Wetterdaten gerade nicht verfügbar.</div>'; });
    return;
  }
  wStunden = daten.stunden; wTage = daten.tage || []; wVersatz = daten.versatz || 0;
  $("wetter-kopf").innerHTML = kopf + kopfHtml(wStunden, wTage, wVersatz, "");
  var idx = stundeIndex(wStunden, lokalJetzt(wVersatz));
  kompaktWetterText = o.name + (idx !== null ? " · " + Math.round(wStunden.temperature_2m[idx]) + "°" : "");
  zeichneStunden(idx);
  zeichneWetter();
  $("wetter-hinweis").textContent = "Wetterdaten: Open-Meteo.com (CC BY 4.0)";
  pruefeKompakt();
}
function zeichneStunden(idx) {
  var karte = $("wetter-stunden-karte"), ziel = $("wetter-stunden");
  if (idx === null || !wStunden) { karte.style.display = "none"; return; }
  karte.style.display = "";
  $("wetter-stunden-kopf").innerHTML = ic("uhr") + "Die nächsten 24 Stunden";
  var html = "";
  for (var k = idx; k < Math.min(wStunden.time.length, idx + 25); k++) {
    var regen = wStunden.precipitation[k];
    html += '<div class="std"><span class="h">' + (k === idx ? "Jetzt" : wStunden.time[k].slice(11, 13)) + '</span>'
      + '<span class="i">' + (wStunden.weather_code ? wetterIcon(wStunden.weather_code[k]) : "") + (regen >= 0.1 ? "<small>" + String(Math.round(regen * 10) / 10).replace(".", ",") + "</small>" : "") + '</span>'
      + '<span class="t">' + Math.round(wStunden.temperature_2m[k]) + '°</span></div>';
  }
  ziel.innerHTML = html;
}
function heuteIsoW() { return lokalJetzt(wVersatz).toISOString().slice(0, 10); }
function zeichneWetter() {
  var karte = $("wetter-woche-karte"), ziel = $("wetter-tage"); ziel.innerHTML = "";
  if (!wTage.length) { karte.style.display = "none"; return; }
  karte.style.display = "";
  $("wetter-woche-kopf").innerHTML = ic("kalender") + wTage.length + "-Tage-Vorhersage";
  var tiefst = Math.min.apply(null, wTage.map(function (t) { return t.tempMin; }));
  var hoechst = Math.max.apply(null, wTage.map(function (t) { return t.tempMax; }));
  wTage.forEach(function (t) { ziel.appendChild(baueTag(t, tiefst, hoechst)); });
}
function baueTag(t, tiefst, hoechst) {
  var tag = document.createElement("div");
  var heute = t.datum === heuteIsoW();
  tag.className = "tag" + (offeneTage[t.datum] ? " offen" : "");
  var spanne = Math.max(1, hoechst - tiefst);
  var links = (t.tempMin - tiefst) / spanne * 100, breite = Math.max(4, (t.tempMax - t.tempMin) / spanne * 100);
  var punkt = "";
  if (heute) {
    var idx = stundeIndex(wStunden, lokalJetzt(wVersatz));
    if (idx !== null) punkt = '<b style="left:' + Math.min(100, Math.max(0, (wStunden.temperature_2m[idx] - tiefst) / spanne * 100)).toFixed(1) + '%"></b>';
  }
  var kopf = document.createElement("div"); kopf.className = "tag-kopf"; kopf.setAttribute("role", "button"); kopf.tabIndex = 0;
  kopf.innerHTML = '<span class="wt">' + (heute ? "Heute" : t.wochentag.slice(0, 2)) + '</span><span class="icon">' + tagIcon(t.datum) + '</span>'
    + '<span class="min">' + t.tempMin + '°</span>'
    + '<span class="spanne"><i style="left:' + links.toFixed(1) + '%;width:' + breite.toFixed(1) + '%;--bw:' + (10000 / breite).toFixed(0) + '%;--bx:' + (links / Math.max(1, 100 - breite) * 100).toFixed(0) + '%"></i>' + punkt + '</span>'
    + '<span class="max">' + t.tempMax + '°</span>';
  var det = document.createElement("div"); det.className = "details";
  function fuelle() { det.innerHTML = detailHtml(t, heute); det.dataset.gefuellt = "1"; verdrahteInteraktion(det); }
  if (offeneTage[t.datum]) fuelle();
  var umschalten = function () {
    offeneTage[t.datum] = !offeneTage[t.datum]; tag.classList.toggle("offen"); tick();
    if (offeneTage[t.datum] && !det.dataset.gefuellt) fuelle();
  };
  kopf.addEventListener("click", umschalten);
  kopf.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); umschalten(); } });
  tag.appendChild(kopf); tag.appendChild(det);
  return tag;
}
function tagIcon(datum) {
  if (!wStunden || !wStunden.weather_code) return "";
  for (var i = 0; i < wStunden.time.length; i++)
    if (wStunden.time[i].slice(0,10) === datum && wStunden.time[i].slice(11,13) === "13") return wetterIcon(wStunden.weather_code[i]);
  return "";
}
function tagIndizes(datum) {
  var idx = []; if (!wStunden) return idx;
  for (var i = 0; i < wStunden.time.length; i++) if (wStunden.time[i].slice(0,10) === datum) idx.push(i);
  return idx;
}
function detailHtml(t, heute) {
  var datum = t.datum, idx = tagIndizes(datum); if (!idx.length) return "";
  var s = wStunden;
  var std = idx.map(function (i) { return parseInt(s.time[i].slice(11,13), 10); });
  var temp = idx.map(function (i) { return s.temperature_2m[i]; });
  var wind = idx.map(function (i) { return s.wind_speed_10m[i]; });
  var boen = s.wind_gusts_10m ? idx.map(function (i) { return s.wind_gusts_10m[i]; }) : null;
  var regen = idx.map(function (i) { return s.precipitation[i]; });
  var dirNamen = s.wind_direction_10m ? idx.map(function (i) { return SEKTOREN[Math.round(s.wind_direction_10m[i] / 45) % 8]; }) : null;
  var uvArr = s.uv_index ? idx.map(function (i) { return s.uv_index[i]; }) : null;
  tagCache[datum] = { std: std, temp: temp, wind: wind, boen: boen, regen: regen, dir: dirNamen, uv: uvArr };
  var jetztIndex = null;
  if (heute && std.length) {
    var l = lokalJetzt(wVersatz), jh = l.getUTCHours() + l.getUTCMinutes() / 60 - std[0];
    if (jh >= 0 && jh <= std.length - 1) jetztIndex = jh;
  }
  var regenSumme = Math.round(regen.reduce(function (a, b) { return a + b; }, 0) * 10) / 10;
  var uvMax = uvArr ? Math.round(Math.max.apply(null, uvArr)) : null;
  var werte = '<div class="tagwerte"><div>Wind<b>' + t.windMax + '</b></div><div>Böen<b>' + (t.boeMax != null ? t.boeMax : "–") + '</b></div>'
    + '<div>Regen<b>' + String(regenSumme).replace(".", ",") + '</b></div><div>UV<b>' + (uvMax != null ? uvMax : "–") + '</b></div></div>';
  return werte + tempWindDiagramm(std, temp, wind, boen, uvArr, jetztIndex, true, datum)
    + (regenSumme > 0 ? balkenDiagramm("Regen", "mm", std, regen, "#64d2ff", jetztIndex, true, datum) : "");
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
        ? '<b>' + d.std[i] + ' Uhr</b> · Regen ' + String(Math.round(d.regen[i] * 10) / 10).replace(".", ",") + ' mm'
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
  if (datum === heuteIsoW() && d.std.length) {
    var l = lokalJetzt(wVersatz), jh = l.getUTCHours() + l.getUTCMinutes() / 60 - d.std[0];
    if (jh >= 0 && jh <= d.std.length - 1) jetztIndex = jh;
  }
  var titel = datum === heuteIsoW() ? "Heute" : (TAGLANG[wochentag(datum)] + ", " + datum.slice(8, 10) + "." + datum.slice(5, 7) + ".");
  var chart = tempWindDiagramm(d.std, d.temp, d.wind, d.boen, d.uv, jetztIndex, true, datum, true);
  var hg = document.createElement("div"); hg.className = "modal-hg";
  hg.innerHTML = '<div class="kachel" style="width:100%;max-width:760px;background:rgba(18,30,48,.85)">'
    + '<div style="display:flex;align-items:center;margin:0 2px 6px"><b style="flex:1;font-size:1.05rem">' + titel + '</b>'
    + '<button class="nav-knopf rechts" type="button" id="dg-zu" style="color:#fff">Fertig</button></div>'
    + chart + '<p class="quelle">Über das Diagramm streichen für die Werte einzelner Stunden.</p></div>';
  $("modal-ziel").appendChild(hg);
  verdrahteInteraktion(hg, true);
  $("dg-zu").addEventListener("click", function () { $("modal-ziel").innerHTML = ""; });
  hg.addEventListener("click", function (e) { if (e.target === hg) $("modal-ziel").innerHTML = ""; });
}
function jetztLinie(jetztIndex, px, o, H, u) {
  if (jetztIndex == null) return "";
  var x = px(jetztIndex).toFixed(1);
  return '<line x1="' + x + '" y1="' + o + '" x2="' + x + '" y2="' + (H - u) + '" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".5"/>'
    + '<text x="' + x + '" y="' + (o + 6) + '" font-size="8" fill="currentColor" text-anchor="middle" opacity=".7">jetzt</text>';
}
function tempWindDiagramm(std, temp, wind, boen, uv, jetztIndex, gross, datum, riesig) {
  var n = temp.length; if (n < 2) return "";
  var W = 320, H = riesig ? 200 : 130, l = riesig ? 10 : 24, r = riesig ? 12 : 26, o = 12, u = 20;
  var tmin = Math.min.apply(null, temp), tmax = Math.max.apply(null, temp); if (tmin === tmax) { tmin -= 1; tmax += 1; }
  var wmax = Math.max.apply(null, wind.concat(boen || [])); if (wmax <= 0) wmax = 1;
  var uvSpitze = uv ? Math.max.apply(null, uv) : 0;
  var uvMax = uvSpitze > 10 ? 15 : 10;
  var px = function (i) { return l + i * (W - l - r) / (n - 1); };
  var yT = function (v) { return o + (1 - (v - tmin) / (tmax - tmin)) * (H - o - u); };
  var yW = function (v) { return o + (1 - v / wmax) * (H - o - u); };
  var yU = function (v) { return o + (1 - v / uvMax) * (H - o - u); };
  var tempFarbe = "#ffb340", windFarbe = "#64d2ff", uvFarbe = "#ffd60a";
  var sw = riesig ? 3.2 : 2.6, basis = (H - u).toFixed(1);
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
    + (uv ? flaeche(uv, uvFarbe, yU, ".14") : "") + flaeche(wind, windFarbe, yW, ".12") + flaeche(temp, tempFarbe, yT, ".14")
    + (boen ? linie(boen, windFarbe, yW, 'stroke-dasharray="3 3" opacity=".6"') : "")
    + linie(wind, windFarbe, yW) + linie(temp, tempFarbe, yT)
    + xBeschriftung(std).map(function (p) { return '<text x="' + px(p[0]).toFixed(1) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" text-anchor="middle" opacity=".65">' + p[1] + '</text>'; }).join("")
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
  var W = 320, H = 72, l = 6, r = 6, o = 10, u = 20;
  var bw = (W - l - r) / n;
  var pxBar = function (idx) { return l + (idx + 0.5) * bw; };
  var summe = Math.round(werte.reduce(function (a, b) { return a + b; }, 0) * 10) / 10;
  var balken = werte.map(function (v, i) {
    var hh = (v / max) * (H - o - u); return '<rect x="' + (l + i * bw + 0.5).toFixed(1) + '" y="' + (H - u - hh).toFixed(1)
      + '" width="' + (bw - 1).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="1.5" fill="' + farbe + '" opacity=".9"/>';
  }).join("");
  var ticks = xBeschriftung(std).map(function (p) { return '<text x="' + pxBar(p[0]).toFixed(1) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" text-anchor="middle" opacity=".65">' + p[1] + '</text>'; }).join("");
  var svg = '<svg class="tw-svg" data-art="balken" data-w="' + W + '" data-l="' + l + '" data-r="' + r + '" data-n="' + n + '"'
    + ' viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + titel + '">' + balken + jetztLinie(jetztIndex, pxBar, o, H, u) + ticks + '</svg>';
  return '<div class="diagramm"><div class="titel"><span class="tw-legende">' + titel + '</span><span>' + String(summe).replace(".", ",") + ' ' + einheit + ' gesamt</span></div>'
    + '<div class="dia-box" data-datum="' + datum + '" data-feld="regen">' + svg + '<div class="xline"></div></div></div>';
}

/* ---------- Einstellungen ---------- */
function zeichneEinstellungen() { zeichneEinstOrte(); zeichneSchriftwahl(); zeichneModusSchalter(); zeichneAppStand(); zeichneZustimmung(); }
function zeichneModusSchalter() {
  $("erweitert-schalter").checked = erweitert;
  $("erweitert-erklaerung").innerHTML = erweitert
    ? "Bausteine lassen sich mit „+ oder“ kombinieren – dann genügt eine der Zeilen – und mit dem Finger ziehen."
    : "Alle Bausteine werden mit „und“ verknüpft. Einfacher, aber ohne Alternativen.";
}
$("erweitert-schalter").addEventListener("change", function () { erweitert = this.checked; zustand.erweitert = erweitert; tick(); speichere(); zeichneModusSchalter(); });
$("ueber-knopf").addEventListener("click", function () {
  var ziel = oeffneBlatt("Was diese App kann");
  var punkte = [
    ["plan", "var(--blau)", "Übersicht", "Oben das Wetter jetzt und was heute passt, darunter der Wochenplan: grün = passt, orange = knapp daneben. Ein Tipp auf ein Feld zeigt, warum."],
    ["plus", "var(--indigo)", "Wünsche", "Mit dem + aus Vorlagen wählen oder einen eigenen bauen. Ein Tipp auf den Namen öffnet ihn zum Bearbeiten."],
    ["pin", "var(--blau)", "Ort je Wunsch", "Bis zu 5 Orte, zum Beispiel Zuhause und Garten. Jeder Wunsch prüft das Wetter an seinem Ort."],
    ["bausteine", "var(--gruen-voll)", "Bausteine", "Temperatur, Wind, Böen, Windrichtung, Regen, Bewölkung, Luftfeuchte und UV. Alle müssen passen; mit „+ oder“ genügt eine von mehreren Zeilen."],
    ["glocke", "var(--rot-voll)", "Mitteilungen", "Einmal am Tag oder stündlich, etwa für Sturm-Warnungen. Mitteilungen nennen nie einen Ort."],
    ["schloss", "var(--grau)", "Datenschutz", "Der genaue Ort bleibt auf diesem Gerät. Zum Dienst und zum Wetteranbieter geht nur ein auf ~11 km gerundeter Wert."]
  ];
  var m = document.createElement("div"); m.className = "merkmale";
  m.innerHTML = punkte.map(function (p) { return '<div class="merkmal"><span class="symbol" style="background:' + p[1] + '">' + ic(p[0]) + '</span><div><b>' + p[2] + '</b><span>' + p[3] + '</span></div></div>'; }).join("");
  ziel.appendChild(m);
});

/* ---------- Mitteilungen ---------- */
function b64urlZuBytes(s) {
  var pad = (4 - (s.length % 4)) % 4; var b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "====".slice(0, pad);
  var r = atob(b64); return Uint8Array.from(r, function (c) { return c.charCodeAt(0); });
}
function zeigePushStatus(text, art) { $("push-status").innerHTML = text ? '<div class="' + (art || "erfolg") + '" style="margin:8px 0 0">' + sicher(text) + "</div>" : ""; }
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
      ? "Auf dem iPhone geht das erst, wenn die App auf dem Home-Bildschirm liegt: Teilen → „Zum Home-Bildschirm“, dann von dort öffnen."
      : "Dieser Browser unterstützt keine Mitteilungen.";
    zeigePushStatus(t, "warnung"); $("push-schalter").checked = false; toast("Mitteilungen gehen hier nicht", "glocke"); if (fertig) fertig(false, t); return;
  }
  zeigePushStatus("Richte ein …", "erfolg");
  Notification.requestPermission().then(function (erlaubnis) {
    if (erlaubnis !== "granted") throw new Error("Ohne Erlaubnis geht es nicht (Status: " + erlaubnis + ").");
    return holeAbo();
  }).then(function (abo) {
    zustand.aktiviert = true; zustand.nudgeWeg = true; speichere(); zeichneNudge(); $("push-schalter").checked = true;
    var bereit = standardOrt() && zustand.regeln.some(function (r) { return r.aktiv; });
    if (bereit) return sendeAnDienst(abo, true).then(function (d) {
      zeigePushStatus(d.gespeichert ? "Aktiv! Eine Bestätigung ist unterwegs. Der Wächter prüft ab jetzt stündlich." : "Test-Mitteilung unterwegs! (Speicher wird noch eingerichtet.)", "erfolg");
      toast("Mitteilungen sind an", "glocke"); if (fertig) fertig(true);
    });
    zeigePushStatus("Eingeschaltet. Sobald du einen aktiven Wunsch hast, wache ich für dich.", "erfolg");
    toast("Mitteilungen sind an", "glocke"); if (fertig) fertig(true);
  }).catch(function (f) { zustand.aktiviert = false; speichere(); $("push-schalter").checked = false; zeigePushStatus(f.message, "warnung"); if (fertig) fertig(false, f.message); });
}
function benachrichtigungAus() {
  zustand.aktiviert = false; speichere();
  zeigePushStatus("Mitteilungen sind aus.", "erfolg");
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (abo) {
      if (!abo) return; return fetch("/api/deaktivieren", { method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ endpoint:abo.endpoint }) }).then(function () { return abo.unsubscribe(); });
    }).catch(function () {});
  }
}
$("push-schalter").addEventListener("change", function () { tick(); if (this.checked) benachrichtigungAn(); else benachrichtigungAus(); });
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

/* ---------- Nutzungsbedingungen ---------- */
function bedingungenLink() { return (navigator.language || "de").toLowerCase().indexOf("de") === 0 ? "/nutzungsbedingungen" : "/terms"; }
function zugestimmt() { return !BEDINGUNGEN || (zustand.bedingungen && zustand.bedingungen.version === BEDINGUNGEN); }
function stimmeZu() { zustand.bedingungen = { version: BEDINGUNGEN, zeit: new Date().toISOString() }; speichere(); zeichneZustimmung(); }
function zeichneZustimmung() {
  var z = zustand.bedingungen, el = $("zustimmung-stand"); if (!el) return;
  el.textContent = zugestimmt() && z ? "Zugestimmt am " + new Date(z.zeit).toLocaleDateString("de-DE") + " (Fassung " + z.version + ")" : "Noch nicht zugestimmt";
}
/* Bisherige Nutzer werden einmal gefragt – und erneut, wenn sich die Bedingungen ändern */
function frageNachZustimmung() {
  var neu = !!zustand.bedingungen;
  var ziel = oeffneBlatt(neu ? "Geänderte Bedingungen" : "Nutzungsbedingungen");
  var m = document.createElement("div");
  m.innerHTML = '<p style="margin:14px 4px 0;font-size:1rem;line-height:1.4">' + (neu ? "Die Nutzungsbedingungen haben sich geändert." : "Für den Wetter-Wächter gibt es jetzt Nutzungsbedingungen.")
    + ' Bitte lies sie und stimme zu. Das Wichtigste in Kürze:</p><div class="merkmale">'
    + '<div class="merkmal"><span class="symbol" style="background:var(--gruen-voll)">' + ic("stern") + '</span><div><b>Kostenlos</b><span>Die App ist derzeit kostenlos.</span></div></div>'
    + '<div class="merkmal"><span class="symbol" style="background:var(--orange)">' + ic("glocke") + '</span><div><b>Kein Warndienst</b><span>Vorhersagen können danebenliegen; amtliche Warnungen gehen vor.</span></div></div>'
    + '<div class="merkmal"><span class="symbol" style="background:var(--grau)">' + ic("schloss") + '</span><div><b>Dein Ort bleibt bei dir</b><span>Zum Dienst geht nur ein gerundeter Wert.</span></div></div></div>'
    + '<button class="knopf breit" type="button" id="nb-ok">Zustimmen</button>'
    + '<a class="leise" style="display:block;text-align:center;text-decoration:none" href="' + bedingungenLink() + '">Nutzungsbedingungen lesen</a>';
  ziel.appendChild(m);
  $("nb-ok").addEventListener("click", function () { stimmeZu(); tick(); toast("Danke!", "haken"); schliesseBlatt(); });
}

/* ---------- Erster Start: Ort, Wünsche, Mitteilungen ---------- */
function zeigeStart(schritt) {
  var alt = document.querySelector(".start"); if (alt) alt.remove();
  var el = document.createElement("div"); el.className = "start";
  var punkte = '<div class="schritte">' + [1, 2, 3].map(function (k) { return '<i class="' + (k <= schritt ? "an" : "") + '"></i>'; }).join("") + '</div>';
  var titel = '<div class="start-titel"><div class="marke">Wetter-Wächter</div><div class="claim">Ich sage dir Bescheid, wenn dein Wunsch-Wetter kommt.</div></div>';
  var karte = document.createElement("div"); karte.className = "start-karte";
  if (schritt === 0) {
    karte.innerHTML = '<h2>Willkommen</h2>'
      + '<div class="merkmale">'
      + '<div class="merkmal"><span class="symbol" style="background:var(--orange)">' + ic("stern") + '</span><div><b>Sag, was du vorhast</b><span>Pizza auf dem Balkon, Wäsche draußen, Laufen im Trockenen.</span></div></div>'
      + '<div class="merkmal"><span class="symbol" style="background:var(--gruen-voll)">' + ic("kalender") + '</span><div><b>Sieh, wann es passt</b><span>Der Wochenplan zeigt dir auf einen Blick die guten Tage.</span></div></div>'
      + '<div class="merkmal"><span class="symbol" style="background:var(--rot-voll)">' + ic("glocke") + '</span><div><b>Ich melde mich</b><span>Jede Stunde prüfe ich das Wetter und sage dir Bescheid.</span></div></div>'
      + '</div>'
      + '<button class="knopf breit" type="button" id="st-los">Los geht’s</button>'
      + '<p class="zustimmung">Mit „Los geht’s“ stimmst du den <a href="' + bedingungenLink() + '">Nutzungsbedingungen</a> zu.<br>Kostenlos · ohne Konto · dein genauer Ort bleibt auf dem Gerät.</p>';
  } else if (schritt === 1) {
    karte.innerHTML = punkte + '<h2>Wo bist du zu Hause?</h2><p>Dort schaue ich nach dem Wetter. Weitere Orte kannst du später anlegen.</p>'
      + '<button class="knopf breit" type="button" id="st-gps">' + ic("ort") + '<span>Aktuellen Standort verwenden</span></button>'
      + '<div class="gruppe-titel">oder suchen</div><div class="suchfeld">' + ic("lupe") + '<input type="search" id="st-suche" placeholder="Ort oder Stadt" autocomplete="off"></div>'
      + '<div class="gruppe" id="st-ergebnisse" style="margin-top:8px"></div>'
      + '<p class="gruppe-fuss" style="margin-top:12px">' + ic("schloss") + ' Der genaue Punkt bleibt auf diesem Gerät. Zum Wetterdienst geht nur ein auf ~11 km gerundeter Wert.</p>';
  } else if (schritt === 2) {
    karte.innerHTML = punkte + '<h2>Was wünschst du dir?</h2><p>Tippe an, was zu dir passt. Alles lässt sich später anpassen.</p>'
      + '<div id="st-vorlagen"></div>'
      + '<button class="knopf breit" type="button" id="st-weiter" style="margin-top:18px">Weiter</button>';
  } else {
    karte.innerHTML = punkte + '<h2>Soll ich dir Bescheid sagen?</h2><p>Dann bekommst du eine Mitteilung, sobald einer deiner Wünsche wahr wird. Sie nennt nie deinen Ort.</p>'
      + (istIosOhneHomescreen() ? '<div class="modus-aus" style="margin-bottom:14px"><div><b>iPhone/iPad:</b> Mitteilungen gehen erst, wenn die App auf dem Home-Bildschirm liegt – Teilen → „Zum Home-Bildschirm“.</div></div>' : "")
      + '<button class="knopf breit" type="button" id="st-push">' + ic("glocke") + 'Ja, Bescheid sagen</button>'
      + '<div id="st-push-status"></div><button class="leise" type="button" id="st-fertig">Später</button>';
  }
  el.innerHTML = titel; el.appendChild(karte);
  document.body.appendChild(el); document.body.classList.add("start-modus");
  if (schritt === 0) $("st-los").addEventListener("click", function () { stimmeZu(); tick(); zeigeStart(1); });
  if (schritt === 1) {
    var ortGesetzt = function (lat, lon, stadt) {
      zustand.orte = [{ id:"o1", name:"Zuhause", stadt:stadt || "", lat:genau(lat), lon:genau(lon) }];
      zustand.standardOrt = "o1"; speichere(); tick(); aktualisiereVorschau(); zeigeStart(2);
    };
    $("st-gps").addEventListener("click", function () {
      var k = this, txt = k.querySelector("span");
      if (!navigator.geolocation) { toast("Standort nicht verfügbar – bitte suchen."); return; }
      k.disabled = true; txt.textContent = "Suche Standort …";
      navigator.geolocation.getCurrentPosition(function (pos) { ortGesetzt(pos.coords.latitude, pos.coords.longitude, ""); },
        function () { k.disabled = false; txt.textContent = "Aktuellen Standort verwenden"; toast("Standort nicht verfügbar – bitte suchen."); },
        { enableHighAccuracy:true, timeout:12000 });
    });
    var t = null;
    $("st-suche").addEventListener("input", function () {
      clearTimeout(t); var text = this.value.trim();
      if (text.length < 2) { $("st-ergebnisse").innerHTML = ""; return; }
      t = setTimeout(function () { sucheOrt(text, function (f) { ortGesetzt(f.latitude, f.longitude, f.name); }, $("st-ergebnisse")); }, 400);
    });
  }
  if (schritt === 2) {
    var gewaehlt = {};
    var gitter = vorlagenGitter(function (v, b) {
      gewaehlt[v.name] = !gewaehlt[v.name]; b.classList.toggle("an", gewaehlt[v.name]); tick();
      var n = Object.keys(gewaehlt).filter(function (k) { return gewaehlt[k]; }).length;
      $("st-weiter").textContent = n ? "Weiter mit " + n + (n === 1 ? " Wunsch" : " Wünschen") : "Weiter";
    });
    gitter.id = "st-vorlagen-gitter";
    $("st-vorlagen").appendChild(gitter);
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
else if (!zugestimmt()) frageNachZustimmung();
</script>
</body>
</html>`;
}
