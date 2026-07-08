/*
 * Die App-Seite des Wetter-Wächters (eine Datei, kein externer Code außer
 * Karten-/Geodiensten, die der Browser des Nutzers direkt anspricht).
 * Wird vom Worker unter "/" ausgeliefert; der öffentliche VAPID-Schlüssel wird
 * beim Ausliefern eingesetzt.
 *
 * Aufbau: drei Reiter (Wünsche · Wetter · Einstellungen) über eine untere
 * Navigationsleiste. Hinweis: Das Seiten-JavaScript nutzt bewusst KEINE
 * Backticks/Template-Literale, weil die ganze Seite in einem Template-Literal steckt.
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

  /* untere Reiter-Navigation */
  nav { position:fixed; bottom:0; left:0; right:0; display:flex; background:var(--karte);
        border-top:1px solid var(--linie); z-index:20; padding-bottom:env(safe-area-inset-bottom); }
  nav button { flex:1; border:0; background:none; cursor:pointer; padding:8px 2px 10px;
    font-size:.72rem; color:var(--text2); display:flex; flex-direction:column; align-items:center; gap:2px; }
  nav button .sym { font-size:1.3rem; }
  nav button.aktiv { color:var(--akzent); font-weight:600; }
  .reiter { display:none; }
  .reiter.sichtbar { display:block; }

  /* Ortssuche */
  .ort-gewaehlt { display:flex; align-items:center; gap:8px; font-weight:600; margin-bottom:8px; }
  #ort-ergebnisse button { display:block; width:100%; text-align:left; background:var(--hg);
    border:1px solid var(--linie); border-radius:8px; padding:9px 10px; margin-top:6px; color:var(--text); font-size:.92rem; cursor:pointer; }
  .ort-zeile { display:flex; gap:8px; } .ort-zeile input { flex:1; }
  .ort-zeile .knopf { padding:11px 13px; flex-shrink:0; }

  /* Vorlagen */
  .vorlagen { display:flex; flex-wrap:wrap; gap:8px; }
  .vorlagen button { border:1px solid var(--linie); background:var(--hg); color:var(--text);
    border-radius:999px; padding:8px 13px; font-size:.9rem; cursor:pointer; }
  .vorlagen button:disabled { opacity:.4; cursor:default; }
  .vorlagen button.eigene { border-style:dashed; color:var(--akzent); }

  /* Regel-Karten */
  .regel { border:1px solid var(--linie); border-radius:12px; padding:11px 12px; margin-top:10px; }
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
  .schalter { position:relative; width:44px; height:25px; flex-shrink:0; }
  .schalter input { opacity:0; width:100%; height:100%; position:absolute; margin:0; cursor:pointer; z-index:2; }
  .schalter .bahn { position:absolute; inset:0; border-radius:13px; background:var(--linie); transition:background .15s; }
  .schalter .bahn::after { content:""; position:absolute; top:3px; left:3px; width:19px; height:19px;
    border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:left .15s; }
  .schalter input:checked + .bahn { background:var(--gruen); }
  .schalter input:checked + .bahn::after { left:22px; }

  /* Wetter-Tage + Stundendetail */
  .tag { border:1px solid var(--linie); border-radius:10px; padding:10px 11px; margin-top:9px; }
  .tag-kopf { display:flex; align-items:center; gap:8px; cursor:pointer; }
  .tag-kopf .wt { font-weight:700; min-width:74px; }
  .tag-kopf .icon { font-size:1.2rem; }
  .tag-kopf .werte { margin-left:auto; text-align:right; font-size:.86rem; }
  .tag-kopf .pfeil { color:var(--text2); transition:transform .15s; }
  .tag.offen .tag-kopf .pfeil { transform:rotate(90deg); }
  .stunden { display:none; margin-top:8px; overflow-x:auto; }
  .tag.offen .stunden { display:block; }
  .stundenreihe { display:flex; gap:9px; padding-bottom:4px; }
  .stunde { flex:0 0 auto; text-align:center; font-size:.74rem; color:var(--text2); min-width:52px; }
  .stunde .h { font-weight:700; color:var(--text); font-size:.8rem; }
  .stunde .i { font-size:1.05rem; margin:1px 0; }
  .stunde .t { color:var(--text); font-weight:600; font-size:.82rem; }

  /* Modal / Banner */
  .modal-hg { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:30; display:flex;
    align-items:center; justify-content:center; padding:18px; }
  .modal { background:var(--karte); border-radius:16px; padding:20px; max-width:420px; width:100%; }
  .modal h2 { font-size:1.15rem; }
  .banner { background:var(--akzent-hell); border:1px solid var(--akzent); border-radius:12px;
    padding:11px 12px; margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .banner .txt { flex:1; min-width:150px; font-size:.88rem; }
</style>
</head>
<body>
<main>
  <h1>🌦️ Wetter-Wächter</h1>
  <p class="untertitel">Sag mir, welches Wetter du suchst – ich melde mich, wenn es kommt.</p>

  <!-- ===== Reiter: Wünsche ===== -->
  <section id="reiter-wuensche" class="reiter sichtbar">
    <div id="nudge"></div>
    <section class="karte">
      <h2>📍 Dein Ort</h2>
      <div id="ort-anzeige" class="ort-gewaehlt" style="display:none">
        <span>📍</span><span id="ort-name"></span>
        <button class="knopf zart" id="ort-aendern" style="margin-left:auto;padding:7px 11px;font-size:.82rem">Ändern</button>
      </div>
      <div id="ort-suche">
        <div class="ort-zeile">
          <input type="text" id="ort-eingabe" placeholder="Ort suchen, z. B. Düsseldorf …" autocomplete="off">
          <button class="knopf zart" id="ort-standort" title="Meinen Standort verwenden">📍</button>
        </div>
        <div id="ort-ergebnisse"></div>
        <p class="hinweis" style="margin-bottom:0">🔒 Es wird nur eine <b>grobe</b> Position (~11 km) verwendet – nie dein genauer Standort.</p>
      </div>
    </section>

    <section class="karte">
      <h2>🎯 Deine Wetter-Wünsche</h2>
      <p class="hinweis">Tippe eine Vorlage an – oder baue eine eigene Regel. Feinjustieren jederzeit möglich.</p>
      <div class="vorlagen" id="vorlagen"></div>
      <div id="regel-liste"></div>
    </section>
  </section>

  <!-- ===== Reiter: Wetter ===== -->
  <section id="reiter-wetter" class="reiter">
    <section class="karte">
      <h2>🌤️ Vorhersage (7 Tage)</h2>
      <p class="hinweis" id="wetter-hinweis">Wähle zuerst im Reiter „Wünsche“ deinen Ort.</p>
      <div id="wetter-tage"></div>
      <p class="hinweis" style="margin-top:12px">🗺️ Eine interaktive Wetterkarte kommt in einem späteren Update.</p>
    </section>
  </section>

  <!-- ===== Reiter: Einstellungen ===== -->
  <section id="reiter-einstellungen" class="reiter">
    <section class="karte">
      <h2>🔔 Benachrichtigungen</h2>
      <p class="hinweis" id="push-erklaerung">Der Wächter prüft stündlich dein Wunsch-Wetter und meldet sich rechtzeitig.
      <b>iPhone/iPad:</b> Seite zuerst über das Teilen-Symbol „Zum Home-Bildschirm“ hinzufügen und von dort öffnen.</p>
      <button class="knopf gruen breit" id="aktivieren">🔔 Benachrichtigungen aktivieren</button>
      <div id="push-status"></div>
    </section>
    <section class="karte">
      <h2>🗑️ Daten</h2>
      <p class="hinweis">Alles im Browser Gespeicherte löschen und dieses Gerät vom Wächter abmelden.</p>
      <button class="knopf rot" id="loeschen" style="padding:9px 13px;font-size:.85rem">Alles löschen</button>
    </section>
    <p class="hinweis" style="text-align:center">Kostenlos · Wetterdaten: Open-Meteo · Nachrichten enthalten nie Ortsangaben</p>
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

/* ---------- Bausteine, Vorlagen, Konstanten ---------- */
var BAUSTEINE = [
  { s:"tempMin",       bez:"Temperatur mindestens", einheit:"°C",   min:-20, max:45,  schritt:1 },
  { s:"tempMax",       bez:"Temperatur höchstens",  einheit:"°C",   min:-20, max:45,  schritt:1 },
  { s:"windMin",       bez:"Wind mindestens",       einheit:"km/h", min:0,   max:120, schritt:1 },
  { s:"windMax",       bez:"Wind höchstens",        einheit:"km/h", min:0,   max:120, schritt:1 },
  { s:"regenMax",      bez:"Regen höchstens",       einheit:"mm/h", min:0,   max:10,  schritt:0.1 },
  { s:"bewoelkungMin", bez:"Bewölkung mindestens",  einheit:"%",    min:0,   max:100, schritt:5 },
  { s:"bewoelkungMax", bez:"Bewölkung höchstens",   einheit:"%",    min:0,   max:100, schritt:5 },
  { s:"feuchteMax",    bez:"Luftfeuchte höchstens", einheit:"%",    min:0,   max:100, schritt:5 },
  { s:"uvMin",         bez:"UV-Index mindestens",   einheit:"UV",   min:0,   max:12,  schritt:1 },
  { s:"uvMax",         bez:"UV-Index höchstens",    einheit:"UV",   min:0,   max:12,  schritt:1 }
];
var STANDARDWERT = { tempMin:15, tempMax:25, windMin:5, windMax:20, regenMax:0,
  bewoelkungMin:20, bewoelkungMax:80, feuchteMax:70, uvMin:3, uvMax:6 };
var SEKTOREN = ["N","NO","O","SO","S","SW","W","NW"];
var PFEIL_VON = ["↓","↙","←","↖","↑","↗","→","↘"]; // wohin der Wind weht (kommt aus Sektor)
var FENSTER_OPTIONEN = [ [24,"1 Tag"], [48,"2 Tage"], [72,"3 Tage"], [120,"5 Tage"], [168,"7 Tage"] ];
var VORLAGEN = [
  { name:"Pizzatag", emoji:"🍕", nurVonUhr:11, nurBisUhr:21, mindestdauerStunden:3,
    bedingungen:{ tempMin:18, tempMax:28, windMax:10, regenMax:0 } },
  { name:"Pflanztag", emoji:"🌱", nurVonUhr:8, nurBisUhr:20, mindestdauerStunden:4,
    bedingungen:{ tempMin:15, tempMax:24, bewoelkungMin:30, bewoelkungMax:70, regenMax:0.2 } },
  { name:"Wäschetag", emoji:"🧺", nurVonUhr:9, nurBisUhr:19, mindestdauerStunden:4,
    bedingungen:{ tempMin:15, windMin:5, windMax:30, regenMax:0, feuchteMax:65 } },
  { name:"Lauf-Wetter", emoji:"🏃", nurVonUhr:6, nurBisUhr:21, mindestdauerStunden:1,
    bedingungen:{ tempMin:5, tempMax:20, windMax:20, regenMax:0.2 } },
  { name:"Sonnencreme", emoji:"🧴", nurVonUhr:9, nurBisUhr:18, mindestdauerStunden:2,
    bedingungen:{ uvMin:6 } },
  { name:"Sturm-Warnung", emoji:"⛈️", nurVonUhr:0, nurBisUhr:24, mindestdauerStunden:1,
    bedingungen:{ windMin:60 } }
];

/* ---------- Zustand ---------- */
var SPEICHER = "wetterWaechterApp_v2";
var zustand = { ort:null, regeln:[], aktiviert:false, willkommenGesehen:false, nudgeWeg:false };
try { var roh = localStorage.getItem(SPEICHER); if (roh) { var g = JSON.parse(roh); if (g && typeof g === "object") zustand = Object.assign(zustand, g); } } catch (e) {}
if (!Array.isArray(zustand.regeln)) zustand.regeln = [];

function speichere() { localStorage.setItem(SPEICHER, JSON.stringify(zustand)); }
function runde(w) { return Math.round(parseFloat(w) * 10) / 10; }
function $(id) { return document.getElementById(id); }
function sicher(t) { return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

var letzteTreffer = null, letzteTage = [], letzteStunden = null, offeneTage = {};

/* ---------- Reiter-Navigation ---------- */
Array.prototype.forEach.call(document.querySelectorAll("nav button"), function (knopf) {
  knopf.addEventListener("click", function () {
    Array.prototype.forEach.call(document.querySelectorAll("nav button"), function (k) { k.classList.remove("aktiv"); });
    knopf.classList.add("aktiv");
    Array.prototype.forEach.call(document.querySelectorAll(".reiter"), function (r) { r.classList.remove("sichtbar"); });
    $("reiter-" + knopf.dataset.reiter).classList.add("sichtbar");
    window.scrollTo(0, 0);
  });
});
function zeigeReiter(name) {
  var knopf = document.querySelector('nav button[data-reiter="' + name + '"]');
  if (knopf) knopf.click();
}

/* ---------- Wetter-Symbole (WMO-Code) ---------- */
function wetterIcon(code) {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

/* ---------- Ortssuche ---------- */
var suchTimer = null;
$("ort-eingabe").addEventListener("input", function () {
  clearTimeout(suchTimer);
  var text = this.value.trim();
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
$("ort-standort").addEventListener("click", function () {
  if (!navigator.geolocation) { alert("Dieses Gerät unterstützt keine Standort-Abfrage."); return; }
  $("ort-standort").textContent = "…";
  navigator.geolocation.getCurrentPosition(function (pos) {
    var lat = runde(pos.coords.latitude), lon = runde(pos.coords.longitude); // sofort grob runden
    // Ortsnamen zur groben Position nachschlagen (Reverse-Geocoding, ohne Schlüssel)
    fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat + "&longitude=" + lon + "&localityLanguage=de")
      .then(function (a) { return a.json(); }).then(function (d) {
        var name = d.city || d.locality || d.principalSubdivision || "Mein Standort";
        setzeOrt(name + " (grob)", lat, lon);
      }).catch(function () { setzeOrt("Mein Standort (grob)", lat, lon); })
      .then(function () { $("ort-standort").textContent = "📍"; });
  }, function () { $("ort-standort").textContent = "📍"; alert("Standort nicht verfügbar – bitte den Ort oben suchen."); },
  { enableHighAccuracy:false, timeout:10000 });
});
function setzeOrt(name, lat, lon) {
  zustand.ort = { name:String(name).slice(0,60), lat:runde(lat), lon:runde(lon) };
  speichere(); zeichneOrt(); aktualisiereVorschau(); syncWennAktiv();
}
$("ort-aendern").addEventListener("click", function () {
  $("ort-anzeige").style.display = "none"; $("ort-suche").style.display = ""; $("ort-eingabe").focus();
});
function zeichneOrt() {
  if (zustand.ort) {
    $("ort-name").textContent = zustand.ort.name + " (grob " + zustand.ort.lat + " / " + zustand.ort.lon + ")";
    $("ort-anzeige").style.display = ""; $("ort-suche").style.display = "none";
  } else { $("ort-anzeige").style.display = "none"; $("ort-suche").style.display = ""; }
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
      speichere(); zeichneRegeln(); zeichneVorlagen(); aktualisiereVorschau(); syncWennAktiv(); pruefeNudge();
    });
    ziel.appendChild(knopf);
  });
  var eigene = document.createElement("button");
  eigene.className = "eigene"; eigene.textContent = "＋ Eigene Regel";
  eigene.addEventListener("click", function () {
    zustand.regeln.push({ name:"Eigene Regel", emoji:"⭐", aktiv:true, zeitfensterStunden:48,
      nurVonUhr:0, nurBisUhr:24, mindestdauerStunden:2, bedingungen:{ tempMin:15 } });
    speichere(); zeichneRegeln(); aktualisiereVorschau(); syncWennAktiv(); pruefeNudge();
    var karten = document.querySelectorAll("#regel-liste details.fein");
    if (karten.length) karten[karten.length - 1].open = true;
  });
  ziel.appendChild(eigene);
}

