import { sanitizar } from "../utils/sanitizar";

describe("sanitização antes de enviar à IA", () => {
  test("remove CPF, e-mail e telefone", () => {
    const saida = sanitizar("CPF 123.456.789-09, e-mail ana@exemplo.com, tel (81) 98888-7777.");
    expect(saida).not.toContain("123.456.789-09");
    expect(saida).not.toContain("ana@exemplo.com");
    expect(saida).not.toContain("98888-7777");
    expect(saida).toContain("[CPF]");
    expect(saida).toContain("[EMAIL]");
    expect(saida).toContain("[TELEFONE]");
  });

  test("remove datas e CEP", () => {
    const saida = sanitizar("Nasceu em 03/04/1990, CEP 50030-230.");
    expect(saida).toContain("[DATA]");
    expect(saida).toContain("[CEP]");
  });

  test("preserva o conteúdo clínico sem identificadores", () => {
    const texto = "Paciente relata insônia e irritabilidade há três semanas.";
    expect(sanitizar(texto)).toBe(texto);
  });
});
