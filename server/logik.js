/*
 * Regel-Logik des Wetter-Wächters (eine einzige Quelle der Wahrheit).
 * ===================================================================
 * Kern-Übersetzung aus dem bewährten waechter.py (per Paritätstest bestätigt).
 * Zusätzlich (nur im neuen Dienst): Windrichtung- und UV-Bedingungen sowie ein
 * einstellbares Zeitfenster bis 7 Tage. Der 5-Werte-Kern (Temperatur, Wind,
 * Regen, Bewölkung, Feuchte) bleibt exakt wie in waechter.py – deshalb gilt die
 * Parität für alle bisherigen Regeln weiterhin.
 */

export const STUNDE_MS = 3600 * 1000;
export const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch",
                           "Donnerstag", "Freitag", "Samstag"];
// Himmelsrichtungen, aus denen der Wind kommt (8 Sektoren à 45°)
export const SEKTOR_NAMEN = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];

/* Datenschutz-Sicherheitsnetz: Koordinaten immer grob runden (~11 km). */
export function rundeKoordinate(wert) {
  return Math.round(parseFloat(wert) * 10) / 10;
}

/* Windgrad (0-360, Richtung woher) -> Sektor-Name. */
export function windSektor(grad) {
  return SEKTOR_NAMEN[Math.round(grad / 45) % 8];
}

/* Prüft eine einzelne Stunde gegen alle gesetzten Grenzwerte.
   Der 5-Werte-Kern entspricht stunde_passt() aus waechter.py;
   windDir/uv werden nur geprüft, wenn die Regel sie nutzt. */
export function stundePasst(bedingungen, temp, wind, regen, wolken, feuchte, windDir, uv, boe) {
  const mindestens = (k, w) => { const g = bedingungen[k]; return g === undefined || g === null || w >= g; };
  const hoechstens = (k, w) => { const g = bedingungen[k]; return g === undefined || g === null || w <= g; };

  const kern = mindestens("tempMin", temp) && hoechstens("tempMax", temp)
    && hoechstens("windMax", wind) && mindestens("windMin", wind)
    && hoechstens("regenMax", regen)
    && mindestens("bewoelkungMin", wolken) && hoechstens("bewoelkungMax", wolken)
    && hoechstens("feuchteMax", feuchte)
    && mindestens("uvMin", uv) && hoechstens("uvMax", uv)
    && mindestens("boeMin", boe) && hoechstens("boeMax", boe);
  if (!kern) return false;

  const richtungen = bedingungen.windRichtungen;
  if (Array.isArray(richtungen) && richtungen.length) {
    if (windDir === undefined || windDir === null) return false; // nicht prüfbar -> kein Treffer
    if (!richtungen.includes(windSektor(windDir))) return false;
  }
  return true;
}

/* ===================================================================
   Bausteine – die neue Regelform mit „oder“
   ===================================================================
   Eine Regel besteht aus Bausteinen. ALLE Bausteine müssen passen (und);
   innerhalb eines Bausteins genügt EINE Alternative (oder). Beispiel:

     [ { teile: [ {art:"temp", min:18, max:28} ] },
       { teile: [ {art:"regen", max:0} ] },
       { teile: [ {art:"wind", max:10},
                  {art:"windrichtung", sektoren:["N","NO","NW"]} ] } ]

   liest sich als: 18–28 °C und kein Regen und (Wind höchstens 10 km/h
   oder Wind aus N/NO/NW).

   Die alte Form (regel.bedingungen) bleibt unverändert gültig; findeTreffer
   nutzt die Bausteine nur, wenn eine Regel welche mitbringt.            */