/* ---------- Regel-Karten ---------- */
function zeichneRegeln() {
  var ziel = $("regel-liste"); ziel.innerHTML = "";
  if (!zustand.regeln.length) { ziel.innerHTML = '<p class="hinweis" style="margin-bottom:0">Noch keine Regel – tippe oben eine Vorlage an oder baue eine eigene.</p>'; return; }
  zustand.regeln.forEach(function (regel, i) {
    var karte = document.createElement("div");
    karte.className = "regel" + (regel.aktiv ? "" : " inaktiv");
    var kopf = document.createElement("div");
    kopf.className = "regelkopf";
    kopf.innerHTML = '<span class="emoji">' + sicher(regel.emoji) + '</span>'
      + '<span class="name">' + sicher(regel.name) + '</span>'
      + '<label class="schalter"><input type="checkbox" ' + (regel.aktiv ? "checked" : "") + '><span class="bahn"></span></label>';
    kopf.querySelector("input").addEventListener("change", function () {
      regel.aktiv = this.checked; speichere(); zeichneRegeln(); aktualisiereVorschau(); syncWennAktiv();
    });
    karte.appendChild(kopf);
    var trefferZiel = document.createElement("div");
    trefferZiel.dataset.regel = i; trefferZiel.innerHTML = trefferHtml(i, regel);
    karte.appendChild(trefferZiel);
    karte.appendChild(feinEditor(regel, i));
    ziel.appendChild(karte);
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
  det.className = "fein";
  det.innerHTML = "<summary>Feinjustieren</summary>";

  // Name + Emoji
  var np = document.createElement("div"); np.className = "zeile";
  np.innerHTML = '<div style="flex:2"><label>Name</label><input type="text" value="' + sicher(regel.name) + '" data-f="name"></div>'
    + '<div><label>Symbol</label><input type="text" maxlength="4" value="' + sicher(regel.emoji) + '" data-f="emoji"></div>';
  np.querySelector('[data-f="name"]').addEventListener("change", function () { regel.name = this.value.trim() || "Regel"; speichere(); zeichneRegeln(); syncWennAktiv(); });
  np.querySelector('[data-f="emoji"]').addEventListener("change", function () { regel.emoji = this.value.trim() || "🔔"; speichere(); zeichneRegeln(); syncWennAktiv(); });
  det.appendChild(np);

  // Zeitfenster (bis 7 Tage), Uhrzeiten, Mindestdauer
  var zf = document.createElement("div"); zf.className = "zeile";
  var optionen = FENSTER_OPTIONEN.map(function (o) {
    return '<option value="' + o[0] + '"' + ((regel.zeitfensterStunden || 48) === o[0] ? " selected" : "") + '>' + o[1] + '</option>';
  }).join("");
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

  // Zahlen-Bedingungen (inkl. UV)
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

  // Windrichtung (Sektoren)
  var wr = document.createElement("div");
  wr.innerHTML = '<label style="margin-top:10px">Windrichtung – nur bei Wind aus:</label>';
  var gitter = document.createElement("div"); gitter.className = "sektoren";
  SEKTOREN.forEach(function (sekt, si) {
    var knopf = document.createElement("button");
    var aktiv = Array.isArray(regel.bedingungen.windRichtungen) && regel.bedingungen.windRichtungen.indexOf(sekt) >= 0;
    if (aktiv) knopf.className = "an";
    knopf.textContent = PFEIL_VON[si] + " " + sekt;
    knopf.addEventListener("click", function () {
      var liste = Array.isArray(regel.bedingungen.windRichtungen) ? regel.bedingungen.windRichtungen.slice() : [];
      var pos = liste.indexOf(sekt);
      if (pos >= 0) liste.splice(pos, 1); else liste.push(sekt);
      if (liste.length) regel.bedingungen.windRichtungen = liste; else delete regel.bedingungen.windRichtungen;
      knopf.classList.toggle("an");
      speichere(); aktualisiereVorschau(); syncWennAktiv();
    });
    gitter.appendChild(knopf);
  });
  wr.appendChild(gitter);
  var wrHinweis = document.createElement("p"); wrHinweis.className = "hinweis"; wrHinweis.style.marginTop = "4px";
  wrHinweis.textContent = "Nichts gewählt = Windrichtung egal.";
  wr.appendChild(wrHinweis);
  det.appendChild(wr);

  // Entfernen
  var entf = document.createElement("div"); entf.style.marginTop = "10px";
  entf.innerHTML = '<button class="knopf rot" style="padding:7px 11px;font-size:.8rem">🗑️ Regel entfernen</button>';
  entf.querySelector("button").addEventListener("click", function () {
    if (!confirm('Regel "' + regel.name + '" wirklich entfernen?')) return;
    zustand.regeln.splice(i, 1); speichere(); zeichneRegeln(); zeichneVorlagen(); aktualisiereVorschau(); syncWennAktiv();
  });
  det.appendChild(entf);
  return det;
}

/* ---------- Vorschau + Wetter-Reiter ---------- */
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
    var icon = tagIcon(t.datum);
    var kopf = document.createElement("div"); kopf.className = "tag-kopf";
    kopf.innerHTML = '<span class="wt">' + t.wochentag.slice(0,2) + ", " + t.datum.slice(8,10) + "." + t.datum.slice(5,7) + '.</span>'
      + '<span class="icon">' + icon + '</span>'
      + '<span class="werte">' + t.tempMin + "–" + t.tempMax + " °C · 💨 " + t.windMax + (t.windRichtung ? " " + t.windRichtung : "")
      + (t.uvMax != null ? " · UV " + t.uvMax : "") + '</span>'
      + '<span class="pfeil">▸</span>';
    kopf.addEventListener("click", function () { offeneTage[t.datum] = !offeneTage[t.datum]; tag.classList.toggle("offen"); });
    tag.appendChild(kopf);
    var det = document.createElement("div"); det.className = "stunden"; det.innerHTML = stundenHtml(t.datum);
    tag.appendChild(det);
    ziel.appendChild(tag);
  });
}
function tagIcon(datum) {
  if (!letzteStunden || !letzteStunden.weather_code) return "🌡️";
  // Symbol der Mittagsstunde (12 Uhr) als Tagesüberblick
  for (var i = 0; i < letzteStunden.time.length; i++) {
    if (letzteStunden.time[i].slice(0,10) === datum && letzteStunden.time[i].slice(11,13) === "12")
      return wetterIcon(letzteStunden.weather_code[i]);
  }
  return "🌡️";
}
function stundenHtml(datum) {
  if (!letzteStunden) return "";
  var s = letzteStunden, teile = [];
  for (var i = 0; i < s.time.length; i++) {
    if (s.time[i].slice(0,10) !== datum) continue;
    var std = s.time[i].slice(11,13);
    var dir = s.wind_direction_10m ? PFEIL_VON[Math.round(s.wind_direction_10m[i] / 45) % 8] : "";
    var uv = s.uv_index ? Math.round(s.uv_index[i]) : null;
    teile.push('<div class="stunde"><div class="h">' + std + '</div>'
      + '<div class="i">' + (s.weather_code ? wetterIcon(s.weather_code[i]) : "") + '</div>'
      + '<div class="t">' + Math.round(s.temperature_2m[i]) + '°</div>'
      + '<div>' + dir + ' ' + Math.round(s.wind_speed_10m[i]) + '</div>'
      + '<div>🌧️ ' + (Math.round(s.precipitation[i] * 10) / 10) + '</div>'
      + (uv != null ? '<div>UV ' + uv + '</div>' : '') + '</div>');
  }
  return '<div class="stundenreihe">' + teile.join("") + '</div>';
}

