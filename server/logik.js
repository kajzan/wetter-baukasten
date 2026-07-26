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
  const blockAbschliessen = (fertig) => {
    if (fertig.length >= mindest) {
      const datum = new Date(fertig[0].zeitMs).toISOString().slice(0, 10);
      if (!(datum in treffer)) treffer[datum] = fertig.slice(); // nur der erste Block pro Tag
    }
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
