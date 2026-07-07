/*
 * Web-Push (Browser-Push) für Cloudflare Workers – ohne externe Bibliothek.
 * =========================================================================
 * Umsetzt die Standards, die Chrome/Firefox/Safari zum Empfang verlangen:
 *   - RFC 8291 (Message Encryption for Web Push)
 *   - RFC 8188 (aes128gcm Content-Encoding)
 *   - RFC 8292 (VAPID: Signatur, mit der sich der Absender ausweist)
 *
 * Nutzt ausschließlich die Web-Crypto-API (globalThis.crypto.subtle), damit
 * derselbe Code in Cloudflare Workers UND in Node (für die Tests) läuft.
 * Gegen die etablierte Bibliothek "web-push" gegengetestet (siehe Tests).
 */

const enc = new TextEncoder();

const b64urlZuBytes = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(s.length + (4 - (s.length % 4)) % 4, "=")), (c) => c.charCodeAt(0));

const bytesZuB64url = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function verkette(...teile) {
  const gesamt = teile.reduce((n, t) => n + t.length, 0);
  const aus = new Uint8Array(gesamt);
  let pos = 0;
  for (const t of teile) { aus.set(t, pos); pos += t.length; }
  return aus;
}

/* HKDF (Extract + Expand in einem Schritt, wie Web-Crypto es liefert). */
async function hkdf(salt, ikm, info, laengeBytes) {
  const schluessel = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info }, schluessel, laengeBytes * 8);
  return new Uint8Array(bits);
}

/* Zerlegt einen rohen 65-Byte-P-256-Punkt (0x04||X||Y) in ein JWK. */
function rohPunktZuJwk(roh, d) {
  const x = bytesZuB64url(roh.slice(1, 33));
  const y = bytesZuB64url(roh.slice(33, 65));
  const jwk = { kty: "EC", crv: "P-256", x, y, ext: true };
  if (d) jwk.d = d;
  return jwk;
}

/*
 * Verschlüsselt den Text für einen Abonnenten (RFC 8291, Ausgabe: aes128gcm).
 * abo.p256dh = öffentl. Schlüssel des Browsers (base64url), abo.auth = Geheimnis (base64url).
 * "test" erlaubt es, Salz und Serverschlüssel fest vorzugeben (nur für Prüfungen).
 */
export async function verschluessele(text, p256dhB64, authB64, test = null) {
  const uaPublic = b64urlZuBytes(p256dhB64);
  const authGeheim = b64urlZuBytes(authB64);
  const klartext = enc.encode(text);

  // Flüchtiges Server-Schlüsselpaar (oder festes aus dem Test)
  let asPrivKey, asPublic;
  if (test) {
    asPublic = b64urlZuBytes(test.asPublic);
    asPrivKey = await crypto.subtle.importKey("jwk",
      rohPunktZuJwk(asPublic, test.asPrivateD), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  } else {
    const paar = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    asPrivKey = paar.privateKey;
    asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", paar.publicKey));
  }
  const salt = test ? b64urlZuBytes(test.salt) : crypto.getRandomValues(new Uint8Array(16));

  // 1) Gemeinsames ECDH-Geheimnis (Server-Privat × Browser-Öffentlich)
  const uaPubKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPubKey }, asPrivKey, 256));

  // 2) IKM = HKDF(auth, ecdh, "WebPush: info\0" || uaPublic || asPublic)
  const keyInfo = verkette(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authGeheim, ecdh, keyInfo, 32);

  // 3) CEK und NONCE aus dem Salz ableiten (RFC 8188)
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // 4) Datensatz = Klartext || 0x02 (Ende-Kennzeichen), dann AES-128-GCM
  const datensatz = verkette(klartext, new Uint8Array([2]));
  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const chiffre = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 }, cekKey, datensatz));

  // 5) Kopf (RFC 8188): salt(16) || rs(4) || idlen(1)=65 || asPublic(65)
  const rs = new Uint8Array([0, 0, 16, 0]); // Datensatzgröße 4096
  const kopf = verkette(salt, rs, new Uint8Array([asPublic.length]), asPublic);
  return verkette(kopf, chiffre);
}

/*
 * Entschlüsselt einen aes128gcm-Web-Push (nur für die Tests: prüft, dass wir
 * die Ausgabe der Referenzbibliothek lesen können und umgekehrt).
 * uaPrivateD = privater Schlüssel (JWK-d, base64url), uaPublicB64 = p256dh.
 */
export async function entschluessele(body, uaPublicB64, uaPrivateD, authB64) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const chiffre = body.slice(21 + idlen);
  const authGeheim = b64urlZuBytes(authB64);
  const uaPublic = b64urlZuBytes(uaPublicB64);

  const uaPrivKey = await crypto.subtle.importKey("jwk",
    rohPunktZuJwk(uaPublic, uaPrivateD), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const asPubKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asPubKey }, uaPrivKey, 256));

  const keyInfo = verkette(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authGeheim, ecdh, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["decrypt"]);
  const roh = new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 }, cekKey, chiffre));
  // Ende-Kennzeichen 0x02 (und evtl. Nullbytes) am Ende entfernen
  let ende = roh.length;
  while (ende > 0 && roh[ende - 1] === 0) ende--;
  if (ende > 0 && roh[ende - 1] === 2) ende--;
  return new TextDecoder().decode(roh.slice(0, ende));
}

/* Baut den VAPID-"Authorization"-Header (RFC 8292), mit dem sich der Dienst
   gegenüber Google/Apple/Mozilla ausweist. */
export async function vapidHeader(endpunkt, vapidPublicB64, vapidPrivateD, betreff, jetztSek = null) {
  const url = new URL(endpunkt);
  const aud = url.origin;
  const now = jetztSek ?? Math.floor(Date.now() / 1000);
  const exp = now + 12 * 60 * 60; // 12 Stunden gültig

  const kopf = bytesZuB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const inhalt = bytesZuB64url(enc.encode(JSON.stringify({ aud, exp, sub: betreff })));
  const signierBasis = enc.encode(kopf + "." + inhalt);

  const vapidPublic = b64urlZuBytes(vapidPublicB64);
  const privKey = await crypto.subtle.importKey("jwk",
    rohPunktZuJwk(vapidPublic, vapidPrivateD), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privKey, signierBasis);
  const jwt = kopf + "." + inhalt + "." + bytesZuB64url(sig);

  return "vapid t=" + jwt + ", k=" + vapidPublicB64;
}

/*
 * Sendet eine Web-Push-Nachricht an einen Abonnenten.
 * abo = { endpoint, keys: { p256dh, auth } } (so liefert es der Browser).
 * Rückgabe: die fetch-Antwort des Push-Dienstes.
 */
export async function sendeWebPush(abo, text, vapidPublicB64, vapidPrivateD, betreff) {
  const body = await verschluessele(text, abo.keys.p256dh, abo.keys.auth);
  const authorization = await vapidHeader(abo.endpoint, vapidPublicB64, vapidPrivateD, betreff);
  return fetch(abo.endpoint, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
    },
    body,
  });
}