export const BAUSTEIN_ARTEN = {
  temp:         { wert: "temp",    bez: "Temperatur",   einheit: "°C",   min: -20, max: 45,  schritt: 1,   emoji: "🌡️" },
  wind:         { wert: "wind",    bez: "Wind",         einheit: "km/h", min: 0,   max: 120, schritt: 1,   emoji: "💨" },
  boe:          { wert: "boe",     bez: "Windböen",     einheit: "km/h", min: 0,   max: 150, schritt: 1,   emoji: "🌬️" },
  regen:        { wert: "regen",   bez: "Regen",        einheit: "mm/h", min: 0,   max: 10,  schritt: 0.1, emoji: "🌧️" },
  bewoelkung:   { wert: "wolken",  bez: "Bewölkung",    einheit: "%",    min: 0,   max: 100, schritt: 5,   emoji: "☁️" },
  feuchte:      { wert: "feuchte", bez: "Luftfeuchte",  einheit: "%",    min: 0,   max: 100, schritt: 5,   emoji: "💧" },
  uv:           { wert: "uv",      bez: "UV-Index",     einheit: "",     min: 0,   max: 15,  schritt: 1,   emoji: "☀️" },
  windrichtung: { wert: "windDir", bez: "Windrichtung", einheit: "",                                       emoji: "🧭" },
};
export const MAX_BAUSTEINE = 8;      // Bausteine je Regel
export const MAX_ALTERNATIVEN = 3;   // „oder“-Zeilen je Baustein

/* Prüft eine einzelne Alternative gegen die Werte einer Stunde. */
export function teilPasst(teil, werte) {
  const art = BAUSTEIN_ARTEN[teil?.art];
  if (!art) return false;
  if (teil.art === "windrichtung") {
    if (!Array.isArray(teil.sektoren) || !teil.sektoren.length) return true; // nichts gewählt = egal
    const grad = werte.windDir;
    if (grad === null || grad === undefined) return false;
    return teil.sektoren.includes(windSektor(grad));
  }
  const wert = werte[art.wert];
  if (wert === null || wert === undefined) return false;
  if (teil.min !== undefined && teil.min !== null && wert < teil.min) return false;
  if (teil.max !== undefined && teil.max !== null && wert > teil.max) return false;
  return true;
}

/* Alle Bausteine müssen passen; je Baustein genügt eine Alternative. */
export function bausteinePassen(bausteine, werte) {
  for (const baustein of bausteine) {
    const teile = Array.isArray(baustein?.teile) ? baustein.teile : [];
    if (!teile.length) continue;                       // leerer Baustein = egal
    if (!teile.some((teil) => teilPasst(teil, werte))) return false;
  }
  return true;
}

/* Wandelt die alte Bedingungs-Form verlustfrei in Bausteine um:
   jede bisherige Bedingung wird ein Baustein ohne Alternative. */
export function bausteineAusBedingungen(bedingungen = {}) {
  const bereiche = [["temp", "tempMin", "tempMax"], ["wind", "windMin", "windMax"],
                    ["boe", "boeMin", "boeMax"], ["regen", null, "regenMax"],
                    ["bewoelkung", "bewoelkungMin", "bewoelkungMax"], ["feuchte", null, "feuchteMax"],
                    ["uv", "uvMin", "uvMax"]];
  const bausteine = [];
  for (const [art, minName, maxName] of bereiche) {
    const teil = { art };
    if (minName && bedingungen[minName] !== undefined && bedingungen[minName] !== null) teil.min = bedingungen[minName];
    if (maxName && bedingungen[maxName] !== undefined && bedingungen[maxName] !== null) teil.max = bedingungen[maxName];
    if (teil.min !== undefined || teil.max !== undefined) bausteine.push({ teile: [teil] });
  }
  if (Array.isArray(bedingungen.windRichtungen) && bedingungen.windRichtungen.length) {
    bausteine.push({ teile: [{ art: "windrichtung", sektoren: bedingungen.windRichtungen.slice() }] });
  }
  return bausteine;
}

/* Prüft und begrenzt vom Nutzer eingereichte Bausteine (Missbrauchs-Schutz).
   Rückgabe: geprüfte Bausteine oder null, wenn keine brauchbaren dabei sind. */
