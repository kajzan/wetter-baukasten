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
         background:var(--hg); color:var(--text); line-height:1.5; -webkit-text-size-adjust:100%; }
  main { max-width:640px; margin:0 auto; padding:14px 12px 60px; }
  h1 { font-size:1.25rem; margin:4px 2px 2px; }
  h2 { font-size:1.02rem; margin:0 0 10px; }
  .karte { background:var(--karte); border:1px solid var(--linie); border-radius:14px; padding:14px; margin-bottom:14px; }
  .hinweis { font-size:.82rem; color:var(--text2); }
  .versuch { background:var(--gelb-hell); color:var(--gelb); border-radius:10px;
    padding:9px 11px; font-size:.84rem; margin:0 2px 14px; }
  .knopf { display:inline-block; border:0; border-radius:10px; cursor:pointer;
    padding:10px 14px; font-size:.92rem; font-weight:600; background:var(--akzent); color:#fff; }
  .knopf.zart { background:var(--akzent-hell); color:var(--akzent); }
  .knopf.rot { background:var(--rot-hell); color:var(--rot); }
  .knopf.klein { padding:6px 11px; font-size:.82rem; }
  input[type=text] { width:100%; padding:10px 11px; border:1px solid var(--linie);
    border-radius:10px; background:var(--hg); color:var(--text); font-size:16px; }
  input[type=number] { width:100%; padding:6px 7px; border:1px solid var(--linie);
    border-radius:8px; background:var(--hg); color:var(--text); font-size:16px; text-align:right; }
  select { padding:8px 9px; border:1px solid var(--linie); border-radius:8px;
    background:var(--hg); color:var(--text); font-size:16px; }
  label { font-size:.8rem; color:var(--text2); display:block; margin-bottom:2px; }

  /* ---- Regel ---- */
  .regel { border:1px solid var(--linie); border-radius:14px; padding:12px; margin-bottom:14px; background:var(--karte); }
  .regelkopf { display:flex; align-items:center; gap:9px; margin-bottom:4px; }
  .regelkopf .emoji { font-size:1.4rem; }
  .regelkopf .name { flex:1; font-weight:700; font-size:1.05rem; border:0; background:none;
    color:var(--text); padding:2px 0; min-width:0; }
  .regelkopf .name:focus { outline:2px solid var(--akzent); outline-offset:2px; border-radius:6px; }

  /* ---- Bausteine ---- */
  .bausteine { margin-top:8px; }
  .baustein { border:1px solid var(--linie); border-radius:12px; padding:8px 10px 10px; margin-top:8px;
    background:var(--hg); }
  .baustein.mehrfach { border-color:var(--akzent); box-shadow:0 0 0 1px var(--akzent-hell); }
  .und-trenner { text-align:center; font-size:.74rem; color:var(--text2); letter-spacing:.08em;
    text-transform:uppercase; margin:8px 0 0; font-weight:700; }
  .teil { padding:4px 0; }
  .teil + .teil { border-top:1px dashed var(--linie); margin-top:6px; padding-top:8px; }
  .teilkopf { display:flex; align-items:center; gap:7px; }
  .teilkopf .sym { font-size:1.05rem; }
  .teilkopf .bez { flex:1; font-weight:600; font-size:.92rem; }
  .teilkopf .weg { border:0; background:none; color:var(--text2); cursor:pointer; font-size:1rem;
    padding:2px 6px; line-height:1; }
  .oder-marke { display:inline-block; background:var(--akzent); color:#fff; border-radius:6px;
    padding:1px 7px; font-size:.7rem; font-weight:700; letter-spacing:.06em; margin-bottom:5px; }
  .grenze { display:grid; grid-template-columns:74px 22px 1fr 62px; gap:7px; align-items:center; padding:3px 0; }
  .grenze .txt { font-size:.8rem; color:var(--text2); }
  .grenze input[type=checkbox] { width:19px; height:19px; accent-color:var(--akzent); margin:0; }
  .grenze input[type=range] { width:100%; accent-color:var(--akzent); }
  .grenze.aus input[type=range], .grenze.aus input[type=number] { opacity:.35; pointer-events:none; }
  .sektoren { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-top:6px; }
  .sektoren button { border:1px solid var(--linie); background:var(--karte); color:var(--text);
    border-radius:8px; padding:7px 3px; font-size:.8rem; cursor:pointer; }
  .sektoren button.an { background:var(--akzent); color:#fff; border-color:var(--akzent); }
  .werkzeuge { display:flex; flex-wrap:wrap; gap:7px; margin-top:8px; }

  /* ---- Auswahl neuer Bausteine ---- */
  .auswahl { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
  .auswahl button { border:1px dashed var(--linie); background:var(--hg); color:var(--text);
    border-radius:999px; padding:7px 12px; font-size:.86rem; cursor:pointer; }
  .auswahl button:hover { border-color:var(--akzent); color:var(--akzent); }

  /* ---- Satz + Treffer ---- */
  .satz { background:var(--akzent-hell); border-radius:10px; padding:9px 11px; margin-top:10px;
    font-size:.88rem; line-height:1.45; }
  .satz b { color:var(--akzent); }
  .treffer { background:var(--gruen-hell); color:var(--gruen); border-radius:8px; padding:7px 9px;
    margin-top:7px; font-size:.86rem; }
  .kein-treffer { color:var(--text2); font-size:.84rem; margin-top:7px; }
  .warnung { background:var(--rot-hell); color:var(--rot); border-radius:8px; padding:8px 10px;
    font-size:.86rem; margin-top:8px; }
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

  <button class="knopf zart" id="neue-regel" style="width:100%">+ Neuen Wunsch anlegen</button>

  <section class="karte" style="margin-top:14px">
    <h2>So funktioniert es</h2>
    <p class="hinweis" style="margin:0">Jeder <b>Baustein</b> ist eine Bedingung. <b>Alle</b> Bausteine müssen
    passen. Mit „+ oder“ legst du eine Alternative in denselben Baustein – dann reicht <b>eine</b> der Zeilen.
    Unten steht immer als Satz, was du gerade gebaut hast, und wie oft es wirklich zutrifft.</p>
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

/* Beispiel aus dem echten Leben: südseitiger Balkon. */
function beispielRegel() {
  return { name:"Pizza am Balkon", emoji:"🍕", zeitfensterStunden:72, nurVonUhr:11, nurBisUhr:22,
    mindestdauerStunden:2, bausteine: [
      { teile:[{ art:"temp", min:18, max:28 }] },
      { teile:[{ art:"regen", max:0 }] },
      { teile:[{ art:"wind", max:10 }, { art:"windrichtung", sektoren:["N","NO","NW"] }] }
    ] };
}

function $(id) { return document.getElementById(id); }
function sicher(t) { return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

var ort = null;
try { var app = JSON.parse(localStorage.getItem(SPEICHER_APP) || "{}"); if (app && app.ort) ort = app.ort; } catch (e) {}

var regeln = [];
try { var d = JSON.parse(localStorage.getItem(SPEICHER_DEMO) || "null"); if (d && Array.isArray(d.regeln)) regeln = d.regeln; } catch (e) {}
if (!regeln.length) regeln = [beispielRegel()];
function speichere() { localStorage.setItem(SPEICHER_DEMO, JSON.stringify({ regeln: regeln })); }

/* ---------- Ort ---------- */
function zeichneOrt() {
  var ziel = $("ort-zeile");
  if (ort) {
    ziel.innerHTML = '<p style="margin:0"><b>' + sicher(ort.name) + '</b> '
      + '<span class="hinweis">· ' + ort.lat + " / " + ort.lon + '</span></p>'
      + '<p class="hinweis" style="margin:6px 0 0">Aus der App übernommen. Die Treffer unten sind echt.</p>';
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
    if (!s.length) return "Windrichtung egal";
    return "Wind aus " + s.join("/");
  }
  var e = art.einheit ? " " + art.einheit : "";
  if (teil.art === "regen" && teil.max === 0 && teil.min === undefined) return "kein Regen";
  if (teil.min !== undefined && teil.max !== undefined)
    return art.bez + " " + zahlText(teil.min) + "–" + zahlText(teil.max) + e;
  if (teil.min !== undefined) return art.bez + " mindestens " + zahlText(teil.min) + e;
  if (teil.max !== undefined) return art.bez + " höchstens " + zahlText(teil.max) + e;
  return art.bez + " egal";
}
function regelSatz(regel) {
  var teile = (regel.bausteine || []).filter(function (b) { return b.teile && b.teile.length; });
  if (!teile.length) return "<b>Passt immer</b> – noch kein Baustein gewählt.";
  var stuecke = teile.map(function (b) {
    var s = b.teile.map(teilSatz);
    return s.length > 1 ? "(" + s.join(" <b>oder</b> ") + ")" : s[0];
  });
  var zeit = " Geprüft wird " + (regel.nurVonUhr || 0) + "–" + (regel.nurBisUhr != null ? regel.nurBisUhr : 24)
    + " Uhr, mindestens " + (regel.mindestdauerStunden || 2) + " Stunden am Stück.";
  return "<b>Passt, wenn:</b> " + stuecke.join(" <b>und</b> ") + "." + zeit;
}

/* ---------- Zeichnen ---------- */
function zeichneAlles() { zeichneOrt(); zeichneRegeln(); hoereVorschau(); }

function zeichneRegeln() {
  var ziel = $("regeln"); ziel.innerHTML = "";
  regeln.forEach(function (regel, ri) { ziel.appendChild(zeichneRegel(regel, ri)); });
}

function zeichneRegel(regel, ri) {
  var karte = document.createElement("section"); karte.className = "regel";

  var kopf = document.createElement("div"); kopf.className = "regelkopf";
  kopf.innerHTML = '<span class="emoji">' + sicher(regel.emoji || "🔔") + '</span>'
    + '<input class="name" value="' + sicher(regel.name) + '" aria-label="Name des Wunsches">'
    + '<button class="knopf rot klein" type="button">Löschen</button>';
  kopf.querySelector(".name").addEventListener("change", function () {
    regel.name = this.value.trim() || "Wunsch"; speichere(); hoereVorschau();
  });
  kopf.querySelector("button").addEventListener("click", function () {
    regeln.splice(ri, 1); if (!regeln.length) regeln = [beispielRegel()]; speichere(); zeichneAlles();
  });
  karte.appendChild(kopf);

  var bau = document.createElement("div"); bau.className = "bausteine";
  (regel.bausteine || []).forEach(function (baustein, bi) {
    if (bi > 0) { var t = document.createElement("p"); t.className = "und-trenner"; t.textContent = "und"; bau.appendChild(t); }
    bau.appendChild(zeichneBaustein(regel, baustein, bi));
  });
  karte.appendChild(bau);

  // Neue Bausteine anbieten
  var auswahl = document.createElement("div"); auswahl.className = "auswahl";
  ARTEN_REIHE.forEach(function (art) {
    var knopf = document.createElement("button"); knopf.type = "button";
    knopf.textContent = ARTEN[art].emoji + " " + ARTEN[art].bez;
    knopf.addEventListener("click", function () {
      if ((regel.bausteine || []).length >= MAX_BAUSTEINE) return;
      regel.bausteine = (regel.bausteine || []).concat([{ teile: [neuerTeil(art)] }]);
      speichere(); zeichneAlles();
    });
    auswahl.appendChild(knopf);
  });
  if ((regel.bausteine || []).length >= MAX_BAUSTEINE) {
    auswahl.innerHTML = '<p class="hinweis" style="margin:0">Mehr als ' + MAX_BAUSTEINE + ' Bausteine sind nicht vorgesehen.</p>';
  }
  karte.appendChild(auswahl);

  // Zeitangaben
  var zeit = document.createElement("div"); zeit.className = "werkzeuge";
  zeit.style.marginTop = "12px";
  var opt = FENSTER.map(function (o) { return '<option value="' + o[0] + '"' + ((regel.zeitfensterStunden || 48) === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("");
  zeit.innerHTML = '<div><label>Vorschau</label><select data-f="zeitfensterStunden">' + opt + '</select></div>'
    + '<div><label>Von (Uhr)</label><input type="number" min="0" max="23" style="width:64px" value="' + (regel.nurVonUhr || 0) + '" data-f="nurVonUhr"></div>'
    + '<div><label>Bis (Uhr)</label><input type="number" min="1" max="24" style="width:64px" value="' + (regel.nurBisUhr != null ? regel.nurBisUhr : 24) + '" data-f="nurBisUhr"></div>'
    + '<div><label>Mind. Std.</label><input type="number" min="1" max="24" style="width:64px" value="' + (regel.mindestdauerStunden || 2) + '" data-f="mindestdauerStunden"></div>';
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

function zeichneBaustein(regel, baustein, bi) {
  var kasten = document.createElement("div");
  kasten.className = "baustein" + (baustein.teile.length > 1 ? " mehrfach" : "");
  kasten.dataset.baustein = bi;

  baustein.teile.forEach(function (teil, ti) {
    var reihe = document.createElement("div"); reihe.className = "teil";
    if (ti > 0) reihe.innerHTML = '<span class="oder-marke">ODER</span>';
    var art = ARTEN[teil.art];

    var kopf = document.createElement("div"); kopf.className = "teilkopf";
    kopf.innerHTML = '<span class="sym">' + art.emoji + '</span><span class="bez">' + art.bez + '</span>'
      + '<button class="weg" type="button" title="Entfernen" aria-label="Entfernen">✕</button>';
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
        var an = (teil.sektoren || []).indexOf(sekt) >= 0;
        if (an) knopf.className = "an";
        knopf.textContent = PFEIL_VON[si] + " " + sekt;
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

  var werkzeuge = document.createElement("div"); werkzeuge.className = "werkzeuge";
  if (baustein.teile.length < MAX_ALTERNATIVEN) {
    var oder = document.createElement("button");
    oder.className = "knopf zart klein"; oder.type = "button"; oder.textContent = "+ oder";
    oder.addEventListener("click", function () { zeigeArtWahl(regel, baustein); });
    werkzeuge.appendChild(oder);
    // Erklärt sich nur dort, wo schon kombiniert wurde – sonst wird es unruhig.
    if (baustein.teile.length > 1) {
      var erklaerung = document.createElement("span"); erklaerung.className = "hinweis";
      erklaerung.style.alignSelf = "center";
      erklaerung.textContent = "Eine dieser " + baustein.teile.length + " Zeilen genügt.";
      werkzeuge.appendChild(erklaerung);
    }
  }
  kasten.appendChild(werkzeuge);
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
    if (!isNaN(z) && haken.checked) { teil[feld] = z; speichere(); frischeSatz(); vorschauLangsam(); }
  }
  regler.addEventListener("input", function () { zahl.value = this.value; uebernehme(this.value); });
  zahl.addEventListener("change", function () { regler.value = this.value; uebernehme(this.value); });
  return reihe;
}

/* Kleine Auswahl, welche Alternative in den Baustein soll. */
function zeigeArtWahl(regel, baustein) {
  var hg = document.createElement("div");
  hg.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:30;display:flex;align-items:flex-end;justify-content:center";
  var kasten = document.createElement("div");
  kasten.style.cssText = "background:var(--karte);border-radius:16px 16px 0 0;padding:16px;width:100%;max-width:640px";
  kasten.innerHTML = '<h2 style="margin-bottom:4px">Alternative hinzufügen</h2>'
    + '<p class="hinweis" style="margin:0 0 10px">Danach genügt <b>eine</b> der Zeilen in diesem Baustein.</p>';
  var auswahl = document.createElement("div"); auswahl.className = "auswahl";
  ARTEN_REIHE.forEach(function (art) {
    var knopf = document.createElement("button"); knopf.type = "button";
    knopf.textContent = ARTEN[art].emoji + " " + ARTEN[art].bez;
    knopf.addEventListener("click", function () {
      baustein.teile.push(neuerTeil(art)); speichere(); hg.remove(); zeichneAlles();
    });
    auswahl.appendChild(knopf);
  });
  kasten.appendChild(auswahl);
  var zu = document.createElement("button");
  zu.className = "knopf zart"; zu.type = "button"; zu.textContent = "Abbrechen";
  zu.style.cssText = "width:100%;margin-top:12px";
  zu.addEventListener("click", function () { hg.remove(); });
  kasten.appendChild(zu);
  hg.appendChild(kasten);
  hg.addEventListener("click", function (e) { if (e.target === hg) hg.remove(); });
  document.body.appendChild(hg);
}

function frischeSatz() {
  Array.prototype.forEach.call(document.querySelectorAll(".regel"), function (el, ri) {
    var s = el.querySelector(".satz"); if (s && regeln[ri]) s.innerHTML = regelSatz(regeln[ri]);
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
