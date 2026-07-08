/*
 * Die App-Seite des Wetter-Wächters (eine Datei; externe Dienste – Ortssuche,
 * Reverse-Geocoding, Karte – spricht der Browser des Nutzers direkt an).
 * Wird vom Worker unter "/" ausgeliefert; der öffentliche VAPID-Schlüssel wird
 * beim Ausliefern eingesetzt.
 *
 * Reiter: Wünsche · Wetter · Einstellungen (untere Navigationsleiste).
 * Hinweis: Das Seiten-JavaScript nutzt bewusst KEINE Backticks/Template-Literale,
 * weil die ganze Seite in einem Template-Literal steckt.
 */

export function appSeite(vapidPublic) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2563eb">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Wetter-Wächter">
<link rel="manifest" href="/manifest.json">
<link rel="icon" href="/icon.svg">
<link rel="apple-touch-icon" href="/icon.svg">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<title>Wetter-Wächter</title>
<style>
  :root {
    --hg:#f4f6f8; --karte:#ffffff; --text:#1c2733; --text2:#5b6b7b;
    --linie:#dde4ea; --akzent:#2563eb; --akzent-hell:#e8effd;
    --gruen:#15803d; --gruen-hell:#e6f4ea; --rot:#b91c1c; --rot-hell:#fdeaea;
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root { --hg:#10161d; --karte:#1a232e; --text:#e8edf2; --text2:#93a3b3;
            --linie:#2c3947; --akzent:#5b93f5; --akzent-hell:#1d2c44;
            --gruen:#4ade80; --gruen-hell:#12291a; --rot:#f87171; --rot-hell:#331616; }
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
         background:var(--hg); color:var(--text); line-height:1.5; -webkit-text-size-adjust:100%; }
  main { max-width:640px; margin:0 auto; padding:14px 12px calc(78px + env(safe-area-inset-bottom)); }
  h1 { font-size:1.3rem; margin:6px 2px 2px; }
  h2 { font-size:1.02rem; margin:0 0 10px; }
  .untertitel { color:var(--text2); font-size:.85rem; margin:0 2px 14px; }
  .karte { background:var(--karte); border:1px solid var(--linie); border-radius:14px; padding:14px; margin-bottom:14px; }
  input[type=text] { width:100%; padding:11px 12px; border:1px solid var(--linie);
    border-radius:10px; background:var(--hg); color:var(--text); font-size:16px; }
  input[type=number] { width:100%; padding:7px 8px; border:1px solid var(--linie);
    border-radius:8px; background:var(--hg); color:var(--text); font-size:16px; text-align:right; }
  select { width:100%; padding:9px 10px; border:1px solid var(--linie); border-radius:8px;
    background:var(--hg); color:var(--text); font-size:16px; }
  label { font-size:.82rem; color:var(--text2); display:block; margin-bottom:2px; }
  .knopf { display:inline-block; border:0; border-radius:10px; cursor:pointer;
    padding:12px 16px; font-size:.95rem; font-weight:600; background:var(--akzent); color:#fff; }
  .knopf.zart { background:var(--akzent-hell); color:var(--akzent); }
  .knopf.gruen { background:var(--gruen); color:#fff; }
  .knopf.rot { background:var(--rot-hell); color:var(--rot); }
  .knopf.breit { width:100%; }
  .knopf:disabled { opacity:.5; cursor:default; }
  .hinweis { font-size:.82rem; color:var(--text2); }
  .warnung { background:var(--rot-hell); color:var(--rot); border-radius:8px; padding:8px 10px; font-size:.86rem; margin-top:8px; }
  .erfolg { background:var(--gruen-hell); color:var(--gruen); border-radius:8px; padding:8px 10px; font-size:.86rem; margin-top:8px; font-weight:600; }

  nav { position:fixed; bottom:0; left:0; right:0; display:flex; background:var(--karte);
        border-top:1px solid var(--linie); z-index:20; padding-bottom:env(safe-area-inset-bottom); }
  nav button { flex:1; border:0; background:none; cursor:pointer; padding:8px 2px 10px;
    font-size:.72rem; color:var(--text2); display:flex; flex-direction:column; align-items:center; gap:2px; }
  nav button .sym { font-size:1.3rem; }
  nav button.aktiv { color:var(--akzent); font-weight:600; }
  .reiter { display:none; } .reiter.sichtbar { display:block; }

  /* Ort */
  .ort-kopf { display:flex; align-items:flex-start; gap:8px; }
  .ort-kopf .pin { font-size:1.15rem; line-height:1.4; }
  .ort-kopf .info { flex:1; min-width:0; }
  .ort-kopf .nam { font-weight:700; }
  .ort-kopf .koord { font-size:.78rem; color:var(--text2); }
  #ort-ergebnisse button { display:block; width:100%; text-align:left; background:var(--hg);
    border:1px solid var(--linie); border-radius:8px; padding:9px 10px; margin-top:6px; color:var(--text); font-size:.92rem; cursor:pointer; }
  .ort-zeile { display:flex; gap:8px; } .ort-zeile input { flex:1; }
  .ort-zeile .knopf { padding:11px 13px; flex-shrink:0; }
  .karten-schalter { margin-top:10px; }
  #ortskarte { height:260px; border-radius:10px; margin-top:10px; display:none; overflow:hidden; z-index:0; }
  #ortskarte.offen { display:block; }
  .leaflet-container { font:inherit; background:var(--hg); }

  /* Vorlagen */
  .vorlagen { display:flex; flex-wrap:wrap; gap:8px; }
  .vorlagen button { border:1px solid var(--linie); background:var(--hg); color:var(--text);
    border-radius:999px; padding:8px 13px; font-size:.9rem; cursor:pointer; }
  .vorlagen button:disabled { opacity:.4; cursor:default; }
  .vorlagen button.eigene { border-style:dashed; color:var(--akzent); }

  /* Regeln */
  .regel-huelle { position:relative; margin-top:10px; }
  .regel-huelle .loeschbg { position:absolute; inset:0; background:var(--rot-hell); color:var(--rot);
    border-radius:12px; display:flex; align-items:center; justify-content:flex-end; padding-right:18px;
    font-weight:700; font-size:.9rem; }
  .regel { position:relative; border:1px solid var(--linie); border-radius:12px; padding:11px 12px;
    background:var(--karte); touch-action:pan-y; }
  .regel.inaktiv { opacity:.55; }
  .regelkopf { display:flex; align-items:center; gap:10px; }
  .regelkopf .emoji { font-size:1.35rem; }
  .regelkopf .name { flex:1; font-weight:700; }
  .treffer { background:var(--gruen-hell); color:var(--gruen); border-radius:8px; padding:7px 9px; margin-top:7px; font-size:.87rem; }
  .kein-treffer { color:var(--text2); font-size:.84rem; margin-top:7px; }
  details.fein summary { cursor:pointer; font-size:.84rem; color:var(--akzent); padding:6px 0 2px; }
  .zeile { display:flex; gap:8px; margin-top:8px; } .zeile > div { flex:1; min-width:0; }
  .bedingung { display:grid; grid-template-columns:30px 1fr 78px; gap:7px; align-items:center; padding:6px 0; border-top:1px solid var(--linie); }
  .bedingung .bez { font-size:.83rem; } .bedingung .bez small { color:var(--text2); }
  .bedingung input[type=checkbox] { width:19px; height:19px; accent-color:var(--akzent); }
  .bedingung input[type=range] { width:100%; accent-color:var(--akzent); grid-column:2; }
  .bedingung.aus input[type=range], .bedingung.aus input[type=number] { opacity:.35; pointer-events:none; }
  .sektoren { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:8px; }
  .sektoren button { border:1px solid var(--linie); background:var(--hg); color:var(--text);
    border-radius:8px; padding:7px 4px; font-size:.82rem; cursor:pointer; }
  .sektoren button.an { background:var(--akzent); color:#fff; border-color:var(--akzent); }

  /* Schalter */
  .schalter { position:relative; width:46px; height:26px; flex-shrink:0; }
  .schalter input { opacity:0; width:100%; height:100%; position:absolute; margin:0; cursor:pointer; z-index:2; }
  .schalter .bahn { position:absolute; inset:0; border-radius:13px; background:var(--linie); transition:background .15s; }
  .schalter .bahn::after { content:""; position:absolute; top:3px; left:3px; width:20px; height:20px;
    border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:left .15s; }
  .schalter input:checked + .bahn { background:var(--gruen); }
  .schalter input:checked + .bahn::after { left:23px; }
  .schalter-zeile { display:flex; align-items:center; gap:12px; }
  .schalter-zeile .txt { flex:1; font-weight:600; }

  /* Wetter-Tage */
  .tag { border:1px solid var(--linie); border-radius:10px; padding:10px 11px; margin-top:9px; }
  .tag-kopf { display:flex; align-items:center; gap:8px; cursor:pointer; }
  .tag-kopf .wt { font-weight:700; min-width:74px; }
  .tag-kopf .icon { font-size:1.2rem; }
  .tag-kopf .werte { margin-left:auto; text-align:right; font-size:.84rem; }
  .tag-kopf .pfeil { color:var(--text2); transition:transform .15s; }
  .tag.offen .tag-kopf .pfeil { transform:rotate(90deg); }
  .details { display:none; margin-top:10px; } .tag.offen .details { display:block; }
  .stundenreihe { display:flex; gap:9px; overflow-x:auto; padding-bottom:4px; }
  .stunde { flex:0 0 auto; text-align:center; font-size:.74rem; color:var(--text2); min-width:50px; }
  .stunde .h { font-weight:700; color:var(--text); font-size:.8rem; }
  .stunde .i { font-size:1.05rem; margin:1px 0; }
  .stunde .t { color:var(--text); font-weight:600; font-size:.82rem; }
  .diagramm { margin-top:12px; }
  .diagramm .titel { font-size:.8rem; color:var(--text2); margin-bottom:2px; display:flex; justify-content:space-between; }
  .diagramm svg { width:100%; height:auto; display:block; }

  /* Modal */
  .modal-hg { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:30; display:flex;
    align-items:center; justify-content:center; padding:18px; }
  .modal { background:var(--karte); border-radius:16px; padding:20px; max-width:420px; width:100%; max-height:90vh; overflow-y:auto; }
  .modal h2 { font-size:1.15rem; }
  .emoji-gitter { display:grid; grid-template-columns:repeat(8,1fr); gap:4px; margin-top:8px; }
  .emoji-gitter button { border:1px solid var(--linie); background:var(--hg); border-radius:8px;
    font-size:1.25rem; padding:6px 0; cursor:pointer; }
  .emoji-gitter button.an { border-color:var(--akzent); background:var(--akzent-hell); }
  .banner { background:var(--akzent-hell); border:1px solid var(--akzent); border-radius:12px;
    padding:11px 12px; margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .banner .txt { flex:1; min-width:150px; font-size:.88rem; }
</style>
</head>
<body>
<main>
  <h1>🌦️ Wetter-Wächter</h1>
  <p class="untertitel">Sag mir, welches Wetter du suchst – ich melde mich, wenn es kommt.</p>

  <!-- ===== Wünsche ===== -->
  <section id="reiter-wuensche" class="reiter sichtbar">
    <div id="nudge"></div>
    <section class="karte">
      <h2 id="ort-titel">📍 Dein Ort</h2>
      <div id="ort-anzeige" style="display:none">
        <div class="ort-kopf">
          <span class="pin">📍</span>
          <div class="info"><div class="nam" id="ort-name"></div><div class="koord" id="ort-koord"></div></div>
          <button class="knopf zart" id="ort-aendern" style="padding:7px 11px;font-size:.82rem">Ändern</button>
        </div>
      </div>
      <div id="ort-suche">
        <div class="ort-zeile">
          <input type="text" id="ort-eingabe" placeholder="Ort suchen, z. B. Düsseldorf …" autocomplete="off">
          <button class="knopf zart" id="ort-standort" title="Meinen Standort verwenden">📍</button>
        </div>
        <div id="ort-ergebnisse"></div>
        <p class="hinweis" style="margin-bottom:0">🔒 Es wird nur eine <b>gerundete</b> Position (~11 km) verwendet – nie dein genauer Standort.</p>
      </div>
      <div class="karten-schalter">
        <button class="knopf zart" id="karte-toggle" style="padding:8px 12px;font-size:.85rem">🗺️ Auf Karte wählen</button>
      </div>
      <div id="ortskarte"></div>
      <p class="hinweis" id="karte-note" style="display:none;margin-bottom:0">Tippe auf die Karte, um deinen Ort zu setzen.</p>
    </section>

    <section class="karte">
      <h2>🎯 Deine Wetter-Wünsche</h2>
      <p class="hinweis">Tippe eine Vorlage an – oder baue eine eigene. Regel nach links wischen zum Löschen.</p>
      <div class="vorlagen" id="vorlagen"></div>
      <div id="regel-liste"></div>
    </section>
  </section>

  <!-- ===== Wetter ===== -->
  <section id="reiter-wetter" class="reiter">
    <section class="karte">
      <h2>🌤️ Vorhersage (7 Tage)</h2>
      <p class="hinweis" id="wetter-hinweis">Wähle zuerst im Reiter „Wünsche“ deinen Ort.</p>
      <div id="wetter-tage"></div>
      <p class="hinweis" style="margin-top:12px">Tipp: Tag antippen für Stundenwerte und Diagramme.</p>
    </section>
  </section>

  <!-- ===== Einstellungen ===== -->
  <section id="reiter-einstellungen" class="reiter">
    <section class="karte">
      <h2>🔔 Benachrichtigungen</h2>
      <div class="schalter-zeile">
        <span class="txt">Push-Benachrichtigungen</span>
        <label class="schalter"><input type="checkbox" id="push-schalter"><span class="bahn"></span></label>
      </div>
      <p class="hinweis" id="push-erklaerung" style="margin-top:8px">An = dein Handy fragt nach Erlaubnis; danach meldet sich der Wächter,
      sobald ein Wunsch zutrifft. <b>iPhone/iPad:</b> Seite zuerst über das Teilen-Symbol „Zum Home-Bildschirm“ hinzufügen und von dort öffnen.</p>
      <div id="push-status"></div>
    </section>
    <section class="karte">
      <h2>🗑️ Daten</h2>
      <p class="hinweis">Alles im Browser Gespeicherte löschen und dieses Gerät vom Wächter abmelden.</p>
      <button class="knopf rot" id="loeschen" style="padding:9px 13px;font-size:.85rem">Alles löschen</button>
    </section>
    <p class="hinweis" style="text-align:center">Kostenlos · Wetterdaten: Open-Meteo · Karte: OpenStreetMap · Nachrichten ohne Ortsangaben</p>
  </section>
</main>

<nav>
  <button data-reiter="wuensche" class="aktiv"><span class="sym">🎯</span>Wünsche</button>
  <button data-reiter="wetter"><span class="sym">🌤️</span>Wetter</button>
  <button data-reiter="einstellungen"><span class="sym">⚙️</span>Einstellungen</button>
</nav>

<div id="modal-ziel"></div>

<script>
"use strict";
var VAPID_PUBLIC = "${vapidPublic}";

var BAUSTEINE = [
  { s:"tempMin",       bez:"Temperatur mindestens", einheit:"°C",   min:-20, max:45,  schritt:1 },
  { s:"tempMax",       bez:"Temperatur höchstens",  einheit:"°C",   min:-20, max:45,  schritt:1 },
  { s:"windMin",       bez:"Wind mindestens",       einheit:"km/h", min:0,   max:120, schritt:1 },
  { s:"windMax",       bez:"Wind höchstens",        einheit:"km/h", min:0,   max:120, schritt:1 },
  { s:"boeMin",        bez:"Windböen mindestens",   einheit:"km/h", min:0,   max:150, schritt:1 },
  { s:"boeMax",        bez:"Windböen höchstens",    einheit:"km/h", min:0,   max:150, schritt:1 },
  { s:"regenMax",      bez:"Regen höchstens",       einheit:"mm/h", min:0,   max:10,  schritt:0.1 },
  { s:"bewoelkungMin", bez:"Bewölkung mindestens",  einheit:"%",    min:0,   max:100, schritt:5 },
  { s:"bewoelkungMax", bez:"Bewölkung höchstens",   einheit:"%",    min:0,   max:100, schritt:5 },
  { s:"feuchteMax",    bez:"Luftfeuchte höchstens", einheit:"%",    min:0,   max:100, schritt:5 },
  { s:"uvMin",         bez:"UV-Index mindestens",   einheit:"UV",   min:0,   max:12,  schritt:1 },
  { s:"uvMax",         bez:"UV-Index höchstens",    einheit:"UV",   min:0,   max:12,  schritt:1 }
];
var STANDARDWERT = { tempMin:15, tempMax:25, windMin:5, windMax:20, boeMin:20, boeMax:60, regenMax:0,
  bewoelkungMin:20, bewoelkungMax:80, feuchteMax:70, uvMin:3, uvMax:6 };
var SEKTOREN = ["N","NO","O","SO","S","SW","W","NW"];
var PFEIL_VON = ["↓","↙","←","↖","↑","↗","→","↘"];
var FENSTER_OPTIONEN = [ [24,"1 Tag"], [48,"2 Tage"], [72,"3 Tage"], [120,"5 Tage"], [168,"7 Tage"] ];
var EMOJI_AUSWAHL = ["🍕","🌱","🧺","🏃","🔥","🧴","⛈️","☀️","🌤️","⛅","☁️","🌧️","❄️","🌈","💨","🌊",
  "🏖️","⛱️","🚴","🥾","🎣","⛳","🎿","🏂","🏕️","🌻","🍄","🐝","🦋","📸","🚗","✈️","🍺","☕","🧗","🏊",
  "🛶","🪁","🌙","⭐","🌡️","💧","🌪️","🌫️","🍇","🐟","🎪","🎈"];
var VORLAGEN = [
  { name:"Pizzatag", emoji:"🍕", nurVonUhr:11, nurBisUhr:21, mindestdauerStunden:3, bedingungen:{ tempMin:18, tempMax:28, windMax:10, regenMax:0 } },
  { name:"Pflanztag", emoji:"🌱", nurVonUhr:8, nurBisUhr:20, mindestdauerStunden:4, bedingungen:{ tempMin:15, tempMax:24, bewoelkungMin:30, bewoelkungMax:70, regenMax:0.2 } },
  { name:"Wäschetag", emoji:"🧺", nurVonUhr:9, nurBisUhr:19, mindestdauerStunden:4, bedingungen:{ tempMin:15, windMin:5, windMax:30, regenMax:0, feuchteMax:65 } },
  { name:"Lauf-Wetter", emoji:"🏃", nurVonUhr:6, nurBisUhr:21, mindestdauerStunden:1, bedingungen:{ tempMin:5, tempMax:20, windMax:20, regenMax:0.2 } },
  { name:"Fahrrad-Wetter", emoji:"🚲", nurVonUhr:6, nurBisUhr:20, mindestdauerStunden:1, bedingungen:{ tempMin:8, tempMax:28, windMax:20, boeMax:35, regenMax:0.1 } },
  { name:"Sonnencreme", emoji:"🧴", nurVonUhr:9, nurBisUhr:18, mindestdauerStunden:2, bedingungen:{ uvMin:6 } },
  { name:"Sturm-Warnung", emoji:"⛈️", nurVonUhr:0, nurBisUhr:24, mindestdauerStunden:1, bedingungen:{ windMin:60 } }
];

var SPEICHER = "wetterWaechterApp_v2";
var zustand = { ort:null, regeln:[], aktiviert:false, willkommenGesehen:false, nudgeWeg:false };
try { var roh = localStorage.getItem(SPEICHER); if (roh) { var g = JSON.parse(roh); if (g && typeof g === "object") zustand = Object.assign(zustand, g); } } catch (e) {}
if (!Array.isArray(zustand.regeln)) zustand.regeln = [];

function speichere() { localStorage.setItem(SPEICHER, JSON.stringify(zustand)); }
function runde(w) { return Math.round(parseFloat(w) * 10) / 10; }
function $(id) { return document.getElementById(id); }
function sicher(t) { return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
var letzteTreffer = null, letzteTage = [], letzteStunden = null, offeneTage = {};

/* Reiter */
Array.prototype.forEach.call(document.querySelectorAll("nav button"), function (knopf) {
  knopf.addEventListener("click", function () {
    Array.prototype.forEach.call(document.querySelectorAll("nav button"), function (k) { k.classList.remove("aktiv"); });
    knopf.classList.add("aktiv");
    Array.prototype.forEach.call(document.querySelectorAll(".reiter"), function (r) { r.classList.remove("sichtbar"); });
    $("reiter-" + knopf.dataset.reiter).classList.add("sichtbar");
    window.scrollTo(0, 0);
  });
});
function zeigeReiter(name) { var k = document.querySelector('nav button[data-reiter="' + name + '"]'); if (k) k.click(); }

/* Wetter-Symbole (WMO) */
function wetterIcon(code) {
  if (code === 0) return "☀️"; if (code === 1 || code === 2) return "🌤️"; if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️"; if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️"; if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️"; if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️"; return "🌡️";
}

/* ---------- Ort ---------- */
var suchTimer = null;
$("ort-eingabe").addEventListener("input", function () {
  clearTimeout(suchTimer); var text = this.value.trim();
  if (text.length < 2) { $("ort-ergebnisse").innerHTML = ""; return; }
  suchTimer = setTimeout(function () { sucheOrt(text); }, 400);
});
function sucheOrt(text) {
  fetch("https://geocoding-api.open-meteo.com/v1/search?count=5&language=de&format=json&name=" + encodeURIComponent(text))
  .then(function (a) { return a.json(); }).then(function (d) {
    var ziel = $("ort-ergebnisse"); ziel.innerHTML = "";
    var funde = (d && d.results) || [];
    if (!funde.length) { ziel.innerHTML = '<p class="hinweis">Nichts gefunden – anders schreiben?</p>'; return; }
    funde.forEach(function (f) {
      var knopf = document.createElement("button");
      var zusatz = [f.admin1, f.country].filter(Boolean).join(", ");
      knopf.textContent = f.name + (zusatz ? " – " + zusatz : "");
      knopf.addEventListener("click", function () { setzeOrt(f.name, f.latitude, f.longitude); });
      ziel.appendChild(knopf);
    });
  }).catch(function () { $("ort-ergebnisse").innerHTML = '<p class="warnung">Ortssuche gerade nicht erreichbar.</p>'; });
}
function reverseUndSetze(lat, lon) {
  fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat + "&longitude=" + lon + "&localityLanguage=de")
    .then(function (a) { return a.json(); }).then(function (d) {
      setzeOrt(d.city || d.locality || d.principalSubdivision || "Mein Standort", lat, lon);
    }).catch(function () { setzeOrt("Mein Standort", lat, lon); });
}
$("ort-standort").addEventListener("click", function () {
  if (!navigator.geolocation) { alert("Dieses Gerät unterstützt keine Standort-Abfrage."); return; }
  $("ort-standort").textContent = "…";
  navigator.geolocation.getCurrentPosition(function (pos) {
    reverseUndSetze(runde(pos.coords.latitude), runde(pos.coords.longitude));
    $("ort-standort").textContent = "📍";
  }, function () { $("ort-standort").textContent = "📍"; alert("Standort nicht verfügbar – bitte den Ort oben suchen."); },
  { enableHighAccuracy:false, timeout:10000 });
});
function setzeOrt(name, lat, lon) {
  zustand.ort = { name:String(name).slice(0,60), lat:runde(lat), lon:runde(lon) };
  speichere(); zeichneOrt(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
  if (ortsKarte && window.L) { var p = [zustand.ort.lat, zustand.ort.lon];
    if (ortsMarker) ortsMarker.setLatLng(p); else ortsMarker = L.marker(p).addTo(ortsKarte);
    ortsKarte.setView(p, Math.max(ortsKarte.getZoom(), 9)); }
}
$("ort-aendern").addEventListener("click", function () {
  schliesseOrtskarte();
  $("ort-anzeige").style.display = "none"; $("ort-suche").style.display = ""; $("ort-titel").style.display = ""; $("ort-eingabe").focus();
});
function zeichneOrt() {
  if (zustand.ort) {
    $("ort-name").textContent = zustand.ort.name;
    $("ort-koord").textContent = zustand.ort.lat + " / " + zustand.ort.lon + " · gerundet";
    $("ort-anzeige").style.display = ""; $("ort-suche").style.display = "none"; $("ort-titel").style.display = "none";
  } else { $("ort-anzeige").style.display = "none"; $("ort-suche").style.display = ""; $("ort-titel").style.display = ""; }
}

/* Karte (Leaflet, optional – lädt extern) */
/* ---------- Standortkarte (Ort per Klick wählen, bleibt offen) ---------- */
var ortsKarte = null, ortsMarker = null;
function schliesseOrtskarte() { $("ortskarte").classList.remove("offen"); $("karte-note").style.display = "none"; $("karte-toggle").textContent = "🗺️ Auf Karte wählen"; }
$("karte-toggle").addEventListener("click", function () {
  var el = $("ortskarte");
  if (el.classList.contains("offen")) { schliesseOrtskarte(); return; }
  el.classList.add("offen"); $("karte-note").style.display = ""; this.textContent = "🗺️ Karte schließen"; initOrtskarte();
});
function initOrtskarte() {
  if (ortsKarte) { setTimeout(function () { ortsKarte.invalidateSize(); }, 50); return; }
  if (!window.L) { $("ortskarte").innerHTML = '<p class="hinweis" style="padding:10px">Karte konnte nicht geladen werden (keine Verbindung?).</p>'; return; }
  var start = zustand.ort ? [zustand.ort.lat, zustand.ort.lon] : [51, 10];
  ortsKarte = L.map("ortskarte").setView(start, zustand.ort ? 9 : 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(ortsKarte);
  if (zustand.ort) ortsMarker = L.marker(start).addTo(ortsKarte);
  // Klick auf die Karte setzt den Ort – die Karte bleibt offen
  ortsKarte.on("click", function (e) { reverseUndSetze(runde(e.latlng.lat), runde(e.latlng.lng)); });
  setTimeout(function () { ortsKarte.invalidateSize(); }, 50);
}

/* ---------- Vorlagen + eigene Regel ---------- */
function zeichneVorlagen() {
  var ziel = $("vorlagen"); ziel.innerHTML = "";
  VORLAGEN.forEach(function (v) {
    var knopf = document.createElement("button");
    knopf.textContent = v.emoji + " " + v.name;
    knopf.disabled = zustand.regeln.some(function (r) { return r.name === v.name; });
    knopf.addEventListener("click", function () {
      zustand.regeln.push({ name:v.name, emoji:v.emoji, aktiv:true, zeitfensterStunden:48,
        nurVonUhr:v.nurVonUhr, nurBisUhr:v.nurBisUhr, mindestdauerStunden:v.mindestdauerStunden,
        bedingungen:JSON.parse(JSON.stringify(v.bedingungen)) });
      speichere(); zeichneRegeln(); zeichneVorlagen(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
    });
    ziel.appendChild(knopf);
  });
  var eigene = document.createElement("button");
  eigene.className = "eigene"; eigene.textContent = "＋ Eigene Regel";
  eigene.addEventListener("click", zeigeEigeneRegelDialog);
  ziel.appendChild(eigene);
}

function zeigeEigeneRegelDialog() {
  var gewaehlt = "⭐";
  var hg = document.createElement("div"); hg.className = "modal-hg";
  var gitter = EMOJI_AUSWAHL.map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join("");
  hg.innerHTML = '<div class="modal"><h2>Eigene Regel</h2>'
    + '<label>Name</label><input type="text" id="er-name" placeholder="z. B. Grillabend" maxlength="40">'
    + '<label style="margin-top:10px">Symbol (tippe eins an oder gib per Tastatur ein beliebiges ein)</label>'
    + '<input type="text" id="er-emoji" value="⭐" maxlength="4" style="text-align:center;font-size:1.4rem">'
    + '<div class="emoji-gitter" id="er-gitter">' + gitter + '</div>'
    + '<div class="zeile" style="margin-top:14px"><div><button class="knopf zart breit" id="er-abbruch">Abbrechen</button></div>'
    + '<div><button class="knopf gruen breit" id="er-ok">Erstellen</button></div></div></div>';
  $("modal-ziel").appendChild(hg);
  function markiere() { Array.prototype.forEach.call(hg.querySelectorAll("#er-gitter button"), function (b) {
    b.classList.toggle("an", b.dataset.e === gewaehlt); }); }
  markiere();
  Array.prototype.forEach.call(hg.querySelectorAll("#er-gitter button"), function (b) {
    b.addEventListener("click", function () { gewaehlt = b.dataset.e; $("er-emoji").value = gewaehlt; markiere(); });
  });
  $("er-emoji").addEventListener("input", function () { gewaehlt = this.value.trim() || "⭐"; markiere(); });
  $("er-abbruch").addEventListener("click", function () { $("modal-ziel").innerHTML = ""; });
  $("er-ok").addEventListener("click", function () {
    var name = ($("er-name").value || "").trim() || "Eigene Regel";
    zustand.regeln.push({ name:name, emoji:(gewaehlt || "⭐"), aktiv:true, zeitfensterStunden:48,
      nurVonUhr:0, nurBisUhr:24, mindestdauerStunden:2, bedingungen:{ tempMin:15 } });
    $("modal-ziel").innerHTML = "";
    speichere(); zeichneRegeln(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
    var karten = document.querySelectorAll("#regel-liste details.fein");
    if (karten.length) karten[karten.length - 1].open = true;
  });
}

/* ---------- Regel-Karten (mit Wisch-zum-Löschen) ---------- */
function zeichneRegeln() {
  var ziel = $("regel-liste"); ziel.innerHTML = "";
  if (!zustand.regeln.length) { ziel.innerHTML = '<p class="hinweis" style="margin-bottom:0">Noch keine Regel – tippe oben eine Vorlage an oder baue eine eigene.</p>'; return; }
  zustand.regeln.forEach(function (regel, i) {
    var huelle = document.createElement("div"); huelle.className = "regel-huelle";
    huelle.innerHTML = '<div class="loeschbg">🗑️ Löschen</div>';
    var karte = document.createElement("div");
    karte.className = "regel" + (regel.aktiv ? "" : " inaktiv");
    var kopf = document.createElement("div"); kopf.className = "regelkopf";
    kopf.innerHTML = '<span class="emoji">' + sicher(regel.emoji) + '</span>'
      + '<span class="name">' + sicher(regel.name) + '</span>'
      + '<label class="schalter"><input type="checkbox" ' + (regel.aktiv ? "checked" : "") + '><span class="bahn"></span></label>';
    kopf.querySelector("input").addEventListener("change", function () {
      regel.aktiv = this.checked; speichere(); zeichneRegeln(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
    });
    karte.appendChild(kopf);
    var trefferZiel = document.createElement("div");
    trefferZiel.dataset.regel = i; trefferZiel.innerHTML = trefferHtml(i, regel);
    karte.appendChild(trefferZiel);
    karte.appendChild(feinEditor(regel, i));
    macheWischbar(karte, function () { entferneRegel(i); });
    huelle.appendChild(karte); ziel.appendChild(huelle);
  });
}
function entferneRegel(i) {
  zustand.regeln.splice(i, 1); speichere(); zeichneRegeln(); zeichneVorlagen(); aktualisiereVorschau(); syncWennAktiv(); zeichneNudge();
}
function macheWischbar(el, onDelete) {
  var startX = 0, startY = 0, dx = 0, aktiv = false;
  el.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX; startY = e.touches[0].clientY; dx = 0; aktiv = true; el.style.transition = "";
  }, { passive: true });
  el.addEventListener("touchmove", function (e) {
    if (!aktiv) return;
    var x = e.touches[0].clientX - startX, y = e.touches[0].clientY - startY;
    if (Math.abs(y) > Math.abs(x)) { aktiv = false; el.style.transform = ""; return; }
    dx = Math.min(0, x); el.style.transform = "translateX(" + dx + "px)";
  }, { passive: true });
  el.addEventListener("touchend", function () {
    if (!aktiv) return; aktiv = false; el.style.transition = "transform .15s";
    if (dx < -90) { el.style.transform = "translateX(-100%)"; setTimeout(onDelete, 130); }
    else { el.style.transform = "translateX(0)"; }
    dx = 0;
  });
}
function trefferHtml(i, regel) {
  if (!regel.aktiv) return '<div class="kein-treffer">Ausgeschaltet – wird nicht geprüft.</div>';
  if (!zustand.ort) return '<div class="kein-treffer">Wähle zuerst deinen Ort.</div>';
  if (!letzteTreffer) return '<div class="kein-treffer">Prüfe …</div>';
  var liste = letzteTreffer[i] || [];
  if (!liste.length) return '<div class="kein-treffer">Kein Treffer im Fenster von ' + fensterText(regel.zeitfensterStunden || 48) + '.</div>';
  return liste.map(function (t) { return '<div class="treffer">✔️ ' + sicher(t.text) + '</div>'; }).join("");
}
function fensterText(h) { for (var k = 0; k < FENSTER_OPTIONEN.length; k++) if (FENSTER_OPTIONEN[k][0] === h) return FENSTER_OPTIONEN[k][1]; return h + " Std."; }

function feinEditor(regel, i) {
  var det = document.createElement("details");
  det.className = "fein"; det.innerHTML = "<summary>Feinjustieren</summary>";
  var np = document.createElement("div"); np.className = "zeile";
  np.innerHTML = '<div style="flex:2"><label>Name</label><input type="text" value="' + sicher(regel.name) + '" data-f="name"></div>'
    + '<div><label>Symbol</label><input type="text" maxlength="4" value="' + sicher(regel.emoji) + '" data-f="emoji" style="text-align:center"></div>';
  np.querySelector('[data-f="name"]').addEventListener("change", function () { regel.name = this.value.trim() || "Regel"; speichere(); zeichneRegeln(); syncWennAktiv(); });
  np.querySelector('[data-f="emoji"]').addEventListener("change", function () { regel.emoji = this.value.trim() || "🔔"; speichere(); zeichneRegeln(); syncWennAktiv(); });
  det.appendChild(np);

  var zf = document.createElement("div"); zf.className = "zeile";
  var optionen = FENSTER_OPTIONEN.map(function (o) { return '<option value="' + o[0] + '"' + ((regel.zeitfensterStunden || 48) === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("");
  zf.innerHTML = '<div style="flex:2"><label>Vorschau-Fenster</label><select data-f="zeitfensterStunden">' + optionen + '</select></div>';
  zf.querySelector("select").addEventListener("change", function () { regel.zeitfensterStunden = parseInt(this.value, 10); speichere(); aktualisiereVorschau(); syncWennAktiv(); });
  det.appendChild(zf);

  var zeit = document.createElement("div"); zeit.className = "zeile";
  zeit.innerHTML =
      '<div><label>Nur von (Uhr)</label><input type="number" min="0" max="23" value="' + (regel.nurVonUhr != null ? regel.nurVonUhr : 0) + '" data-f="nurVonUhr"></div>'
    + '<div><label>Nur bis (Uhr)</label><input type="number" min="1" max="24" value="' + (regel.nurBisUhr != null ? regel.nurBisUhr : 24) + '" data-f="nurBisUhr"></div>'
    + '<div><label>Mind. Dauer</label><input type="number" min="1" max="24" value="' + (regel.mindestdauerStunden != null ? regel.mindestdauerStunden : 2) + '" data-f="mindestdauerStunden"></div>';
  Array.prototype.forEach.call(zeit.querySelectorAll("input"), function (feld) {
    feld.addEventListener("change", function () { var z = parseInt(this.value, 10); if (!isNaN(z)) { regel[this.dataset.f] = z; speichere(); aktualisiereVorschau(); syncWennAktiv(); } });
  });
  det.appendChild(zeit);

  BAUSTEINE.forEach(function (b) {
    var gesetzt = regel.bedingungen[b.s] !== undefined;
    var wert = gesetzt ? regel.bedingungen[b.s] : STANDARDWERT[b.s];
    var reihe = document.createElement("div");
    reihe.className = "bedingung" + (gesetzt ? "" : " aus");
    reihe.innerHTML = '<input type="checkbox"' + (gesetzt ? " checked" : "") + '>'
      + '<span class="bez">' + b.bez + ' <small>(' + b.einheit + ')</small></span>'
      + '<input type="number" min="' + b.min + '" max="' + b.max + '" step="' + b.schritt + '" value="' + wert + '">'
      + '<input type="range" min="' + b.min + '" max="' + b.max + '" step="' + b.schritt + '" value="' + wert + '">';
    var haken = reihe.querySelector("input[type=checkbox]");
    var zahl = reihe.querySelector("input[type=number]");
    var regler = reihe.querySelector("input[type=range]");
    haken.addEventListener("change", function () {
      if (this.checked) { regel.bedingungen[b.s] = parseFloat(zahl.value); reihe.classList.remove("aus"); }
      else { delete regel.bedingungen[b.s]; reihe.classList.add("aus"); }
      speichere(); aktualisiereVorschau(); syncWennAktiv();
    });
    function uebernehme(w) { var z = parseFloat(w); if (!isNaN(z) && regel.bedingungen[b.s] !== undefined) { regel.bedingungen[b.s] = z; speichere(); aktualisiereVorschauLangsam(); syncWennAktiv(); } }
    regler.addEventListener("input", function () { zahl.value = this.value; uebernehme(this.value); });
    zahl.addEventListener("change", function () { regler.value = this.value; uebernehme(this.value); });
    det.appendChild(reihe);
  });

  var wr = document.createElement("div");
  wr.innerHTML = '<label style="margin-top:10px">Windrichtung – nur bei Wind aus:</label>';
  var gitter = document.createElement("div"); gitter.className = "sektoren";
  SEKTOREN.forEach(function (sekt, si) {
    var knopf = document.createElement("button");
    var an = Array.isArray(regel.bedingungen.windRichtungen) && regel.bedingungen.windRichtungen.indexOf(sekt) >= 0;
    if (an) knopf.className = "an"; knopf.textContent = PFEIL_VON[si] + " " + sekt;
    knopf.addEventListener("click", function () {
      var liste = Array.isArray(regel.bedingungen.windRichtungen) ? regel.bedingungen.windRichtungen.slice() : [];
      var pos = liste.indexOf(sekt); if (pos >= 0) liste.splice(pos, 1); else liste.push(sekt);
      if (liste.length) regel.bedingungen.windRichtungen = liste; else delete regel.bedingungen.windRichtungen;
      knopf.classList.toggle("an"); speichere(); aktualisiereVorschau(); syncWennAktiv();
    });
    gitter.appendChild(knopf);
  });
  wr.appendChild(gitter);
  var h = document.createElement("p"); h.className = "hinweis"; h.style.marginTop = "4px"; h.textContent = "Nichts gewählt = Windrichtung egal.";
  wr.appendChild(h); det.appendChild(wr);

  var entf = document.createElement("div"); entf.style.marginTop = "10px";
  entf.innerHTML = '<button class="knopf rot" style="padding:7px 11px;font-size:.8rem">🗑️ Regel entfernen</button>';
  entf.querySelector("button").addEventListener("click", function () { if (confirm('Regel "' + regel.name + '" wirklich entfernen?')) entferneRegel(i); });
  det.appendChild(entf);
  return det;
}

/* ---------- Vorschau + Wetter ---------- */
var vorschauTimer = null;
function aktualisiereVorschauLangsam() { clearTimeout(vorschauTimer); vorschauTimer = setTimeout(aktualisiereVorschau, 700); }
function aktualisiereVorschau() {
  clearTimeout(vorschauTimer);
  if (!zustand.ort) { $("wetter-hinweis").style.display = ""; $("wetter-tage").innerHTML = ""; return; }
  fetch("/api/vorschau", { method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ lat:zustand.ort.lat, lon:zustand.ort.lon, regeln:zustand.regeln }) })
  .then(function (a) { return a.json(); }).then(function (d) {
    if (!d || !d.ok) throw new Error((d && d.fehler) || "unbekannt");
    letzteTreffer = d.treffer; letzteTage = d.tage || []; letzteStunden = d.stunden || null;
    Array.prototype.forEach.call(document.querySelectorAll("[data-regel]"), function (ziel) {
      var i = parseInt(ziel.dataset.regel, 10); ziel.innerHTML = trefferHtml(i, zustand.regeln[i]);
    });
    zeichneWetter();
  }).catch(function (f) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-regel]"), function (ziel) {
      ziel.innerHTML = '<div class="warnung">Vorschau gerade nicht möglich (' + sicher(f.message) + ').</div>';
    });
    $("wetter-hinweis").textContent = "Wetterdaten gerade nicht verfügbar."; $("wetter-hinweis").style.display = "";
  });
}
function zeichneWetter() {
  $("wetter-hinweis").style.display = letzteTage.length ? "none" : "";
  var ziel = $("wetter-tage"); ziel.innerHTML = "";
  letzteTage.forEach(function (t) {
    var tag = document.createElement("div"); tag.className = "tag" + (offeneTage[t.datum] ? " offen" : "");
    var kopf = document.createElement("div"); kopf.className = "tag-kopf";
    kopf.innerHTML = '<span class="wt">' + t.wochentag.slice(0,2) + ", " + t.datum.slice(8,10) + "." + t.datum.slice(5,7) + '.</span>'
      + '<span class="icon">' + tagIcon(t.datum) + '</span>'
      + '<span class="werte">' + t.tempMin + "–" + t.tempMax + " °C · 💨 " + t.windMax
      + (t.boeMax != null ? " 🌬️" + t.boeMax : "") + (t.windRichtung ? " " + t.windRichtung : "")
      + (t.uvMax != null ? " · UV " + t.uvMax : "") + '</span><span class="pfeil">▸</span>';
    kopf.addEventListener("click", function () { offeneTage[t.datum] = !offeneTage[t.datum]; tag.classList.toggle("offen");
      if (offeneTage[t.datum] && !det.dataset.gefuellt) { det.innerHTML = detailHtml(t.datum); det.dataset.gefuellt = "1"; } });
    tag.appendChild(kopf);
    var det = document.createElement("div"); det.className = "details";
    if (offeneTage[t.datum]) { det.innerHTML = detailHtml(t.datum); det.dataset.gefuellt = "1"; }
    tag.appendChild(det); ziel.appendChild(tag);
  });
}
function tagIcon(datum) {
  if (!letzteStunden || !letzteStunden.weather_code) return "🌡️";
  for (var i = 0; i < letzteStunden.time.length; i++)
    if (letzteStunden.time[i].slice(0,10) === datum && letzteStunden.time[i].slice(11,13) === "12")
      return wetterIcon(letzteStunden.weather_code[i]);
  return "🌡️";
}
function tagIndizes(datum) {
  var idx = []; if (!letzteStunden) return idx;
  for (var i = 0; i < letzteStunden.time.length; i++) if (letzteStunden.time[i].slice(0,10) === datum) idx.push(i);
  return idx;
}
function detailHtml(datum) {
  var idx = tagIndizes(datum); if (!idx.length) return "";
  var s = letzteStunden, stunden = [];
  idx.forEach(function (i) {
    var dir = s.wind_direction_10m ? PFEIL_VON[Math.round(s.wind_direction_10m[i] / 45) % 8] : "";
    var uv = s.uv_index ? Math.round(s.uv_index[i]) : null;
    var boe = s.wind_gusts_10m ? Math.round(s.wind_gusts_10m[i]) : null;
    stunden.push('<div class="stunde"><div class="h">' + s.time[i].slice(11,13) + '</div>'
      + '<div class="i">' + (s.weather_code ? wetterIcon(s.weather_code[i]) : "") + '</div>'
      + '<div class="t">' + Math.round(s.temperature_2m[i]) + '°</div>'
      + '<div>' + dir + ' ' + Math.round(s.wind_speed_10m[i]) + '</div>'
      + (boe != null ? '<div>🌬️ ' + boe + '</div>' : '')
      + '<div>🌧️ ' + (Math.round(s.precipitation[i] * 10) / 10) + '</div>'
      + (uv != null ? '<div>UV ' + uv + '</div>' : '') + '</div>');
  });
  var std = idx.map(function (i) { return parseInt(s.time[i].slice(11,13), 10); });
  var temp = idx.map(function (i) { return s.temperature_2m[i]; });
  var wind = idx.map(function (i) { return s.wind_speed_10m[i]; });
  var boen = s.wind_gusts_10m ? idx.map(function (i) { return s.wind_gusts_10m[i]; }) : null;
  var regen = idx.map(function (i) { return s.precipitation[i]; });
  // Position der aktuellen Uhrzeit (nur wenn der Tag heute ist)
  var heute = new Date();
  var heuteIso = heute.getFullYear() + "-" + ("0" + (heute.getMonth() + 1)).slice(-2) + "-" + ("0" + heute.getDate()).slice(-2);
  var jetztIndex = null;
  if (datum === heuteIso && std.length) {
    var jh = heute.getHours() + heute.getMinutes() / 60 - std[0];
    if (jh >= 0 && jh <= std.length - 1) jetztIndex = jh;
  }
  return '<div class="stundenreihe">' + stunden.join("") + '</div>'
    + tempWindDiagramm(std, temp, wind, boen, jetztIndex)
    + balkenDiagramm("🌧️ Regen", "mm", std, regen, "#2563eb", jetztIndex);
}
/* Dezente senkrechte Linie an der aktuellen Uhrzeit. */
function jetztLinie(jetztIndex, px, o, H, u) {
  if (jetztIndex == null) return "";
  var x = px(jetztIndex).toFixed(1);
  return '<line class="jetzt-linie" x1="' + x + '" y1="' + o + '" x2="' + x + '" y2="' + (H - u) + '" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" opacity=".4"/>'
    + '<text x="' + x + '" y="' + (o + 6) + '" font-size="8" fill="currentColor" text-anchor="middle" opacity=".6">jetzt</text>';
}
/* Doppelachsen-Diagramm: Temperatur (links, rot) + Wind/Böen (rechts, türkis). */
function tempWindDiagramm(std, temp, wind, boen, jetztIndex) {
  var n = temp.length; if (!n) return "";
  var W = 320, H = 100, l = 26, r = 30, o = 12, u = 20;
  var tmin = Math.min.apply(null, temp), tmax = Math.max.apply(null, temp); if (tmin === tmax) { tmin -= 1; tmax += 1; }
  var wmax = Math.max.apply(null, wind.concat(boen || [])); if (wmax <= 0) wmax = 1;
  var px = function (i) { return l + i * (W - l - r) / (n - 1); };
  var yT = function (v) { return o + (1 - (v - tmin) / (tmax - tmin)) * (H - o - u); };
  var yW = function (v) { return o + (1 - v / wmax) * (H - o - u); };
  var tempFarbe = "#e11d48", windFarbe = "#0891b2";
  var linie = function (werte, f, mapy, extra) { return '<polyline fill="none" stroke="' + f + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ' + (extra || "") + ' points="'
    + werte.map(function (v, i) { return px(i).toFixed(1) + "," + mapy(v).toFixed(1); }).join(" ") + '"/>'; };
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Temperatur und Wind">'
    + '<text x="2" y="' + (yT(tmax) + 3).toFixed(1) + '" font-size="9" fill="' + tempFarbe + '">' + Math.round(tmax) + '°</text>'
    + '<text x="2" y="' + (yT(tmin) + 3).toFixed(1) + '" font-size="9" fill="' + tempFarbe + '">' + Math.round(tmin) + '°</text>'
    + '<text x="' + (W - 2) + '" y="' + (yW(wmax) + 6).toFixed(1) + '" font-size="9" fill="' + windFarbe + '" text-anchor="end">' + Math.round(wmax) + '</text>'
    + '<text x="' + (W - 2) + '" y="' + (yW(0) - 1).toFixed(1) + '" font-size="9" fill="' + windFarbe + '" text-anchor="end">0</text>'
    + jetztLinie(jetztIndex, px, o, H, u)
    + (boen ? linie(boen, windFarbe, yW, 'stroke-dasharray="3 3" opacity=".5"') : "")
    + linie(wind, windFarbe, yW) + linie(temp, tempFarbe, yT)
    + xBeschriftung(std).map(function (p) { return '<text x="' + px(p[0]).toFixed(1) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" text-anchor="middle" opacity=".55">' + p[1] + '</text>'; }).join("")
    + '</svg>';
  return '<div class="diagramm"><div class="titel"><span><b style="color:' + tempFarbe + '">Temperatur °C</b> · <b style="color:' + windFarbe + '">Wind km/h</b>' + (boen ? " · Böen (gestrichelt)" : "") + '</span></div>' + svg + '</div>';
}
function xBeschriftung(std) {
  var t = [];
  for (var k = 0; k < std.length; k++) if (std[k] % 6 === 0) t.push([k, std[k]]);
  return t;
}
function linienDiagramm(titel, einheit, std, werte, farbe) {
  var n = werte.length; if (!n) return "";
  var min = Math.min.apply(null, werte), max = Math.max.apply(null, werte);
  if (min === max) { min -= 1; max += 1; }
  var W = 320, H = 78, l = 6, r = 6, o = 10, u = 20;
  var px = function (i) { return l + i * (W - l - r) / (n - 1); };
  var py = function (v) { return o + (1 - (v - min) / (max - min)) * (H - o - u); };
  var punkte = werte.map(function (v, i) { return px(i).toFixed(1) + "," + py(v).toFixed(1); }).join(" ");
  var ticks = xBeschriftung(std).map(function (p) { return '<text x="' + px(p[0]).toFixed(1) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" text-anchor="middle" opacity=".55">' + p[1] + '</text>'; }).join("");
  return '<div class="diagramm"><div class="titel"><span>' + titel + '</span><span>' + Math.round(min) + '–' + Math.round(max) + ' ' + einheit + '</span></div>'
    + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + titel + '">'
    + '<polyline fill="none" stroke="' + farbe + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + punkte + '"/>'
    + ticks + '</svg></div>';
}
function balkenDiagramm(titel, einheit, std, werte, farbe, jetztIndex) {
  var n = werte.length; if (!n) return "";
  var max = Math.max.apply(null, werte); if (max <= 0) max = 1;
  var W = 320, H = 78, l = 6, r = 6, o = 10, u = 20;
  var bw = (W - l - r) / n;
  var pxBar = function (idx) { return l + (idx + 0.5) * bw; };
  var summe = Math.round(werte.reduce(function (a, b) { return a + b; }, 0) * 10) / 10;
  var balken = werte.map(function (v, i) {
    var hh = (v / max) * (H - o - u); return '<rect x="' + (l + i * bw + 0.5).toFixed(1) + '" y="' + (H - u - hh).toFixed(1)
      + '" width="' + (bw - 1).toFixed(1) + '" height="' + hh.toFixed(1) + '" fill="' + farbe + '" opacity=".85"/>';
  }).join("");
  var ticks = xBeschriftung(std).map(function (p) { return '<text x="' + (l + p[0] * bw + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" text-anchor="middle" opacity=".55">' + p[1] + '</text>'; }).join("");
  return '<div class="diagramm"><div class="titel"><span>' + titel + '</span><span>' + summe + ' ' + einheit + ' gesamt</span></div>'
    + '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + titel + '">' + balken + jetztLinie(jetztIndex, pxBar, o, H, u) + ticks + '</svg></div>';
}

/* ---------- Benachrichtigungen (Schalter) ---------- */
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
function benachrichtigungAn() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    zeigePushStatus("Dieser Browser unterstützt keine Push-Nachrichten. iPhone: Seite zuerst zum Home-Bildschirm hinzufügen und von dort öffnen.", "warnung");
    $("push-schalter").checked = false; return;
  }
  zeigePushStatus("Richte ein …", "erfolg");
  Notification.requestPermission().then(function (erlaubnis) {
    if (erlaubnis !== "granted") throw new Error("Ohne Erlaubnis geht es nicht (Status: " + erlaubnis + ").");
    return holeAbo();
  }).then(function (abo) {
    zustand.aktiviert = true; zustand.nudgeWeg = true; speichere(); zeichneNudge();
    var bereit = zustand.ort && zustand.regeln.some(function (r) { return r.aktiv; });
    if (bereit) { return sendeAnDienst(abo).then(function (d) {
      zeigePushStatus(d.gespeichert ? "✅ Aktiv! Eine Bestätigung ist unterwegs. Der Wächter prüft ab jetzt stündlich."
        : "✅ Test-Nachricht unterwegs! (Speicher wird noch eingerichtet.)", "erfolg"); }); }
    zeigePushStatus("✅ Eingeschaltet. Sobald du einen Ort und einen aktiven Wunsch hast, wache ich für dich.", "erfolg");
  }).catch(function (f) { zustand.aktiviert = false; speichere(); $("push-schalter").checked = false; zeigePushStatus("⚠️ " + f.message, "warnung"); });
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
function sendeAnDienst(abo) {
  return fetch("/api/aktivieren", { method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ abo:abo.toJSON ? abo.toJSON() : abo, lat:zustand.ort.lat, lon:zustand.ort.lon, regeln:zustand.regeln }) })
    .then(function (a) { return a.json().then(function (d) { if (!a.ok || !d.ok) throw new Error((d && d.fehler) || "Dienst nicht erreichbar."); return d; }); });
}
var syncTimer = null;
function syncWennAktiv() {
  if (!zustand.aktiviert || !zustand.ort || !zustand.regeln.some(function (r) { return r.aktiv; })) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function () {
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); })
      .then(function (abo) { if (abo) return sendeAnDienst(abo); }).catch(function () {});
  }, 1200);
}
$("loeschen").addEventListener("click", function () {
  if (!confirm("Wirklich alles löschen? Regeln, Ort und die Abmeldung vom Wächter.")) return;
  var fertig = function () { localStorage.removeItem(SPEICHER); location.reload(); };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (abo) {
      if (!abo) return null;
      return fetch("/api/deaktivieren", { method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ endpoint:abo.endpoint }) }).then(function () { return abo.unsubscribe(); });
    }).then(fertig, fertig);
  } else { fertig(); }
});

