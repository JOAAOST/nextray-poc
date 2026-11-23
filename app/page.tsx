"use client";

// ============================================================
// NextRay (POC) - Tela inicial (estilo landing page escura)
// Responsável: Nicoly
// Branch: feat/front-telainicial
// Arquivo no projeto: app/page.tsx
//
// ESTRUTURA DA PÁGINA (de cima para baixo)
//   1. Cabeçalho: logo, links e botão
//   2. Hero: título grande, botões e cartões ilustrativos
//   3. Como funciona: 3 passos
//   4. Demonstração: a caixa de texto que gera o resumo
//      (é a parte que FUNCIONA de verdade no protótipo)
//   5. Rodapé
//
// FASE 1 (agora): a resposta da IA é FALSA (mock), só para testar a tela.
// FASE 2 (depois que João e José entregarem): troque a linha
//   const USAR_MOCK = true;
// por
//   const USAR_MOCK = false;
// e a tela passa a chamar a rota real /api/resumo.
// ============================================================

import { useState } from "react";

// >>> ÚNICA LINHA QUE VOCÊ TROCA NA FASE 2 <<<
const USAR_MOCK = true;

// ------------------------------------------------------------
// Resposta FALSA da IA (mock). Espera 1,5 segundo e devolve um texto fixo.
// Serve para ver o "Carregando..." funcionando sem depender de ninguém.
// ------------------------------------------------------------
async function gerarResumoMock(texto: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return (
    "Resumo de exemplo (resposta simulada, sem IA de verdade). " +
    `O texto recebido tem ${texto.length} caracteres. ` +
    "Quando a integração real estiver ativa, o resumo gerado pela IA aparecerá aqui."
  );
}

// ------------------------------------------------------------
// Chamada REAL à rota do João (app/api/resumo/route.ts).
// ATENÇÃO: combine com o João o formato:
//   - o que a tela ENVIA:   { "texto": "..." }
//   - o que a rota DEVOLVE: { "resumo": "..." }
// Se ele usar outros nomes (ex.: "text" ou "summary"), ajuste aqui.
// ------------------------------------------------------------
async function gerarResumoReal(texto: string): Promise<string> {
  const resposta = await fetch("/api/resumo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto }),
  });

  if (!resposta.ok) {
    throw new Error("Erro ao chamar /api/resumo");
  }

  const dados = await resposta.json();
  return dados.resumo;
}

export default function Home() {
  // "Estados" = a memória da tela. Quando mudam, a tela se atualiza sozinha.
  const [texto, setTexto] = useState(""); // o que a pessoa digitou
  const [resumo, setResumo] = useState(""); // o resumo que apareceu
  const [carregando, setCarregando] = useState(false); // true = esperando a IA
  const [erro, setErro] = useState(""); // mensagem de erro (se houver)

  async function handleGerarResumo() {
    // Não deixa enviar caixa vazia
    if (texto.trim() === "") {
      setErro("Escreva ou cole o texto da sessão antes de gerar o resumo.");
      return;
    }

    setErro("");
    setResumo("");
    setCarregando(true);

    try {
      const resultado = USAR_MOCK
        ? await gerarResumoMock(texto)
        : await gerarResumoReal(texto);
      setResumo(resultado);
    } catch {
      setErro("Não foi possível gerar o resumo agora. Tente novamente.");
    } finally {
      setCarregando(false); // acontece sempre, deu certo ou não
    }
  }

  function handleLimpar() {
    setTexto("");
    setResumo("");
    setErro("");
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
              registros. Este protótipo demonstra o resumo de sessões com IA.
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
              Do texto da sessão ao resumo, em três passos.
            </p>

            <div className="nx-passos">
              <div className="nx-passo">
                <div className="nx-passo-numero">1</div>
                <h3>Você escreve</h3>
                <p>Cole ou digite as anotações da sessão na caixa de texto.</p>
              </div>
              <div className="nx-passo">
                <div className="nx-passo-numero">2</div>
                <h3>Sanitização</h3>
                <p>
                  Antes de chegar à IA, os dados sensíveis passam por uma etapa
                  de sanitização.
                </p>
              </div>
              <div className="nx-passo">
                <div className="nx-passo-numero">3</div>
                <h3>A IA resume</h3>
                <p>
                  O resumo volta para a tela em poucos segundos, pronto para
                  você revisar.
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
              Cole um texto de exemplo (sem dados reais de pacientes) e gere um
              resumo.
            </p>

            <div className="nx-demo">
              <label htmlFor="texto-sessao" className="nx-rotulo">
                Texto da sessão
              </label>
              <textarea
                id="texto-sessao"
                className="nx-caixa"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escreva ou cole aqui as anotações da sessão..."
                rows={8}
                disabled={carregando}
              />

              <div className="nx-demo-botoes">
                <button
                  type="button"
                  className="nx-botao nx-botao-azul"
                  onClick={handleGerarResumo}
                  disabled={carregando}
                >
                  {carregando ? "Carregando..." : "Gerar resumo"}
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

              {resumo !== "" && (
                <section aria-live="polite" className="nx-resumo">
                  <h3>Resumo</h3>
                  <p>{resumo}</p>
                </section>
              )}

              <p className="nx-aviso">
                Protótipo (POC): não utilize dados reais de pacientes.
              </p>
            </div>
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
.nx-resumo {
  margin-top: 20px;
  padding: 18px;
  border-radius: 12px;
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.35);
}
.nx-resumo h3 { margin: 0 0 8px; font-size: 16px; color: #5eead4; }
.nx-resumo p { margin: 0; line-height: 1.6; color: #e8edf9; }
.nx-aviso { margin: 20px 0 0; font-size: 13px; color: #8d99b8; }

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
