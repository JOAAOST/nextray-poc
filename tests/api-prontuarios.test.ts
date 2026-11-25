import { POST, GET } from "../app/api/prontuarios/route";
import { criarArmazenamentoMemoria, definirArmazenamento } from "../utils/armazenamento";
import { encriptar, decriptar } from "../utils/cripto";
import { salvarProntuario } from "../utils/cliente";

const SENHA = "senha-mestra-do-psicologo";
const CLARO = "Paciente João, CPF 123.456.789-09, relatou luto recente.";

const post = (corpo: unknown) =>
  POST(new Request("http://localhost/api/prontuarios", { method: "POST", body: JSON.stringify(corpo) }));

beforeEach(() => definirArmazenamento(criarArmazenamentoMemoria()));
afterAll(() => definirArmazenamento(undefined));

describe("base de dados: só guarda texto ilegível", () => {
  test("recusa texto em claro (422) e não grava nada", async () => {
    const res = await post({ conteudo_cifrado: CLARO });
    expect(res.status).toBe(422);
    expect(await (await GET()).json()).toEqual([]);
  });

  test("guarda o envelope cifrado e a base nunca contém o texto original", async () => {
    const res = await post({ conteudo_cifrado: await encriptar(CLARO, SENHA) });
    expect(res.status).toBe(201);

    const texto = JSON.stringify(await (await GET()).json());
    expect(texto).not.toContain("João");
    expect(texto).not.toContain("123.456.789-09");
    expect(texto).not.toContain("luto");
  });

  test("o psicólogo, com a senha, recupera o original a partir da base", async () => {
    await post({ conteudo_cifrado: await encriptar(CLARO, SENHA) });
    const [linha] = await (await GET()).json();
    expect(await decriptar(linha.conteudo_cifrado, SENHA)).toBe(CLARO);
  });

  test("o cliente cifra antes do fetch: o corpo da requisição não tem texto nem senha", async () => {
    const corpos: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      corpos.push(String(init?.body));
      return new Response(JSON.stringify({ id: "1" }), { status: 201 });
    }) as typeof fetch;
    try {
      await salvarProntuario(CLARO, SENHA);
    } finally {
      globalThis.fetch = original;
    }
    expect(corpos[0]).not.toContain("João");
    expect(corpos[0]).not.toContain(SENHA);
    expect(corpos[0]).toContain("conteudo_cifrado");
  });
});