/* ---------- Erstnutzer + Nudge ---------- */
function zeigeWillkommen() {
  var hg = document.createElement("div"); hg.className = "modal-hg";
  hg.innerHTML = '<div class="modal"><h2>👋 Willkommen beim Wetter-Wächter!</h2>'
    + '<p style="font-size:.92rem">In drei Schritten fertig:</p>'
    + '<ol style="font-size:.92rem;padding-left:20px"><li><b>Ort</b> wählen</li>'
    + '<li><b>Wetter-Wunsch</b> antippen (z. B. 🍕 Pizzatag)</li>'
    + '<li><b>Benachrichtigungen</b> einschalten – dann melde ich mich, wenn dein Wetter kommt.</li></ol>'
    + '<p class="hinweis">Kostenlos · nur gerundeter Ort · keine Ortsangaben in den Nachrichten.</p>'
    + '<button class="knopf breit" id="willkommen-ok">Los geht\\'s</button></div>';
  $("modal-ziel").appendChild(hg);
  $("willkommen-ok").addEventListener("click", function () { zustand.willkommenGesehen = true; speichere(); $("modal-ziel").innerHTML = ""; $("ort-eingabe").focus(); });
}
function zeichneNudge() {
  var ziel = $("nudge"); ziel.innerHTML = "";
  var bereit = zustand.ort && zustand.regeln.some(function (r) { return r.aktiv; });
  if (!bereit || zustand.aktiviert || zustand.nudgeWeg) return;
  var banner = document.createElement("div"); banner.className = "banner";
  banner.innerHTML = '<span style="font-size:1.4rem">🔔</span><span class="txt">Sollen wir dich benachrichtigen, sobald dein Wunsch-Wetter kommt?</span>';
  var ja = document.createElement("button"); ja.className = "knopf gruen"; ja.style.padding = "9px 13px"; ja.textContent = "Aktivieren";
  ja.addEventListener("click", function () { $("push-schalter").checked = true; benachrichtigungAn(); });
  var spaeter = document.createElement("button"); spaeter.className = "knopf zart"; spaeter.style.padding = "9px 13px"; spaeter.textContent = "Später";
  spaeter.addEventListener("click", function () { zustand.nudgeWeg = true; speichere(); zeichneNudge(); });
  banner.appendChild(ja); banner.appendChild(spaeter); ziel.appendChild(banner);
}

/* ---------- Start ---------- */
$("push-schalter").checked = !!zustand.aktiviert;
zeichneOrt(); zeichneVorlagen(); zeichneRegeln(); zeichneNudge(); aktualisiereVorschau();
if (!zustand.willkommenGesehen) zeigeWillkommen();
</script>
</body>
</html>`;
}