export function normalisiereBausteine(roh) {
  if (!Array.isArray(roh) || !roh.length) return null;
  const grenze = (w, min, max) => {
    const z = Number(w);
    if (!Number.isFinite(z)) return undefined;
    return Math.max(min, Math.min(max, z));
  };
  const bausteine = [];
  for (const baustein of roh.slice(0, MAX_BAUSTEINE)) {
    const teile = [];
    const rohTeile = Array.isArray(baustein?.teile) ? baustein.teile : [];
    for (const rohTeil of rohTeile.slice(0, MAX_ALTERNATIVEN)) {
      const art = BAUSTEIN_ARTEN[rohTeil?.art];
      if (!art) continue;
      if (rohTeil.art === "windrichtung") {
        const sektoren = [...new Set(Array.isArray(rohTeil.sektoren) ? rohTeil.sektoren : [])]
          .filter((s) => SEKTOR_NAMEN.includes(s));
        if (sektoren.length && sektoren.length < 8) teile.push({ art: "windrichtung", sektoren });
        continue;
      }
      const teil = { art: rohTeil.art };
      const min = grenze(rohTeil.min, art.min, art.max);
      const max = grenze(rohTeil.max, art.min, art.max);
      if (min !== undefined) teil.min = min;
      if (max !== undefined) teil.max = max;
      if (teil.min !== undefined || teil.max !== undefined) teile.push(teil);
    }
    if (teile.length) bausteine.push({ teile });
  }
  return bausteine.length ? bausteine : null;
}

/* ===================================================================
   „Woran hat es gelegen?“ – Beinahe-Treffer erklären
   ===================================================================
   Wenn eine Regel nicht zutrifft, ist die interessante Frage: was genau hat
   gefehlt, und wie knapp war es? Dafür suchen wir die Stunde im Vorschau-
   Fenster, die am wenigsten danebenliegt, und sagen für jeden gescheiterten
   Baustein, um wie viel er verfehlt wurde.                               */

/* Wie weit ist eine einzelne Alternative daneben? abstand in der Einheit des
   Werts; bei der Windrichtung gibt es keinen Abstand (Infinity). */
export function teilAbstand(teil, werte) {
  const art = BAUSTEIN_ARTEN[teil?.art];
  if (!art) return { passt: false, abstand: Infinity, grund: null };
  if (teil.art === "windrichtung") {
    if (teilPasst(teil, werte)) return { passt: true, abstand: 0, grund: null };
    const grad = werte.windDir;
    return { passt: false, abstand: Infinity, grund: { art: "windrichtung",
      ist: (grad === null || grad === undefined) ? null : windSektor(grad),
      sektoren: Array.isArray(teil.sektoren) ? teil.sektoren.slice() : [] } };
  }
  const wert = werte[art.wert];
  if (wert === null || wert === undefined) return { passt: false, abstand: Infinity, grund: null };
  if (teil.min !== undefined && teil.min !== null && wert < teil.min) {
    return { passt: false, abstand: teil.min - wert,
             grund: { art: teil.art, ist: wert, grenze: teil.min, richtung: "min" } };
  }
  if (teil.max !== undefined && teil.max !== null && wert > teil.max) {
    return { passt: false, abstand: wert - teil.max,
             grund: { art: teil.art, ist: wert, grenze: teil.max, richtung: "max" } };
  }
  return { passt: true, abstand: 0, grund: null };
}

/* Ein Baustein zählt als erfüllt, sobald EINE Alternative passt. Scheitert er,
   melden wir die Alternative, die am wenigsten fehlt. */
export function bausteinAbstand(baustein, werte) {
  const teile = Array.isArray(baustein?.teile) ? baustein.teile : [];
  if (!teile.length) return { passt: true, abstand: 0, grund: null };
  let beste = null;
  for (const teil of teile) {
    const a = teilAbstand(teil, werte);
    if (a.passt) return { passt: true, abstand: 0, grund: null };
    if (!beste || a.abstand < beste.abstand) beste = a;
  }
  return beste;
}

