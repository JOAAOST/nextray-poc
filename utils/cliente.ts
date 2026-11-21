import { encriptar } from "./cripto";

/**
 * Usado pelo front-end: cifra NO NAVEGADOR e só então faz o POST.
 * O texto em claro e a senha mestra nunca entram no corpo da requisição.
 */
export async function salvarProntuario(texto: string, senhaMestra: string, baseUrl = ""): Promise<{ id: string }> {
  const conteudo_cifrado = await encriptar(texto, senhaMestra);
  const res = await fetch(`${baseUrl}/api/prontuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conteudo_cifrado }),
  });
  if (!res.ok) throw new Error(`Falha ao salvar (${res.status})`);
  return res.json();
}
