import { encriptar, decriptar, envelopeValido } from "../utils/cripto";

const SENHA = "senha-mestra-do-psicologo";

describe("criptografia zero-knowledge", () => {
  test('encriptar("olá") devolve algo diferente de "olá"', async () => {
    const cifra = await encriptar("olá", SENHA);
    expect(cifra).not.toBe("olá");
    expect(cifra).not.toContain("olá");
  });

  test("decriptar com a senha certa devolve o texto original (ida e volta)", async () => {
    const texto = "Paciente relatou ansiedade ao falar com a chefe. Sessão 12.";
    expect(await decriptar(await encriptar(texto, SENHA), SENHA)).toBe(texto);
  });

  test("senha errada não decifra", async () => {
    const cifra = await encriptar("segredo clínico", SENHA);
    await expect(decriptar(cifra, "senha-errada")).rejects.toThrow();
  });

  test("o mesmo texto gera cifras diferentes (sal e IV aleatórios)", async () => {
    const a = await encriptar("igual", SENHA);
    const b = await encriptar("igual", SENHA);
    expect(a).not.toBe(b);
  });

  test("dado adulterado é detectado", async () => {
    const [v, sal, iv, cifra] = (await encriptar("intacto", SENHA)).split(".");
    const adulterada = [v, sal, iv, (cifra[0] === "A" ? "B" : "A") + cifra.slice(1)].join(".");
    await expect(decriptar(adulterada, SENHA)).rejects.toThrow();
  });

  test("envelopeValido aceita cifra e recusa texto em claro", async () => {
    expect(envelopeValido(await encriptar("x", SENHA))).toBe(true);
    expect(envelopeValido("texto em claro do prontuário")).toBe(false);
    expect(envelopeValido(undefined)).toBe(false);
  });
});
