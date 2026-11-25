"use client";

// ============================================================
// NextRay (POC) - Tela inicial
// Responsável: Nicoly
// Branch: feat/front-telainicial
// Arquivo no projeto: app/page.tsx
//
// ESTA VERSÃO JUNTA DUAS COISAS:
//   - o VISUAL (landing page escura) feito pela Nicoly
//   - a LÓGICA que o João deixou na develop: a tela envia
//       { anotacoesSessao }  para  /api/resumo
//     e recebe
//       { evolucao }  (demandas, estado emocional, intervenções,
//                      plano e pontos de atenção)
//
// ESTRUTURA DA PÁGINA (de cima para baixo)
//   1. Cabeçalho: logo, links e botão
//   2. Hero: título grande, botões e cartões ilustrativos
//   3. Como funciona: 3 passos
//   4. Demonstração: a caixa de texto que gera a evolução
//      (é a parte que FUNCIONA de verdade no protótipo)
//   5. Rodapé
//
// USAR_MOCK:
//   false = usa a IA de verdade (rota /api/resumo)  <- valor para entregar
//   true  = usa uma resposta FALSA, só para testar o visual sem IA
// ============================================================

import { useState, type FormEvent } from "react";

// Formato da resposta que a rota /api/resumo devolve (definido pelo João)
interface EvolucaoPsicologica {
  demandasPrincipais: string[];
  estadoEmocional: string;
  intervencoesEAnalise: string;
  planoEEncaminhamentos: string;
  pontosDeAtencao: string | null;
}

// >>> Deixe false na entrega final <<<
const USAR_MOCK = false;

// ------------------------------------------------------------
// Resposta FALSA (mock). Espera 1,5 segundo e devolve um texto fixo.
// Serve para testar o "Carregando..." e o visual sem depender da IA.
// ------------------------------------------------------------
async function gerarEvolucaoMock(
  anotacoesSessao: string
): Promise<EvolucaoPsicologica> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    demandasPrincipais: [
      "Exemplo de demanda 1 (simulado)",
      "Exemplo de demanda 2 (simulado)",
    ],
    estadoEmocional: `Resposta simulada, sem IA de verdade. O texto recebido tem ${anotacoesSessao.length} caracteres.`,
    intervencoesEAnalise:
      "Aqui aparecerão as intervenções e a análise clínica geradas pela IA.",
    planoEEncaminhamentos:
      "Aqui aparecerão o plano e os encaminhamentos sugeridos pela IA.",
    pontosDeAtencao: "Exemplo de ponto de atenção (simulado).",
  };
}

// ------------------------------------------------------------
// Chamada REAL à rota do João (app/api/resumo/route.ts).
//   envia:   { "anotacoesSessao": "..." }
//   recebe:  { "evolucao": { ... } }   ou, se der erro,  { "erro": "..." }
// ------------------------------------------------------------
async function gerarEvolucaoReal(
  anotacoesSessao: string
): Promise<EvolucaoPsicologica> {
  const resposta = await fetch("/api/resumo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anotacoesSessao }),
  });

  const dados: { erro?: string; evolucao?: EvolucaoPsicologica } =
    await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro ao gerar evolução clínica.");
  }
  if (!dados.evolucao) {
    throw new Error("Resposta inesperada do servidor.");
  }

  return dados.evolucao;
}

