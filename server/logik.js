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
export function stundePasst(bedingungen, temp, wind, regen, wolken, feuchte, windDir, uv) {
  const mindestens = (k, w) => { const g = bedingungen[k]; return g === undefined || g === null || w >= g; };
  const hoechstens = (k, w) => { const g = bedingungen[k]; return g === undefined || g === null || w <= g; };

  const kern = mindestens("tempMin", temp) && hoechstens("tempMax", temp)
    && hoechstens("windMax", wind) && mindestens("windMin", wind)
    && hoechstens("regenMax", regen)
    && mindestens("bewoelkungMin", wolken) && hoechstens("bewoelkungMax", wolken)
    && hoechstens("feuchteMax", feuchte)
    && mindestens("uvMin", uv) && hoechstens("uvMax", uv);
  if (!kern) return false;

  const richtungen = bedingungen.windRichtungen;
  if (Array.isArray(richtungen) && richtungen.length) {
    if (windDir === undefined || windDir === null) return false; // nicht prüfbar -> kein Treffer
    if (!richtungen.includes(windSektor(windDir))) return false;
  }
  return true;
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
    if (stundePasst(bedingungen, ...kern, windDir, uv)) {
      passende.push({ zeitMs, werte: [...kern, windDir, uv] });
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
    hourly: "temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,"
          + "cloud_cover,relative_humidity_2m,uv_index,weather_code",
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
    const regen = nimm("precipitation");
    const wolken = nimm("cloud_cover");
    const uv = nimm("uv_index");
    liste.push({
      datum: tag,
      wochentag: WOCHENTAGE[new Date(tag + "T00:00:00Z").getUTCDay()],
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      windMax: Math.round(Math.max(...winde)),
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
    return {
      name, emoji,
      aktiv: r?.aktiv !== false,
      zeitfensterStunden: Math.round(zahl(r?.zeitfensterStunden, 1, 168, 48)),
      nurVonUhr: Math.round(zahl(r?.nurVonUhr, 0, 23, 0)),
      nurBisUhr: Math.round(zahl(r?.nurBisUhr, 1, 24, 24)),
      mindestdauerStunden: Math.round(zahl(r?.mindestdauerStunden, 1, 24, 2)),
      bedingungen,
    };
  });
}
