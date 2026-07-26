/*
 * Der Baustein-Editor – gemeinsam genutzt von der App (seite.js) und der
 * Demo-Seite (baukasten.js). Beide betten CSS und JavaScript als Text ein,
 * damit es die Regelbedienung nur EINMAL gibt und beide Seiten nicht
 * auseinanderlaufen.
 *
 * Was die einbettende Seite bereitstellen muss:
 *   $(id)                – document.getElementById
 *   sicher(text)         – HTML-Maskierung
 *   erweitert            – Variable: erlaubt „oder“ und Ziehen?
 *   regeln               – das Array der Regeln (gleiche Reihenfolge wie die
 *                          .regel-Elemente im Dokument)
 *   speichere()          – Zustand sichern
 *   zeichneAlles()       – Oberfläche neu aufbauen
 *   vorschauLangsam()    – Vorschau verzögert auffrischen (beim Reglerschieben)
 *
 * Einstiegspunkt: baueBausteinBereich(ziel, regel, regelIndex)
 * Das .regel-Element der Regel braucht data-regelkarte="<Index>", damit das Ziehen
 * seine Ablegeziele findet.
 */

export const BAUSTEINE_CSS = `
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
  .teilkopf .oder-knopf { border:0; background:var(--akzent); color:#fff; flex-shrink:0;
    border-radius:999px; padding:4px 11px; font-size:.74rem; font-weight:700; cursor:pointer;
    line-height:1.3; letter-spacing:.02em; }
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
  /* Umbrechend statt scrollend: sonst beansprucht der Browser ein schraeges
     Ziehen als waagerechtes Wischen der Leiste und bricht es ab (pointercancel).
     Ohne Scrollbedarf darf touch-action:none gelten. */
  .palette { display:flex; flex-wrap:wrap; gap:5px; margin-top:7px; }
  .palette .p-chip { flex:0 0 auto; border:1px dashed var(--linie); background:var(--hg); color:var(--text);
    border-radius:999px; padding:5px 10px; font-size:.82rem; cursor:grab; white-space:nowrap;
    transition:transform .12s;
    /* pan-y: die Seite scrollt normal ueber die Chips hinweg. Gezogen wird erst
       nach kurzem Halten - sonst waehlt man beim Scrollen versehentlich aus. */
    touch-action:pan-y; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
  .palette .p-chip.wartet { transform:scale(1.12); border-color:var(--akzent); color:var(--akzent); }
  .palette .p-chip.benutzt { opacity:.55; }
  .palette .p-chip.benutzt::after { content:" ✓"; font-weight:700; }

  /* ---- Ziehen: Anfasser, Ziele, Geist ---- */
  /* WICHTIG: touch-action wirkt nicht auf inline-Elementen. Der Anfasser muss
     deshalb ein Block sein, sonst scrollt iOS weiter und bricht das Ziehen ab.
     Ausserdem gross genug zum Treffen mit dem Daumen. */
  .teilkopf .griff { display:flex; align-items:center; justify-content:center;
    width:30px; height:30px; margin-left:-6px; flex-shrink:0;
    color:var(--akzent); cursor:grab; font-size:1.05rem; line-height:1;
    touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
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
  /* Grosse Ablegeflaeche am unteren Rand – liegt durchscheinend ueber der
     Baustein-Leiste, damit man sie im Ziehen sicher trifft. */
  #zieh-abbruch { position:fixed; z-index:58; pointer-events:none; left:0; right:0; bottom:0;
    height:30vh; min-height:160px; max-height:260px;
    background:linear-gradient(180deg, rgba(185,28,28,.02), rgba(185,28,28,.20));
    border-top:2px dashed rgba(185,28,28,.45);
    display:flex; align-items:center; justify-content:center;
    transition:background .12s, border-color .12s; }
  #zieh-abbruch .schild { background:rgba(255,255,255,.9); color:var(--rot);
    border-radius:999px; padding:9px 18px; font-size:.86rem; font-weight:700;
    box-shadow:0 2px 10px rgba(0,0,0,.18); }
  #zieh-abbruch.bereit { background:linear-gradient(180deg, rgba(185,28,28,.22), rgba(185,28,28,.42));
    border-top-color:var(--rot); }
  #zieh-abbruch.bereit .schild { background:var(--rot); color:#fff; }

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
    font-size:.83rem; margin-top:6px; }`;

