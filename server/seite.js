/*
 * Die App-Seite des Wetter-Wächters (eine Datei, kein externer Code).
 * Wird vom Worker unter "/" ausgeliefert. Der öffentliche VAPID-Schlüssel
 * wird beim Ausliefern eingesetzt.
 *
 * Hinweis für Entwickler: Das Seiten-JavaScript benutzt absichtlich KEINE
 * Template-Literale (Backticks), weil die ganze Seite hier in einem
 * JS-Template-Literal steckt.
 */

export function appSeite(vapidPublic) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
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
  main { max-width:640px; margin:0 auto; padding:14px 12px 60px; }
  h1 { font-size:1.3rem; margin:8px 2px 2px; }
  h2 { font-size:1.02rem; margin:0 0 10px; }
  .untertitel { color:var(--text2); font-size:.85rem; margin:0 2px 14px; }
  .karte { background:var(--karte); border:1px solid var(--linie); border-radius:14px;
           padding:14px; margin-bottom:14px; }
  input[type=text] { width:100%; padding:11px 12px; border:1px solid var(--linie);
    border-radius:10px; background:var(--hg); color:var(--text); font-size:16px; }
  input[type=number] { width:100%; padding:7px 8px; border:1px solid var(--linie);
    border-radius:8px; background:var(--hg); color:var(--text); font-size:16px; text-align:right; }
  label { font-size:.82rem; color:var(--text2); display:block; margin-bottom:2px; }
  .knopf { display:inline-block; border:0; border-radius:10px; cursor:pointer;
    padding:12px 16px; font-size:.95rem; font-weight:600; background:var(--akzent); color:#fff; }
  .knopf.zart { background:var(--akzent-hell); color:var(--akzent); }
  .knopf.gruen { background:var(--gruen); color:#fff; }
  .knopf.rot { background:var(--rot-hell); color:var(--rot); }
  .knopf.breit { width:100%; }
  .knopf:disabled { opacity:.5; cursor:default; }
  .hinweis { font-size:.82rem; color:var(--text2); }
  .warnung { background:var(--rot-hell); color:var(--rot); border-radius:8px;
             padding:8px 10px; font-size:.86rem; margin-top:8px; }
  .erfolg { background:var(--gruen-hell); color:var(--gruen); border-radius:8px;
            padding:8px 10px; font-size:.86rem; margin-top:8px; font-weight:600; }

  /* Ortssuche */
  .ort-gewaehlt { display:flex; align-items:center; gap:8px; font-weight:600; margin-bottom:8px; }
  #ort-ergebnisse { margin-top:6px; }
  #ort-ergebnisse button { display:block; width:100%; text-align:left; background:var(--hg);
    border:1px solid var(--linie); border-radius:8px; padding:9px 10px; margin-top:6px;
    color:var(--text); font-size:.92rem; cursor:pointer; }
  .ort-zeile { display:flex; gap:8px; }
  .ort-zeile input { flex:1; }
  .ort-zeile .knopf { padding:11px 13px; flex-shrink:0; }

  /* Vorlagen */
  .vorlagen { display:flex; flex-wrap:wrap; gap:8px; }
  .vorlagen button { border:1px solid var(--linie); background:var(--hg); color:var(--text);
    border-radius:999px; padding:8px 13px; font-size:.9rem; cursor:pointer; }
  .vorlagen button:disabled { opacity:.4; cursor:default; }

  /* Regel-Karten */
  .regel { border:1px solid var(--linie); border-radius:12px; padding:11px 12px; margin-top:10px; }
  .regel.inaktiv { opacity:.55; }
  .regelkopf { display:flex; align-items:center; gap:10px; }
  .regelkopf .emoji { font-size:1.35rem; }
  .regelkopf .name { flex:1; font-weight:700; }
  .treffer { background:var(--gruen-hell); color:var(--gruen); border-radius:8px;
             padding:7px 9px; margin-top:7px; font-size:.87rem; }
  .kein-treffer { color:var(--text2); font-size:.84rem; margin-top:7px; }
  details.fein summary { cursor:pointer; font-size:.84rem; color:var(--akzent); padding:6px 0 2px; }
  .zeile { display:flex; gap:8px; margin-top:8px; }
  .zeile > div { flex:1; min-width:0; }
  .bedingung { display:grid; grid-template-columns:30px 1fr 80px; gap:7px; align-items:center;
               padding:6px 0; border-top:1px solid var(--linie); }
  .bedingung .bez { font-size:.83rem; }
  .bedingung .bez small { color:var(--text2); }
  .bedingung input[type=checkbox] { width:19px; height:19px; accent-color:var(--akzent); }
  .bedingung input[type=range] { width:100%; accent-color:var(--akzent); grid-column:2; }
  .bedingung.aus input[type=range], .bedingung.aus input[type=number] { opacity:.35; pointer-events:none; }

  /* Schalter */
  .schalter { position:relative; width:44px; height:25px; flex-shrink:0; }
  .schalter input { opacity:0; width:100%; height:100%; position:absolute; margin:0; cursor:pointer; z-index:2; }
  .schalter .bahn { position:absolute; inset:0; border-radius:13px; background:var(--linie); transition:background .15s; }
  .schalter .bahn::after { content:""; position:absolute; top:3px; left:3px; width:19px; height:19px;
    border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:left .15s; }
  .schalter input:checked + .bahn { background:var(--gruen); }
  .schalter input:checked + .bahn::after { left:22px; }

  /* Wetter-Tage */
  .tagesgitter { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:9px; }
  .tag { border:1px solid var(--linie); border-radius:10px; padding:9px; font-size:.83rem; }
  .tag .tagname { font-weight:700; margin-bottom:3px; }
  .tag div { display:flex; justify-content:space-between; gap:6px; }
</style>
</head>
<body>
<main>
  <h1>🌦️ Wetter-Wächter</h1>
  <p class="untertitel">Sag mir, welches Wetter du suchst – ich melde mich, wenn es kommt.</p>

  <!-- Schritt 1: Ort -->
  <section class="karte">
    <h2>1️⃣ Dein Ort</h2>
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

  <!-- Schritt 2: Regeln -->
  <section class="karte">
    <h2>2️⃣ Deine Wetter-Wünsche</h2>
    <p class="hinweis">Tippe eine Vorlage an – fertig. Feinjustieren kannst du später jederzeit.</p>
    <div class="vorlagen" id="vorlagen"></div>
    <div id="regel-liste"></div>
  </section>

  <!-- Wetter-Übersicht -->
  <section class="karte" id="wetter-karte" style="display:none">
    <h2>🌤️ Nächste 4 Tage</h2>
    <div class="tagesgitter" id="wetter-tage"></div>
  </section>

  <!-- Schritt 3: Aktivieren -->
  <section class="karte">
    <h2>3️⃣ Benachrichtigungen</h2>
    <p class="hinweis" id="push-erklaerung">Ein Tipp genügt – dein Handy fragt nach Erlaubnis, danach wacht der Wächter
    stündlich für dich. <b>iPhone/iPad:</b> Seite erst über das Teilen-Symbol „Zum Home-Bildschirm“ hinzufügen
    und von dort öffnen.</p>
    <button class="knopf gruen breit" id="aktivieren">🔔 Benachrichtigungen aktivieren</button>
    <div id="push-status"></div>
    <div style="margin-top:12px">
      <button class="knopf rot" id="loeschen" style="padding:8px 12px;font-size:.82rem">🗑️ Alles löschen (Gerät abmelden)</button>
    </div>
  </section>

  <p class="hinweis" style="text-align:center">Kostenlos · keine Konten in dieser Vorschau-Version · Wetterdaten:
  Open-Meteo · Nachrichten enthalten nie Ortsangaben</p>
</main>
<script>
"use strict";
var VAPID_PUBLIC = "${vapidPublic}";

/* ---------- Bausteine und Vorlagen ---------- */
var BAUSTEINE = [
  { s:"tempMin",       bez:"Temperatur mindestens", einheit:"°C",   min:-20, max:45,  schritt:1 },
  { s:"tempMax",       bez:"Temperatur höchstens",  einheit:"°C",   min:-20, max:45,  schritt:1 },
  { s:"windMin",       bez:"Wind mindestens",       einheit:"km/h", min:0,   max:120, schritt:1 },
  { s:"windMax",       bez:"Wind höchstens",        einheit:"km/h", min:0,   max:120, schritt:1 },
  { s:"regenMax",      bez:"Regen höchstens",       einheit:"mm/h", min:0,   max:10,  schritt:0.1 },
  { s:"bewoelkungMin", bez:"Bewölkung mindestens",  einheit:"%",    min:0,   max:100, schritt:5 },
  { s:"bewoelkungMax", bez:"Bewölkung höchstens",   einheit:"%",    min:0,   max:100, schritt:5 },
  { s:"feuchteMax",    bez:"Luftfeuchte höchstens", einheit:"%",    min:0,   max:100, schritt:5 }
];
var STANDARDWERT = { tempMin:15, tempMax:25, windMin:5, windMax:20, regenMax:0,
                     bewoelkungMin:20, bewoelkungMax:80, feuchteMax:70 };
var VORLAGEN = [
  { name:"Pizzatag", emoji:"🍕", nurVonUhr:11, nurBisUhr:21, mindestdauerStunden:3,
    bedingungen:{ tempMin:18, tempMax:28, windMax:10, regenMax:0 } },
  { name:"Pflanztag", emoji:"🌱", nurVonUhr:8, nurBisUhr:20, mindestdauerStunden:4,
    bedingungen:{ tempMin:15, tempMax:24, bewoelkungMin:30, bewoelkungMax:70, regenMax:0.2 } },
  { name:"Wäschetag", emoji:"🧺", nurVonUhr:9, nurBisUhr:19, mindestdauerStunden:4,
    bedingungen:{ tempMin:15, windMin:5, windMax:30, regenMax:0, feuchteMax:65 } },
  { name:"Lauf-Wetter", emoji:"🏃", nurVonUhr:6, nurBisUhr:21, mindestdauerStunden:1,
    bedingungen:{ tempMin:5, tempMax:20, windMax:20, regenMax:0.2 } },
  { name:"Grill-Abend", emoji:"🔥", nurVonUhr:17, nurBisUhr:22, mindestdauerStunden:2,
    bedingungen:{ tempMin:16, windMax:15, regenMax:0 } },
  { name:"Sturm-Warnung", emoji:"⛈️", nurVonUhr:0, nurBisUhr:24, mindestdauerStunden:1,
    bedingungen:{ windMin:60 } }
];

/* ---------- Zustand (bleibt im Browser) ---------- */
var SPEICHER = "wetterWaechterApp_v1";
var zustand = { ort:null, regeln:[], aktiviert:false };
try {
  var roh = localStorage.getItem(SPEICHER);
  if (roh) { var g = JSON.parse(roh); if (g && typeof g === "object") zustand = g; }
} catch (e) {}
if (!Array.isArray(zustand.regeln)) zustand.regeln = [];

function speichere() { localStorage.setItem(SPEICHER, JSON.stringify(zustand)); }
function runde(w) { return Math.round(parseFloat(w) * 10) / 10; }
function $(id) { return document.getElementById(id); }
function sicher(t) {
  return String(t == null ? "" : t).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
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
  var url = "https://geocoding-api.open-meteo.com/v1/search?count=5&language=de&format=json&name=" + encodeURIComponent(text);
  fetch(url).then(function (a) { return a.json(); }).then(function (d) {
    var ziel = $("ort-ergebnisse");
    ziel.innerHTML = "";
    var funde = (d && d.results) || [];
    if (!funde.length) { ziel.innerHTML = '<p class="hinweis">Nichts gefunden – anders schreiben?</p>'; return; }
    funde.forEach(function (f) {
      var knopf = document.createElement("button");
      var zusatz = [f.admin1, f.country].filter(Boolean).join(", ");
      knopf.textContent = f.name + (zusatz ? " – " + zusatz : "");
      knopf.addEventListener("click", function () {
        setzeOrt(f.name, f.latitude, f.longitude);
      });
      ziel.appendChild(knopf);
    });
  }).catch(function () {
    $("ort-ergebnisse").innerHTML = '<p class="warnung">Ortssuche gerade nicht erreichbar.</p>';
  });
}

$("ort-standort").addEventListener("click", function () {
  if (!navigator.geolocation) { alert("Dieses Gerät unterstützt keine Standort-Abfrage."); return; }
  $("ort-standort").textContent = "…";
  navigator.geolocation.getCurrentPosition(function (pos) {
    // Datenschutz: sofort grob runden, der genaue Wert verlässt das Gerät nie
    setzeOrt("Mein Standort (grob)", pos.coords.latitude, pos.coords.longitude);
    $("ort-standort").textContent = "📍";
  }, function () {
    $("ort-standort").textContent = "📍";
    alert("Standort nicht verfügbar – bitte den Ort oben suchen.");
  }, { enableHighAccuracy:false, timeout:10000 });
});

function setzeOrt(name, lat, lon) {
  zustand.ort = { name:String(name).slice(0,60), lat:runde(lat), lon:runde(lon) };
  speichere(); zeichneOrt(); aktualisiereVorschau(); syncWennAktiv();
}

$("ort-aendern").addEventListener("click", function () {
  $("ort-anzeige").style.display = "none";
  $("ort-suche").style.display = "";
  $("ort-eingabe").focus();
});

function zeichneOrt() {
  if (zustand.ort) {
    $("ort-name").textContent = zustand.ort.name + " (grob " + zustand.ort.lat + " / " + zustand.ort.lon + ")";
    $("ort-anzeige").style.display = "";
    $("ort-suche").style.display = "none";
  } else {
    $("ort-anzeige").style.display = "none";
    $("ort-suche").style.display = "";
  }
}

/* ---------- Vorlagen ---------- */
function zeichneVorlagen() {
  var ziel = $("vorlagen");
  ziel.innerHTML = "";
  VORLAGEN.forEach(function (v) {
    var knopf = document.createElement("button");
    knopf.textContent = v.emoji + " " + v.name;
    var schonDa = zustand.regeln.some(function (r) { return r.name === v.name; });
    knopf.disabled = schonDa;
    knopf.addEventListener("click", function () {
      zustand.regeln.push({
        name:v.name, emoji:v.emoji, aktiv:true, zeitfensterStunden:48,
        nurVonUhr:v.nurVonUhr, nurBisUhr:v.nurBisUhr,
        mindestdauerStunden:v.mindestdauerStunden,
        bedingungen:JSON.parse(JSON.stringify(v.bedingungen))
      });
      speichere(); zeichneRegeln(); zeichneVorlagen(); aktualisiereVorschau(); syncWennAktiv();
    });
    ziel.appendChild(knopf);
  });
}

/* ---------- Regel-Karten ---------- */
var letzteTreffer = null; // Antwort der Vorschau-API

function zeichneRegeln() {
  var ziel = $("regel-liste");
  ziel.innerHTML = "";
  if (!zustand.regeln.length) {
    ziel.innerHTML = '<p class="hinweis" style="margin-bottom:0">Noch keine Regel – tippe oben eine Vorlage an.</p>';
    return;
  }
  zustand.regeln.forEach(function (regel, i) {
    var karte = document.createElement("div");
    karte.className = "regel" + (regel.aktiv ? "" : " inaktiv");

    var kopf = document.createElement("div");
    kopf.className = "regelkopf";
    kopf.innerHTML = '<span class="emoji">' + sicher(regel.emoji) + '</span>'
      + '<span class="name">' + sicher(regel.name) + '</span>'
      + '<label class="schalter"><input type="checkbox" ' + (regel.aktiv ? "checked" : "")
      + '><span class="bahn"></span></label>';
    kopf.querySelector("input").addEventListener("change", function () {
      regel.aktiv = this.checked;
      speichere(); zeichneRegeln(); aktualisiereVorschau(); syncWennAktiv();
    });
    karte.appendChild(kopf);

    var trefferZiel = document.createElement("div");
    trefferZiel.dataset.regel = i;
    trefferZiel.innerHTML = trefferHtml(i, regel);
    karte.appendChild(trefferZiel);

    karte.appendChild(feinEditor(regel, i));
    ziel.appendChild(karte);
  });
}

function trefferHtml(i, regel) {
  if (!regel.aktiv) return '<div class="kein-treffer">Ausgeschaltet – wird nicht geprüft.</div>';
  if (!zustand.ort) return '<div class="kein-treffer">Wähle zuerst oben deinen Ort.</div>';
  if (!letzteTreffer) return '<div class="kein-treffer">Prüfe …</div>';
  var liste = letzteTreffer[i] || [];
  if (!liste.length) return '<div class="kein-treffer">Kein Treffer in den nächsten '
    + (regel.zeitfensterStunden || 48) + ' Stunden.</div>';
  return liste.map(function (t) { return '<div class="treffer">✔️ ' + sicher(t.text) + '</div>'; }).join("");
}

function feinEditor(regel, i) {
  var det = document.createElement("details");
  det.className = "fein";
  det.innerHTML = "<summary>Feinjustieren</summary>";

  var zeit = document.createElement("div");
  zeit.className = "zeile";
  zeit.innerHTML =
      '<div><label>Nur von (Uhr)</label><input type="number" min="0" max="23" value="' + (regel.nurVonUhr != null ? regel.nurVonUhr : 0) + '" data-f="nurVonUhr"></div>'
    + '<div><label>Nur bis (Uhr)</label><input type="number" min="1" max="24" value="' + (regel.nurBisUhr != null ? regel.nurBisUhr : 24) + '" data-f="nurBisUhr"></div>'
    + '<div><label>Mind. Dauer (Std.)</label><input type="number" min="1" max="24" value="' + (regel.mindestdauerStunden != null ? regel.mindestdauerStunden : 2) + '" data-f="mindestdauerStunden"></div>';
  zeit.querySelectorAll("input").forEach(function (feld) {
    feld.addEventListener("change", function () {
      var z = parseInt(this.value, 10);
      if (!isNaN(z)) { regel[this.dataset.f] = z; speichere(); aktualisiereVorschau(); syncWennAktiv(); }
    });
  });
  det.appendChild(zeit);

  BAUSTEINE.forEach(function (b) {
    var gesetzt = regel.bedingungen[b.s] !== undefined;
    var wert = gesetzt ? regel.bedingungen[b.s] : STANDARDWERT[b.s];
    var reihe = document.createElement("div");
    reihe.className = "bedingung" + (gesetzt ? "" : " aus");
    reihe.innerHTML =
        '<input type="checkbox"' + (gesetzt ? " checked" : "") + '>'
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
    function uebernehme(w) {
      var z = parseFloat(w);
      if (!isNaN(z) && regel.bedingungen[b.s] !== undefined) {
        regel.bedingungen[b.s] = z; speichere(); aktualisiereVorschauLangsam(); syncWennAktiv();
      }
    }
    regler.addEventListener("input", function () { zahl.value = this.value; uebernehme(this.value); });
    zahl.addEventListener("change", function () { regler.value = this.value; uebernehme(this.value); });
    det.appendChild(reihe);
  });

  var entf = document.createElement("div");
  entf.style.marginTop = "8px";
  entf.innerHTML = '<button class="knopf rot" style="padding:7px 11px;font-size:.8rem">🗑️ Regel entfernen</button>';
  entf.querySelector("button").addEventListener("click", function () {
    if (!confirm('Regel "' + regel.name + '" wirklich entfernen?')) return;
    zustand.regeln.splice(i, 1);
    speichere(); zeichneRegeln(); zeichneVorlagen(); aktualisiereVorschau(); syncWennAktiv();
  });
  det.appendChild(entf);
  return det;
}

/* ---------- Vorschau über die Dienst-API (dieselbe Logik wie der Wächter) ---------- */
var vorschauTimer = null;
function aktualisiereVorschauLangsam() {
  clearTimeout(vorschauTimer);
  vorschauTimer = setTimeout(aktualisiereVorschau, 700);
}
function aktualisiereVorschau() {
  clearTimeout(vorschauTimer);
  if (!zustand.ort) { $("wetter-karte").style.display = "none"; return; }
  fetch("/api/vorschau", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ lat:zustand.ort.lat, lon:zustand.ort.lon, regeln:zustand.regeln })
  }).then(function (a) { return a.json(); }).then(function (d) {
    if (!d || !d.ok) throw new Error((d && d.fehler) || "unbekannt");
    letzteTreffer = d.treffer;
    document.querySelectorAll("[data-regel]").forEach(function (ziel) {
      var i = parseInt(ziel.dataset.regel, 10);
      ziel.innerHTML = trefferHtml(i, zustand.regeln[i]);
    });
    var tage = d.tage || [];
    $("wetter-tage").innerHTML = tage.map(function (t) {
      return '<div class="tag"><div class="tagname">' + t.wochentag.slice(0,2) + ", "
        + t.datum.slice(8,10) + "." + t.datum.slice(5,7) + '.</div>'
        + '<div><span>🌡️</span><span>' + t.tempMin + "–" + t.tempMax + ' °C</span></div>'
        + '<div><span>💨 max.</span><span>' + t.windMax + ' km/h</span></div>'
        + '<div><span>🌧️ ges.</span><span>' + String(t.regenSumme).replace(".", ",") + ' mm</span></div>'
        + '<div><span>☁️ Ø</span><span>' + t.wolkenMittel + ' %</span></div></div>';
    }).join("");
    $("wetter-karte").style.display = tage.length ? "" : "none";
  }).catch(function (f) {
    document.querySelectorAll("[data-regel]").forEach(function (ziel) {
      ziel.innerHTML = '<div class="warnung">Vorschau gerade nicht möglich (' + sicher(f.message) + ').</div>';
    });
  });
}

