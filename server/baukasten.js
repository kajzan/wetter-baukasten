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

  /* ---- Bausteine ---- */
  .bausteine { margin-top:6px; }
  .baustein { border:1px solid var(--linie); border-radius:10px; padding:5px 8px 6px; margin-top:5px; background:var(--hg); }
  .baustein.mehrfach { border-color:var(--akzent); box-shadow:0 0 0 1px var(--akzent-hell); }
  .und-trenner { text-align:center; font-size:.68rem; color:var(--text2); letter-spacing:.09em;
    text-transform:uppercase; margin:4px 0 0; font-weight:700; }
  .teil { padding:2px 0; }
  .teil + .teil { border-top:1px dashed var(--linie); margin-top:4px; padding-top:5px; }
  .teilkopf { display:flex; align-items:center; gap:6px; }
  .teilkopf .sym { font-size:1rem; }
  .teilkopf .bez { flex:1; font-weight:600; font-size:.88rem; }
  .teilkopf .weg { border:0; background:none; color:var(--text2); cursor:pointer; font-size:.95rem;
    padding:1px 5px; line-height:1; }
  /* „+ oder“ sitzt in der Kopfzeile des Bausteins, damit keine eigene Zeile nötig ist */
  .teilkopf .oder-knopf { border:1px solid var(--akzent); background:var(--akzent-hell); color:var(--akzent);
    border-radius:999px; padding:1px 9px; font-size:.72rem; font-weight:700; cursor:pointer; line-height:1.5; }
  .oder-marke { display:inline-block; background:var(--akzent); color:#fff; border-radius:5px;
    padding:0 6px; font-size:.66rem; font-weight:700; letter-spacing:.06em; margin-bottom:2px; }
  .grenze { display:grid; grid-template-columns:74px 20px 1fr 54px; gap:5px; align-items:center; padding:0; }
  .grenze .txt { font-size:.76rem; color:var(--text2); }
  .grenze input[type=checkbox] { width:17px; height:17px; accent-color:var(--akzent); margin:0; }
  .grenze input[type=range] { width:100%; height:16px; accent-color:var(--akzent); margin:0; display:block; }
  /* Nicht gesetzte Grenzen schrumpfen auf eine dünne Zeile – kein grauer Regler-Ballast */
  .grenze.aus { grid-template-columns:74px 20px; }
  .grenze.aus input[type=range], .grenze.aus input[type=number] { display:none; }
  .sektoren { display:grid; grid-template-columns:repeat(8,1fr); gap:3px; margin-top:4px; }
  .sektoren button { border:1px solid var(--linie); background:var(--karte); color:var(--text);
    border-radius:6px; padding:5px 0; font-size:.68rem; cursor:pointer; }
  .sektoren button.an { background:var(--akzent); color:#fff; border-color:var(--akzent); }
  .werkzeuge { display:flex; flex-wrap:wrap; gap:6px; margin-top:5px; align-items:center; }

  /* ---- Chips (neue Bausteine, Vorlagen) ---- */
  .auswahl { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
  .auswahl button { border:1px dashed var(--linie); background:var(--hg); color:var(--text);
    border-radius:999px; padding:5px 10px; font-size:.83rem; cursor:pointer; }
  .auswahl button:hover { border-color:var(--akzent); color:var(--akzent); }
  .auswahl.vorlagen button { border-style:solid; background:var(--karte); }
  /* Schon verwendet: nur leicht zurückgenommen, weiterhin anklickbar */
  .auswahl button.benutzt { opacity:.55; }
  .auswahl button.benutzt::after { content:" ✓"; font-weight:700; }

  /* ---- Ziehbare Baustein-Leiste ---- */
  .palette { display:flex; gap:5px; margin-top:7px; overflow-x:auto; padding:1px 0 3px;
    scrollbar-width:none; -ms-overflow-style:none; }
  .palette::-webkit-scrollbar { display:none; }
  .palette .p-chip { flex:0 0 auto; border:1px dashed var(--linie); background:var(--hg); color:var(--text);
    border-radius:999px; padding:5px 11px; font-size:.83rem; cursor:grab; white-space:nowrap;
    touch-action:pan-x; user-select:none; -webkit-user-select:none; }
  .palette .p-chip.benutzt { opacity:.55; }
  .palette .p-chip.benutzt::after { content:" ✓"; font-weight:700; }

  /* ---- Ziehen: Anfasser, Ziele, Geist ---- */
  .teilkopf .griff { color:var(--text2); cursor:grab; font-size:.92rem; line-height:1;
    padding:3px 1px; touch-action:none; user-select:none; -webkit-user-select:none; }
  .baustein.ziel-oder { outline:2px solid var(--akzent); outline-offset:1px; background:var(--akzent-hell); }
  .baustein.ziel-voll { outline:2px solid var(--rot); outline-offset:1px; }
  .teil.wandert { opacity:.35; }
  body.zieht { user-select:none; -webkit-user-select:none; }
  body.zieht .p-chip, body.zieht .griff { cursor:grabbing; }
  #zieh-geist { position:fixed; z-index:60; pointer-events:none; background:var(--karte);
    border:1px solid var(--akzent); border-radius:999px; padding:5px 12px; font-size:.83rem;
    font-weight:600; box-shadow:0 5px 16px rgba(0,0,0,.28); white-space:nowrap; }
  #zieh-linie { position:fixed; z-index:59; pointer-events:none; height:3px;
    background:var(--akzent); border-radius:2px; }
  #zieh-linie::after { content:"UND"; position:absolute; left:12px; top:-9px;
    background:var(--akzent); color:#fff; font-size:.6rem; font-weight:700;
    padding:1px 6px; border-radius:4px; letter-spacing:.09em; }
  #zieh-marke { position:fixed; z-index:61; pointer-events:none; background:var(--akzent); color:#fff;
    font-size:.62rem; font-weight:700; letter-spacing:.09em; padding:2px 7px; border-radius:5px; }
  #zieh-marke.voll { background:var(--rot); }

  /* ---- Satz, Warnung, Treffer ---- */
  .satz { background:var(--akzent-hell); border-radius:9px; padding:6px 9px; margin-top:7px;
    font-size:.8rem; line-height:1.38; }
  .satz b { color:var(--akzent); }
  .unmoeglich { background:var(--rot-hell); color:var(--rot); border-radius:9px; padding:7px 10px;
    margin-top:6px; font-size:.82rem; line-height:1.4; }
  .treffer { background:var(--gruen-hell); color:var(--gruen); border-radius:8px; padding:5px 9px;
    margin-top:5px; font-size:.83rem; }
  .kein-treffer { color:var(--text2); font-size:.81rem; margin-top:6px; }
  .warnung { background:var(--rot-hell); color:var(--rot); border-radius:8px; padding:7px 10px;
    font-size:.83rem; margin-top:6px; }
  .zeitleiste { display:flex; flex-wrap:wrap; gap:8px; margin-top:9px; }
