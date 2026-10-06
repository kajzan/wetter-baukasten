/*
 * Nutzungsbedingungen (Deutsch maßgeblich, Englisch als Übersetzung).
 *
 * Name, Anschrift und E-Mail des Anbieters stehen NICHT im Code, sondern werden
 * als Cloudflare-Variablen eingetragen (ANBIETER_NAME, ANBIETER_ANSCHRIFT,
 * ANBIETER_EMAIL) und beim Ausliefern eingesetzt. Fehlen sie, steht dort ein
 * deutlicher Platzhalter.
 *
 * Bei jeder inhaltlichen Änderung BEDINGUNGEN_VERSION erhöhen – dann fragt die
 * App alle Nutzer einmal erneut nach ihrer Zustimmung.
 */

export const BEDINGUNGEN_VERSION = "2026-10-06";

function sicher(t) {
  return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Anbieterangaben aus den Cloudflare-Variablen (nur Text, wird maskiert). */
export function anbieterAus(env) {
  const wert = (k) => (typeof env?.[k] === "string" ? env[k].trim().slice(0, 300) : "");
  return { name: wert("ANBIETER_NAME"), anschrift: wert("ANBIETER_ANSCHRIFT"), email: wert("ANBIETER_EMAIL") };
}

function anbieterHtml(a, de) {
  if (!a.name || !a.anschrift || !a.email) {
    return '<p class="fehlt">' + (de
      ? "[Name, Anschrift und E-Mail-Adresse des Anbieters – werden vor der Veröffentlichung ergänzt.]"
      : "[Name, postal address and e-mail address of the provider – to be added before publication.]") + "</p>";
  }
  return "<p>" + sicher(a.name) + "<br>" + sicher(a.anschrift).replace(/\s*[,;|]\s*|\n/g, "<br>")
    + "<br>" + (de ? "E-Mail: " : "E-mail: ") + '<a href="mailto:' + sicher(a.email) + '">' + sicher(a.email) + "</a></p>";
}

/* ---------- Inhalte ---------- */
const DE = {
  lang: "de", titel: "Nutzungsbedingungen", stand: "Stand", fassung: "Fassung",
  zurueck: "Zur App", andere: { text: "English", href: "/terms" },
  hinweis: "",
  abschnitte: [
    ["Anbieter und Geltungsbereich", (a) => [
      "Diese Bedingungen gelten für die Nutzung der Web-App „Wetter-Wächter“ (im Folgenden „App“) und des zugehörigen Benachrichtigungsdienstes. Anbieter ist:",
      anbieterHtml(a, true),
      "Mit dem Tippen auf „Los geht’s“ beziehungsweise „Zustimmen“ erklärst du dich mit diesen Bedingungen einverstanden; damit kommt ein Nutzungsvertrag zustande.",
    ]],
    ["Was die App leistet", () => [
      "Die App prüft Wettervorhersagen für von dir gewählte Orte anhand von Regeln, die du selbst festlegst („Wünsche“), zeigt die Ergebnisse an und kann dich per Push-Nachricht benachrichtigen, wenn eine Regel zutrifft.",
      "Die Vorhersagen stammen von externen Wetterdiensten. Vorhersagen sind naturgemäß unsicher; wir übernehmen keine Gewähr dafür, dass das vorhergesagte Wetter eintritt, dass eine Regel zum richtigen Zeitpunkt erkannt wird oder dass eine Benachrichtigung rechtzeitig oder überhaupt ankommt.",
      "Die Zustellung von Push-Nachrichten hängt außerdem von deinem Gerät, deinem Browser beziehungsweise Betriebssystem und dem Push-Dienst des jeweiligen Herstellers ab.",
    ]],
    ["Kein Warndienst", () => [
      "Die App ist <b>kein amtlicher Warndienst</b>. Auch die Vorlage „Sturm-Warnung“ ersetzt keine amtlichen Unwetterwarnungen. Maßgeblich sind die Warnungen des Deutschen Wetterdienstes (zum Beispiel in der App „WarnWetter“) beziehungsweise der in deinem Land zuständigen Stellen.",
      "Verlass dich bei Entscheidungen, die Sicherheit, Gesundheit oder erhebliche Sachwerte betreffen, nicht allein auf die App.",
    ]],
    ["Verfügbarkeit und Änderungen am Dienst", () => [
      "Wir bemühen uns um einen störungsfreien Betrieb, schulden aber keine ununterbrochene Verfügbarkeit. Wartungen, Störungen bei uns oder bei Drittanbietern (Hosting, Wetterdaten, Push-Dienste) können zu Ausfällen führen.",
      "Wir dürfen die App weiterentwickeln und Funktionen ändern, soweit dies für dich zumutbar ist und der Kern der Leistung – das Prüfen von Wetter-Wünschen – erhalten bleibt.",
    ]],
    ["Deine Pflichten", () => [
      "Du nutzt die App nur für eigene, private Zwecke und in einer Weise, die den Dienst nicht beeinträchtigt. Insbesondere ist es nicht erlaubt, die Schnittstellen der App automatisiert abzufragen, den Dienst zu überlasten, Schutzmechanismen zu umgehen oder die App für rechtswidrige Zwecke zu verwenden.",
      "Verstößt du erheblich gegen diese Pflichten, dürfen wir dein Gerät vom Benachrichtigungsdienst abmelden.",
    ]],
    ["Preise", () => [
      "Die Nutzung ist derzeit kostenlos.",
      "Sollte die App künftig gegen Entgelt angeboten werden, informieren wir dich vorher in der App; kostenpflichtige Leistungen entstehen nur, wenn du sie ausdrücklich bestellst. Bei Kauf über einen App-Store (zum Beispiel den Apple App Store) gelten für Bestellung, Bezahlung und Erstattung zusätzlich die Bedingungen des jeweiligen Store-Betreibers.",
    ]],
    ["Daten und Datenschutz (Kurzfassung)", () => [
      "Ein Konto ist nicht nötig. Deine Orte und Wünsche werden auf deinem Gerät gespeichert; der genaue Punkt eines Ortes verlässt dein Gerät nicht.",
      "Für Vorschau und Benachrichtigungen erhält unser Dienst die Wünsche zusammen mit einem auf etwa 11 km gerundeten Ort; mit dem gerundeten Ort werden die Wetterdaten abgerufen. Wenn du Benachrichtigungen einschaltest, speichern wir zusätzlich die vom Push-Dienst deines Geräts vergebene Empfangsadresse. Benachrichtigungen nennen nie einen Ort.",
      "Mit „Alles löschen“ in den Einstellungen entfernst du alle Daten auf deinem Gerät und meldest dein Gerät bei unserem Dienst ab; die dort gespeicherten Angaben werden dabei gelöscht. Technische Vermerke, ob eine Nachricht bereits verschickt wurde, verfallen spätestens nach drei Tagen.",
      "Die App wird bei Cloudflare betrieben; dabei werden technisch notwendige Verbindungsdaten wie die IP-Adresse verarbeitet.",
      "Beim Anzeigen der Karte lädt dein Gerät Kartenbilder von OpenStreetMap; beim Suchen eines Ortes wird der Suchbegriff an die Ortssuche von Open-Meteo übermittelt.",
    ]],
    ["Haftung", () => [
      "(1) Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei der Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz sowie im Umfang einer von uns übernommenen Garantie.",
      "(2) Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht ist unsere Haftung auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt. Wesentliche Vertragspflichten sind Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung du regelmäßig vertrauen darfst.",
      "(3) Im Übrigen ist unsere Haftung für leichte Fahrlässigkeit ausgeschlossen. Diese Regeln gelten auch zugunsten unserer Erfüllungsgehilfen.",
    ]],
    ["Rechte an der App und Quellen", () => [
      "Die App ist urheberrechtlich geschützt. Du erhältst das einfache, nicht übertragbare Recht, sie für die Dauer dieses Vertrags für private Zwecke zu nutzen.",
      "Wetterdaten: Open-Meteo.com (Lizenz CC BY 4.0). Ortssuche: Open-Meteo Geocoding auf Basis von GeoNames (CC BY 4.0). Karten: © OpenStreetMap-Mitwirkende (Daten unter ODbL), Darstellung mit Leaflet.",
    ]],
    ["Änderungen dieser Bedingungen", () => [
      "Wir können diese Bedingungen ändern, wenn es dafür einen sachlichen Grund gibt, etwa geänderte Gesetze, neue Funktionen oder geänderte Bedingungen unserer Dienstleister. Über Änderungen informieren wir dich in der App. Geänderte Bedingungen gelten erst, nachdem du ihnen zugestimmt hast; stimmst du nicht zu, kannst du die Nutzung jederzeit beenden.",
    ]],
    ["Laufzeit und Beendigung", () => [
      "Du kannst die Nutzung jederzeit ohne Frist beenden, indem du in den Einstellungen „Alles löschen“ wählst oder die App nicht mehr verwendest.",
      "Wir können den Dienst mit einer Frist von vier Wochen einstellen; wir kündigen dies in der App an. Das Recht zur Kündigung aus wichtigem Grund bleibt unberührt.",
    ]],
    ["Schlussbestimmungen", () => [
      "Es gilt das Recht der Bundesrepublik Deutschland. Bist du Verbraucher, gilt diese Rechtswahl nur, soweit dir dadurch nicht der Schutz zwingender Vorschriften des Staates entzogen wird, in dem du deinen gewöhnlichen Aufenthalt hast.",
      "Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
      "Sollte eine Bestimmung dieser Bedingungen unwirksam sein, bleiben die übrigen Bestimmungen wirksam.",
    ]],
  ],
};

const EN = {
  lang: "en", titel: "Terms of Use", stand: "Last updated", fassung: "Version",
  zurueck: "Back to the app", andere: { text: "Deutsch", href: "/nutzungsbedingungen" },
  hinweis: "This English version is a convenience translation. In case of any discrepancy, the German version prevails.",
  abschnitte: [
    ["Provider and scope", (a) => [
      "These terms apply to the use of the web app “Wetter-Wächter” (the “App”) and its notification service. The provider is:",
      anbieterHtml(a, false),
      "By tapping “Los geht’s” (Let’s go) or “Zustimmen” (Agree) you accept these terms, and a contract for the use of the App is concluded.",
    ]],
    ["What the App does", () => [
      "The App checks weather forecasts for places you choose against rules you define yourself (“wishes”), displays the results and can notify you by push message when a rule is met.",
      "Forecasts are provided by external weather services. Forecasts are inherently uncertain; we do not guarantee that the forecast weather will occur, that a rule will be detected at the right time, or that a notification will arrive in time or at all.",
      "Delivery of push messages also depends on your device, your browser or operating system and the push service of the respective manufacturer.",
    ]],
    ["Not a warning service", () => [
      "The App is <b>not an official warning service</b>. The “Sturm-Warnung” (storm warning) template does not replace official severe-weather warnings. The warnings of the German Weather Service (Deutscher Wetterdienst, e.g. in the “WarnWetter” app) or of the authorities responsible in your country are authoritative.",
      "Do not rely on the App alone for decisions affecting safety, health or significant property.",
    ]],
    ["Availability and changes to the service", () => [
      "We strive for uninterrupted operation but do not owe continuous availability. Maintenance and disruptions on our side or at third parties (hosting, weather data, push services) may cause outages.",
      "We may develop the App further and change features, provided this is reasonable for you and the core service – checking weather wishes – is preserved.",
    ]],
    ["Your obligations", () => [
      "You use the App only for your own private purposes and in a way that does not impair the service. In particular, you must not query the App’s interfaces automatically, overload the service, circumvent protective measures or use the App for unlawful purposes.",
      "If you materially breach these obligations, we may unsubscribe your device from the notification service.",
    ]],
    ["Prices", () => [
      "Use of the App is currently free of charge.",
      "Should the App be offered for a fee in the future, we will inform you in advance in the App; paid services only arise if you expressly order them. For purchases via an app store (e.g. the Apple App Store), the terms of the respective store operator additionally apply to ordering, payment and refunds.",
    ]],
    ["Data and privacy (summary)", () => [
      "No account is required. Your places and wishes are stored on your device; the exact point of a place never leaves your device.",
      "For previews and notifications, our service receives your wishes together with a location rounded to about 11 km; weather data is retrieved using this rounded location. If you turn on notifications, we additionally store the delivery address issued by your device’s push service. Notifications never mention a location.",
      "“Alles löschen” (Delete everything) in the settings removes all data on your device and unsubscribes your device from our service; the data stored there is deleted. Technical records of whether a message has already been sent expire after three days at the latest.",
      "The App is operated on Cloudflare; technically necessary connection data such as the IP address is processed in the process.",
      "When the map is shown, your device loads map images from OpenStreetMap; when you search for a place, the search term is sent to the Open-Meteo place search.",
    ]],
    ["Liability", () => [
      "(1) We are liable without limitation for intent and gross negligence, for injury to life, body or health, under the German Product Liability Act and to the extent of any guarantee we have given.",
      "(2) In the event of a slightly negligent breach of an essential contractual obligation, our liability is limited to the typical damage foreseeable at the time the contract was concluded. Essential contractual obligations are those whose fulfilment makes the proper performance of the contract possible in the first place and on whose observance you may regularly rely.",
      "(3) Otherwise, our liability for slight negligence is excluded. These rules also apply in favour of our vicarious agents.",
    ]],
    ["Rights to the App and sources", () => [
      "The App is protected by copyright. You receive a simple, non-transferable right to use it for private purposes for the duration of this contract.",
      "Weather data: Open-Meteo.com (licence CC BY 4.0). Place search: Open-Meteo Geocoding based on GeoNames (CC BY 4.0). Maps: © OpenStreetMap contributors (data under ODbL), rendered with Leaflet.",
    ]],
    ["Changes to these terms", () => [
      "We may change these terms if there is an objective reason, such as changes in law, new features or changed terms of our service providers. We will inform you of changes in the App. Changed terms only apply once you have agreed to them; if you do not agree, you may stop using the App at any time.",
    ]],
    ["Term and termination", () => [
      "You may stop using the App at any time without notice by choosing “Alles löschen” (Delete everything) in the settings or by no longer using the App.",
      "We may discontinue the service with four weeks’ notice, which we will announce in the App. The right to terminate for good cause remains unaffected.",
    ]],
    ["Final provisions", () => [
      "The law of the Federal Republic of Germany applies. If you are a consumer, this choice of law applies only insofar as it does not deprive you of the protection of mandatory provisions of the country in which you have your habitual residence.",
      "We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.",
      "Should any provision of these terms be invalid, the remaining provisions remain valid.",
    ]],
  ],
};

function datumText(version, de) {
  const [j, m, t] = version.split("-");
  if (de) return t + "." + m + "." + j;
  const MONATE = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return Number(t) + " " + MONATE[Number(m) - 1] + " " + j;
}

export function bedingungenSeite(sprache, anbieter) {
  const t = sprache === "en" ? EN : DE, de = t === DE;
  const abschnitte = t.abschnitte.map(([titel, inhalt], i) => {
    const absaetze = inhalt(anbieter).map((p) => (p.startsWith("<p") ? p : "<p>" + p + "</p>")).join("");
    return '<section id="s' + (i + 1) + '"><h2><span class="nr">§ ' + (i + 1) + "</span>" + titel + "</h2>" + absaetze + "</section>";
  }).join("");
  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<link rel="icon" href="/icon.svg">
<title>${t.titel} · Wetter-Wächter</title>
<style>
  :root, :root[data-theme="light"] { --hg:#f3f6f9; --blatt:#ffffff; --text:#13263b; --text2:#5a6f86; --linie:#dde5ee; --akzent:#1d6fd1; color-scheme:light dark; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --hg:#0f1722; --blatt:#16202c; --text:#e6edf4; --text2:#9aabbd; --linie:#283647; --akzent:#6aa6f7; } }
  :root[data-theme="dark"] { --hg:#0f1722; --blatt:#16202c; --text:#e6edf4; --text2:#9aabbd; --linie:#283647; --akzent:#6aa6f7; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--hg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,"Segoe UI",Roboto,sans-serif;
    line-height:1.6; -webkit-text-size-adjust:100%; }
  .leiste { position:sticky; top:0; z-index:2; background:color-mix(in srgb, var(--hg) 88%, transparent);
    -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border-bottom:1px solid var(--linie); }
  .leiste-innen { max-width:720px; margin:0 auto; padding:calc(env(safe-area-inset-top) + 10px) 16px 10px; display:flex; gap:12px; align-items:center; }
  .leiste a { color:var(--akzent); text-decoration:none; font-weight:600; font-size:.95rem; padding:6px 0; }
  .leiste .sprache { margin-left:auto; border:1px solid var(--linie); border-radius:999px; padding:5px 12px; }
  main { max-width:720px; margin:0 auto; padding:24px 16px calc(48px + env(safe-area-inset-bottom)); }
  .blatt { background:var(--blatt); border:1px solid var(--linie); border-radius:20px; padding:28px clamp(18px, 5vw, 40px); }
  h1 { font-size:clamp(1.6rem, 5vw, 2.1rem); letter-spacing:-.02em; line-height:1.15; margin:0 0 6px; text-wrap:balance; }
  .meta { color:var(--text2); font-size:.88rem; margin:0 0 6px; font-variant-numeric:tabular-nums; }
  .hinweis { color:var(--text2); font-size:.88rem; font-style:italic; margin:8px 0 0; }
  nav.inhalt { margin:22px 0 4px; padding:14px 16px; border-radius:14px; background:var(--hg); font-size:.92rem; }
  nav.inhalt ol { margin:0; padding-left:1.4em; columns:2 15em; column-gap:24px; }
  nav.inhalt a { color:var(--text); text-decoration:none; }
  nav.inhalt a:hover, nav.inhalt a:focus-visible { color:var(--akzent); text-decoration:underline; }
  section { border-top:1px solid var(--linie); padding-top:18px; margin-top:22px; scroll-margin-top:72px; }
  h2 { font-size:1.08rem; margin:0 0 8px; letter-spacing:-.01em; display:flex; gap:10px; align-items:baseline; text-wrap:balance; }
  h2 .nr { color:var(--akzent); font-variant-numeric:tabular-nums; flex-shrink:0; }
  p { margin:0 0 10px; max-width:68ch; }
  p.fehlt { color:#b45309; background:color-mix(in srgb, #f59e0b 14%, transparent); border-radius:10px; padding:10px 12px; font-style:italic; }
  a { color:var(--akzent); }
  a:focus-visible { outline:2px solid var(--akzent); outline-offset:2px; border-radius:4px; }
</style>
</head>
<body>
<div class="leiste"><div class="leiste-innen">
  <a href="/">‹ ${t.zurueck}</a>
  <a class="sprache" href="${t.andere.href}" hreflang="${de ? "en" : "de"}" lang="${de ? "en" : "de"}">${t.andere.text}</a>
</div></div>
<main><article class="blatt">
  <h1>${t.titel}</h1>
  <p class="meta">Wetter-Wächter · ${t.stand}: ${datumText(BEDINGUNGEN_VERSION, de)} · ${t.fassung} ${BEDINGUNGEN_VERSION}</p>
  ${t.hinweis ? '<p class="hinweis">' + t.hinweis + "</p>" : ""}
  <nav class="inhalt" aria-label="${de ? "Inhalt" : "Contents"}"><ol>${t.abschnitte.map(([titel], i) => '<li><a href="#s' + (i + 1) + '">' + titel + "</a></li>").join("")}</ol></nav>
  ${abschnitte}
</article></main>
</body>
</html>`;
}