/* ---------- Benachrichtigungen (Browser-Push) ---------- */
function b64urlZuBytes(s) {
  var pad = (4 - (s.length % 4)) % 4;
  var b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "====".slice(0, pad);
  var roh = atob(b64);
  return Uint8Array.from(roh, function (c) { return c.charCodeAt(0); });
}

function zeigePushStatus(text, gut) {
  $("push-status").innerHTML = '<div class="' + (gut ? "erfolg" : "warnung") + '">' + sicher(text) + "</div>";
}

function holeAbo() {
  return navigator.serviceWorker.register("/sw.js")
    .then(function () { return navigator.serviceWorker.ready; })
    .then(function (reg) {
      return reg.pushManager.getSubscription().then(function (abo) {
        if (abo) return abo;
        return reg.pushManager.subscribe({
          userVisibleOnly:true, applicationServerKey:b64urlZuBytes(VAPID_PUBLIC)
        });
      });
    });
}

$("aktivieren").addEventListener("click", function () {
  if (!zustand.ort) { zeigePushStatus("Bitte wähle zuerst oben deinen Ort.", false); return; }
  if (!zustand.regeln.some(function (r) { return r.aktiv; })) {
    zeigePushStatus("Bitte füge zuerst mindestens eine aktive Regel hinzu.", false); return;
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    zeigePushStatus("Dieser Browser unterstützt keine Push-Nachrichten. iPhone: Seite zuerst zum Home-Bildschirm hinzufügen und von dort öffnen.", false);
    return;
  }
  zeigePushStatus("Richte ein …", true);
  Notification.requestPermission().then(function (erlaubnis) {
    if (erlaubnis !== "granted") { throw new Error("Ohne Erlaubnis geht es nicht (Status: " + erlaubnis + ")."); }
    return holeAbo();
  }).then(function (abo) {
    return sendeAnDienst(abo);
  }).then(function (d) {
    zustand.aktiviert = true; speichere();
    if (d.gespeichert) {
      zeigePushStatus("✅ Fertig! Eine Bestätigung ist unterwegs. Der Wächter prüft ab jetzt stündlich für dich.", true);
    } else {
      zeigePushStatus("✅ Test-Nachricht unterwegs! (Hinweis: Der Speicher des Dienstes wird gerade noch eingerichtet – die stündliche Überwachung startet in Kürze.)", true);
    }
  }).catch(function (f) {
    zeigePushStatus("⚠️ " + f.message, false);
  });
});

