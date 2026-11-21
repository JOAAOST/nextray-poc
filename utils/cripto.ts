/**
 * Criptografia de conhecimento zero (Zero-Knowledge) da NextRay.
 *
 * Roda NO NAVEGADOR (e no Node, para os testes). A senha mestra do psicólogo
 * nunca sai do dispositivo: o servidor só recebe o envelope cifrado.
 *
 * Algoritmos (Web Crypto API, nativa, sem dependências):
 *  - PBKDF2-SHA256 (600.000 iterações) deriva a chave a partir da senha mestra
 *  - AES-256-GCM cifra e autentica (detecta adulteração do texto cifrado)
 *  - sal (16 bytes) e IV (12 bytes) aleatórios a cada cifragem
 *
 * Formato do envelope: "v1.<sal>.<iv>.<cifra>" (cada parte em base64).
 */

export const PREFIXO_ENVELOPE = "v1";
export const ITERACOES = 600_000;
const TAM_SAL = 16;
const TAM_IV = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

function paraBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function deBase64(b64: string): Uint8Array {
  const bin = atob(b64); /* ASCII to binary . Decodifica uma string em Base64 para texto ou binários originais em JS*/
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derivarChave(senha: string, sal: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal as BufferSource, iterations: ITERACOES, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Cifra o texto com a senha mestra e devolve o envelope "v1.sal.iv.cifra". */
export async function encriptar(texto: string, senhaMestra: string): Promise<string> {
  if (!senhaMestra) throw new Error("Senha mestra obrigatória");
  const sal = crypto.getRandomValues(new Uint8Array(TAM_SAL));
  const iv = crypto.getRandomValues(new Uint8Array(TAM_IV));
  const chave = await derivarChave(senhaMestra, sal);
  const cifra = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, chave, enc.encode(texto)),
  );
  return [PREFIXO_ENVELOPE, paraBase64(sal), paraBase64(iv), paraBase64(cifra)].join(".");
}

/** Decifra um envelope. Lança erro se a senha estiver errada ou o dado tiver sido alterado. */
export async function decriptar(envelope: string, senhaMestra: string): Promise<string> {
  if (!envelopeValido(envelope)) throw new Error("Envelope inválido");
  const [, salB64, ivB64, cifraB64] = envelope.split(".");
  const chave = await derivarChave(senhaMestra, deBase64(salB64));
  try {
    const claro = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: deBase64(ivB64) as BufferSource },
      chave,
      deBase64(cifraB64) as BufferSource,
    );
    return dec.decode(claro);
  } catch {
    throw new Error("Senha mestra incorreta ou dado adulterado");
  }
}

/**
 * Confere só o FORMATO do envelope (não precisa de senha). O servidor usa isto
 * para recusar qualquer coisa que não seja texto já cifrado.
 */
export function envelopeValido(valor: unknown): valor is string {
  if (typeof valor !== "string") return false;
  const partes = valor.split(".");
  if (partes.length !== 4 || partes[0] !== PREFIXO_ENVELOPE) return false;
  const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
  if (!partes.slice(1).every((p) => b64.test(p))) return false;
  // sal de 16 bytes, IV de 12 bytes e ao menos o tag de autenticação (16 bytes)
  return deBase64(partes[1]).length === TAM_SAL && deBase64(partes[2]).length === TAM_IV && deBase64(partes[3]).length >= 16;
}