</style>
</head>
<body>
<main>
  <h1>Baukasten-Demo</h1>
  <p class="versuch"><b>Versuchsfeld.</b> Hier probieren wir die neue Regelform mit „oder“ aus.
  Diese Seite verschickt <b>keine</b> Benachrichtigungen und ändert nichts an deinen echten Wünschen.</p>

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
var ARTEN = {
  temp:         { bez:"Temperatur",   einheit:"°C",   min:-20, max:45,  schritt:1,   emoji:"🌡️", standard:{min:18,max:26} },
  wind:         { bez:"Wind",         einheit:"km/h", min:0,   max:120, schritt:1,   emoji:"💨", standard:{max:15} },
  boe:          { bez:"Windböen",     einheit:"km/h", min:0,   max:150, schritt:1,   emoji:"🌬️", standard:{max:40} },
  regen:        { bez:"Regen",        einheit:"mm/h", min:0,   max:10,  schritt:0.1, emoji:"🌧️", standard:{max:0} },
  bewoelkung:   { bez:"Bewölkung",    einheit:"%",    min:0,   max:100, schritt:5,   emoji:"☁️", standard:{max:60} },
  feuchte:      { bez:"Luftfeuchte",  einheit:"%",    min:0,   max:100, schritt:5,   emoji:"💧", standard:{max:70} },
  uv:           { bez:"UV-Index",     einheit:"",     min:0,   max:15,  schritt:1,   emoji:"☀️", standard:{min:6} },
  windrichtung: { bez:"Windrichtung", einheit:"",                                    emoji:"🧭", standard:{sektoren:["N","NO","NW"]} }
};
var ARTEN_REIHE = ["temp","wind","boe","windrichtung","regen","bewoelkung","feuchte","uv"];
var SEKTOREN = ["N","NO","O","SO","S","SW","W","NW"];
var PFEIL_VON = ["↓","↙","←","↖","↑","↗","→","↘"];
var FENSTER = [[24,"1 Tag"],[48,"2 Tage"],[72,"3 Tage"],[120,"5 Tage"],[168,"7 Tage"]];
var MAX_BAUSTEINE = 8, MAX_ALTERNATIVEN = 3;

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

/* ---------- Satz in normalem Deutsch ---------- */
function zahlText(w) { return String(Math.round(w * 10) / 10).replace(".", ","); }
function teilSatz(teil) {
  var art = ARTEN[teil.art];
  if (!art) return "?";
  if (teil.art === "windrichtung") {
    var s = teil.sektoren || [];
    return s.length ? "Wind aus " + s.join("/") : "Windrichtung egal";
  }
  var e = art.einheit ? " " + art.einheit : "";
  if (teil.art === "regen" && teil.max === 0 && teil.min === undefined) return "kein Regen";
  if (teil.min !== undefined && teil.max !== undefined) {
    if (teil.min > teil.max)   // widersprüchlich – nicht als Bereich schönschreiben
      return art.bez + " mindestens " + zahlText(teil.min) + " und höchstens " + zahlText(teil.max) + e;
    return art.bez + " " + zahlText(teil.min) + "–" + zahlText(teil.max) + e;
  }
  if (teil.min !== undefined) return art.bez + " mindestens " + zahlText(teil.min) + e;
  if (teil.max !== undefined) return art.bez + " höchstens " + zahlText(teil.max) + e;
  return art.bez + " egal";
}

