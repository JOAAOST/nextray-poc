"use client";

// ============================================================
// NextRay (POC) - Tela inicial + SIGILO (criptografia Zero-Knowledge)
// Responsável: Nicoly
// Branch sugerida: feat/front-sigilo
// Arquivo no projeto: app/page.tsx
//
// COMO O SIGILO FUNCIONA NESTA TELA
//   1. Você escreve as anotações e a IA devolve a evolução estruturada
//      (fluxo do João: /api/resumo). A evolução NÃO aparece ainda:
//      fica bloqueada.
//   2. Para visualizar, você cria a SENHA MESTRA (digita duas vezes).
//      A evolução é cifrada AQUI NO NAVEGADOR (salvarProntuario, do José,
//      em utils/cliente.ts) e o servidor guarda só o texto cifrado.
//      Só depois de salvar é que os cartões da evolução são liberados.
//   3. Na seção "O que o servidor guarda" aparece a lista do que ficou
//      guardado (GET /api/prontuarios). Para abrir um item, é preciso a
//      senha mestra: se estiver certa, a evolução aparece nos mesmos
//      cartões (decriptar, do José, em utils/cripto.ts); se estiver errada,
//      dá erro.
//
// ESTRUTURA DA PÁGINA (de cima para baixo)
//   1. Cabeçalho   2. Hero   3. Como funciona
//   4. Demonstração (gerar + proteger com senha mestra)
//   5. O que o servidor guarda (lista + abrir com senha)   6. Rodapé
//
// USAR_MOCK:
//   false = usa a IA de verdade (rota /api/resumo)  <- valor para entregar
//   true  = usa uma resposta FALSA, só para testar o visual sem IA
// ============================================================

import { useState, type FormEvent } from "react";
import { salvarProntuario } from "../utils/cliente";
import { decriptar } from "../utils/cripto";
import type { Registro } from "../utils/armazenamento";

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

// Tamanho mínimo da senha mestra (uma senha fraca enfraquece a criptografia).
// Pode ajustar se o grupo preferir outro valor.
const TAMANHO_MIN_SENHA = 8;

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

// ------------------------------------------------------------
// Junta todos os campos da evolução num texto único.
// É esse texto que vai para a área de transferência (botão "Copiar").
// ------------------------------------------------------------
function formatarEvolucao(evolucao: EvolucaoPsicologica): string {
  const demandas = evolucao.demandasPrincipais ?? [];
  return [
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
}

// ------------------------------------------------------------
// Confere se um objeto tem o formato da evolução.
// Serve para saber se o que foi decifrado dá para mostrar em cartões.
// ------------------------------------------------------------
function ehEvolucao(valor: unknown): valor is EvolucaoPsicologica {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    Array.isArray(v.demandasPrincipais) &&
    v.demandasPrincipais.every((d) => typeof d === "string") &&
    typeof v.estadoEmocional === "string" &&
    typeof v.intervencoesEAnalise === "string" &&
    typeof v.planoEEncaminhamentos === "string" &&
    (typeof v.pontosDeAtencao === "string" ||
      v.pontosDeAtencao === null ||
      v.pontosDeAtencao === undefined)
  );
}