export const BAUSTEINE_JS = `
var SEKTOREN = ["N","NO","O","SO","S","SW","W","NW"];
var PFEIL_VON = ["↓","↙","←","↖","↑","↗","→","↘"];
var ARTEN = {
  temp:         { bez:"Temperatur",   kurz:"Temp",     einheit:"°C",   min:-20, max:45,  schritt:1,   emoji:"🌡️", standard:{min:18,max:26} },
  wind:         { bez:"Wind",         kurz:"Wind",     einheit:"km/h", min:0,   max:120, schritt:1,   emoji:"💨", standard:{max:15} },
  boe:          { bez:"Windböen",     kurz:"Böen",     einheit:"km/h", min:0,   max:150, schritt:1,   emoji:"🌬️", standard:{max:40} },
  regen:        { bez:"Regen",        kurz:"Regen",    einheit:"mm/h", min:0,   max:10,  schritt:0.1, emoji:"🌧️", standard:{max:0} },
  bewoelkung:   { bez:"Bewölkung",    kurz:"Wolken",   einheit:"%",    min:0,   max:100, schritt:5,   emoji:"☁️", standard:{max:60} },
  feuchte:      { bez:"Luftfeuchte",  kurz:"Feuchte",  einheit:"%",    min:0,   max:100, schritt:5,   emoji:"💧", standard:{max:70} },
  uv:           { bez:"UV-Index",     kurz:"UV",       einheit:"",     min:0,   max:15,  schritt:1,   emoji:"☀️", standard:{min:6} },
  windrichtung: { bez:"Windrichtung", kurz:"Richtung", einheit:"",                                    emoji:"🧭", standard:{sektoren:["N","NO","NW"]} }
};
var ARTEN_REIHE = ["temp","wind","boe","windrichtung","regen","bewoelkung","feuchte","uv"];
var FENSTER = [[24,"1 Tag"],[48,"2 Tage"],[72,"3 Tage"],[120,"5 Tage"],[168,"7 Tage"]];
var MAX_BAUSTEINE = 8, MAX_ALTERNATIVEN = 3;

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

/* Welche Bausteinarten kommen in dieser Regel / diesem Baustein schon vor? */
function benutzteArten(quelle) {
  var arten = {};
  (quelle || []).forEach(function (b) { (b.teile || []).forEach(function (t) { arten[t.art] = true; }); });
  return arten;
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
      anfasserStart(e, { typ: "teil", regel: regel, regelIndex: regelNummer, baustein: baustein, ti: ti },
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
   Zwei Wege hinein, je nach Verwechslungsgefahr:
     Anfasser ⠿  – touch-action:none, zieht sofort. Ein eigener Greifpunkt,
                   den man nicht zufällig trifft.
     Chip        – touch-action:pan-y, die Seite scrollt also ganz normal
                   darüber hinweg. Gezogen wird erst nach kurzem Halten,
                   damit beim Scrollen nichts versehentlich mitgeht.        */
var zieht = null, zuletztGezogen = false, rollTimer = null, langTimer = null;
var HALTEN_MS = 220;

/* Anfasser: sofort. */
function anfasserStart(e, quelle, beschriftung) {
  if (e.button > 0) return;
  starteZiehen(e.currentTarget, e, quelle, beschriftung, false);
}

/* Chip: erst nach kurzem Halten – und nur, wenn der Finger dabei ruhig bleibt. */
function chipStart(e, quelle, beschriftung) {
  if (!erweitert || e.button > 0 || zieht) return;
  var el = e.currentTarget, id = e.pointerId, x = e.clientX, y = e.clientY;
  el.classList.add("wartet");
  function aufraeumen() {
    clearTimeout(langTimer); langTimer = null;
    el.classList.remove("wartet");
    document.removeEventListener("pointermove", pruefeRuhe);
    document.removeEventListener("pointerup", aufraeumen);
    document.removeEventListener("pointercancel", aufraeumen);
  }
  function pruefeRuhe(ev) {
    if (Math.abs(ev.clientX - x) > 8 || Math.abs(ev.clientY - y) > 8) aufraeumen();  // scrollt
  }
  document.addEventListener("pointermove", pruefeRuhe);
  document.addEventListener("pointerup", aufraeumen);
  document.addEventListener("pointercancel", aufraeumen);
  langTimer = setTimeout(function () {
    aufraeumen();
    starteZiehen(el, { pointerId: id, clientX: x, clientY: y }, quelle, beschriftung, true);
  }, HALTEN_MS);
}

function starteZiehen(el, e, quelle, beschriftung, sofort) {
  if (!erweitert || zieht) return;
  // KEIN preventDefault beim Drücken: auf iOS würde das den anschließenden
  // Klick unterdrücken, und Antippen soll weiter funktionieren.
  // Zeiger einfangen, sonst verliert iOS die Bewegung, sobald der Finger das
  // kleine Element verlässt.
  try { el.setPointerCapture(e.pointerId); } catch (f) {}
  zieht = { quelle: quelle, ziel: null, zeiger: e.pointerId, beschriftung: beschriftung,
            startX: e.clientX, startY: e.clientY, bewegt: false };
  document.addEventListener("pointermove", beiZiehen, { passive: false });
  document.addEventListener("pointerup", beendeZiehen);
  document.addEventListener("pointercancel", brichZiehenAb);
  // Chips dürfen laut touch-action senkrecht scrollen; sobald wirklich gezogen
  // wird, muss das unterbunden werden – das geht nur über touchmove.
  document.addEventListener("touchmove", haltScrollenAn, { passive: false });
  document.addEventListener("keydown", beiTaste);
  if (sofort) {
    zieht.bewegt = true;
    zeigeGeist(); bewegeGeist(e.clientX, e.clientY);
    zieht.ziel = findeAblegeZiel(e.clientX, e.clientY);
    zeigeZiel();
  }
}
function haltScrollenAn(e) { if (zieht && zieht.bewegt) e.preventDefault(); }
function beiTaste(e) { if (e.key === "Escape") brichZiehenAb(); }
function regelnBausteinIndex(regel, baustein) { return (regel.bausteine || []).indexOf(baustein); }

/* Der mitlaufende Chip entsteht erst bei echter Bewegung – beim bloßen
   Antippen soll nichts aufblitzen. */
function zeigeGeist() {
  var quelle = zieht.quelle;
  document.body.classList.add("zieht");
  var geist = document.createElement("div"); geist.id = "zieh-geist";
  geist.textContent = zieht.beschriftung;
  document.body.appendChild(geist);
  zieht.geist = geist;
  // Rückzieher: hier ablegen (oder Esc) lässt alles, wie es war.
  var abbruch = document.createElement("div"); abbruch.id = "zieh-abbruch";
  abbruch.innerHTML = '<span class="schild">✕ Hier loslassen zum Abbrechen</span>';
  document.body.appendChild(abbruch);
  if (quelle.typ === "teil") {
    var reihen = document.querySelectorAll('.regel[data-regelkarte="' + quelle.regelIndex + '"] .baustein[data-baustein="'
      + regelnBausteinIndex(quelle.regel, quelle.baustein) + '"] .teil');
    if (reihen[quelle.ti]) reihen[quelle.ti].classList.add("wandert");
  }
}
function bewegeGeist(x, y) {
  if (!zieht || !zieht.geist) return;
  zieht.geist.style.left = (x + 14) + "px";
  zieht.geist.style.top = (y - 14) + "px";
  var breite = zieht.geist.offsetWidth;
  if (x + 14 + breite > window.innerWidth - 6) zieht.geist.style.left = (window.innerWidth - 6 - breite) + "px";
}

function beiZiehen(e) {
  if (!zieht) return;
  if (!zieht.bewegt) {
    if (Math.abs(e.clientX - zieht.startX) <= 5 && Math.abs(e.clientY - zieht.startY) <= 5) return;
    zieht.bewegt = true;
    zeigeGeist();
  }
  e.preventDefault();
  bewegeGeist(e.clientX, e.clientY);
  zieht.ziel = findeAblegeZiel(e.clientX, e.clientY);
  zeigeZiel();
  rolleAmRand(e.clientY);
}

/* Nahe am oberen/unteren Rand mitscrollen, damit man auch weit weg ablegen kann. */
function rolleAmRand(y) {
  clearInterval(rollTimer); rollTimer = null;
  // Nur nach oben: unten liegt die Abbruchflaeche, dort darf die Seite nicht
  // unter dem Finger wegrutschen.
  if (y >= 80) return;
  rollTimer = setInterval(function () { window.scrollBy(0, -12); }, 16);
}

/* Welcher Platz liegt unter dem Finger? */
function findeAblegeZiel(x, y) {
  var karte = document.querySelector('.regel[data-regelkarte="' + zieht.quelle.regelIndex + '"]');
  if (!karte) return null;
  // Über dem Abbruch-Feld oder weit weg von der Regel: nichts tun.
  var feld = $("zieh-abbruch");
  var weitGenug = Math.abs(x - zieht.startX) > 40 || Math.abs(y - zieht.startY) > 40;
  if (feld && weitGenug && y >= feld.getBoundingClientRect().top) return { modus: "abbruch" };
  var kr = karte.getBoundingClientRect();
  if (y < kr.top - 90) return { modus: "abbruch" };
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
  var karte = document.querySelector('.regel[data-regelkarte="' + zieht.quelle.regelIndex + '"]');
  var feld = $("zieh-abbruch");
  if (feld) feld.classList.toggle("bereit", ziel.modus === "abbruch");

  if (ziel.modus === "abbruch") { ziel.erlaubt = false; return; }
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
  document.removeEventListener("touchmove", haltScrollenAn);
  document.removeEventListener("keydown", beiTaste);
  clearInterval(rollTimer); rollTimer = null;
  if (zieht && zieht.geist) zieht.geist.remove();
  var l = $("zieh-linie"); if (l) l.remove();
  var m = $("zieh-marke"); if (m) m.remove();
  var ab = $("zieh-abbruch"); if (ab) ab.remove();
  Array.prototype.forEach.call(document.querySelectorAll(".wandert, .wartet"), function (el) {
    el.classList.remove("wandert"); el.classList.remove("wartet"); });
  Array.prototype.forEach.call(document.querySelectorAll(".baustein"), function (k) {
    k.classList.remove("ziel-oder", "ziel-voll");
  });
  document.body.classList.remove("zieht");
  zieht = null;
}

/* Führt die Ablage aus. Arbeitet mit Objekt-Verweisen statt Indizes, damit das
   Entfernen der Quelle die Zielposition nicht verschiebt. */
function legeAb(quelle, ziel) {
  if (!ziel || ziel.modus === "abbruch") return false;
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

/* Baut den kompletten Baustein-Bereich einer Regel: die Bausteine mit ihren
   „und“-Trennern und die Leiste zum Hinzufügen. */
function baueBausteinBereich(ziel, regel, ri) {
  var bau = document.createElement("div"); bau.className = "bausteine";
  (regel.bausteine || []).forEach(function (baustein, bi) {
    if (bi > 0) {
      var t = document.createElement("p"); t.className = "und-trenner"; t.textContent = "und";
      bau.appendChild(t);
    }
    bau.appendChild(zeichneBaustein(regel, baustein, bi, ri));
  });
  ziel.appendChild(bau);

  // Baustein-Leiste: antippen hängt an (und), ziehen entscheidet Platz und Art.
  if ((regel.bausteine || []).length >= MAX_BAUSTEINE) {
    var voll = document.createElement("p"); voll.className = "hinweis"; voll.style.margin = "7px 0 0";
    voll.textContent = "Mehr als " + MAX_BAUSTEINE + " Bausteine sind nicht vorgesehen.";
    ziel.appendChild(voll);
  } else {
    var benutzt = benutzteArten(regel.bausteine);
    var palette = document.createElement("div"); palette.className = "palette";
    ARTEN_REIHE.forEach(function (art) {
      var chip = document.createElement("button"); chip.type = "button";
      chip.className = "p-chip" + (benutzt[art] ? " benutzt" : "");
      chip.dataset.art = art;
      chip.textContent = ARTEN[art].emoji + " " + (ARTEN[art].kurz || ARTEN[art].bez);
      chip.title = ARTEN[art].bez;
      chip.addEventListener("click", function () {
        if (zuletztGezogen) return;              // Klick nach dem Ziehen unterdrücken
        regel.bausteine = (regel.bausteine || []).concat([{ teile: [neuerTeil(art)] }]);
        speichere(); zeichneAlles();
      });
      chip.addEventListener("pointerdown", function (e) {
        chipStart(e, { typ: "palette", art: art, regel: regel, regelIndex: ri },
                  ARTEN[art].emoji + " " + ARTEN[art].bez);
      });
      palette.appendChild(chip);
    });
    ziel.appendChild(palette);
    var wink = document.createElement("p"); wink.className = "hinweis"; wink.style.margin = "2px 0 0";
    // Im einfachen Modus nicht mit Ziehen werben – das gibt es dort nicht.
    wink.textContent = erweitert
      ? "Antippen hängt an. Kurz halten und ziehen: auf einen Baustein = oder, dazwischen = und."
      : "Antippen hängt einen Baustein an (muss zusätzlich passen).";
    ziel.appendChild(wink);
  }

}

/* Satz in normalem Deutsch plus – falls nötig – die Warnung vor einer Regel,
   die nie zutreffen kann. Getrennt vom Baustein-Bereich, damit die Seite
   dazwischen noch eigene Angaben (Zeitfenster, Häufigkeit) unterbringen kann. */
function baueSatzUndWarnung(ziel, regel) {
  var satz = document.createElement("div"); satz.className = "satz";
  satz.innerHTML = regelSatz(regel);
  ziel.appendChild(satz);

  var probleme = unmoeglichkeiten(regel);
  if (probleme.length) {
    var warn = document.createElement("div"); warn.className = "unmoeglich";
    warn.innerHTML = '<b>⚠️ Kann nie zutreffen.</b> ' + probleme.map(sicher).join(" ")
      + (erweitert ? ' <br>Meintest du „entweder … oder …“? Dann gehören beide in <b>einen</b> Baustein (+ oder).' : "");
    ziel.appendChild(warn);
  }
}

/* Wandelt die alte Bedingungsform verlustfrei in Bausteine um (Migration).
   Muss zu bausteineAusBedingungen in logik.js passen. */
function bausteineAusAltForm(bedingungen) {
  var bereiche = [["temp","tempMin","tempMax"], ["wind","windMin","windMax"],
                  ["boe","boeMin","boeMax"], ["regen",null,"regenMax"],
                  ["bewoelkung","bewoelkungMin","bewoelkungMax"], ["feuchte",null,"feuchteMax"],
                  ["uv","uvMin","uvMax"]];
  var b = bedingungen || {}, raus = [];
  bereiche.forEach(function (e) {
    var teil = { art: e[0] };
    if (e[1] && b[e[1]] !== undefined && b[e[1]] !== null) teil.min = b[e[1]];
    if (e[2] && b[e[2]] !== undefined && b[e[2]] !== null) teil.max = b[e[2]];
    if (teil.min !== undefined || teil.max !== undefined) raus.push({ teile: [teil] });
  });
  if (Array.isArray(b.windRichtungen) && b.windRichtungen.length) {
    raus.push({ teile: [{ art: "windrichtung", sektoren: b.windRichtungen.slice() }] });
  }
  return raus;
}
`;