/* Abstände verschiedener Größen vergleichbar machen (Anteil der Spannweite). */
function relativerAbstand(art, abstand) {
  const a = BAUSTEIN_ARTEN[art];
  if (!a || !Number.isFinite(abstand) || a.max === undefined) return 1;
  const spanne = (a.max - a.min) || 1;
  return Math.min(1, abstand / spanne);
}

function werteDerStunde(stunden, i) {
  const kern = [stunden.temperature_2m[i], stunden.wind_speed_10m[i], stunden.precipitation[i],
                stunden.cloud_cover[i], stunden.relative_humidity_2m[i]];
  if (kern.some((w) => w === null || w === undefined)) return null;
  return { temp: kern[0], wind: kern[1], regen: kern[2], wolken: kern[3], feuchte: kern[4],
           windDir: stunden.wind_direction_10m ? stunden.wind_direction_10m[i] : undefined,
           uv: stunden.uv_index ? stunden.uv_index[i] : undefined,
           boe: stunden.wind_gusts_10m ? stunden.wind_gusts_10m[i] : undefined };
}

function zeitpunktText(zeitMs) {
  const d = new Date(zeitMs);
  const tag = d.toISOString().slice(0, 10);
  return `${WOCHENTAGE[d.getUTCDay()]}, ${tag.slice(8, 10)}.${tag.slice(5, 7)}., ${d.getUTCHours()} Uhr`;
}

/* Sucht die Stunde, die der Regel am nächsten kommt.
   Rückgabe (oder null, wenn es gar keine prüfbare Stunde gibt):
     { wann, fehlend:[ {art, ist, grenze, richtung} | {art:"windrichtung", ist, sektoren} ] }
     { wann, dauer, gebraucht }   – alles passt, aber nicht lang genug am Stück */
export function findeKnapp(regel, vorhersage, jetztLokalMs, nurDatum = null) {
  const bausteine = Array.isArray(regel.bausteine) && regel.bausteine.length
    ? regel.bausteine : bausteineAusBedingungen(regel.bedingungen ?? {});
  if (!bausteine.length) return null;                 // Regel ohne Bedingungen
  const stunden = vorhersage.hourly;
  const fensterEndeMs = jetztLokalMs + (regel.zeitfensterStunden ?? 48) * STUNDE_MS;
  const vonUhr = regel.nurVonUhr ?? 0;
  const bisUhr = regel.nurBisUhr ?? 24;
  const mindest = regel.mindestdauerStunden ?? 2;

  let beste = null;                 // knappester Fehlschlag
  let laufJetzt = 0, laengsterLauf = 0, ersteGutStunde = null;
  let letzteZeitMs = null;

  for (let i = 0; i < stunden.time.length; i++) {
    const zeitMs = Date.parse(stunden.time[i] + ":00Z");
    if (zeitMs < jetztLokalMs || zeitMs > fensterEndeMs) continue;
    if (nurDatum && stunden.time[i].slice(0, 10) !== nurDatum) continue;   // nur dieser eine Tag
    const uhr = new Date(zeitMs).getUTCHours();
    if (!(vonUhr <= uhr && uhr < bisUhr)) continue;
    const werte = werteDerStunde(stunden, i);
    if (!werte) continue;

    const fehlend = [];
    let punkte = 0;
    for (const baustein of bausteine) {
      const a = bausteinAbstand(baustein, werte);
      if (a.passt) continue;
      if (a.grund) fehlend.push(a.grund);
      punkte += 1 + relativerAbstand(a.grund && a.grund.art, a.abstand);
    }

    if (!fehlend.length) {
      // Diese Stunde passt – nur die Dauer könnte noch scheitern.
      laufJetzt = (letzteZeitMs !== null && zeitMs - letzteZeitMs === STUNDE_MS) ? laufJetzt + 1 : 1;
      if (laufJetzt > laengsterLauf) { laengsterLauf = laufJetzt; }
      if (ersteGutStunde === null) ersteGutStunde = zeitMs;
    } else {
      laufJetzt = 0;
      if (!beste || punkte < beste.punkte) beste = { zeitMs, punkte, fehlend };
    }
    letzteZeitMs = zeitMs;
  }

  // Gibt es einen ausreichend langen Block, trifft die Regel zu – dann ist
  // hier nichts zu erklären.
  if (laengsterLauf >= mindest) return null;
  if (laengsterLauf > 0) {
    return { wann: zeitpunktText(ersteGutStunde), uhr: new Date(ersteGutStunde).getUTCHours(),
             dauer: laengsterLauf, gebraucht: mindest };
  }
  if (!beste) return null;
  return { wann: zeitpunktText(beste.zeitMs), uhr: new Date(beste.zeitMs).getUTCHours(), fehlend: beste.fehlend };
}