/* Mehrere Bausteine derselben Art sind mit „und“ verknüpft – wirksam ist also
   nur ihre Überschneidung. Genau die zeigen wir im Satz, damit dort steht, was
   wirklich auslöst (10–20 und 15–25 ergibt 15–20). */
function vereinfacheBausteine(bausteine) {
  var liste = [], stelle = {};
  (bausteine || []).forEach(function (b) {
    var teile = b.teile || [];
    if (!teile.length) return;
    if (teile.length > 1) { liste.push({ oder: teile }); return; }
    var t = teile[0];
    if (stelle[t.art] === undefined) {
      stelle[t.art] = liste.length;
      liste.push({ einzel: JSON.parse(JSON.stringify(t)), zusammengefasst: false });
      return;
    }
    var eintrag = liste[stelle[t.art]], e = eintrag.einzel;
    if (t.art === "windrichtung") {
      var vorhanden = e.sektoren || [], neu = t.sektoren || [];
      e.sektoren = vorhanden.filter(function (x) { return neu.indexOf(x) >= 0; });
    } else {
      if (t.min !== undefined) e.min = e.min === undefined ? t.min : Math.max(e.min, t.min);
      if (t.max !== undefined) e.max = e.max === undefined ? t.max : Math.min(e.max, t.max);
    }
    eintrag.zusammengefasst = true;
  });
  return liste;
}

function regelSatz(regel) {
  var liste = vereinfacheBausteine(regel.bausteine);
  if (!liste.length) return "<b>Passt immer</b> – noch kein Baustein gewählt.";
  var zusammengefasst = false;
  var stuecke = liste.map(function (eintrag) {
    if (eintrag.oder) return "(" + eintrag.oder.map(teilSatz).join(" <b>oder</b> ") + ")";
    if (eintrag.zusammengefasst) zusammengefasst = true;
    return teilSatz(eintrag.einzel);
  });
  var zeit = " Geprüft wird " + (regel.nurVonUhr || 0) + "–" + (regel.nurBisUhr != null ? regel.nurBisUhr : 24)
    + " Uhr, mindestens " + (regel.mindestdauerStunden || 2) + " Stunden am Stück.";
  var fuss = zusammengefasst
    ? '<br><span class="hinweis">Mehrere Bausteine derselben Art sind zur wirksamen Überschneidung zusammengefasst.</span>'
    : "";
  return "<b>Passt, wenn:</b> " + stuecke.join(" <b>und</b> ") + "." + zeit + fuss;
}

/* ---------- Unerfüllbare Regeln erkennen ----------
   Zwei getrennte Bausteine derselben Art werden mit „und“ verknüpft. Wer
   10–20 °C UND 30–40 °C fordert, bekommt nie einen Treffer – das sagen wir. */
function unmoeglichkeiten(regel) {
  var probleme = [], pflicht = {};
  (regel.bausteine || []).forEach(function (b) {
    var teile = b.teile || [];
    teile.forEach(function (t) {
      if (t.min !== undefined && t.max !== undefined && t.min > t.max) {
        probleme.push(ARTEN[t.art].bez + ": „mindestens " + zahlText(t.min) + "“ ist größer als „höchstens "
          + zahlText(t.max) + "“.");
      }
    });
    if (teile.length !== 1) return;                 // „oder“-Bausteine sind nie in sich unmöglich
    var t = teile[0];
    if (t.art === "windrichtung") {
      var s = t.sektoren || []; if (!s.length) return;
      if (!pflicht.windrichtung) pflicht.windrichtung = { sektoren: s.slice(), anzahl: 1 };
      else {
        pflicht.windrichtung.anzahl++;
        pflicht.windrichtung.sektoren = pflicht.windrichtung.sektoren.filter(function (x) { return s.indexOf(x) >= 0; });
      }
      return;
    }
    if (!pflicht[t.art]) pflicht[t.art] = { min: -Infinity, max: Infinity, anzahl: 0 };
    var p = pflicht[t.art];
    if (t.min !== undefined) p.min = Math.max(p.min, t.min);
    if (t.max !== undefined) p.max = Math.min(p.max, t.max);
    p.anzahl++;
  });
  Object.keys(pflicht).forEach(function (art) {
    var p = pflicht[art];
    if (p.anzahl < 2) return;
    if (art === "windrichtung") {
      if (!p.sektoren.length) probleme.push("Windrichtung: die geforderten Richtungen schließen sich gegenseitig aus.");
      return;
    }
    if (p.min > p.max) {
      probleme.push(ARTEN[art].bez + ": es müsste gleichzeitig mindestens " + zahlText(p.min)
        + " und höchstens " + zahlText(p.max) + (ARTEN[art].einheit ? " " + ARTEN[art].einheit : "") + " sein.");
    }
  });
  return probleme;
}