export default function Home() {
  // "Estados" = a memória da tela. Quando mudam, a tela se atualiza sozinha.
  const [anotacoesSessao, setAnotacoesSessao] = useState(""); // o que a pessoa digitou
  const [evolucao, setEvolucao] = useState<EvolucaoPsicologica | null>(null); // a resposta
  const [carregando, setCarregando] = useState(false); // true = esperando a IA
  const [erro, setErro] = useState(""); // mensagem de erro (se houver)
  const [copiado, setCopiado] = useState(false); // true = acabou de copiar

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); // impede a página de recarregar

    // Não deixa enviar caixa vazia
    if (anotacoesSessao.trim() === "") {
      setErro("Escreva ou cole as anotações da sessão antes de gerar a evolução.");
      return;
    }

    setCarregando(true);
    setErro("");
    setEvolucao(null);
    setCopiado(false);

    try {
      const resultado = USAR_MOCK
        ? await gerarEvolucaoMock(anotacoesSessao)
        : await gerarEvolucaoReal(anotacoesSessao);
      setEvolucao(resultado);
    } catch (err) {
      setErro(
        err instanceof Error && err.message
          ? err.message
          : "Falha na comunicação com o servidor."
      );
    } finally {
      setCarregando(false); // acontece sempre, deu certo ou não
    }
  }

  function handleLimpar() {
    setAnotacoesSessao("");
    setEvolucao(null);
    setErro("");
    setCopiado(false);
  }

  // Junta todos os campos num texto único e copia para a área de transferência
  async function copiarParaProntuario() {
    if (!evolucao) return;

    const demandas = evolucao.demandasPrincipais ?? [];
    const textoFormatado = [
      `EVOLUÇÃO DE SESSÃO`,
      `\n1. Demandas Principais:\n${demandas.map((d) => `- ${d}`).join("\n")}`,
      `\n2. Estado Emocional e Comportamental:\n${evolucao.estadoEmocional}`,
      `\n3. Intervenções e Análise Clínica:\n${evolucao.intervencoesEAnalise}`,
      `\n4. Plano e Encaminhamentos:\n${evolucao.planoEEncaminhamentos}`,
      evolucao.pontosDeAtencao
        ? `\n5. Pontos de Atenção:\n${evolucao.pontosDeAtencao}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(textoFormatado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro("Não foi possível copiar o texto. Selecione e copie manualmente.");
    }
  }

  return (
    <div className="nx-pagina">
      {/* A aparência fica toda no bloco de CSS no final deste arquivo */}
      <style>{css}</style>

      {/* ============ 1. CABEÇALHO ============ */}
      <header className="nx-header">
        <div className="nx-container nx-header-interno">
          <a href="#topo" className="nx-logo">
            <span className="nx-logo-icone">N</span>
            NextRay
          </a>

          <nav className="nx-nav" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#demo">Demonstração</a>
          </nav>

          <a href="#demo" className="nx-botao nx-botao-azul nx-botao-pequeno">
            Testar protótipo
          </a>
        </div>
      </header>

      <main id="topo">
        {/* ============ 2. HERO ============ */}
        <section className="nx-container nx-hero">
          <div>
            <span className="nx-selo">
              <span className="nx-selo-ponto" />
              Para psicólogos clínicos autônomos que atendem online
            </span>

            <h1 className="nx-titulo">
              Só você tem a chave dos prontuários dos seus pacientes.
            </h1>

            {/* Texto escrito para não prometer o que o protótipo ainda não faz */}
            <p className="nx-lead">
              O NextRay é uma proposta de prontuário com criptografia
              Zero-Knowledge: a ideia é que apenas a psicóloga tenha a chave dos
              registros. Este protótipo demonstra a estruturação de anotações de
              sessão com IA.
            </p>

            <div className="nx-botoes">
              <a href="#demo" className="nx-botao nx-botao-azul">
                Testar o protótipo
              </a>
              <a href="#como-funciona" className="nx-botao nx-botao-contorno">
                Ver como funciona
              </a>
            </div>

            <p className="nx-nota">
              Protótipo (POC): não use dados reais de pacientes.
            </p>
          </div>

          {/* Cartões ilustrativos (só desenho, não fazem nada) */}
          <div className="nx-visual" aria-hidden="true">
            <div className="nx-cartao-claro">
              <div className="nx-cartao-topo">
                <span className="nx-chip-verde">No seu dispositivo</span>
                <span>Evolução · sessão 12</span>
              </div>
              <p className="nx-cartao-texto">
                Paciente relata melhora no sono após ajuste da rotina. Retomar
                na próxima sessão o tema do trabalho.
              </p>
            </div>

            <div className="nx-senha">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              senha mestra
            </div>

            <div className="nx-cartao-escuro">
              <div className="nx-cartao-topo">
                <span className="nx-chip-cinza">No nosso servidor</span>
                <span>o que fica guardado</span>
              </div>
              <p className="nx-codigo">
                kZ3vQ8xT1mP0/aW7r+NfB2uJ9eLd5hGcYt4sXoV6iR=hA1qMn0Ew8yUjPbKz2CdFg7lT3vS+Q9xoI5rN4mHk6aB1cD
              </p>
            </div>
          </div>
        </section>

        {/* ============ 3. COMO FUNCIONA ============ */}
        <section id="como-funciona" className="nx-secao">
          <div className="nx-container">
            <h2 className="nx-secao-titulo">Como funciona</h2>
            <p className="nx-secao-sub">
              Das anotações da sessão à evolução estruturada, em três passos.
            </p>

            <div className="nx-passos">
              <div className="nx-passo">
                <div className="nx-passo-numero">1</div>
                <h3>Você escreve</h3>
                <p>
                  Cole ou digite as anotações brutas da sessão na caixa de
                  texto.
                </p>
              </div>
              <div className="nx-passo">
                <div className="nx-passo-numero">2</div>
                <h3>Sanitização</h3>
                {/* Confirme com João/José que a rota realmente sanitiza antes da IA.
                    Se não, ajuste ou remova este texto (nada de prometer e não entregar). */}
                <p>
                  Antes de chegar à IA, os dados sensíveis passam por uma etapa
                  de sanitização.
                </p>
              </div>
              <div className="nx-passo">
                <div className="nx-passo-numero">3</div>
                <h3>A IA estrutura</h3>
                <p>
                  A evolução volta organizada em demandas, estado emocional,
                  intervenções e plano, pronta para você revisar e copiar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 4. DEMONSTRAÇÃO (a parte que funciona) ============ */}
        <section id="demo" className="nx-secao">
          <div className="nx-container">
            <h2 className="nx-secao-titulo">Teste o protótipo</h2>
            <p className="nx-secao-sub">
              Cole anotações de exemplo (sem dados reais de pacientes) e gere a
              evolução estruturada.
            </p>

            <form className="nx-demo" onSubmit={handleSubmit}>
              <label htmlFor="anotacoesSessao" className="nx-rotulo">
                Anotações brutas da sessão
              </label>
              <textarea
                id="anotacoesSessao"
                className="nx-caixa"
                value={anotacoesSessao}
                onChange={(e) => setAnotacoesSessao(e.target.value)}
                placeholder="Ex: Paciente relata sobrecarga no trabalho e crises de ansiedade antes de reuniões. Trabalhamos identificação de pensamentos automáticos e comunicação assertiva..."
                rows={7}
                disabled={carregando}
              />

              <div className="nx-demo-botoes">
                <button
                  type="submit"
                  className="nx-botao nx-botao-azul"
                  disabled={carregando}
                >
                  {carregando
                    ? "Estruturando evolução..."
                    : "Gerar evolução de prontuário"}
                </button>

                <button
                  type="button"
                  className="nx-botao nx-botao-contorno"
                  onClick={handleLimpar}
                  disabled={carregando}
                >
                  Limpar
                </button>
              </div>

              {erro !== "" && (
                <p role="alert" className="nx-erro">
                  {erro}
                </p>
              )}

              {evolucao && (
                <section aria-live="polite" className="nx-resultado">
                  <div className="nx-resultado-topo">
                    <h3>Evolução estruturada</h3>
                    <button
                      type="button"
                      className="nx-botao nx-botao-contorno nx-botao-pequeno"
                      onClick={copiarParaProntuario}
                    >
                      {copiado
                        ? "Copiado para o prontuário!"
                        : "Copiar texto formatado"}
                    </button>
                  </div>

                  {evolucao.pontosDeAtencao && (
                    <div className="nx-alerta">
                      <strong>Ponto de atenção / alerta clínico</strong>
                      {evolucao.pontosDeAtencao}
                    </div>
                  )}

                  <div className="nx-grade">
                    <div className="nx-bloco">
                      <h4>Demandas principais</h4>
                      <ul>
                        {(evolucao.demandasPrincipais ?? []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="nx-bloco">
                      <h4>Estado emocional e comportamental</h4>
                      <p>{evolucao.estadoEmocional}</p>
                    </div>

                    <div className="nx-bloco">
                      <h4>Intervenções e análise clínica</h4>
                      <p>{evolucao.intervencoesEAnalise}</p>
                    </div>

                    <div className="nx-bloco">
                      <h4>Plano e encaminhamentos</h4>
                      <p>{evolucao.planoEEncaminhamentos}</p>
                    </div>
                  </div>
                </section>
              )}

              <p className="nx-aviso">
                Protótipo (POC): não utilize dados reais de pacientes.
              </p>
            </form>
          </div>
        </section>
      </main>

      {/* ============ 5. RODAPÉ ============ */}
      <footer className="nx-rodape">
        <div className="nx-container">NextRay · Protótipo (POC)</div>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------
// Aparência da página (cores, tamanhos, espaçamentos).
// Está aqui embaixo para não misturar com a lógica lá de cima.
// Todas as classes começam com "nx-" (de NextRay) para não
// bagunçar o resto do projeto.
//
// Cores principais:
//   fundo azul-marinho: #0a1230 / #060b1c
//   azul dos botões:    #2f5af0
//   verde de destaque:  #34d399 / #5eead4
// ------------------------------------------------------------
const css = `
html { scroll-behavior: smooth; }

.nx-pagina {
  min-height: 100vh;
  color: #e8edf9;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
  background:
    radial-gradient(900px 520px at 12% 18%, rgba(47, 90, 240, 0.28), transparent 60%),
    radial-gradient(700px 400px at 95% 0%, rgba(52, 211, 153, 0.12), transparent 60%),
    linear-gradient(180deg, #0a1230 0%, #060b1c 100%);
}

.nx-container {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
  box-sizing: border-box;
}

/* ---------- Cabeçalho ---------- */
.nx-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(8, 14, 34, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.nx-header-interno {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 66px;
}
.nx-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 20px;
  color: #ffffff;
  text-decoration: none;
}
.nx-logo-icone {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #0f1d44;
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34d399;
  font-size: 16px;
}
.nx-nav { display: flex; gap: 28px; }
.nx-nav a {
  color: #c3cce4;
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
}
.nx-nav a:hover { color: #ffffff; }

/* ---------- Botões ---------- */
.nx-botao {
  display: inline-block;
  padding: 14px 26px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.nx-botao:hover { transform: translateY(-1px); }
.nx-botao:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.nx-botao-azul {
  background: #2f5af0;
  color: #ffffff;
  box-shadow: 0 8px 24px rgba(47, 90, 240, 0.4);
}
.nx-botao-contorno {
  background: transparent;
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.35);
}
.nx-botao-pequeno { padding: 10px 18px; font-size: 14px; }

/* ---------- Hero ---------- */
.nx-hero {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 56px;
  align-items: center;
  padding-top: 72px;
  padding-bottom: 88px;
}
.nx-selo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #c3cce4;
  font-size: 14px;
}
.nx-selo-ponto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
}
.nx-titulo {
  margin: 22px 0 20px;
  font-size: clamp(36px, 5.2vw, 60px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  font-weight: 800;
  color: #ffffff;
}
.nx-lead {
  margin: 0 0 28px;
  max-width: 520px;
  font-size: 18px;
  line-height: 1.6;
  color: #b4bfda;
}
.nx-botoes { display: flex; gap: 14px; flex-wrap: wrap; }
.nx-nota { margin: 16px 0 0; font-size: 14px; color: #8d99b8; }

/* ---------- Cartões ilustrativos ---------- */
.nx-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.nx-cartao-claro {
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  color: #1b2440;
  border-radius: 18px;
  padding: 20px 22px;
  transform: rotate(-2deg);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}
.nx-cartao-topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #6b7694;
}
.nx-chip-verde {
  padding: 5px 12px;
  border-radius: 999px;
  background: #d9f7ea;
  color: #0b8a5f;
  font-weight: 700;
  font-size: 13px;
}
.nx-cartao-texto { margin: 0; font-size: 16px; line-height: 1.55; }
.nx-senha {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(52, 211, 153, 0.45);
  background: rgba(52, 211, 153, 0.1);
  color: #5eead4;
  font-weight: 700;
  font-size: 14px;
}
.nx-cartao-escuro {
  width: 100%;
  box-sizing: border-box;
  background: rgba(15, 24, 52, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 20px 22px;
  transform: rotate(1.5deg);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}
.nx-cartao-escuro .nx-cartao-topo { color: #8d99b8; }
.nx-chip-cinza {
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #dbe3f7;
  font-weight: 700;
  font-size: 13px;
}
.nx-codigo {
  margin: 0;
  font-family: "Courier New", Consolas, monospace;
  font-size: 13.5px;
  line-height: 1.6;
  color: #5eead4;
  word-break: break-all;
}

/* ---------- Seções ---------- */
.nx-secao { padding: 72px 0; scroll-margin-top: 70px; }
.nx-secao-titulo {
  margin: 0 0 8px;
  font-size: clamp(26px, 3.4vw, 36px);
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #ffffff;
}
.nx-secao-sub {
  margin: 0 0 32px;
  font-size: 17px;
  line-height: 1.6;
  color: #b4bfda;
}

/* ---------- Como funciona ---------- */
.nx-passos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.nx-passo {
  padding: 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.nx-passo-numero {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: rgba(47, 90, 240, 0.2);
  color: #8fa8ff;
  font-weight: 800;
}
.nx-passo h3 { margin: 0 0 8px; font-size: 18px; color: #ffffff; }
.nx-passo p { margin: 0; font-size: 15.5px; line-height: 1.6; color: #b4bfda; }

/* ---------- Demonstração ---------- */
.nx-demo {
  padding: 28px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.nx-rotulo { display: block; margin-bottom: 8px; font-weight: 700; color: #e8edf9; }
.nx-caixa {
  width: 100%;
  box-sizing: border-box;
  padding: 14px;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.5;
  color: #ffffff;
  background: #0b1432;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  resize: vertical;
}
.nx-caixa::placeholder { color: #7f8bab; }
.nx-caixa:focus { outline: 2px solid #2f5af0; outline-offset: 1px; }
.nx-caixa:disabled { opacity: 0.7; }
.nx-demo-botoes { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.nx-erro {
  margin: 16px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fecaca;
  font-size: 15px;
}
.nx-aviso { margin: 20px 0 0; font-size: 13px; color: #8d99b8; }

/* ---------- Resultado (evolução estruturada) ---------- */
.nx-resultado { margin-top: 28px; }
.nx-resultado-topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.nx-resultado-topo h3 { margin: 0; font-size: 20px; color: #ffffff; }
.nx-alerta {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fde68a;
  font-size: 15px;
  line-height: 1.55;
}
.nx-alerta strong { display: block; margin-bottom: 4px; color: #fcd34d; }
.nx-grade { display: grid; grid-template-columns: 1fr; gap: 14px; }
.nx-bloco {
  padding: 18px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.nx-bloco h4 {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8fa8ff;
}
.nx-bloco p { margin: 0; font-size: 15.5px; line-height: 1.6; color: #dbe3f7; }
.nx-bloco ul { margin: 0; padding-left: 20px; font-size: 15.5px; line-height: 1.7; color: #dbe3f7; }

/* ---------- Rodapé ---------- */
.nx-rodape {
  padding: 28px 0 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 14px;
  color: #8d99b8;
}

/* ---------- Celular e tablet ---------- */
@media (max-width: 900px) {
  .nx-hero { grid-template-columns: 1fr; gap: 40px; padding-top: 48px; }
  .nx-passos { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .nx-nav { display: none; }
  .nx-secao { padding: 48px 0; }
  .nx-demo { padding: 18px; }
}
`;