/* ---------- Benachrichtigungen ---------- */
function b64urlZuBytes(s) {
  var pad = (4 - (s.length % 4)) % 4;
  var b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "====".slice(0, pad);
  var r = atob(b64); return Uint8Array.from(r, function (c) { return c.charCodeAt(0); });
}
function zeigePushStatus(text, gut) { $("push-status").innerHTML = '<div class="' + (gut ? "erfolg" : "warnung") + '">' + sicher(text) + "</div>"; }
function holeAbo() {
  return navigator.serviceWorker.register("/sw.js").then(function () { return navigator.serviceWorker.ready; })
    .then(function (reg) { return reg.pushManager.getSubscription().then(function (abo) {
      return abo || reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64urlZuBytes(VAPID_PUBLIC) }); }); });
}
function aktiviereBenachrichtigungen() {
  if (!zustand.ort) { zeigeReiter("wuensche"); zeigePushStatus("Bitte wähle zuerst deinen Ort.", false); return; }
  if (!zustand.regeln.some(function (r) { return r.aktiv; })) { zeigeReiter("wuensche"); zeigePushStatus("Bitte füge zuerst mindestens eine aktive Regel hinzu.", false); return; }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    zeigePushStatus("Dieser Browser unterstützt keine Push-Nachrichten. iPhone: Seite zuerst zum Home-Bildschirm hinzufügen und von dort öffnen.", false); return;
  }
  zeigePushStatus("Richte ein …", true);
  Notification.requestPermission().then(function (erlaubnis) {
    if (erlaubnis !== "granted") throw new Error("Ohne Erlaubnis geht es nicht (Status: " + erlaubnis + ").");
    return holeAbo();
  }).then(function (abo) { return sendeAnDienst(abo); }).then(function (d) {
    zustand.aktiviert = true; zustand.nudgeWeg = true; speichere(); zeichneNudge();
    zeigePushStatus(d.gespeichert ? "✅ Fertig! Eine Bestätigung ist unterwegs. Der Wächter prüft ab jetzt stündlich für dich."
      : "✅ Test-Nachricht unterwegs! (Der Speicher wird noch eingerichtet – die stündliche Überwachung startet in Kürze.)", true);
  }).catch(function (f) { zeigePushStatus("⚠️ " + f.message, false); });
}
$("aktivieren").addEventListener("click", aktiviereBenachrichtigungen);
function sendeAnDienst(abo) {
  return fetch("/api/aktivieren", { method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ abo:abo.toJSON ? abo.toJSON() : abo, lat:zustand.ort.lat, lon:zustand.ort.lon, regeln:zustand.regeln }) })
    .then(function (a) { return a.json().then(function (d) { if (!a.ok || !d.ok) throw new Error((d && d.fehler) || "Dienst nicht erreichbar."); return d; }); });
}
var syncTimer = null;
function syncWennAktiv() {
  if (!zustand.aktiviert || !zustand.ort) return;
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

/* ---------- Erstnutzer-Dialog + Nudge ---------- */
function zeigeWillkommen() {
  var hg = document.createElement("div"); hg.className = "modal-hg";
  hg.innerHTML = '<div class="modal"><h2>👋 Willkommen beim Wetter-Wächter!</h2>'
    + '<p style="font-size:.92rem">In drei Schritten fertig:</p>'
    + '<ol style="font-size:.92rem;padding-left:20px"><li><b>Ort</b> wählen</li>'
    + '<li><b>Wetter-Wunsch</b> antippen (z. B. 🍕 Pizzatag)</li>'
    + '<li><b>Benachrichtigungen</b> erlauben – dann melde ich mich, wenn dein Wetter kommt.</li></ol>'
    + '<p class="hinweis">Kostenlos · nur grober Ort · keine Ortsangaben in den Nachrichten.</p>'
    + '<button class="knopf breit" id="willkommen-ok">Los geht\\'s</button></div>';
  $("modal-ziel").appendChild(hg);
  $("willkommen-ok").addEventListener("click", function () {
    zustand.willkommenGesehen = true; speichere(); $("modal-ziel").innerHTML = ""; $("ort-eingabe").focus();
  });
}
function pruefeNudge() { zeichneNudge(); }
function zeichneNudge() {
  var ziel = $("nudge"); ziel.innerHTML = "";
  var bereit = zustand.ort && zustand.regeln.some(function (r) { return r.aktiv; });
  if (!bereit || zustand.aktiviert || zustand.nudgeWeg) return;
  var banner = document.createElement("div"); banner.className = "banner";
  banner.innerHTML = '<span style="font-size:1.4rem">🔔</span><span class="txt">Sollen wir dich benachrichtigen, sobald dein Wunsch-Wetter kommt?</span>';
  var ja = document.createElement("button"); ja.className = "knopf gruen"; ja.style.padding = "9px 13px"; ja.textContent = "Aktivieren";
  ja.addEventListener("click", aktiviereBenachrichtigungen);
  var spaeter = document.createElement("button"); spaeter.className = "knopf zart"; spaeter.style.padding = "9px 13px"; spaeter.textContent = "Später";
  spaeter.addEventListener("click", function () { zustand.nudgeWeg = true; speichere(); zeichneNudge(); });
  banner.appendChild(ja); banner.appendChild(spaeter); ziel.appendChild(banner);
}

/* ---------- Start ---------- */
zeichneOrt(); zeichneVorlagen(); zeichneRegeln(); zeichneNudge(); aktualisiereVorschau();
if (!zustand.willkommenGesehen) zeigeWillkommen();
</script>
</body>
</html>`;
}