/* ---------- Zeichnen ---------- */
function zeichneAlles() { zeichneOrt(); zeichneSchalter(); zeichneVorlagen(); zeichneRegeln(); hoereVorschau(); }

function zeichneSchalter() {
  $("erweitert-schalter").checked = erweitert;
  $("erweitert-erklaerung").innerHTML = erweitert
    ? "An: Du kannst Bausteine mit „+ oder“ zu Alternativen kombinieren."
    : "Aus: Alle Bausteine werden mit <b>und</b> verknüpft – wie in der bisherigen App.";
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

/* Welche Bausteinarten kommen in dieser Regel / diesem Baustein schon vor? */
function benutzteArten(quelle) {
  var arten = {};
  (quelle || []).forEach(function (b) { (b.teile || []).forEach(function (t) { arten[t.art] = true; }); });
  return arten;
}

function zeichneRegeln() {
  var ziel = $("regeln"); ziel.innerHTML = "";
  regeln.forEach(function (regel, ri) { ziel.appendChild(zeichneRegel(regel, ri)); });
}

function zeichneRegel(regel, ri) {
  var karte = document.createElement("section"); karte.className = "regel";
  karte.dataset.regel = ri;

  var kopf = document.createElement("div"); kopf.className = "regelkopf";
  kopf.innerHTML = '<span class="emoji">' + sicher(regel.emoji || "🔔") + '</span>'
    + '<input class="name" value="' + sicher(regel.name) + '" aria-label="Name des Wunsches">'
    + '<button class="knopf rot klein" type="button">Löschen</button>';
  kopf.querySelector(".name").addEventListener("change", function () {
    regel.name = this.value.trim() || "Wunsch"; speichere(); hoereVorschau();
  });
  kopf.querySelector("button").addEventListener("click", function () {
    regeln.splice(ri, 1);
    if (!regeln.length) regeln = [ausVorlage(VORLAGEN[0])];
    speichere(); zeichneAlles();
  });
  karte.appendChild(kopf);

  var bau = document.createElement("div"); bau.className = "bausteine";
  (regel.bausteine || []).forEach(function (baustein, bi) {
    if (bi > 0) { var t = document.createElement("p"); t.className = "und-trenner"; t.textContent = "und"; bau.appendChild(t); }
    bau.appendChild(zeichneBaustein(regel, baustein, bi, ri));
  });
  karte.appendChild(bau);

  // Baustein-Leiste: antippen hängt an (und), ziehen entscheidet Platz und Art.
  if ((regel.bausteine || []).length >= MAX_BAUSTEINE) {
    var voll = document.createElement("div"); voll.className = "auswahl";
    voll.innerHTML = '<p class="hinweis" style="margin:0">Mehr als ' + MAX_BAUSTEINE + ' Bausteine sind nicht vorgesehen.</p>';
    karte.appendChild(voll);
  } else {
    var benutzt = benutzteArten(regel.bausteine);
    var palette = document.createElement("div"); palette.className = "palette";
    ARTEN_REIHE.forEach(function (art) {
      var chip = document.createElement("button"); chip.type = "button";
      chip.className = "p-chip" + (benutzt[art] ? " benutzt" : "");
      chip.dataset.art = art;
      chip.textContent = ARTEN[art].emoji + " " + ARTEN[art].bez;
      chip.addEventListener("click", function () {
        if (zuletztGezogen) return;              // Klick nach dem Ziehen unterdrücken
        regel.bausteine = (regel.bausteine || []).concat([{ teile: [neuerTeil(art)] }]);
        speichere(); zeichneAlles();
      });
      chip.addEventListener("pointerdown", function (e) {
        starteZiehen(e, { typ: "palette", art: art, regel: regel, regelIndex: ri },
                     ARTEN[art].emoji + " " + ARTEN[art].bez);
      });
      palette.appendChild(chip);
    });
    karte.appendChild(palette);
    var wink = document.createElement("p"); wink.className = "hinweis"; wink.style.margin = "2px 0 0";
    wink.textContent = "Antippen hängt an. Ziehen: auf einen Baustein = oder, dazwischen = und.";
    karte.appendChild(wink);
  }

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

  var satz = document.createElement("div"); satz.className = "satz";
  satz.innerHTML = regelSatz(regel);
  karte.appendChild(satz);

  var probleme = unmoeglichkeiten(regel);
  if (probleme.length) {
    var warn = document.createElement("div"); warn.className = "unmoeglich";
    warn.innerHTML = '<b>⚠️ Kann nie zutreffen.</b> ' + probleme.map(sicher).join(" ")
      + (erweitert ? ' <br>Meintest du „entweder … oder …“? Dann gehören beide in <b>einen</b> Baustein (+ oder).' : "");
    karte.appendChild(warn);
  }

  var tr = document.createElement("div"); tr.dataset.treffer = ri;
  tr.innerHTML = '<div class="kein-treffer">Prüfe …</div>';
  karte.appendChild(tr);
  return karte;
}

function neuerTeil(art) {
  var s = ARTEN[art].standard || {};
  var teil = { art: art };
  if (s.min !== undefined) teil.min = s.min;
  if (s.max !== undefined) teil.max = s.max;
  if (s.sektoren) teil.sektoren = s.sektoren.slice();
  return teil;
}

function zeichneBaustein(regel, baustein, bi, regelNummer) {
  var kasten = document.createElement("div");
  kasten.className = "baustein" + (baustein.teile.length > 1 ? " mehrfach" : "");
  kasten.dataset.baustein = bi;

  baustein.teile.forEach(function (teil, ti) {
    var reihe = document.createElement("div"); reihe.className = "teil";
    if (ti > 0) reihe.innerHTML = '<span class="oder-marke">ODER</span>';
    var art = ARTEN[teil.art];

    var kopf = document.createElement("div"); kopf.className = "teilkopf";
    var letzte = ti === baustein.teile.length - 1;
    var zeigeOder = letzte && erweitert && baustein.teile.length < MAX_ALTERNATIVEN;
    kopf.innerHTML = (erweitert ? '<span class="griff" title="Ziehen zum Verschieben" aria-hidden="true">⠿</span>' : "")
      + '<span class="sym">' + art.emoji + '</span><span class="bez">' + art.bez + '</span>'
      + (zeigeOder ? '<button class="oder-knopf" type="button">+ oder</button>' : "")
      + '<button class="weg" type="button" title="Entfernen" aria-label="Entfernen">✕</button>';
    if (erweitert) kopf.querySelector(".griff").addEventListener("pointerdown", function (e) {
      starteZiehen(e, { typ: "teil", regel: regel, regelIndex: regelNummer, baustein: baustein, ti: ti },
                   art.emoji + " " + art.bez);
    });
    if (zeigeOder) kopf.querySelector(".oder-knopf").addEventListener("click", function () {
      zeigeArtWahl({ baustein: baustein });
    });
    kopf.querySelector(".weg").addEventListener("click", function () {
      baustein.teile.splice(ti, 1);
      if (!baustein.teile.length) regel.bausteine.splice(bi, 1);
      speichere(); zeichneAlles();
    });
    reihe.appendChild(kopf);

    if (teil.art === "windrichtung") {
      var gitter = document.createElement("div"); gitter.className = "sektoren";
      SEKTOREN.forEach(function (sekt, si) {
        var knopf = document.createElement("button"); knopf.type = "button";
        if ((teil.sektoren || []).indexOf(sekt) >= 0) knopf.className = "an";
        knopf.textContent = PFEIL_VON[si] + sekt;
        knopf.addEventListener("click", function () {
          var liste = (teil.sektoren || []).slice();
          var pos = liste.indexOf(sekt);
          if (pos >= 0) liste.splice(pos, 1); else liste.push(sekt);
          teil.sektoren = liste; speichere(); zeichneAlles();
        });
        gitter.appendChild(knopf);
      });
      reihe.appendChild(gitter);
    } else {
      reihe.appendChild(grenzZeile(teil, "min", "mindestens"));
      reihe.appendChild(grenzZeile(teil, "max", "höchstens"));
    }
    kasten.appendChild(reihe);
  });

  // Nur dort eine Fußzeile, wo es etwas zu erklären gibt.
  var text = "";
  if (erweitert && baustein.teile.length > 1) text = "Eine dieser " + baustein.teile.length + " Zeilen genügt.";
  else if (!erweitert && baustein.teile.length > 1) text = "Alternativen – zum Ändern „Erweiterte Regeln“ einschalten.";
  if (text) {
    var fuss = document.createElement("div"); fuss.className = "werkzeuge";
    var erklaerung = document.createElement("span"); erklaerung.className = "hinweis";
    erklaerung.textContent = text;
    fuss.appendChild(erklaerung);
    kasten.appendChild(fuss);
  }
  return kasten;
}

function grenzZeile(teil, feld, wort) {
  var art = ARTEN[teil.art];
  var gesetzt = teil[feld] !== undefined && teil[feld] !== null;
  var wert = gesetzt ? teil[feld] : (feld === "min" ? art.min : art.max);
  var reihe = document.createElement("div");
  reihe.className = "grenze" + (gesetzt ? "" : " aus");
  reihe.innerHTML = '<span class="txt">' + wort + '</span>'
    + '<input type="checkbox"' + (gesetzt ? " checked" : "") + ' aria-label="' + wort + ' verwenden">'
    + '<input type="range" min="' + art.min + '" max="' + art.max + '" step="' + art.schritt + '" value="' + wert + '">'
    + '<input type="number" min="' + art.min + '" max="' + art.max + '" step="' + art.schritt + '" value="' + wert + '">';
  var haken = reihe.querySelector("input[type=checkbox]");
  var regler = reihe.querySelector("input[type=range]");
  var zahl = reihe.querySelector("input[type=number]");
  haken.addEventListener("change", function () {
    if (this.checked) teil[feld] = parseFloat(zahl.value); else delete teil[feld];
    speichere(); zeichneAlles();
  });
  function uebernehme(w) {
    var z = parseFloat(w);
    if (!isNaN(z) && haken.checked) { teil[feld] = z; speichere(); frischeTexte(); vorschauLangsam(); }
  }
  regler.addEventListener("input", function () { zahl.value = this.value; uebernehme(this.value); });
  zahl.addEventListener("change", function () { regler.value = this.value; uebernehme(this.value); });
  return reihe;
}

/* Auswahlblatt – entweder für eine Alternative (ziel.baustein) oder für einen
   ganz neuen Baustein (ziel.regel). */
function zeigeArtWahl(ziel) {
  var alternative = Boolean(ziel.baustein);
  var hg = document.createElement("div");
  hg.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:30;display:flex;align-items:flex-end;justify-content:center";
  var kasten = document.createElement("div");
  kasten.style.cssText = "background:var(--karte);border-radius:16px 16px 0 0;padding:14px;width:100%;max-width:640px";
  kasten.innerHTML = '<h2 style="margin-bottom:3px">' + (alternative ? "Alternative hinzufügen" : "Baustein hinzufügen") + '</h2>'
    + '<p class="hinweis" style="margin:0 0 8px">' + (alternative
        ? "Danach genügt <b>eine</b> der Zeilen in diesem Baustein."
        : "Der neue Baustein muss <b>zusätzlich</b> passen.") + '</p>';
  // Bei „+ oder“ zählt der eine Baustein, bei „+ Baustein“ die ganze Regel.
  var benutzt = benutzteArten(alternative ? [ziel.baustein] : ziel.regel.bausteine);
  var auswahl = document.createElement("div"); auswahl.className = "auswahl";
  ARTEN_REIHE.forEach(function (art) {
    var knopf = document.createElement("button"); knopf.type = "button";
    knopf.textContent = ARTEN[art].emoji + " " + ARTEN[art].bez;
    if (benutzt[art]) {
      knopf.className = "benutzt";
      knopf.title = "Diese Art ist hier schon im Einsatz – geht trotzdem.";
    }
    knopf.addEventListener("click", function () {
      if (alternative) ziel.baustein.teile.push(neuerTeil(art));
      else ziel.regel.bausteine = (ziel.regel.bausteine || []).concat([{ teile: [neuerTeil(art)] }]);
      speichere(); hg.remove(); zeichneAlles();
    });
    auswahl.appendChild(knopf);
  });
  kasten.appendChild(auswahl);
  var zu = document.createElement("button");
  zu.className = "knopf zart"; zu.type = "button"; zu.textContent = "Abbrechen";
  zu.style.cssText = "width:100%;margin-top:10px";
  zu.addEventListener("click", function () { hg.remove(); });
  kasten.appendChild(zu);
  hg.appendChild(kasten);
  hg.addEventListener("click", function (e) { if (e.target === hg) hg.remove(); });
  document.body.appendChild(hg);
}

/* ===================================================================
   Ziehen: Bausteine mit dem Finger umsortieren und kombinieren
   ===================================================================
   Gezogen wird entweder ein Chip aus der Leiste (neuer Baustein) oder eine
   vorhandene Zeile am Anfasser ⠿. Wohin man loslässt, entscheidet:
     auf einen Baustein   -> die Zeile wird dort zur Alternative (oder)
     zwischen Bausteine   -> die Zeile wird ein eigener Baustein (und)
   Die Anfasser haben touch-action:none, deshalb gerät das Ziehen nie mit dem
   Scrollen der Seite in Konflikt – kein Langdruck nötig.                  */
var zieht = null, zuletztGezogen = false, rollTimer = null;

function starteZiehen(e, quelle, beschriftung) {
  if (!erweitert || e.button > 0 || zieht) return;
  e.preventDefault();
  // startX/startY: Ein reines Antippen (ohne Bewegung) darf kein Ziehen sein,
  // sonst schluckt es den Klick auf den Chip.
  zieht = { quelle: quelle, ziel: null, zeiger: e.pointerId,
            startX: e.clientX, startY: e.clientY, bewegt: false };
  document.body.classList.add("zieht");

  var geist = document.createElement("div"); geist.id = "zieh-geist";
  geist.textContent = beschriftung;
  document.body.appendChild(geist);
  zieht.geist = geist;

  if (quelle.typ === "teil") {
    var reihen = document.querySelectorAll('.regel[data-regel="' + quelle.regelIndex + '"] .baustein[data-baustein="'
      + (regelnBausteinIndex(quelle.regel, quelle.baustein)) + '"] .teil');
    if (reihen[quelle.ti]) reihen[quelle.ti].classList.add("wandert");
  }
  bewegeGeist(e.clientX, e.clientY);
  document.addEventListener("pointermove", beiZiehen, { passive: false });
  document.addEventListener("pointerup", beendeZiehen);
  document.addEventListener("pointercancel", brichZiehenAb);
}
function regelnBausteinIndex(regel, baustein) { return (regel.bausteine || []).indexOf(baustein); }

function bewegeGeist(x, y) {
  if (!zieht) return;
  zieht.geist.style.left = (x + 14) + "px";
  zieht.geist.style.top = (y - 14) + "px";
  var breite = zieht.geist.offsetWidth;
  if (x + 14 + breite > window.innerWidth - 6) zieht.geist.style.left = (window.innerWidth - 6 - breite) + "px";
}

function beiZiehen(e) {
  if (!zieht) return;
  e.preventDefault();
  if (Math.abs(e.clientX - zieht.startX) > 5 || Math.abs(e.clientY - zieht.startY) > 5) zieht.bewegt = true;
  bewegeGeist(e.clientX, e.clientY);
  if (!zieht.bewegt) return;
  zieht.ziel = findeAblegeZiel(e.clientX, e.clientY);
  zeigeZiel();
  rolleAmRand(e.clientY);
}

/* Nahe am oberen/unteren Rand mitscrollen, damit man auch weit weg ablegen kann. */
function rolleAmRand(y) {
  var oben = y < 80, unten = y > window.innerHeight - 80;
  clearInterval(rollTimer); rollTimer = null;
  if (!oben && !unten) return;
  rollTimer = setInterval(function () { window.scrollBy(0, oben ? -12 : 12); }, 16);
}

/* Welcher Platz liegt unter dem Finger? */
function findeAblegeZiel(x, y) {
  var karte = document.querySelector('.regel[data-regel="' + zieht.quelle.regelIndex + '"]');
  if (!karte) return null;
  var regel = zieht.quelle.regel;
  var kaesten = Array.prototype.slice.call(karte.querySelectorAll(".baustein"));
  if (!kaesten.length) return { modus: "und", vorBaustein: null };
  for (var i = 0; i < kaesten.length; i++) {
    var r = kaesten[i].getBoundingClientRect();
    var baustein = regel.bausteine[+kaesten[i].dataset.baustein];
    if (y < r.top) return { modus: "und", vorBaustein: baustein };
    if (y <= r.bottom) {
      var rand = Math.min(16, r.height * 0.26);
      if (y < r.top + rand) return { modus: "und", vorBaustein: baustein };
      if (y > r.bottom - rand) return { modus: "und", vorBaustein: regel.bausteine[+kaesten[i].dataset.baustein + 1] || null };
      return { modus: "oder", baustein: baustein, kasten: kaesten[i] };
    }
  }
  return { modus: "und", vorBaustein: null };
}

function zeigeZiel() {
  Array.prototype.forEach.call(document.querySelectorAll(".baustein"), function (k) {
    k.classList.remove("ziel-oder", "ziel-voll");
  });
  var linie = $("zieh-linie"), marke = $("zieh-marke");
  if (linie) linie.remove();
  if (marke) marke.remove();
  var ziel = zieht.ziel; if (!ziel) return;
  var regel = zieht.quelle.regel;
  var karte = document.querySelector('.regel[data-regel="' + zieht.quelle.regelIndex + '"]');

  if (ziel.modus === "oder") {
    var eigener = zieht.quelle.typ === "teil" && zieht.quelle.baustein === ziel.baustein;
    var passtNoch = ziel.baustein.teile.length < MAX_ALTERNATIVEN;
    ziel.erlaubt = !eigener && passtNoch;
    ziel.kasten.classList.add(ziel.erlaubt ? "ziel-oder" : "ziel-voll");
    var r = ziel.kasten.getBoundingClientRect();
    setzeMarke(eigener ? "SCHON HIER" : (passtNoch ? "ODER" : "VOLL"), !ziel.erlaubt, r.right - 68, r.top - 8);
    return;
  }
  // „und“: waagerechte Linie an der Einfügestelle
  var platzFrei = zieht.quelle.typ === "teil" || regel.bausteine.length < MAX_BAUSTEINE;
  ziel.erlaubt = platzFrei;
  var block = karte.querySelector(".bausteine").getBoundingClientRect();
  var yLinie;
  if (ziel.vorBaustein) {
    var idx = regel.bausteine.indexOf(ziel.vorBaustein);
    var el = karte.querySelector('.baustein[data-baustein="' + idx + '"]');
    yLinie = el ? el.getBoundingClientRect().top - 4 : block.bottom;
  } else {
    var alle = karte.querySelectorAll(".baustein");
    yLinie = alle.length ? alle[alle.length - 1].getBoundingClientRect().bottom + 3 : block.top;
  }
  var l = document.createElement("div"); l.id = "zieh-linie";
  l.style.left = block.left + "px"; l.style.width = block.width + "px"; l.style.top = yLinie + "px";
  if (!platzFrei) l.style.background = "var(--rot)";
  document.body.appendChild(l);
}
function setzeMarke(text, rot, x, y) {
  var m = document.createElement("div"); m.id = "zieh-marke";
  if (rot) m.className = "voll";
  m.textContent = text;
  m.style.left = Math.max(6, x) + "px"; m.style.top = Math.max(6, y) + "px";
  document.body.appendChild(m);
}

function beendeZiehen() {
  if (!zieht) return;
  var quelle = zieht.quelle, ziel = zieht.ziel, bewegt = zieht.bewegt;
  raeumeZiehenAuf();
  // Nur getippt: nichts neu zeichnen, sonst geht der Klick auf dem Chip verloren.
  if (!bewegt) return;
  zuletztGezogen = true;
  setTimeout(function () { zuletztGezogen = false; }, 350);
  if (ziel && ziel.erlaubt !== false && legeAb(quelle, ziel)) speichere();
  zeichneAlles();
}
function brichZiehenAb() {
  var bewegt = zieht && zieht.bewegt;
  raeumeZiehenAuf();
  if (bewegt) zeichneAlles();
}
function raeumeZiehenAuf() {
  document.removeEventListener("pointermove", beiZiehen);
  document.removeEventListener("pointerup", beendeZiehen);
  document.removeEventListener("pointercancel", brichZiehenAb);
  clearInterval(rollTimer); rollTimer = null;
  if (zieht && zieht.geist) zieht.geist.remove();
  var l = $("zieh-linie"); if (l) l.remove();
  var m = $("zieh-marke"); if (m) m.remove();
  Array.prototype.forEach.call(document.querySelectorAll(".wandert"), function (el) { el.classList.remove("wandert"); });
  Array.prototype.forEach.call(document.querySelectorAll(".baustein"), function (k) {
    k.classList.remove("ziel-oder", "ziel-voll");
  });
  document.body.classList.remove("zieht");
  zieht = null;
}

/* Führt die Ablage aus. Arbeitet mit Objekt-Verweisen statt Indizes, damit das
   Entfernen der Quelle die Zielposition nicht verschiebt. */
function legeAb(quelle, ziel) {
  var regel = quelle.regel, teil;
  if (quelle.typ === "palette") {
    if (ziel.modus === "und" && regel.bausteine.length >= MAX_BAUSTEINE) return false;
    if (ziel.modus === "oder" && ziel.baustein.teile.length >= MAX_ALTERNATIVEN) return false;
    teil = neuerTeil(quelle.art);
  } else {
    var quellBaustein = quelle.baustein;
    if (ziel.modus === "oder") {
      if (ziel.baustein === quellBaustein) return false;                 // liegt schon dort
      if (ziel.baustein.teile.length >= MAX_ALTERNATIVEN) return false;
    }
    teil = quellBaustein.teile[quelle.ti];
    if (!teil) return false;
    quellBaustein.teile.splice(quelle.ti, 1);
    if (!quellBaustein.teile.length) {
      var weg = regel.bausteine.indexOf(quellBaustein);
      regel.bausteine.splice(weg, 1);
      // Sollte davor eingefügt werden, rückt der Nachfolger an dieselbe Stelle
      if (ziel.modus === "und" && ziel.vorBaustein === quellBaustein) ziel.vorBaustein = regel.bausteine[weg] || null;
    }
  }
  if (ziel.modus === "oder") { ziel.baustein.teile.push(teil); return true; }
  var pos = ziel.vorBaustein ? regel.bausteine.indexOf(ziel.vorBaustein) : regel.bausteine.length;
  if (pos < 0) pos = regel.bausteine.length;
  regel.bausteine.splice(pos, 0, { teile: [teil] });
  return true;
}

/* Satz und Warnung ohne Neuaufbau auffrischen (beim Schieben der Regler). */
function frischeTexte() {
  Array.prototype.forEach.call(document.querySelectorAll(".regel"), function (el, ri) {
    if (!regeln[ri]) return;
    var s = el.querySelector(".satz"); if (s) s.innerHTML = regelSatz(regeln[ri]);
    var probleme = unmoeglichkeiten(regeln[ri]);
    var w = el.querySelector(".unmoeglich");
    if (probleme.length && !w) { zeichneAlles(); return; }
    if (!probleme.length && w) { w.remove(); return; }
    if (w) w.innerHTML = '<b>⚠️ Kann nie zutreffen.</b> ' + probleme.map(sicher).join(" ");
  });
}

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