/* Überblick Tag für Tag: an Treffer-Tagen der Treffer, an allen anderen Tagen
   im Vorschau-Fenster, woran es dort am wenigsten gefehlt hat. So sieht man
   z. B. für den Pizzaabend, welche Tage gehen – auch wenn nicht jeder Tag passt.
   Rückgabe (chronologisch):
     [ { datum, treffer:"…", von, bis, temp } | { datum, knapp:{…} } ] */
export function tagesStand(regel, vorhersage, jetztLokalMs, trefferListe) {
  const trefferNachTag = {};
  for (const t of trefferListe) trefferNachTag[t.datum] = t;
  const fensterEndeMs = jetztLokalMs + (regel.zeitfensterStunden ?? 48) * STUNDE_MS;
  const tage = [];
  for (const zeit of vorhersage.hourly.time) {
    const zeitMs = Date.parse(zeit + ":00Z");
    if (zeitMs < jetztLokalMs || zeitMs > fensterEndeMs) continue;
    const datum = zeit.slice(0, 10);
    if (!tage.includes(datum)) tage.push(datum);
  }
  for (const datum of Object.keys(trefferNachTag)) if (!tage.includes(datum)) tage.push(datum);
  tage.sort();
  const stand = [];
  for (const datum of tage) {
    const t = trefferNachTag[datum];
    if (t) { stand.push({ datum, treffer: t.text, von: t.von, bis: t.bis, temp: t.temp }); continue; }
    const knapp = findeKnapp(regel, vorhersage, jetztLokalMs, datum);
    if (knapp) stand.push({ datum, knapp });   // ohne prüfbare Stunde (z. B. heute schon vorbei): weglassen
  }
  return stand;
}

/* Sucht pro Tag den ersten ausreichend langen Zeitblock, der zur Regel passt.
   Rückgabe: { "JJJJ-MM-TT": [ { zeitMs, werte:[temp,wind,regen,wolken,feuchte,windDir,uv] } ] } */
