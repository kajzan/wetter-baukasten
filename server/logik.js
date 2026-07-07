/*
 * Regel-Logik des Wetter-Wächters (eine einzige Quelle der Wahrheit).
 * ===================================================================
 * 1:1-Übersetzung aus dem bewährten waechter.py (per Paritätstest bestätigt:
 * identische Treffer-Blöcke). Wird vom stündlichen Wächter-Lauf UND von der
 * Vorschau-API benutzt – Vorschau und Push können sich daher nie widersprechen.
 */

export const STUNDE_MS = 3600 * 1000;
export const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch",
                           "Donnerstag", "Freitag", "Samstag"];

/* Datenschutz-Sicherheitsnetz: Koordinaten immer grob runden (~11 km). */
export function rundeKoordinate(wert) {
  return Math.round(parseFloat(wert) * 10) / 10;
}

/* Entspricht stunde_passt() in waechter.py. */
export function stundePasst(bedingungen, temp, wind, regen, wolken, feuchte) {
  function mindestens(schluessel, wert) {
    const grenze = bedingungen[schluessel];
    return grenze === undefined || grenze === null || wert >= grenze;
  }
  function hoechstens(schluessel, wert) {
    const grenze = bedingungen[schluessel];
    return grenze === undefined || grenze === null || wert <= grenze;
  }
  return (mindestens("tempMin", temp) && hoechstens("tempMax", temp)
          && hoechstens("windMax", wind) && mindestens("windMin", wind)
          && hoechstens("regenMax", regen)
          && mindestens("bewoelkungMin", wolken)
          && hoechstens("bewoelkungMax", wolken)
          && hoechstens("feuchteMax", feuchte));
}

/* Entspricht finde_treffer() in waechter.py. Zeiten werden wie dort "naiv"
   behandelt: lokale Zeitstempel als UTC-Millisekunden geparst und mit
   jetztLokalMs (UTC-jetzt + Zeitzonen-Versatz) verglichen.
   Rückgabe: { "JJJJ-MM-TT": [ { zeitMs, werte:[temp,wind,regen,wolken,feuchte] } ] } */
export function findeTreffer(regel, vorhersage, jetztLokalMs) {
  const stunden = vorhersage.hourly;
  const fensterEndeMs = jetztLokalMs + (regel.zeitfensterStunden ?? 48) * STUNDE_MS;
  const vonUhr = regel.nurVonUhr ?? 0;
  const bisUhr = regel.nurBisUhr ?? 24;
  const mindest = regel.mindestdauerStunden ?? 2;
  const bedingungen = regel.bedingungen ?? {};

  // Schritt 1: alle passenden Einzelstunden sammeln
  const passende = [];
  for (let i = 0; i < stunden.time.length; i++) {
    const zeitMs = Date.parse(stunden.time[i] + ":00Z");
    if (zeitMs < jetztLokalMs || zeitMs > fensterEndeMs) continue;
    const uhr = new Date(zeitMs).getUTCHours();
    if (!(vonUhr <= uhr && uhr < bisUhr)) continue;
    const werte = [stunden.temperature_2m[i],
                   stunden.wind_speed_10m[i],
                   stunden.precipitation[i],
                   stunden.cloud_cover[i],
                   stunden.relative_humidity_2m[i]];
    if (werte.some((w) => w === null || w === undefined)) continue;
    if (stundePasst(bedingungen, ...werte)) passende.push({ zeitMs, werte });
  }

  // Schritt 2: aufeinanderfolgende Stunden zu Blöcken gruppieren
  const treffer = {};
  let block = [];
  function blockAbschliessen(fertig) {
    if (fertig.length >= mindest) {
      const datum = new Date(fertig[0].zeitMs).toISOString().slice(0, 10);
      if (!(datum in treffer)) treffer[datum] = fertig.slice(); // nur der erste Block pro Tag
    }
  }
  for (const eintrag of passende) {
    if (block.length && (eintrag.zeitMs - block[block.length - 1].zeitMs !== STUNDE_MS)) {
      blockAbschliessen(block);
      block = [];
    }
    block.push(eintrag);
  }
  blockAbschliessen(block);
  return treffer;
}

/* Holt die stündliche Vorhersage (4 Tage) – gleiche Parameter wie waechter.py,
   inklusive Sicherheitsnetz: Koordinaten immer grob runden. */
export async function holeVorhersage(lat, lon, fetchFn = fetch) {
  const parameter = new URLSearchParams({
    latitude: String(rundeKoordinate(lat)),
    longitude: String(rundeKoordinate(lon)),
    hourly: "temperature_2m,wind_speed_10m,precipitation,cloud_cover,relative_humidity_2m",
    forecast_days: "4",
    timezone: "auto",
  });
  const antwort = await fetchFn("https://api.open-meteo.com/v1/forecast?" + parameter);
  if (!antwort.ok) throw new Error("Open-Meteo antwortete mit Status " + antwort.status);
  return antwort.json();
}

/* Baut aus einem Treffer-Block den Push-/Anzeige-Text – bewusst OHNE Ortsangabe,
   im selben Wortlaut wie waechter.py. */
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
    const nimm = (feld) => idx.map((i) => stunden[feld][i]).filter((w) => w !== null && w !== undefined);
    const temps = nimm("temperature_2m");
    if (!temps.length) continue;
    const winde = nimm("wind_speed_10m");
    const regen = nimm("precipitation");
    const wolken = nimm("cloud_cover");
    liste.push({
      datum: tag,
      wochentag: WOCHENTAGE[new Date(tag + "T00:00:00Z").getUTCDay()],
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      windMax: Math.round(Math.max(...winde)),
      regenSumme: Math.round(regen.reduce((a, b) => a + b, 0) * 10) / 10,
      wolkenMittel: Math.round(wolken.reduce((a, b) => a + b, 0) / wolken.length),
    });
  }
  return liste;
}

/* Prüft und begrenzt vom Nutzer eingereichte Regeln (Missbrauchs-Schutz).
   Rückgabe: bereinigte Regel-Liste; wirft Error bei grob ungültiger Eingabe. */
export function normalisiereRegeln(regeln) {
  if (!Array.isArray(regeln)) throw new Error("Regeln fehlen.");
  if (regeln.length > 10) throw new Error("Höchstens 10 Regeln erlaubt.");
  const zahl = (w, min, max, standard) => {
    const z = Number(w);
    if (!Number.isFinite(z)) return standard;
    return Math.max(min, Math.min(max, z));
  };
  const ERLAUBTE = { tempMin: [-60, 60], tempMax: [-60, 60], windMin: [0, 300], windMax: [0, 300],
                     regenMax: [0, 100], bewoelkungMin: [0, 100], bewoelkungMax: [0, 100], feuchteMax: [0, 100] };
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
    return {
      name, emoji,
      aktiv: r?.aktiv !== false,
      zeitfensterStunden: Math.round(zahl(r?.zeitfensterStunden, 1, 96, 48)),
      nurVonUhr: Math.round(zahl(r?.nurVonUhr, 0, 23, 0)),
      nurBisUhr: Math.round(zahl(r?.nurBisUhr, 1, 24, 24)),
      mindestdauerStunden: Math.round(zahl(r?.mindestdauerStunden, 1, 24, 2)),
      bedingungen,
    };
  });
}
