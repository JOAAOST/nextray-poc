/**
 * Camada de dados. O servidor guarda APENAS o envelope cifrado e metadados.
 *  - Com SUPABASE_URL e SUPABASE_SERVICE_KEY definidos: grava no Supabase (tabela "prontuarios").
 *  - Sem elas: usa memória (serve para testes e demo local; na Vercel NÃO persiste entre requisições).
 */

export interface Registro {
  id: string;
  conteudo_cifrado: string;
  criado_em: string;
}

export interface Armazenamento {
  salvar(conteudoCifrado: string): Promise<Registro>;
  listar(): Promise<Registro[]>;
}

export function criarArmazenamentoMemoria(): Armazenamento {
  const linhas: Registro[] = [];
  return {
    async salvar(conteudoCifrado) {
      const r = { id: crypto.randomUUID(), conteudo_cifrado: conteudoCifrado, criado_em: new Date().toISOString() };
      linhas.push(r);
      return r;
    },
    async listar() {
      return [...linhas].reverse();
    },
  };
}

export function criarArmazenamentoSupabase(url: string, chave: string): Armazenamento {
  const base = `${url.replace(/\/$/, "")}/rest/v1/prontuarios`;
  const cab: Record<string, string> = { apikey: chave, "Content-Type": "application/json" };
  if (chave.startsWith("eyJ")) cab.Authorization = `Bearer ${chave}`; // chaves antigas (JWT)
  return {
    async salvar(conteudoCifrado) {
      const res = await fetch(base, {
        method: "POST",
        headers: { ...cab, Prefer: "return=representation" },
        body: JSON.stringify({ conteudo_cifrado: conteudoCifrado }),
      });
      if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
      return (await res.json())[0] as Registro;
    },
    async listar() {
      const res = await fetch(`${base}?select=id,conteudo_cifrado,criado_em&order=criado_em.desc&limit=50`, { headers: cab });
      if (!res.ok) throw new Error(`Supabase ${res.status}`);
      return (await res.json()) as Registro[];
    },
  };
}

let padrao: Armazenamento | undefined;
export function obterArmazenamento(): Armazenamento {
  if (!padrao) {
    const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
    padrao = SUPABASE_URL && SUPABASE_SERVICE_KEY
      ? criarArmazenamentoSupabase(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      : criarArmazenamentoMemoria();
  }
  return padrao;
}

/** Só para testes: troca a implementação usada pela rota. */
export function definirArmazenamento(a: Armazenamento | undefined) {
  padrao = a;
}
