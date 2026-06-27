/** SHA-256 hex con WebCrypto. Suficiente para PIN local (no salt — riesgo aceptable mientras vivimos en localStorage). */
export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