export function findeTreffer(regel, vorhersage, jetztLokalMs) {
  const stunden = vorhersage.hourly;
  const fensterEndeMs = jetztLokalMs + (regel.zeitfensterStunden ?? 48) * STUNDE_MS;
  const vonUhr = regel.nurVonUhr ?? 0;
  const bisUhr = regel.nurBisUhr ?? 24;
  const mindest = regel.mindestdauerStunden ?? 2;
  const bedingungen = regel.bedingungen ?? {};

  const passende = [];
  for (let i = 0; i < stunden.time.length; i++) {
    const zeitMs = Date.parse(stunden.time[i] + ":00Z");
    if (zeitMs < jetztLokalMs || zeitMs > fensterEndeMs) continue;
    const uhr = new Date(zeitMs).getUTCHours();
    if (!(vonUhr <= uhr && uhr < bisUhr)) continue;
    // 5-Werte-Kern (wie waechter.py): fehlt einer davon -> Stunde überspringen
    const kern = [stunden.temperature_2m[i], stunden.wind_speed_10m[i],
                  stunden.precipitation[i], stunden.cloud_cover[i], stunden.relative_humidity_2m[i]];
    if (kern.some((w) => w === null || w === undefined)) continue;
    const windDir = stunden.wind_direction_10m ? stunden.wind_direction_10m[i] : undefined;
    const uv = stunden.uv_index ? stunden.uv_index[i] : undefined;
    const boe = stunden.wind_gusts_10m ? stunden.wind_gusts_10m[i] : undefined;
    // Neue Bausteinform, sonst unverändert die bewährte Bedingungsprüfung
    const passt = Array.isArray(regel.bausteine) && regel.bausteine.length
      ? bausteinePassen(regel.bausteine, { temp: kern[0], wind: kern[1], regen: kern[2],
          wolken: kern[3], feuchte: kern[4], windDir, uv, boe })
      : stundePasst(bedingungen, ...kern, windDir, uv, boe);
    if (passt) {
      passende.push({ zeitMs, werte: [...kern, windDir, uv, boe] });
    }
  }

  const treffer = {};
  let block = [];
  const tagVon = (eintrag) => new Date(eintrag.zeitMs).toISOString().slice(0, 10);
  const blockAbschliessen = (fertig) => {
    if (fertig.length < mindest) return;
    // Ein Block kann über Mitternacht weiterlaufen (z. B. „ganzer Tag“ bei
    // tagelang ruhigem Wetter). Dann zählt er für jeden Tag, an dem er dort
    // selbst lang genug ist – sonst gäbe es nur am ersten Tag einen Treffer.
    const stuecke = [];
    for (const eintrag of fertig) {
      const letztes = stuecke[stuecke.length - 1];
      if (letztes && tagVon(letztes[0]) === tagVon(eintrag)) letztes.push(eintrag); else stuecke.push([eintrag]);
    }
    stuecke.forEach((stueck, k) => {
      const datum = tagVon(stueck[0]);
      if (datum in treffer) return;                               // nur der erste Block pro Tag
      if (k === 0) treffer[datum] = stueck.length >= mindest ? stueck : fertig.slice(); // wie bisher
      else if (stueck.length >= mindest) treffer[datum] = stueck;
    });
  };
  for (const eintrag of passende) {
    if (block.length && (eintrag.zeitMs - block[block.length - 1].zeitMs !== STUNDE_MS)) {
      blockAbschliessen(block); block = [];
    }
    block.push(eintrag);
  }
  blockAbschliessen(block);
  return treffer;
}

/* Holt die stündliche Vorhersage – gleiche Parameter wie waechter.py, plus
   Windrichtung und UV-Index; Zeitraum bis 7 Tage. Koordinaten immer grob. */
export async function holeVorhersage(lat, lon, tage = 7, fetchFn = fetch) {
  const parameter = new URLSearchParams({
    latitude: String(rundeKoordinate(lat)),
    longitude: String(rundeKoordinate(lon)),
    hourly: "temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,"
          + "cloud_cover,relative_humidity_2m,uv_index,weather_code",
    daily: "sunrise,sunset",
    forecast_days: String(tage),
    timezone: "auto",
  });
  const antwort = await fetchFn("https://api.open-meteo.com/v1/forecast?" + parameter);
  if (!antwort.ok) throw new Error("Open-Meteo antwortete mit Status " + antwort.status);
  return antwort.json();
}

/* Baut aus einem Treffer-Block den Push-/Anzeige-Text – bewusst OHNE Ortsangabe. */
/* Kurzform eines Treffer-Blocks für die Tagesübersicht: { von, bis, temp } */
export function blockKurz(block) {
  return { von: new Date(block[0].zeitMs).getUTCHours(),
           bis: new Date(block[block.length - 1].zeitMs).getUTCHours() + 1,
           temp: Math.round(block.reduce((s, b) => s + b.werte[0], 0) / block.length) };
}