// Tenta transformar o texto decifrado de volta na evolução.
// Registros antigos (salvos como texto simples) devolvem null.
function tentarLerEvolucao(texto: string): EvolucaoPsicologica | null {
  try {
    const dado: unknown = JSON.parse(texto);
    return ehEvolucao(dado) ? dado : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Os cartões da evolução estruturada (usados quando a evolução é
// liberada e quando um prontuário salvo é aberto com a senha).
// ------------------------------------------------------------
function EvolucaoCartoes({ evolucao }: { evolucao: EvolucaoPsicologica }) {
  const [copiado, setCopiado] = useState(false); // true = acabou de copiar
  const [erroCopia, setErroCopia] = useState("");

  // Copia o texto formatado para a área de transferência
  async function copiar() {
    try {
      await navigator.clipboard.writeText(formatarEvolucao(evolucao));
      setErroCopia("");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErroCopia("Não foi possível copiar o texto. Selecione e copie manualmente.");
    }
  }

  return (
    <section aria-live="polite" className="nx-resultado">
      <div className="nx-resultado-topo">
        <h3>Evolução estruturada</h3>
        <button
          type="button"
          className="nx-botao nx-botao-contorno nx-botao-pequeno"
          onClick={copiar}
        >
          {copiado ? "Copiado para o prontuário!" : "Copiar texto formatado"}
        </button>
      </div>

      {erroCopia !== "" && (
        <p role="alert" className="nx-erro">
          {erroCopia}
        </p>
      )}

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
  );
}

export default function Home() {
  // "Estados" = a memória da tela. Quando mudam, a tela se atualiza sozinha.

  // --- Gerar a evolução (fluxo do João) ---
  const [anotacoesSessao, setAnotacoesSessao] = useState(""); // o que a pessoa digitou
  const [evolucao, setEvolucao] = useState<EvolucaoPsicologica | null>(null); // a resposta da IA
  const [liberada, setLiberada] = useState(false); // true = senha definida, a evolução pode aparecer
  const [carregando, setCarregando] = useState(false); // true = esperando a IA
  const [erro, setErro] = useState(""); // mensagem de erro (se houver)

  // --- Proteger com a senha mestra (cifra no navegador, fluxo do José) ---
  const [senhaMestra, setSenhaMestra] = useState(""); // senha que cifra o prontuário
  const [confirmarSenha, setConfirmarSenha] = useState(""); // a mesma senha, de novo
  const [salvando, setSalvando] = useState(false); // true = cifrando e enviando
  const [mensagemSalvo, setMensagemSalvo] = useState(""); // aviso de sucesso
  const [erroSalvar, setErroSalvar] = useState(""); // erro ao salvar

  // --- Lista do servidor e abrir um prontuário ---
  const [registros, setRegistros] = useState<Registro[]>([]); // o que o servidor guarda
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [erroLista, setErroLista] = useState("");
  const [idAberto, setIdAberto] = useState<string | null>(null); // qual item está aberto
  const [senhaAbrir, setSenhaAbrir] = useState(""); // senha digitada para abrir
  const [abrindo, setAbrindo] = useState(false);
  const [erroAbrir, setErroAbrir] = useState("");
  const [evolucaoAberta, setEvolucaoAberta] = useState<EvolucaoPsicologica | null>(null); // já decifrada
  const [textoAberto, setTextoAberto] = useState(""); // registros antigos (texto simples)

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
    setLiberada(false); // a evolução nova começa bloqueada
    setSenhaMestra("");
    setConfirmarSenha("");
    setMensagemSalvo("");
    setErroSalvar("");

    try {
      const resultado = USAR_MOCK
        ? await gerarEvolucaoMock(anotacoesSessao)
        : await gerarEvolucaoReal(anotacoesSessao);
      setEvolucao(resultado); // guardada na memória, mas ainda NÃO exibida
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
    setLiberada(false);
    setErro("");
    setSenhaMestra("");
    setConfirmarSenha("");
    setMensagemSalvo("");
    setErroSalvar("");
  }

  // Busca no servidor o que está guardado (só texto cifrado)
  async function carregarLista() {
    setCarregandoLista(true);
    setErroLista("");
    try {
      const resposta = await fetch("/api/prontuarios");
      if (!resposta.ok) {
        throw new Error("Falha ao carregar a lista");
      }
      const dados: unknown = await resposta.json();
      setRegistros(Array.isArray(dados) ? (dados as Registro[]) : []);
    } catch {
      setErroLista("Não foi possível carregar a lista do servidor.");
    } finally {
      setCarregandoLista(false);
    }
  }

  // Cifra no navegador (função do José), envia só o texto cifrado
  // e, se der certo, libera a visualização da evolução.
  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    if (!evolucao) return;

    if (senhaMestra.length < TAMANHO_MIN_SENHA) {
      setErroSalvar(
        `Use uma senha mestra com pelo menos ${TAMANHO_MIN_SENHA} caracteres.`
      );
      return;
    }
    if (senhaMestra !== confirmarSenha) {
      setErroSalvar("As senhas não conferem. Digite a mesma senha nos dois campos.");
      return;
    }

    setSalvando(true);
    setErroSalvar("");
    setMensagemSalvo("");

    try {
      // O que é cifrado é a evolução inteira (em JSON), para poder
      // reaparecer em cartões quando for aberta com a senha.
      const { id } = await salvarProntuario(JSON.stringify(evolucao), senhaMestra);
      setLiberada(true); // senha definida e prontuário salvo: libera a visualização
      setMensagemSalvo(
        `Prontuário salvo com sigilo (código ${id.slice(0, 8)}). O servidor guardou apenas o texto cifrado.`
      );
      setSenhaMestra(""); // não deixa a senha parada na tela
      setConfirmarSenha("");
      await carregarLista();
    } catch (err) {
      setErroSalvar(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível salvar o prontuário."
      );
    } finally {
      setSalvando(false);
    }
  }

  // Abre/fecha o painel de senha de um item da lista
  function alternarAbrir(id: string) {
    setErroAbrir("");
    setEvolucaoAberta(null);
    setTextoAberto("");
    setSenhaAbrir("");
    setIdAberto((atual) => (atual === id ? null : id));
  }

  // Decifra no navegador (função do José). Senha errada gera erro.
  async function handleAbrir(e: FormEvent, registro: Registro) {
    e.preventDefault();

    if (senhaAbrir === "") {
      setErroAbrir("Digite a senha mestra para abrir o prontuário.");
      return;
    }

    setAbrindo(true);
    setErroAbrir("");
    setEvolucaoAberta(null);
    setTextoAberto("");

    try {
      const claro = await decriptar(registro.conteudo_cifrado, senhaAbrir);
      const lida = tentarLerEvolucao(claro);
      if (lida) {
        setEvolucaoAberta(lida); // mostra nos cartões
      } else {
        setTextoAberto(claro); // registro antigo: mostra como texto simples
      }
      setSenhaAbrir(""); // não deixa a senha parada na tela
    } catch (err) {
      setErroAbrir(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível abrir o prontuário."
      );
    } finally {
      setAbrindo(false);
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
            <a href="#servidor">Sigilo</a>
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

            {/* Texto escrito para não prometer o que o protótipo não faz */}
            <p className="nx-lead">
              O NextRay é uma proposta de prontuário com criptografia
              Zero-Knowledge: o prontuário é cifrado no navegador com a senha
              mestra da psicóloga, e o servidor guarda apenas o texto cifrado.
              Este protótipo demonstra a estruturação de anotações com IA e o
              salvamento com sigilo.
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
                v1.kZ3vQ8xT1mP0aW7rNfB2uA==.hA1qMn0Ew8yUjPbK.Q9xoI5rN4mHk6aB1cDfGt7lT3vS+z2CdYt4sXoV6iR=
              </p>
            </div>
          </div>
        </section>

        {/* ============ 3. COMO FUNCIONA ============ */}
        <section id="como-funciona" className="nx-secao">
          <div className="nx-container">
            <h2 className="nx-secao-titulo">Como funciona</h2>
            <p className="nx-secao-sub">
              Das anotações da sessão ao prontuário guardado com sigilo, em três
              passos.
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
                <h3>A IA estrutura</h3>
                {/* Hoje a rota /api/resumo envia o texto a um provedor de IA
                    (Gemini, Groq ou OpenAI). Se a sanitização do José for
                    ligada à rota, atualize este texto. */}
                <p>
                  As anotações são enviadas a um provedor de IA, que devolve a
                  evolução organizada em demandas, estado emocional,
                  intervenções e plano.
                </p>
              </div>
              <div className="nx-passo">
                <div className="nx-passo-numero">3</div>
                <h3>Você protege com sigilo</h3>
                <p>
                  A evolução só é exibida depois de cifrada no seu navegador com
                  a sua senha mestra. O servidor guarda apenas o texto cifrado e
                  não consegue lê-lo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 4. DEMONSTRAÇÃO (gerar + proteger com senha) ============ */}
        <section id="demo" className="nx-secao">
          <div className="nx-container">
            <h2 className="nx-secao-titulo">Teste o protótipo</h2>
            <p className="nx-secao-sub">
              Cole anotações de exemplo (sem dados reais de pacientes), gere a
              evolução, proteja com a senha mestra e só então visualize.
            </p>

            <div className="nx-demo">
              <form onSubmit={handleSubmit}>
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
              </form>

              {erro !== "" && (
                <p role="alert" className="nx-erro">
                  {erro}
                </p>
              )}

              {/* ----- EVOLUÇÃO BLOQUEADA: pede a senha mestra ----- */}
              {evolucao && !liberada && (
                <div className="nx-sigilo" aria-live="polite">
                  <h4>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    Evolução gerada e bloqueada
                  </h4>
                  <p className="nx-dica">
                    Por sigilo, o conteúdo só aparece depois que você o protege
                    com a sua senha mestra. Ele será cifrado aqui, no seu
                    navegador (AES-256), e salvo cifrado no servidor. Guarde a
                    senha: sem ela ninguém consegue ler, nem a nossa equipe, e
                    ela não pode ser recuperada.
                  </p>

                  <form className="nx-form-senha" onSubmit={handleSalvar}>
                    <label htmlFor="senhaMestra" className="nx-sr-only">
                      Senha mestra
                    </label>
                    <input
                      id="senhaMestra"
                      type="password"
                      className="nx-input"
                      value={senhaMestra}
                      onChange={(e) => setSenhaMestra(e.target.value)}
                      placeholder="Senha mestra (mínimo 8 caracteres)"
                      autoComplete="new-password"
                      disabled={salvando}
                    />

                    <label htmlFor="confirmarSenha" className="nx-sr-only">
                      Confirmar senha mestra
                    </label>
                    <input
                      id="confirmarSenha"
                      type="password"
                      className="nx-input"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Confirmar senha mestra"
                      autoComplete="new-password"
                      disabled={salvando}
                    />

                    <button
                      type="submit"
                      className="nx-botao nx-botao-azul"
                      disabled={salvando}
                    >
                      {salvando
                        ? "Cifrando e salvando..."
                        : "Proteger e visualizar"}
                    </button>
                  </form>

                  {erroSalvar !== "" && (
                    <p role="alert" className="nx-erro">
                      {erroSalvar}
                    </p>
                  )}
                </div>
              )}

              {/* ----- EVOLUÇÃO LIBERADA: só depois da senha ----- */}
              {evolucao && liberada && (
                <>
                  {mensagemSalvo !== "" && (
                    <p role="status" className="nx-sucesso">
                      {mensagemSalvo}{" "}
                      <a href="#servidor" className="nx-link">
                        Ver o que o servidor guarda
                      </a>
                    </p>
                  )}
                  <EvolucaoCartoes evolucao={evolucao} />
                </>
              )}

              <p className="nx-aviso">
                Protótipo (POC): não utilize dados reais de pacientes.
              </p>
            </div>
          </div>
        </section>

        {/* ============ 5. O QUE O SERVIDOR GUARDA ============ */}
        <section id="servidor" className="nx-secao">
          <div className="nx-container">
            <h2 className="nx-secao-titulo">O que o servidor guarda</h2>
            <p className="nx-secao-sub">
              Só texto cifrado, ilegível sem a senha mestra. Para abrir um item,
              digite a senha: a decifragem acontece no seu navegador e o
              conteúdo só aparece se a senha estiver correta.
            </p>

            <div className="nx-botoes">
              <button
                type="button"
                className="nx-botao nx-botao-contorno"
                onClick={carregarLista}
                disabled={carregandoLista}
              >
                {carregandoLista ? "Carregando..." : "Atualizar lista"}
              </button>
            </div>

            {erroLista !== "" && (
              <p role="alert" className="nx-erro">
                {erroLista}
              </p>
            )}

            {registros.length === 0 && erroLista === "" && !carregandoLista && (
              <p className="nx-vazio">
                Nada para mostrar ainda. Salve um prontuário ou clique em
                &quot;Atualizar lista&quot;.
              </p>
            )}

            <ul className="nx-lista">
              {registros.map((registro) => (
                <li key={registro.id} className="nx-registro">
                  <div className="nx-registro-topo">
                    <span className="nx-chip-cinza">No nosso servidor</span>
                    <span>
                      {new Date(registro.criado_em).toLocaleString("pt-BR")} ·{" "}
                      {registro.id.slice(0, 8)}
                    </span>
                  </div>

                  <p className="nx-cifra">
                    {registro.conteudo_cifrado.slice(0, 180)}…
                  </p>

                  <button
                    type="button"
                    className="nx-botao nx-botao-contorno nx-botao-pequeno"
                    onClick={() => alternarAbrir(registro.id)}
                  >
                    {idAberto === registro.id
                      ? "Fechar"
                      : "Abrir com a senha mestra"}
                  </button>

                  {idAberto === registro.id && (
                    <>
                      {/* Pede a senha enquanto o conteúdo ainda está bloqueado */}
                      {evolucaoAberta === null && textoAberto === "" && (
                        <form
                          className="nx-abrir"
                          onSubmit={(e) => handleAbrir(e, registro)}
                        >
                          <label
                            htmlFor={`senha-${registro.id}`}
                            className="nx-sr-only"
                          >
                            Senha mestra para abrir
                          </label>
                          <div className="nx-linha-senha">
                            <input
                              id={`senha-${registro.id}`}
                              type="password"
                              className="nx-input"
                              value={senhaAbrir}
                              onChange={(e) => setSenhaAbrir(e.target.value)}
                              placeholder="Senha mestra"
                              autoComplete="off"
                              disabled={abrindo}
                            />
                            <button
                              type="submit"
                              className="nx-botao nx-botao-azul nx-botao-pequeno"
                              disabled={abrindo}
                            >
                              {abrindo ? "Abrindo..." : "Abrir"}
                            </button>
                          </div>

                          {erroAbrir !== "" && (
                            <p role="alert" className="nx-erro">
                              {erroAbrir}
                            </p>
                          )}
                        </form>
                      )}

                      {/* Senha certa: a evolução aparece nos mesmos cartões */}
                      {evolucaoAberta && (
                        <EvolucaoCartoes evolucao={evolucaoAberta} />
                      )}

                      {/* Registros antigos, salvos como texto simples */}
                      {textoAberto !== "" && (
                        <pre className="nx-aberto">{textoAberto}</pre>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* ============ 6. RODAPÉ ============ */}
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

/* Texto só para leitores de tela (o campo já tem placeholder) */
.nx-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
.nx-caixa,
.nx-input {
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
}
.nx-caixa { resize: vertical; }
.nx-caixa::placeholder,
.nx-input::placeholder { color: #7f8bab; }
.nx-caixa:focus,
.nx-input:focus { outline: 2px solid #2f5af0; outline-offset: 1px; }
.nx-caixa:disabled,
.nx-input:disabled { opacity: 0.7; }
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
.nx-sucesso {
  margin: 20px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.4);
  color: #a7f3d0;
  font-size: 15px;
  line-height: 1.55;
}
.nx-link { color: #5eead4; font-weight: 700; }
.nx-aviso { margin: 20px 0 0; font-size: 13px; color: #8d99b8; }

/* ---------- Evolução bloqueada (pede a senha mestra) ---------- */
.nx-sigilo {
  margin-top: 24px;
  padding: 20px;
  border-radius: 14px;
  background: rgba(52, 211, 153, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.35);
}
.nx-sigilo h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 17px;
  color: #5eead4;
}
.nx-dica { margin: 0 0 16px; font-size: 14.5px; line-height: 1.6; color: #b4bfda; }
.nx-form-senha {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: center;
}
.nx-form-senha .nx-botao { grid-column: 1 / -1; justify-self: start; }
.nx-linha-senha { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.nx-linha-senha .nx-input { flex: 1 1 240px; width: auto; }

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

/* ---------- O que o servidor guarda ---------- */
.nx-vazio { margin: 20px 0 0; font-size: 15px; color: #8d99b8; }
.nx-lista {
  list-style: none;
  margin: 24px 0 0;
  padding: 0;
  display: grid;
  gap: 14px;
}
.nx-registro {
  padding: 18px 20px;
  border-radius: 16px;
  background: rgba(15, 24, 52, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.nx-registro .nx-resultado { margin-top: 20px; }
.nx-registro-topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 13px;
  color: #8d99b8;
}
.nx-cifra {
  margin: 0 0 14px;
  font-family: "Courier New", Consolas, monospace;
  font-size: 13.5px;
  line-height: 1.6;
  color: #5eead4;
  word-break: break-all;
}
.nx-abrir { margin-top: 16px; }
.nx-aberto {
  margin: 14px 0 0;
  padding: 16px;
  border-radius: 12px;
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #e8edf9;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

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
  .nx-form-senha { grid-template-columns: 1fr; }
}
`;