/*
 * Baukasten-Demo (Versuchsfeld, nicht Teil der laufenden App)
 * ===========================================================
 * Erreichbar unter /baukasten, nirgends verlinkt. Hier probieren wir die
 * neue Regelform mit „und“/„oder“ aus, ohne die App anzufassen:
 *
 *   Alle Bausteine müssen passen.  In einem Baustein reicht eine Zeile.
 *
 * Die Demo schickt ihre Regeln an dasselbe /api/vorschau wie die App und
 * zeigt daher echte Treffer für den in der App gewählten Ort. Sie speichert
 * unter einem eigenen Schlüssel und verschickt keine Benachrichtigungen.
 *
 * Hinweis: Das Seiten-JavaScript nutzt bewusst KEINE Backticks, weil die
 * ganze Seite in einem Template-Literal steckt.
 */

import { BAUSTEINE_CSS, BAUSTEINE_JS } from "./bausteine_ui.js";

export function baukastenSeite() {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2563eb">
<title>Baukasten-Demo · Wetter-Wächter</title>
<style>
  :root, :root[data-theme="light"] {
    --hg:#f4f6f8; --karte:#ffffff; --text:#1c2733; --text2:#5b6b7b;
    --linie:#dde4ea; --akzent:#2563eb; --akzent-hell:#e8effd;
    --gruen:#15803d; --gruen-hell:#e6f4ea; --rot:#b91c1c; --rot-hell:#fdeaea;
    --gelb-hell:#fdf4e3; --gelb:#8a6414;
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root { --hg:#10161d; --karte:#1a232e; --text:#e8edf2; --text2:#93a3b3;
            --linie:#2c3947; --akzent:#5b93f5; --akzent-hell:#1d2c44;
            --gruen:#4ade80; --gruen-hell:#12291a; --rot:#f87171; --rot-hell:#331616;
            --gelb-hell:#2b2416; --gelb:#e3b95f; }
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
         background:var(--hg); color:var(--text); line-height:1.4; -webkit-text-size-adjust:100%; }
  main { max-width:640px; margin:0 auto; padding:10px 10px 50px; }
  h1 { font-size:1.2rem; margin:2px 2px 6px; }
  h2 { font-size:.98rem; margin:0 0 7px; }
  .karte { background:var(--karte); border:1px solid var(--linie); border-radius:12px; padding:11px; margin-bottom:10px; }
  .hinweis { font-size:.79rem; color:var(--text2); }
  .versuch { background:var(--gelb-hell); color:var(--gelb); border-radius:9px;
    padding:7px 10px; font-size:.8rem; margin:0 2px 10px; }
  .modus-aus { display:flex; align-items:center; gap:10px; flex-wrap:wrap;
    background:var(--akzent-hell); border:1px solid var(--akzent); border-radius:10px;
    padding:9px 11px; margin:0 2px 10px; font-size:.82rem; }
  .modus-aus > div { flex:1; min-width:170px; }
  .knopf { display:inline-block; border:0; border-radius:9px; cursor:pointer;
    padding:9px 13px; font-size:.9rem; font-weight:600; background:var(--akzent); color:#fff; }
  .knopf.zart { background:var(--akzent-hell); color:var(--akzent); }
  .knopf.rot { background:var(--rot-hell); color:var(--rot); }
  .knopf.klein { padding:5px 10px; font-size:.8rem; border-radius:8px; }
  input[type=text] { width:100%; padding:9px 10px; border:1px solid var(--linie);
    border-radius:9px; background:var(--hg); color:var(--text); font-size:16px; }
  input[type=number] { width:100%; padding:4px 6px; border:1px solid var(--linie);
    border-radius:7px; background:var(--hg); color:var(--text); font-size:16px; text-align:right; }
  select { padding:6px 8px; border:1px solid var(--linie); border-radius:7px;
    background:var(--hg); color:var(--text); font-size:16px; }
  label { font-size:.75rem; color:var(--text2); display:block; margin-bottom:1px; }

  /* ---- Schalter ---- */
  .schalter-zeile { display:flex; align-items:center; gap:10px; }
  .schalter-zeile .txt { flex:1; font-weight:600; font-size:.92rem; }
  .schalter { position:relative; width:44px; height:25px; flex-shrink:0; }
  .schalter input { opacity:0; width:100%; height:100%; position:absolute; margin:0; cursor:pointer; z-index:2; }
  .schalter .bahn { position:absolute; inset:0; border-radius:13px; background:var(--linie); transition:background .15s; }
  .schalter .bahn::after { content:""; position:absolute; top:3px; left:3px; width:19px; height:19px;
    border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:left .15s; }
  .schalter input:checked + .bahn { background:var(--gruen); }
  .schalter input:checked + .bahn::after { left:22px; }

  /* ---- Regel ---- */
  .regel { border:1px solid var(--linie); border-radius:12px; padding:10px; margin-bottom:10px; background:var(--karte); }
  .regelkopf { display:flex; align-items:center; gap:8px; margin-bottom:2px; }
  .regelkopf .emoji { font-size:1.3rem; }
  .regelkopf .name { flex:1; font-weight:700; font-size:1.02rem; border:0; background:none;
    color:var(--text); padding:1px 0; min-width:0; }
  .regelkopf .name:focus { outline:2px solid var(--akzent); outline-offset:2px; border-radius:5px; }

${BAUSTEINE_CSS}
  .zeitleiste { display:flex; flex-wrap:wrap; gap:8px; margin-top:9px; }
</style>
</head>
<body>
<main>
  <h1>Baukasten-Demo</h1>
  <p class="versuch"><b>Versuchsfeld.</b> Hier probieren wir die neue Regelform mit „oder“ aus.
  Diese Seite verschickt <b>keine</b> Benachrichtigungen und ändert nichts an deinen echten Wünschen.</p>

  <div id="modus-hinweis"></div>

  <section class="karte">
    <h2>Ort</h2>
    <div id="ort-zeile"></div>
  </section>

  <div id="regeln"></div>

  <section class="karte">
    <h2>Wunsch hinzufügen</h2>
    <div class="auswahl vorlagen" id="vorlagen"></div>
    <button class="knopf zart" id="neue-regel" style="width:100%;margin-top:8px">+ Leerer Wunsch</button>
  </section>

  <section class="karte">
    <h2>So funktioniert es</h2>
    <p class="hinweis" style="margin:0">Jeder <b>Baustein</b> ist eine Bedingung. <b>Alle</b> Bausteine müssen
    passen. Mit „+ oder“ legst du eine Alternative in denselben Baustein – dann reicht <b>eine</b> der Zeilen.
    Unten steht immer als Satz, was du gerade gebaut hast, und wie oft es wirklich zutrifft.</p>
  </section>

  <section class="karte">
    <h2>Einstellungen</h2>
    <div class="schalter-zeile">
      <span class="txt">Erweiterte Regeln (und/oder)</span>
      <label class="schalter"><input type="checkbox" id="erweitert-schalter"><span class="bahn"></span></label>
    </div>
    <p class="hinweis" id="erweitert-erklaerung" style="margin:6px 0 0"></p>
    <p class="hinweis" style="margin:8px 0 0">In der App landet dieser Schalter später unter „Einstellungen“.</p>
  </section>
</main>

<script>
"use strict";

/* Muss zu BAUSTEIN_ARTEN in logik.js passen. */
var FENSTER = [[24,"1 Tag"],[48,"2 Tage"],[72,"3 Tage"],[120,"5 Tage"],[168,"7 Tage"]];

var SPEICHER_APP = "wetterWaechterApp_v2";
var SPEICHER_DEMO = "wetterWaechterBaukasten_v1";

/* Die bekannten Vorlagen, in Bausteinform. „Pizza am Balkon“ zeigt das „oder“. */
function B(art, min, max) {
  var t = { art: art };
  if (min !== null && min !== undefined) t.min = min;
  if (max !== null && max !== undefined) t.max = max;
  return { teile: [t] };
}
var VORLAGEN = [
  { name:"Pizza am Balkon", emoji:"🍕", zeitfensterStunden:72, nurVonUhr:11, nurBisUhr:22, mindestdauerStunden:2,
    bausteine:[ B("temp",18,28), B("regen",null,0),
                { teile:[{ art:"wind", max:10 }, { art:"windrichtung", sektoren:["N","NO","NW"] }] } ] },
  { name:"Pizzatag", emoji:"🍕", zeitfensterStunden:48, nurVonUhr:11, nurBisUhr:21, mindestdauerStunden:3,
    bausteine:[ B("temp",18,28), B("wind",null,10), B("regen",null,0) ] },
  { name:"Pflanztag", emoji:"🌱", zeitfensterStunden:48, nurVonUhr:8, nurBisUhr:20, mindestdauerStunden:4,
    bausteine:[ B("temp",15,24), B("bewoelkung",30,70), B("regen",null,0.2) ] },
  { name:"Wäschetag", emoji:"🧺", zeitfensterStunden:48, nurVonUhr:9, nurBisUhr:19, mindestdauerStunden:4,
    bausteine:[ B("temp",15,null), B("wind",5,30), B("regen",null,0), B("feuchte",null,65) ] },
  { name:"Lauf-Wetter", emoji:"🏃", zeitfensterStunden:48, nurVonUhr:6, nurBisUhr:21, mindestdauerStunden:1,
    bausteine:[ B("temp",5,20), B("wind",null,20), B("regen",null,0.2) ] },
  { name:"Fahrrad-Wetter", emoji:"🚲", zeitfensterStunden:48, nurVonUhr:6, nurBisUhr:20, mindestdauerStunden:1,
    bausteine:[ B("temp",8,28), B("wind",null,20), B("boe",null,35), B("regen",null,0.1) ] },
  { name:"Sonnencreme", emoji:"🧴", zeitfensterStunden:48, nurVonUhr:9, nurBisUhr:18, mindestdauerStunden:2,
    bausteine:[ B("uv",6,null) ] },
  { name:"Sturm-Warnung", emoji:"⛈️", zeitfensterStunden:48, nurVonUhr:0, nurBisUhr:24, mindestdauerStunden:1,
    bausteine:[ { teile:[{ art:"wind", min:60 }, { art:"boe", min:90 }] } ] }
];
function ausVorlage(v) { return JSON.parse(JSON.stringify(v)); }

function $(id) { return document.getElementById(id); }
function sicher(t) { return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

var ort = null;
try { var app = JSON.parse(localStorage.getItem(SPEICHER_APP) || "{}"); if (app && app.ort) ort = app.ort; } catch (e) {}

var regeln = [], erweitert = true;
try {
  var d = JSON.parse(localStorage.getItem(SPEICHER_DEMO) || "null");
  if (d && Array.isArray(d.regeln)) regeln = d.regeln;
  if (d && typeof d.erweitert === "boolean") erweitert = d.erweitert;
} catch (e) {}
if (!regeln.length) regeln = [ausVorlage(VORLAGEN[0])];
function speichere() { localStorage.setItem(SPEICHER_DEMO, JSON.stringify({ regeln: regeln, erweitert: erweitert })); }

/* ---------- Ort ---------- */
function zeichneOrt() {
  var ziel = $("ort-zeile");
  if (ort) {
    ziel.innerHTML = '<p style="margin:0"><b>' + sicher(ort.name) + '</b> '
      + '<span class="hinweis">· ' + ort.lat + " / " + ort.lon + '</span></p>'
      + '<p class="hinweis" style="margin:4px 0 0">Aus der App übernommen. Die Treffer unten sind echt.</p>';
  } else {
    ziel.innerHTML = '<p class="hinweis" style="margin:0 0 8px">Noch kein Ort gewählt. Öffne zuerst die App '
      + 'und wähle deinen Ort – die Demo übernimmt ihn dann automatisch.</p>'
      + '<a class="knopf zart" href="/">Zur App</a>';
  }
}


/* ---------- Zeichnen ---------- */
function zeichneAlles() { zeichneOrt(); zeichneSchalter(); zeichneVorlagen(); zeichneRegeln(); hoereVorschau(); }

function zeichneSchalter() {
  $("erweitert-schalter").checked = erweitert;
  $("erweitert-erklaerung").innerHTML = erweitert
    ? "An: Du kannst Bausteine mit „+ oder“ zu Alternativen kombinieren."
    : "Aus: Alle Bausteine werden mit <b>und</b> verknüpft – wie in der bisherigen App.";
  // Der ausgeschaltete Zustand muss sofort sichtbar sein: sonst sucht man oben
  // vergeblich nach „+ oder“ und den Anfassern, während der Schalter unten steht.
  var ziel = $("modus-hinweis");
  if (erweitert) { ziel.innerHTML = ""; return; }
  ziel.innerHTML = '<div class="modus-aus"><div><b>Erweiterte Regeln sind aus.</b> '
    + 'Deshalb gibt es kein „+ oder“ und kein Ziehen – alle Bausteine sind mit <b>und</b> verknüpft.</div>'
    + '<button class="knopf" type="button" id="modus-an">Einschalten</button></div>';
  $("modus-an").addEventListener("click", function () {
    erweitert = true; speichere(); zeichneAlles(); window.scrollTo(0, 0);
  });
}
$("erweitert-schalter").addEventListener("change", function () {
  erweitert = this.checked; speichere(); zeichneAlles();
});

function zeichneVorlagen() {
  var ziel = $("vorlagen"); ziel.innerHTML = "";
  var schonDa = regeln.map(function (r) { return r.name; });
  VORLAGEN.forEach(function (v) {
    if (!erweitert && v.bausteine.some(function (b) { return b.teile.length > 1; })) return;
    var knopf = document.createElement("button"); knopf.type = "button";
    knopf.textContent = v.emoji + " " + v.name;
    if (schonDa.indexOf(v.name) >= 0) knopf.className = "benutzt";  // leicht zurückgenommen, bleibt klickbar
    knopf.addEventListener("click", function () { regeln.push(ausVorlage(v)); speichere(); zeichneAlles(); });
    ziel.appendChild(knopf);
  });
}


function zeichneRegeln() {
  var ziel = $("regeln"); ziel.innerHTML = "";
  regeln.forEach(function (regel, ri) { ziel.appendChild(zeichneRegel(regel, ri)); });
}
function entferneRegel(ri) {
  regeln.splice(ri, 1);
  if (!regeln.length) regeln = [ausVorlage(VORLAGEN[0])];
  speichere(); zeichneAlles();
}


function zeichneRegel(regel, ri) {
  var karte = document.createElement("section"); karte.className = "regel";
  karte.dataset.regelkarte = ri;

  var kopf = document.createElement("div"); kopf.className = "regelkopf";
  kopf.innerHTML = '<span class="emoji">' + sicher(regel.emoji || "🔔") + '</span>'
    + '<input class="name" value="' + sicher(regel.name) + '" aria-label="Name des Wunsches">'
    + '<button class="knopf rot klein" type="button">Löschen</button>';
  kopf.querySelector(".name").addEventListener("change", function () {
    regel.name = this.value.trim() || "Wunsch"; speichere(); hoereVorschau();
  });
  kopf.querySelector("button").addEventListener("click", function () { entferneRegel(ri); });
  karte.appendChild(kopf);

  baueBausteinBereich(karte, regel, ri);

  var zeit = document.createElement("div"); zeit.className = "zeitleiste";
  var opt = FENSTER.map(function (o) { return '<option value="' + o[0] + '"' + ((regel.zeitfensterStunden || 48) === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("");
  zeit.innerHTML = '<div><label>Vorschau</label><select data-f="zeitfensterStunden">' + opt + '</select></div>'
    + '<div><label>Von (Uhr)</label><input type="number" min="0" max="23" style="width:60px" value="' + (regel.nurVonUhr || 0) + '" data-f="nurVonUhr"></div>'
    + '<div><label>Bis (Uhr)</label><input type="number" min="1" max="24" style="width:60px" value="' + (regel.nurBisUhr != null ? regel.nurBisUhr : 24) + '" data-f="nurBisUhr"></div>'
    + '<div><label>Mind. Std.</label><input type="number" min="1" max="24" style="width:60px" value="' + (regel.mindestdauerStunden || 2) + '" data-f="mindestdauerStunden"></div>';
  Array.prototype.forEach.call(zeit.querySelectorAll("select,input"), function (feld) {
    feld.addEventListener("change", function () {
      var z = parseInt(this.value, 10);
      if (!isNaN(z)) { regel[this.dataset.f] = z; speichere(); zeichneAlles(); }
    });
  });
  karte.appendChild(zeit);

  baueSatzUndWarnung(karte, regel);

  var tr = document.createElement("div"); tr.dataset.treffer = ri;
  tr.innerHTML = '<div class="kein-treffer">Prüfe …</div>';
  karte.appendChild(tr);
  return karte;
}


${BAUSTEINE_JS}

/* ---------- Echte Treffer über /api/vorschau ---------- */
var vorschauTimer = null;
function vorschauLangsam() { clearTimeout(vorschauTimer); vorschauTimer = setTimeout(hoereVorschau, 500); }
function hoereVorschau() {
  if (!ort) return;
  fetch("/api/vorschau", { method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ lat: ort.lat, lon: ort.lon, regeln: regeln.map(function (r) {
      return { name:r.name, emoji:r.emoji, aktiv:true, bausteine:r.bausteine, bedingungen:{},
               zeitfensterStunden:r.zeitfensterStunden, nurVonUhr:r.nurVonUhr,
               nurBisUhr:r.nurBisUhr, mindestdauerStunden:r.mindestdauerStunden };
    }) }) })
  .then(function (a) { return a.json(); })
  .then(function (d) {
    if (!d.ok) { zeigeFehler(d.fehler || "Unbekannter Fehler."); return; }
    (d.treffer || []).forEach(function (liste, ri) {
      var ziel = document.querySelector('[data-treffer="' + ri + '"]'); if (!ziel) return;
      if (!liste.length) { ziel.innerHTML = '<div class="kein-treffer">Kein Treffer im gewählten Vorschau-Zeitraum.</div>'; return; }
      ziel.innerHTML = liste.map(function (t) { return '<div class="treffer">✔️ ' + sicher(t.text) + '</div>'; }).join("");
    });
  })
  .catch(function () { zeigeFehler("Vorschau gerade nicht erreichbar."); });
}
function zeigeFehler(text) {
  Array.prototype.forEach.call(document.querySelectorAll("[data-treffer]"), function (el) {
    el.innerHTML = '<div class="warnung">' + sicher(text) + '</div>';
  });
}

$("neue-regel").addEventListener("click", function () {
  regeln.push({ name:"Neuer Wunsch", emoji:"🔔", zeitfensterStunden:72, nurVonUhr:0, nurBisUhr:24,
    mindestdauerStunden:2, bausteine:[{ teile:[neuerTeil("temp")] }] });
  speichere(); zeichneAlles();
});

zeichneAlles();
</script>
</body>
</html>`;
}