export function blockZuText(datumIso, block) {
  const von = new Date(block[0].zeitMs).getUTCHours();
  const bis = new Date(block[block.length - 1].zeitMs).getUTCHours() + 1;
  const temps = block.map((b) => b.werte[0]);
  const winde = block.map((b) => b.werte[1]);
  const d = new Date(datumIso + "T00:00:00Z");
  return `${WOCHENTAGE[d.getUTCDay()]}, ${datumIso.slice(8, 10)}.${datumIso.slice(5, 7)}.: `
       + `von ${von} bis ${bis} Uhr passt alles – `
       + `ca. ${Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)} °C, `
       + `Wind bis ${Math.round(Math.max(...winde))} km/h.`;
}

/* Repräsentative Windrichtung (Kreis-Mittel) über eine Stunden-Auswahl. */
function mittlereWindrichtung(werte) {
  let sx = 0, sy = 0, n = 0;
  for (const grad of werte) {
    if (grad === null || grad === undefined) continue;
    sx += Math.sin(grad * Math.PI / 180); sy += Math.cos(grad * Math.PI / 180); n++;
  }
  if (!n) return null;
  let grad = Math.atan2(sx, sy) * 180 / Math.PI;
  if (grad < 0) grad += 360;
  return windSektor(grad);
}

/* Fasst die Vorhersage zu Tageswerten fürs Dashboard zusammen. */
export function tagesZusammenfassung(vorhersage) {
  const stunden = vorhersage.hourly;
  const tage = {};
  for (let i = 0; i < stunden.time.length; i++) {
    (tage[stunden.time[i].slice(0, 10)] ??= []).push(i);
  }
  const liste = [];
  for (const tag of Object.keys(tage).sort()) {
    const idx = tage[tag];
    const nimm = (feld) => (stunden[feld] ? idx.map((i) => stunden[feld][i]).filter((w) => w !== null && w !== undefined) : []);
    const temps = nimm("temperature_2m");
    if (!temps.length) continue;
    const winde = nimm("wind_speed_10m");
    const boen = nimm("wind_gusts_10m");
    const regen = nimm("precipitation");
    const wolken = nimm("cloud_cover");
    const uv = nimm("uv_index");
    liste.push({
      datum: tag,
      wochentag: WOCHENTAGE[new Date(tag + "T00:00:00Z").getUTCDay()],
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      windMax: Math.round(Math.max(...winde)),
      boeMax: boen.length ? Math.round(Math.max(...boen)) : null,
      windRichtung: mittlereWindrichtung(idx.map((i) => stunden.wind_direction_10m && stunden.wind_direction_10m[i])),
      regenSumme: Math.round(regen.reduce((a, b) => a + b, 0) * 10) / 10,
      wolkenMittel: Math.round(wolken.reduce((a, b) => a + b, 0) / wolken.length),
      uvMax: uv.length ? Math.round(Math.max(...uv) * 10) / 10 : null,
    });
  }
  return liste;
}

/* Prüft und begrenzt vom Nutzer eingereichte Regeln (Missbrauchs-Schutz). */
/* Orte je Regel: Jede Regel darf einen eigenen (gerundeten) Ort haben, sonst
   gilt der Standard-Ort. Höchstens MAX_ORTE verschiedene Orte je Gerät, damit
   das Gratis-Kontingent der Wetterabfragen reicht. */