function sendeAnDienst(abo) {
  return fetch("/api/aktivieren", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ abo:abo.toJSON ? abo.toJSON() : abo,
      lat:zustand.ort.lat, lon:zustand.ort.lon, regeln:zustand.regeln })
  }).then(function (a) { return a.json().then(function (d) {
    if (!a.ok || !d.ok) throw new Error((d && d.fehler) || "Dienst nicht erreichbar.");
    return d;
  }); });
}

/* Änderungen automatisch zum Dienst schicken, wenn bereits aktiviert */
var syncTimer = null;
function syncWennAktiv() {
  if (!zustand.aktiviert || !zustand.ort) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function () {
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (abo) {
      if (abo) return sendeAnDienst(abo);
    }).catch(function () { /* still bleiben – beim nächsten Öffnen erneut */ });
  }, 1200);
}

$("loeschen").addEventListener("click", function () {
  if (!confirm("Wirklich alles löschen? Regeln, Ort und die Abmeldung vom Wächter.")) return;
  var fertig = function () { localStorage.removeItem(SPEICHER); location.reload(); };
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (abo) {
      if (!abo) return null;
      return fetch("/api/deaktivieren", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ endpoint:abo.endpoint })
      }).then(function () { return abo.unsubscribe(); });
    }).then(fertig, fertig);
  } else { fertig(); }
});

/* ---------- Start ---------- */
zeichneOrt();
zeichneVorlagen();
zeichneRegeln();
aktualisiereVorschau();
</script>
</body>
</html>`;
}
