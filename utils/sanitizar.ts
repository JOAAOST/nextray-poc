/**
 * Sanitização antes de enviar texto a IA externa.
 * Troca identificadores diretos por marcadores. É uma camada de redução de
 * risco: nomes próprios e dados indiretos
 * (profissão, bairro, história única) não são detectáveis por regex.
 */

const REGRAS: Array<[RegExp, string]> = [
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]"],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[CNPJ]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[EMAIL]"],
  [/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}\b/g, "[TELEFONE]"],
  [/\b\d{5}-?\d{3}\b/g, "[CEP]"],
  [/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[DATA]"],
];

export function sanitizar(texto: string): string {
  return REGRAS.reduce((acc, [regex, marcador]) => acc.replace(regex, marcador), texto);
}