export const MAX_ORTE = 5;
export function ortVonRegel(regel, standardLat, standardLon) {
  return regel.lat != null && regel.lon != null
    ? { lat: regel.lat, lon: regel.lon } : { lat: standardLat, lon: standardLon };
}
export function ortsSchluessel(ort) { return ort.lat + "," + ort.lon; }
/* Alle verschiedenen Orte (Schlüssel -> {lat, lon}); der Standard-Ort zuerst. */
export function orteDerRegeln(regeln, standardLat, standardLon) {
  const orte = new Map([[ortsSchluessel({ lat: standardLat, lon: standardLon }), { lat: standardLat, lon: standardLon }]]);
  for (const r of regeln) { const o = ortVonRegel(r, standardLat, standardLon); orte.set(ortsSchluessel(o), o); }
  return orte;
}

export function normalisiereRegeln(regeln) {
  if (!Array.isArray(regeln)) throw new Error("Regeln fehlen.");
  if (regeln.length > 15) throw new Error("Höchstens 15 Regeln erlaubt.");
  const zahl = (w, min, max, standard) => {
    const z = Number(w);
    if (!Number.isFinite(z)) return standard;
    return Math.max(min, Math.min(max, z));
  };
  const ERLAUBTE = { tempMin: [-60, 60], tempMax: [-60, 60], windMin: [0, 300], windMax: [0, 300],
                     boeMin: [0, 300], boeMax: [0, 300],
                     regenMax: [0, 100], bewoelkungMin: [0, 100], bewoelkungMax: [0, 100],
                     feuchteMax: [0, 100], uvMin: [0, 15], uvMax: [0, 15] };
  return regeln.map((r) => {
    const name = String(r?.name ?? "Regel").slice(0, 40).replace(/[\n\r\t|]/g, " ").trim() || "Regel";
    const emoji = String(r?.emoji ?? "🔔").slice(0, 8);
    const bedingungen = {};
    for (const [schluessel, [min, max]] of Object.entries(ERLAUBTE)) {
      const wert = r?.bedingungen?.[schluessel];
      if (wert !== undefined && wert !== null && Number.isFinite(Number(wert))) {
        bedingungen[schluessel] = zahl(wert, min, max, undefined);
      }
    }
    const richtungen = r?.bedingungen?.windRichtungen;
    if (Array.isArray(richtungen)) {
      const gefiltert = [...new Set(richtungen)].filter((s) => SEKTOR_NAMEN.includes(s));
      if (gefiltert.length && gefiltert.length < 8) bedingungen.windRichtungen = gefiltert;
    }
    const geprueft = {
      name, emoji,
      aktiv: r?.aktiv !== false,
      haeufigkeit: r?.haeufigkeit === "stuendlich" ? "stuendlich" : "taeglich",
      zeitfensterStunden: Math.round(zahl(r?.zeitfensterStunden, 1, 168, 48)),
      nurVonUhr: Math.round(zahl(r?.nurVonUhr, 0, 23, 0)),
      nurBisUhr: Math.round(zahl(r?.nurBisUhr, 1, 24, 24)),
      mindestdauerStunden: Math.round(zahl(r?.mindestdauerStunden, 1, 24, 2)),
      bedingungen,
    };
    // Eigener Ort je Regel (optional). Immer gerundet (~11 km) – auch wenn das
    // Gerät einen genaueren Wert schicken sollte.
    const lat = rundeKoordinate(r?.lat), lon = rundeKoordinate(r?.lon);
    if (r?.lat != null && r?.lon != null && Number.isFinite(lat) && Number.isFinite(lon)
        && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      geprueft.lat = lat; geprueft.lon = lon;
    }
    const bausteine = normalisiereBausteine(r?.bausteine);
    if (bausteine) geprueft.bausteine = bausteine;
    else if (Array.isArray(r?.bausteine) && r.bausteine.length) {
      // Bausteine eingereicht, aber keiner davon brauchbar: Die Regel würde
      // sonst auf die (evtl. leeren) alten Bedingungen zurückfallen und jede
      // Stunde treffen. Lieber stillegen als den Nutzer zuspammen.
      geprueft.aktiv = false;
    }
    return geprueft;
  });
}
